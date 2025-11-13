import { Editor, EditorPosition, MarkdownView } from 'obsidian';
import { SnippetManager } from './snippetManager';
import { SnippetSettings, TRIGGER_KEYS } from './types'

export class SnippetEventHandler {
    private settings: SnippetSettings;
    private snippetManager: SnippetManager;
    private isProcessing: boolean = false;

    constructor(snippetManager: SnippetManager, settings: SnippetSettings) {
        this.snippetManager = snippetManager;
        this.settings = settings;
    }

    /**
     * Main keydown handler
     * This will be called BEFORE Obsidian's handlers due to capture phase
     */
    handleKeyDown(event: KeyboardEvent): boolean {
        // Prevent re-entrant calls
        if (this.isProcessing) return false;

        // Check if this is a trigger key
        const isTrigger = this.isTriggerKey(event);
        if (!isTrigger) return false;

        // Get active editor
        const view = this.getActiveMarkdownView();
        if (!view) return false;

        const editor = view.editor;
        if (!editor) return false;

        // Attempt expansion
        const expanded = this.attemptExpansion(editor, event.key);

        if (expanded) {
            // Prevent default behavior and stop propagation
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            return true;
        }

        return false;
    }

    /**
     * Check if the pressed key is a configured trigger
     */
    private isTriggerKey(event: KeyboardEvent): boolean {
        // Ignore modified keys (Ctrl, Alt, Cmd combinations)
        if (event.ctrlKey || event.altKey || event.metaKey) {
            return false;
        }

        const key = event.key;

        if (key === TRIGGER_KEYS.Space && this.settings.enableSpaceTrigger) {
            return true;
        }
        if (key === TRIGGER_KEYS.Tab && this.settings.enableTabTrigger) {
            return true;
        }
        if (key === TRIGGER_KEYS.Enter && this.settings.enableEnterTrigger) {
            return true;
        }

        return false;
    }

    /**
     * Attempt to expand snippet at current cursor position
     */
    private attemptExpansion(editor: Editor, triggerKey: string): boolean {
        this.isProcessing = true;

        try {
            // Get cursor position
            const cursor = editor.getCursor();

            // Get current line text
            const lineText = editor.getLine(cursor.line);

            // Get text before cursor on current line
            const textBeforeCursor = lineText.substring(0, cursor.ch);

            // Extract word before cursor (non-whitespace characters)
            const wordMatch = textBeforeCursor.match(/(\S+)$/);

            if (!wordMatch) {
                return false;
            }

            const word = wordMatch[1];

            // Check minimum length
            if (word.length < this.settings.minKeyLength) {
                return false;
            }

            // Look up snippet
            const snippet = this.snippetManager.findSnippet(word);

            if (!snippet) {
                return false;
            }

            // Found a match! Perform expansion
            this.expandSnippet(editor, cursor, word, snippet, triggerKey);

            return true;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Perform the actual text expansion
     */
    private expandSnippet(
        editor: Editor,
        cursor: EditorPosition,
        matchedWord: string,
        snippet: any,
        triggerKey: string
    ): void {
        // Get file context for template variables
        const view = this.getActiveMarkdownView();
        const context = {
            fileName: view?.file?.basename,
            filePath: view?.file?.path
        };

        // Process the template
        const [expandedText, cursorOffset] = this.snippetManager.processSnippet(
            snippet,
            context
        );

        // Calculate replacement range
        // Start: cursor position minus word length
        // End: current cursor position
        const wordStart = cursor.ch - matchedWord.length;
        const from: EditorPosition = { line: cursor.line, ch: wordStart };
        const to: EditorPosition = { line: cursor.line, ch: cursor.ch };

        // Determine what to insert
        let insertText = expandedText;

        // Optionally include the trigger character (except Tab which doesn't insert text)
        if (triggerKey === TRIGGER_KEYS.Space) {
            insertText = expandedText + ' ';
        } else if (triggerKey === TRIGGER_KEYS.Enter) {
            insertText = expandedText + '\n';
        }
        // For Tab, we don't add the trigger character

        // Replace the matched word with expanded text
        editor.replaceRange(insertText, from, to);

        // Position cursor
        if (cursorOffset !== null) {
            // Calculate new cursor position based on marker
            this.setCursorFromOffset(editor, from, insertText, cursorOffset);
        } else {
            // No marker - cursor goes to end of inserted text
            const newCursor = this.calculateEndPosition(editor, from, insertText);
            editor.setCursor(newCursor);
        }
    }

    /**
     * Set cursor based on offset within expanded text
     */
    private setCursorFromOffset(
        editor: Editor,
        startPos: EditorPosition,
        text: string,
        offset: number
    ): void {
        const textBeforeMarker = text.substring(0, offset);
        const lines = textBeforeMarker.split('\n');

        if (lines.length === 1) {
            // Single line - cursor on same line
            editor.setCursor({
                line: startPos.line,
                ch: startPos.ch + offset
            });
        } else {
            // Multiple lines - calculate line and column
            const newLine = startPos.line + lines.length - 1;
            const newCh = lines[lines.length - 1].length;
            editor.setCursor({ line: newLine, ch: newCh });
        }
    }

    /**
     * Calculate end position after inserting multi-line text
     */
    private calculateEndPosition(
        editor: Editor,
        startPos: EditorPosition,
        text: string
    ): EditorPosition {
        const lines = text.split('\n');

        if (lines.length === 1) {
            return {
                line: startPos.line,
                ch: startPos.ch + text.length
            };
        } else {
            return {
                line: startPos.line + lines.length - 1,
                ch: lines[lines.length - 1].length
            };
        }
    }

    /**
     * Get active markdown view
     */
    private getActiveMarkdownView(): MarkdownView | null {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        return view;
    }

    private get app() {
        return this.snippetManager['app'];
    }

    /**
     * Update settings reference
     */
    updateSettings(settings: SnippetSettings): void {
        this.settings = settings;
    }
}
