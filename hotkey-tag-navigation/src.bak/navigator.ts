import { Editor, EditorPosition, Modifier } from 'obsidian';
import { TagNode, TagParser, ParseResult } from './parser';

/**
 * Navigation state management
 */
export interface NavigationState {
    currentNode: TagNode | null;
    currentChildIndex: number;  // Which child we're currently on
    selectionHistory: TagNode[];
}

/**
 * Manage hotkey-based navigation through advanced tags
 */

export interface NavigateTagHotkey {
    modifiers: Modifier[];
    key: string;
}
/**
 * Manages navigation through tags with parent->child ordering
 */
export class TagNavigator {
    private parser: TagParser;
    private state: NavigationState;
    private lastParseResult: ParseResult | null = null;

    constructor(openingDelimiter: string = '[[', closingDelimiter: string = ']]') {
        this.parser = new TagParser(openingDelimiter, closingDelimiter);
        this.state = {
            currentNode: null,
            currentChildIndex: -1,
            selectionHistory: []
        };
    }

    /**
     * Update delimiter if user changes settings
     */
    public updateOpeningDelimiter(openingDelimiter: string): void {
        this.parser = new TagParser(openingDelimiter, this.parser['closingDelimiter']);
        this.reset();
    }
    public updateClosingDelimiter(closingDelimiter: string): void {
        this.parser = new TagParser(this.parser['openingDelimiter'], closingDelimiter);
        this.reset();
    }

    /**
     * Reset navigation state
     */
    public reset(): void {
        this.state = {
            currentNode: null,
            currentChildIndex: -1,
            selectionHistory: []
        };
        this.lastParseResult = null;
    }

    /**
     * Parse current document and cache result
     */
    private parseDocument(editor: Editor): ParseResult {
        const text = editor.getValue();
        this.lastParseResult = this.parser.parse(text);
        return this.lastParseResult;
    }

    /**
     * Convert editor position to offset
     */
    private positionToOffset(editor: Editor, pos: EditorPosition): number {
        return editor.posToOffset(pos);
    }

    /**
     * Convert offset to editor position
     */
    private offsetToPosition(editor: Editor, offset: number): EditorPosition {
        return editor.offsetToPos(offset);
    }

    /**
     * Advance to next tag with intelligent parent->child ordering
     * 
     * Logic:
     * 1. If we're in a parent tag and haven't visited its children, go to first child
     * 2. If we've exhausted children, go to next sibling or parent's sibling
     * 3. If nothing else, go to next top-level tag in document order
     */
    public advanceToNextTag(editor: Editor): boolean {
        const parseResult = this.parseDocument(editor);

        if (parseResult.flattenedNodes.length === 0) {
            return false; // No tags in document
        }

        const cursorOffset = this.positionToOffset(editor, editor.getCursor());

        // Case 1: No current selection - find first tag after cursor
        if (this.state.currentNode === null) {
            const nextTag = this.parser.findNextTag(parseResult, cursorOffset);
            if (nextTag) {
                this.selectNode(editor, nextTag, true);
                return true;
            }
            // Wrap around to first tag
            const firstTag = parseResult.flattenedNodes[0];
            this.selectNode(editor, firstTag, true);
            return true;
        }

        // Case 2: We have a current node - follow parent->child logic
        const current = this.state.currentNode;

        // Check if current node has unvisited children
        if (current.children.length > 0 && this.state.currentChildIndex < current.children.length - 1) {
            this.state.currentChildIndex++;
            const childNode = current.children[this.state.currentChildIndex];
            this.selectNode(editor, childNode, false);
            return true;
        }

        // No more children, find next tag in document order
        const currentIndex = parseResult.flattenedNodes.indexOf(current);
        if (currentIndex !== -1 && currentIndex < parseResult.flattenedNodes.length - 1) {
            const nextNode = parseResult.flattenedNodes[currentIndex + 1];
            this.selectNode(editor, nextNode, true);
            return true;
        }

        // Wrap around to beginning
        const firstTag = parseResult.flattenedNodes[0];
        this.selectNode(editor, firstTag, true);
        return true;
    }

