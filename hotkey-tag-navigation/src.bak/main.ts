import { Editor, MarkdownView, Notice, Plugin } from 'obsidian';
import { AdvanceTagSettings, AdvanceTagSettingTab, DEFAULT_SETTINGS } from './settings';
import { NavigateTagHotkey, TagNavigator } from './navigator';

export default class AdvanceTagPlugin extends Plugin {
    settings: AdvanceTagSettings;
    navigator: TagNavigator;
    advanceHotkey: NavigateTagHotkey = {
        modifiers: ['Mod', 'Shift'],
        key: 'ArrowRight'
    };
    previousHotkey: NavigateTagHotkey = {
        modifiers: ['Mod', 'Shift'],
        key: 'ArrowLeft'
    };
    selectInnerHotkey: NavigateTagHotkey = {
        modifiers: ['Mod', 'Shift'],
        key: 'i'
    };
    removeTagAtCursorHotkey: NavigateTagHotkey = {
        modifiers: ['Mod', 'Shift'],
        key: 'Backspace'
    };
    removeAllTagsInSelectionHotkey: NavigateTagHotkey = {
        modifiers: ['Mod', 'Shift', 'Alt'],
        key: 'Backspace'
    };

    async onload() {
        console.log('Loading Advance Tag Navigator plugin');

        await this.loadSettings();

        // Initialize navigator with current delimiter
        this.navigator = new TagNavigator(this.settings.openingTagDelimiter, this.settings.closingTagDelimiter);

        // Command: Advance to next tag
        this.addCommand({
            id: 'advance-to-next-tag',
            name: 'Advance to next tag',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                const success = this.navigator.advanceToNextTag(editor);

                if (!success) {
                    new Notice('No tags found in document');
                }

                if (this.settings.showDebugInfo) {
                    console.log(this.navigator.getDebugInfo(editor));
                }
            },
            hotkeys: [
                this.advanceHotkey
            ]
        });

        // Command: Advance to previous tag
        this.addCommand({
            id: 'advance-to-previous-tag',
            name: 'Advance to previous tag',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                const success = this.navigator.advanceToPreviousTag(editor);

                if (!success) {
                    new Notice('No tags found in document');
                }

                if (this.settings.showDebugInfo) {
                    console.log(this.navigator.getDebugInfo(editor));
                }
            },
            hotkeys: [
                this.previousHotkey
            ]
        });

        // Command: Select inner content only
        this.addCommand({
            id: 'select-inner-content',
            name: 'Select inner content (without delimiters)',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                const success = this.navigator.selectInnerContent(editor);

                if (!success) {
                    new Notice('Cursor is not inside a tag');
                }
            },
            hotkeys: [
                this.selectInnerHotkey
            ]
        });

        // Command: Remove tag at cursor
        this.addCommand({
            id: 'remove-tag-at-cursor',
            name: 'Remove tag at cursor (keep content)',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                const success = this.navigator.removeTagAtCursor(editor);

                if (success) {
                    new Notice('Tag removed');
                } else {
                    new Notice('Cursor is not inside a tag');
                }
            },
            hotkeys: [
                this.removeTagAtCursorHotkey
            ]
        });

        // Command: Remove all tags in selection
        this.addCommand({
            id: 'remove-all-tags-in-selection',
            name: 'Remove all tags in selection',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                const success = this.navigator.removeAllTagsInSelection(editor);

                if (success) {
                    new Notice('Tags removed from selection');
                }
            },
            hotkeys: [
                this.removeAllTagsInSelectionHotkey
            ]
        });

        // Command: Show debug information
        this.addCommand({
            id: 'show-tag-debug-info',
            name: 'Show tag structure (debug)',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                const debugInfo = this.navigator.getDebugInfo(editor);
                console.log(debugInfo);
                new Notice('Tag structure logged to console');
            }
        });

        // Command: Reset navigation state
        this.addCommand({
            id: 'reset-navigation',
            name: 'Reset navigation state',
            callback: () => {
                this.navigator.reset();
                new Notice('Navigation state reset');
            }
        });

        // Add settings tab
        this.addSettingTab(new AdvanceTagSettingTab(this.app, this));

        // Register event: reset navigation when switching files
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', () => {
                this.navigator.reset();
            })
        );
    }

    onunload() {
        console.log('Unloading Advance Tag Navigator plugin');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
