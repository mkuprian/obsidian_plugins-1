import { App, Editor, MarkdownFileInfo, MarkdownView, Notice, Plugin } from 'obsidian';
import { AdvanceTagSettings, AdvanceTagSettingTab, DEFAULT_SETTINGS } from './settings';
import { Parser, NavigateTagHotkey } from './parser';
import { Logger, LogLevel } from "./logger";


export default class AdvanceTagPlugin extends Plugin {

    settings!: AdvanceTagSettings;
    editor!: Editor;
    parser!: Parser;
    logger!: Logger;
    logLevel: LogLevel = LogLevel.DEBUG;

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
        // Initialize logger first with the app instance
        this.logger = new Logger(this.app, LogLevel.DEBUG);
        this.logger.info('Advance Tag Navigator plugin is loading');
        await this.loadSettings();
        this.parser = new Parser(this.settings, this.settings.openingTagDelimiter, this.settings.closingTagDelimiter);
        this.parser.setLogger(this.logger);
        // Command: Advance to next tag
        this.logger.debug('Registering commands');
        this.addCommand({
            id: 'advance-to-next-tag',
            name: 'Advance to next tag',
            editorCallback: (editor: Editor, view: MarkdownView | MarkdownFileInfo) => {
                const success = this.parser.parse(editor, true);

                if (!success) {
                    new Notice('No tags found in document');
                } else {
                    // Highlight the found tag
                    this.parser.highlightTag(editor);
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
            editorCallback: (editor: Editor, view: MarkdownView | MarkdownFileInfo) => {
                const success = this.parser.parse(editor, false);

                if (!success) {
                    new Notice('No tags found in document');
                } else {
                    // Highlight the found tag
                    this.parser.highlightTag(editor);
                }

            },
            hotkeys: [
                this.previousHotkey
            ]
        });

        // Command: Select inner content only
        this.addCommand({
            id: 'select-inner-content',
            name: 'Select inner content (without delimiters). If a either no text is selected or the selected text is not a tag, will advance to next tag',
            editorCallback: (editor: Editor, view: MarkdownView | MarkdownFileInfo) => {
                // First check if a tag exists and parse to find if we're inside a tag
                console.log(`Selecting inner text`)
                console.log(`Current tag content is ${this.parser.getTagContent}`)
                console.log(`Check in tag = ${this.parser.checkInTag(editor)}`)
                let parseCheck: boolean = false;
                let success = false;
                if (!this.parser.checkInTag(editor)) {
                    success = this.parser.parse(editor, true);
                };
                parseCheck = true

                if (parseCheck || success) {
                    // If we found a tag, highlight just the inner content
                    this.parser.highlightInnerTag(editor);
                } else {
                    new Notice('Cursor is not inside a tag');
                }
            },
            hotkeys: [
                this.selectInnerHotkey
            ]
        });

        // Command: Remove tag at cursor
        this.addCommand({
            id: 'keep-tag-default-content',
            name: 'Remove tag at cursor keeping the default content',
            editorCallback: (editor: Editor, view: MarkdownView | MarkdownFileInfo) => {
                // First parse to find if we're inside a tag
                let parseSuccess: boolean = false;
                console.log(`Selecting inner text`)
                console.log(`Current tag content is ${this.parser.getTagContent}`)
                console.log(`Check in tag = ${this.parser.checkInTag(editor)}`)
                if (!this.parser.checkInTag(editor)) {
                    parseSuccess = this.parser.parse(editor, true);
                } else {
                    parseSuccess = true
                }
                if (parseSuccess) {
                    const success = this.parser.acceptDefaultText(editor);
                    if (success) {
                        new Notice('Tag removed');
                    } else {
                        new Notice('Failed to remove tag');
                    }
                } else {
                    new Notice('Cursor is not inside a tag');
                }
            },
            hotkeys: [
                this.removeTagAtCursorHotkey
            ]
        });

        // Add settings tab
        this.addSettingTab(new AdvanceTagSettingTab(this.app, this));

        // Register event: reset navigation when switching files
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', () => {
                this.parser.reset();
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