    /**
     * Go to previous tag
     */
    public advanceToPreviousTag(editor: Editor): boolean {
        const parseResult = this.parseDocument(editor);

        if (parseResult.flattenedNodes.length === 0) {
            return false;
        }

        const cursorOffset = this.positionToOffset(editor, editor.getCursor());

        if (this.state.currentNode === null) {
            const prevTag = this.parser.findPreviousTag(parseResult, cursorOffset);
            if (prevTag) {
                this.selectNode(editor, prevTag, true);
                return true;
            }
            // Wrap to last tag
            const lastTag = parseResult.flattenedNodes[parseResult.flattenedNodes.length - 1];
            this.selectNode(editor, lastTag, true);
            return true;
        }

        const current = this.state.currentNode;
        const currentIndex = parseResult.flattenedNodes.indexOf(current);

        if (currentIndex > 0) {
            const prevNode = parseResult.flattenedNodes[currentIndex - 1];
            this.selectNode(editor, prevNode, true);
            return true;
        }

        // Wrap to end
        const lastTag = parseResult.flattenedNodes[parseResult.flattenedNodes.length - 1];
        this.selectNode(editor, lastTag, true);
        return true;
    }

    /**
     * Select a tag node in the editor
     */
    private selectNode(editor: Editor, node: TagNode, isNewParent: boolean): void {
        const startPos = this.offsetToPosition(editor, node.outerStart);
        const endPos = this.offsetToPosition(editor, node.outerEnd);

        editor.setSelection(startPos, endPos);

        // Update state
        this.state.currentNode = node;
        if (isNewParent) {
            this.state.currentChildIndex = -1;
        }
        this.state.selectionHistory.push(node);
    }

    /**
     * Select inner content (without delimiters)
     */
    public selectInnerContent(editor: Editor): boolean {
        const parseResult = this.parseDocument(editor);
        const cursorOffset = this.positionToOffset(editor, editor.getCursor());

        const node = this.parser.findTagAtPosition(parseResult, cursorOffset);
        if (!node) {
            return false;
        }

        const startPos = this.offsetToPosition(editor, node.innerStart);
        const endPos = this.offsetToPosition(editor, node.innerEnd);

        editor.setSelection(startPos, endPos);
        return true;
    }

    /**
     * Remove tag at cursor, preserving inner content and child tags
     */
    public removeTagAtCursor(editor: Editor): boolean {
        const parseResult = this.parseDocument(editor);
        const cursorOffset = this.positionToOffset(editor, editor.getCursor());

        const node = this.parser.findTagAtPosition(parseResult, cursorOffset);
        if (!node) {
            return false;
        }

        // Replace the outer tag (including delimiters) with just the inner content
        const startPos = this.offsetToPosition(editor, node.outerStart);
        const endPos = this.offsetToPosition(editor, node.outerEnd);

        editor.replaceRange(node.content, startPos, endPos);

        // Reset state since document structure changed
        this.reset();

        return true;
    }

    /**
     * Remove all tags in selection, preserving content
     */
    public removeAllTagsInSelection(editor: Editor): boolean {
        if (!editor.somethingSelected()) {
            return this.removeTagAtCursor(editor);
        }

        const from = editor.getCursor('from');
        const to = editor.getCursor('to');
        const fromOffset = this.positionToOffset(editor, from);
        const toOffset = this.positionToOffset(editor, to);

        const selectedText = editor.getRange(from, to);
        const parseResult = this.parser.parse(selectedText);

        // Remove tags from innermost to outermost to maintain correct positions
        let modifiedText = selectedText;
        const sortedNodes = [...parseResult.flattenedNodes].sort((a, b) => b.depth - a.depth);

        for (const node of sortedNodes) {
            // Calculate adjusted positions within selected text
            const before = modifiedText.substring(0, node.outerStart);
            const after = modifiedText.substring(node.outerEnd);
            modifiedText = before + node.content + after;
        }

        editor.replaceRange(modifiedText, from, to);
        this.reset();

        return true;
    }

    /**
     * Get debug information about current state
     */
    public getDebugInfo(editor: Editor): string {
        const parseResult = this.parseDocument(editor);
        const visualization = this.parser.visualize(parseResult);

        return `
Tags Found: ${parseResult.flattenedNodes.length}
Current Node: ${this.state.currentNode?.documentOrder ?? 'none'}
Child Index: ${this.state.currentChildIndex}

Tag Structure:
${visualization}
    `.trim();
    }
}
