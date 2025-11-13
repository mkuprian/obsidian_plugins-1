//TODO: Remove the ability to place plugins in the metadata however retain the ability to read metadata for interpolation

import {
    App,
    Plugin,
    PluginSettingTab,
    Setting,
    MarkdownView,
    Editor,
    MarkdownFileInfo
} from 'obsidian';
import { SnippetManager } from './snippetManager';
import { SnippetEventHandler } from './eventHandler';
import { SnippetSettings, DEFAULT_SETTINGS } from './types';

export default class SnippetExpanderPlugin extends Plugin {
    settings!: SnippetSettings;
    snippetManager!: SnippetManager;
    eventHandler!: SnippetEventHandler;
    private keydownHandler!: (event: KeyboardEvent) => void;

    async onload() {
        console.log('Loading Snippet Expander Plugin');

        // Load settings
        await this.loadSettings();

        // Initialize components
        this.snippetManager = new SnippetManager(this.app, this.settings);
        this.eventHandler = new SnippetEventHandler(
            this.snippetManager,
            this.settings
        );

        // Load initial snippets
        await this.reloadSnippets();

        // Register keydown event listener with CAPTURE phase
        // This ensures we intercept BEFORE Obsidian's handlers
        this.keydownHandler = this.createKeydownHandler();

        this.registerDomEvent(
            document,
            'keydown',
            this.keydownHandler,
            { capture: true } // CRITICAL: Use capture phase for priority
        );

        // Register commands
        this.addCommand({
            id: 'reload-snippets',
            name: 'Reload snippets',
            callback: async () => {
                await this.reloadSnippets();
            }
        });

        this.addCommand({
            id: 'expand-snippet-manual',
            name: 'Expand snippet at cursor',
            editorCallback: (editor: Editor, view: MarkdownView | MarkdownFileInfo) => {
                if (view instanceof MarkdownView) {
                    this.manualExpand(editor, view);
                } else {
                    console.log('Manual expansion is only available in Markdown views.');
                }
            }
        });

        this.addCommand({
            id: 'list-snippets',
            name: 'List all loaded snippets',
            callback: () => {
                const keys = this.snippetManager.getAllKeys();
                console.log(`Loaded snippets (${keys.length}):`, keys);
                // Could also show modal with list
            }
        });

        // Settings tab
        this.addSettingTab(new SnippetSettingsTab(this.app, this));

        // Watch for file changes to reload inline snippets
        this.registerEvent(
            this.app.workspace.on('file-open', async (file) => {
                if (this.settings.parseInlineSnippets && file) {
                    await this.reloadSnippets();
                }
            })
        );

        // Also reload on editor changes (debounced)
        let debounceTimer: NodeJS.Timeout | null = null;
        this.registerEvent(
            this.app.workspace.on('editor-change', () => {
                if (!this.settings.parseInlineSnippets) return;

                // Debounce: only reload 500ms after user stops typing
                if (debounceTimer) clearTimeout(debounceTimer);

                debounceTimer = setTimeout(async () => {
                    await this.reloadSnippets();
                }, 500);
            })
        );
    }

