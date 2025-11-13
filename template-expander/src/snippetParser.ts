import { App, TFile, Vault } from 'obsidian';
import { SnippetTemplate } from './types';

export class SnippetParser {
    constructor(private app: App, private vault: Vault) { }

    /**
     * Parse inline snippets from markdown content
     * Format: --> key || template <--
     */
    parseInlineSnippets(content: string): Map<string, SnippetTemplate> {
        const snippets = new Map<string, SnippetTemplate>();

        // Regex to match: --> key || template <--
        // Using lazy matching for key, greedy for template
        const inlineRegex = /-->\s*([^\|]+?)\s*\|\|\s*([\s\S]*?)\s*<--/g;

        let match: RegExpExecArray | null;
        while ((match = inlineRegex.exec(content)) !== null) {
            const key = match[1].trim();
            const template = match[2].trim();

            if (key && template) {
                snippets.set(key, {
                    key,
                    template: this.unescapeTemplate(template),
                    description: 'Inline snippet'
                });
            }
        }

        return snippets;
    }

    /**
     * Parse snippets from frontmatter YAML (manual parsing - no dependencies)
     */
    // parseFrontmatterSnippets(content: string): Map<string, SnippetTemplate> {
    //     const snippets = new Map<string, SnippetTemplate>();

    //     // Extract frontmatter between --- markers
    //     const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    //     if (!frontmatterMatch) return snippets;

    //     const yamlContent = frontmatterMatch[1];

    //     // Look for snippets section
    //     const snippetSectionMatch = yamlContent.match(/snippets:\s*\n((?:  .+\n?)*)/);

    //     if (!snippetSectionMatch) return snippets;

    //     const snippetSection = snippetSectionMatch[1];

    //     // Parse each line: "  key: value" or "  key: 'value'" or '  key: "value"'
    //     const lineRegex = /^\s{2}([^:]+):\s*(?:"([^"]*)"|'([^']*)'|(.+))$/gm;
    //     let lineMatch: RegExpExecArray | null;

    //     while ((lineMatch = lineRegex.exec(snippetSection)) !== null) {
    //         const key = lineMatch[1].trim();
    //         // Handle quoted and unquoted values
    //         const template = lineMatch[2] || lineMatch[3] || lineMatch[4];

    //         if (key && template) {
    //             snippets.set(key, {
    //                 key,
    //                 template: this.unescapeTemplate(template.trim())
    //             });
    //         }
    //     }

    //     return snippets;
    // }

    /**
     * Load snippets from JSON file using Vault adapter
     */
    async loadJSONSnippets(filePath: string): Promise<Map<string, SnippetTemplate>> {
        const snippets = new Map<string, SnippetTemplate>();

        try {
            // Construct path relative to plugin directory
            const pluginDir = `${this.vault.configDir}/plugins/snippet-expander`;
            const fullPath = `${pluginDir}/${filePath}`;

            // Use adapter to read file (no Node.js fs required)
            const adapter = this.app.vault.adapter;

            // Check if file exists
            const exists = await adapter.exists(fullPath);
            if (!exists) {
                console.log(`Snippet file not found: ${fullPath}`);
                return snippets;
            }

            const jsonContent = await adapter.read(fullPath);
            const data = JSON.parse(jsonContent);

            // Support two formats:
            // 1. Object: { "key1": "template1", "key2": "template2" }
            // 2. Array: [{ "key": "key1", "template": "template1" }, ...]

            if (Array.isArray(data)) {
                data.forEach((item: any) => {
                    if (item.key && item.template) {
                        snippets.set(item.key, {
                            key: item.key,
                            template: item.template,
                            description: item.description
                        });
                    }
                });
            } else if (typeof data === 'object') {
                Object.entries(data).forEach(([key, value]) => {
                    if (typeof value === 'string') {
                        snippets.set(key, { key, template: value });
                    } else if (typeof value === 'object' && value !== null) {
                        // Support: { "key1": { "template": "...", "description": "..." } }
                        const obj = value as any;
                        snippets.set(key, {
                            key,
                            template: obj.template || String(value),
                            description: obj.description
                        });
                    }
                });
            }

            console.log(`Loaded ${snippets.size} snippets from ${filePath}`);
        } catch (error) {
            console.error('Failed to load JSON snippets:', error);
        }

        return snippets;
    }

    /**
     * Unescape special sequences in templates
     */
    private unescapeTemplate(template: string): string {
        return template
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\r/g, '\r');
    }

    /**
     * Process template variables at expansion time
     */
    processTemplate(template: string, context?: any): string {
        let processed = template;

        // Date/time variables
        const now = new Date();
        processed = processed
            .replace(/\$date\$/g, now.toLocaleDateString())
            .replace(/\$time\$/g, now.toLocaleTimeString())
            .replace(/\$datetime\$/g, now.toLocaleString())
            .replace(/\$year\$/g, String(now.getFullYear()))
            .replace(/\$month\$/g, String(now.getMonth() + 1).padStart(2, '0'))
            .replace(/\$day\$/g, String(now.getDate()).padStart(2, '0'));

        // File context variables
        if (context?.fileName) {
            processed = processed.replace(/\$filename\$/g, context.fileName);
        }
        if (context?.filePath) {
            processed = processed.replace(/\$filepath\$/g, context.filePath);
        }

        return processed;
    }

    /**
     * Extract cursor position markers from template
     * Returns [processed_template, cursor_offset_from_start]
     */
    extractCursorMarker(template: string): [string, number | null] {
        const markers = ['$CURSOR$', '$END$', '$end$', '$cursor$'];

        for (const marker of markers) {
            const index = template.indexOf(marker);
            if (index !== -1) {
                const processed = template.replace(marker, '');
                return [processed, index];
            }
        }

        // No marker found - cursor goes to end
        return [template, null];
    }
}
