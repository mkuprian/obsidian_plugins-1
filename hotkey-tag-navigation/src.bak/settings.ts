import { App, PluginSettingTab, Setting, Modifier } from 'obsidian';
import type AdvanceTagPlugin from './main';

export interface AdvanceTagSettings {
    openingTagDelimiter: string;
    closingTagDelimiter: string;
    showDebugInfo: boolean;
    wrapAroundEnabled: boolean;
    selectInnerByDefault: boolean;
}

export const DEFAULT_SETTINGS: AdvanceTagSettings = {
    openingTagDelimiter: '|<',
    closingTagDelimiter: '>|',
    showDebugInfo: false,
    wrapAroundEnabled: true,
    selectInnerByDefault: false
};

export class AdvanceTagSettingTab extends PluginSettingTab {
    plugin: AdvanceTagPlugin;

    constructor(app: App, plugin: AdvanceTagPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Advance Tag Navigator Settings' });

        new Setting(containerEl)
            .setName('Opening tag delimiter')
            .setDesc('The delimiter used to wrap tagged text (default: |<)')
            .addText(text => text
                .setPlaceholder('|<')
                .setValue(this.plugin.settings.openingTagDelimiter)
                .onChange(async (value) => {
                    if (value.length > 0) {
                        this.plugin.settings.openingTagDelimiter = value;
                        await this.plugin.saveSettings();
                        this.plugin.navigator.updateOpeningDelimiter(value);
                    }
                }));

        new Setting(containerEl)
            .setName('Closing tag delimiter')
            .setDesc('The delimiter used to wrap tagged text (default: |>)')
            .addText(text => text
                .setPlaceholder('|>')
                .setValue(this.plugin.settings.closingTagDelimiter)
                .onChange(async (value) => {
                    if (value.length > 0) {
                        this.plugin.settings.closingTagDelimiter = value;
                        await this.plugin.saveSettings();
                        this.plugin.navigator.updateClosingDelimiter(value);
                    }
                }));

        new Setting(containerEl)
            .setName('Select inner content by default')
            .setDesc('When enabled, selections will exclude the delimiters')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.selectInnerByDefault)
                .onChange(async (value) => {
                    this.plugin.settings.selectInnerByDefault = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Wrap around navigation')
            .setDesc('When reaching the last tag, wrap to the first tag')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.wrapAroundEnabled)
                .setValue(this.plugin.settings.wrapAroundEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.wrapAroundEnabled = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Show debug information')
            .setDesc('Display tag structure information in console (for development)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showDebugInfo)
                .onChange(async (value) => {
                    this.plugin.settings.showDebugInfo = value;
                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl)
            .setName('Advance to next tag')
            .setDesc('Set hotkey for advancing to the next tag in parent→child order (default: Mod+Shift+Right Arrow)')
            .addText(text => text
                .setPlaceholder('Mod+Shift+Right Arrow')
                .setValue(this.plugin.advanceHotkey.modifiers.join('+') + '+' + this.plugin.advanceHotkey.key)
                .onChange(async (value) => {
                    const [modifiers, key] = value.split('+');
                    this.plugin.advanceHotkey = {
                        modifiers: modifiers.split('+') as Modifier[],
                        key
                    };
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl('h3', { text: 'Usage Examples' });

        const exampleEl = containerEl.createDiv();
        exampleEl.createEl('p', {
            text: 'With delimiters [[ ]], you can write:'
        });
        exampleEl.createEl('pre', {
            text: 'I like to eat [[spaghetti]].\nFor dinner: [[spaghetti]] or [[pastrami]].'
        });
        exampleEl.createEl('p', {
            text: 'Use the advance command to navigate through tags in parent→child order.'
        });
    }
}