    /**
     * Create the keydown handler with proper binding
     */
    private createKeydownHandler(): (event: KeyboardEvent) => void {
        return (event: KeyboardEvent) => {
            // Only process events when editing markdown
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!activeView) return;

            // Check if editor is focused
            const editor = activeView.editor;
            if (!editor) return;

            // Delegate to event handler
            this.eventHandler.handleKeyDown(event);
        };
    }

    /**
     * Reload snippets from all sources
     */
    async reloadSnippets(): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        await this.snippetManager.reloadSnippets(activeFile);
    }

    /**
     * Manual expansion (command-triggered)
     */
    private manualExpand(editor: Editor, view: MarkdownView): void {
        const cursor = editor.getCursor();
        const lineText = editor.getLine(cursor.line);
        const textBeforeCursor = lineText.substring(0, cursor.ch);

        const wordMatch = textBeforeCursor.match(/(\S+)$/);
        if (!wordMatch) return;

        const word = wordMatch[1];
        const snippet = this.snippetManager.findSnippet(word);

        if (!snippet) {
            console.log(`No snippet found for: ${word}`);
            return;
        }

        // Get context
        const context = {
            fileName: view.file?.basename,
            filePath: view.file?.path
        };

        // Process and expand
        const [expandedText, cursorOffset] = this.snippetManager.processSnippet(
            snippet,
            context
        );

        // Calculate range
        const wordStart = cursor.ch - word.length;
        const from = { line: cursor.line, ch: wordStart };
        const to = cursor;

        // Replace
        editor.replaceRange(expandedText, from, to);

        // Position cursor
        if (cursorOffset !== null) {
            const textBeforeMarker = expandedText.substring(0, cursorOffset);
            const lines = textBeforeMarker.split('\n');

            const newLine = cursor.line + lines.length - 1;
            const newCh = lines.length === 1
                ? wordStart + cursorOffset
                : lines[lines.length - 1].length;

            editor.setCursor({ line: newLine, ch: newCh });
        }
    }

    async onunload() {
        console.log('Unloading Snippet Expander Plugin');
        // Event listeners are automatically cleaned up by registerDomEvent
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);

        // Update components with new settings
        this.snippetManager.updateSettings(this.settings);
        this.eventHandler.updateSettings(this.settings);

        // Reload snippets in case paths changed
        await this.reloadSnippets();
    }
}

/**
 * Settings tab
 */
class SnippetSettingsTab extends PluginSettingTab {
    plugin: SnippetExpanderPlugin;

    constructor(app: App, plugin: SnippetExpanderPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Snippet Expander Settings' });

        // Trigger keys section
        containerEl.createEl('h3', { text: 'Trigger Keys' });

        new Setting(containerEl)
            .setName('Expand on Space')
            .setDesc('Trigger snippet expansion when Space is pressed')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableSpaceTrigger)
                .onChange(async (value) => {
                    this.plugin.settings.enableSpaceTrigger = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Expand on Tab')
            .setDesc('Trigger snippet expansion when Tab is pressed')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableTabTrigger)
                .onChange(async (value) => {
                    this.plugin.settings.enableTabTrigger = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Expand on Enter')
            .setDesc('Trigger snippet expansion when Enter is pressed')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableEnterTrigger)
                .onChange(async (value) => {
                    this.plugin.settings.enableEnterTrigger = value;
                    await this.plugin.saveSettings();
                }));

        // Snippet sources
        containerEl.createEl('h3', { text: 'Snippet Sources' });

        new Setting(containerEl)
            .setName('JSON file path')
            .setDesc('Filename for JSON snippets (in plugin folder)')
            .addText(text => text
                .setPlaceholder('snippets.json')
                .setValue(this.plugin.settings.jsonFilePath)
                .onChange(async (value) => {
                    this.plugin.settings.jsonFilePath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Parse inline snippets')
            .setDesc('Load snippets from current markdown file')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.parseInlineSnippets)
                .onChange(async (value) => {
                    this.plugin.settings.parseInlineSnippets = value;
                    await this.plugin.saveSettings();
                }));

        // Behavior
        containerEl.createEl('h3', { text: 'Behavior' });

        new Setting(containerEl)
            .setName('Case sensitive')
            .setDesc('Match snippet keys with case sensitivity')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.caseSensitive)
                .onChange(async (value) => {
                    this.plugin.settings.caseSensitive = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Minimum key length')
            .setDesc('Minimum characters before attempting expansion')
            .addSlider(slider => slider
                .setLimits(1, 5, 1)
                .setValue(this.plugin.settings.minKeyLength)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.minKeyLength = value;
                    await this.plugin.saveSettings();
                }));

        // Actions
        containerEl.createEl('h3', { text: 'Actions' });

        new Setting(containerEl)
            .setName('Reload snippets now')
            .setDesc('Manually reload all snippets from sources')
            .addButton(button => button
                .setButtonText('Reload')
                .onClick(async () => {
                    await this.plugin.reloadSnippets();
                }));

        new Setting(containerEl)
            .setName('Show loaded snippets')
            .setDesc('Display list of currently loaded snippet keys')
            .addButton(button => button
                .setButtonText('Show')
                .onClick(() => {
                    const keys = this.plugin.snippetManager.getAllKeys();
                    console.log(`Loaded snippets (${keys.length}):`, keys.sort());
                }));
    }
}
