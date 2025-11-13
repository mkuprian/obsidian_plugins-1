import { App, TFile } from 'obsidian';
import { SnippetParser } from './snippetParser';
import { SnippetTemplate, SnippetSettings } from './types';

export class SnippetManager {
    private snippets: Map<string, SnippetTemplate> = new Map();
    private parser: SnippetParser;
    private settings: SnippetSettings;

    constructor(private app: App, settings: SnippetSettings) {
        this.parser = new SnippetParser(app, app.vault);
        this.settings = settings;
    }

    /**
     * Reload all snippets from all sources
     */
    async reloadSnippets(currentFile?: TFile | null): Promise<void> {
        const newSnippets = new Map<string, SnippetTemplate>();

        // Load from JSON file first (lower priority)
        if (this.settings.jsonFilePath) {
            const jsonSnippets = await this.parser.loadJSONSnippets(
                this.settings.jsonFilePath
            );
            jsonSnippets.forEach((snippet, key) => newSnippets.set(key, snippet));
        }

        // Load from current file (higher priority - overrides JSON)
        if (this.settings.parseInlineSnippets && currentFile) {
            const content = await this.app.vault.read(currentFile);

            // // Parse frontmatter snippets
            // const frontmatterSnippets = this.parser.parseFrontmatterSnippets(content);
            // frontmatterSnippets.forEach((snippet, key) => newSnippets.set(key, snippet));

            // Parse inline delimited snippets
            const inlineSnippets = this.parser.parseInlineSnippets(content);
            inlineSnippets.forEach((snippet, key) => newSnippets.set(key, snippet));
        }

        this.snippets = newSnippets;
        console.log(`Snippet registry updated: ${this.snippets.size} snippets loaded`);
    }

    /**
     * Find snippet by key (respecting case sensitivity setting)
     */
    findSnippet(key: string): SnippetTemplate | undefined {
        if (this.settings.caseSensitive) {
            return this.snippets.get(key);
        } else {
            const lowerKey = key.toLowerCase();
            for (const [k, v] of this.snippets) {
                if (k.toLowerCase() === lowerKey) {
                    return v;
                }
            }
        }
        return undefined;
    }

    /**
     * Get all snippet keys (for autocomplete, debugging, etc.)
     */
    getAllKeys(): string[] {
        return Array.from(this.snippets.keys());
    }

    /**
     * Update settings reference
     */
    updateSettings(settings: SnippetSettings): void {
        this.settings = settings;
    }

    /**
     * Process a template with context
     */
    processSnippet(snippet: SnippetTemplate, context?: any): [string, number | null] {
        const processed = this.parser.processTemplate(snippet.template, context);
        return this.parser.extractCursorMarker(processed);
    }
}
