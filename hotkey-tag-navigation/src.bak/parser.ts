/**
 * Represents a position in the document
 */
export interface Position {
    line: number;
    ch: number;
    offset: number;
}

/**
 * Represents a tag node in the Abstract Syntax Tree
 */
export interface TagNode {
    // Absolute positions in document
    outerStart: number;  // Start of opening delimiter
    outerEnd: number;    // End of closing delimiter
    innerStart: number;  // Start of content (after opening delimiter)
    innerEnd: number;    // End of content (before closing delimiter)

    // The actual content between delimiters
    content: string;

    // Depth in nesting hierarchy (0 = root level)
    depth: number;

    // Child tags nested within this tag
    children: TagNode[];

    // Parent reference for traversal
    parent: TagNode | null;

    // Document order index for traversal
    documentOrder: number;
}

/**
 * Result of parsing operation
 */
export interface ParseResult {
    nodes: TagNode[];           // All nodes in document order
    rootNodes: TagNode[];       // Only top-level nodes
    flattenedNodes: TagNode[];  // Depth-first traversal order
}

/**
 * Advanced tag parser with support for complex nesting
 */
export class TagParser {
    private openingDelimiter: string;
    private closingDelimiter: string;
    private delimiterLength: number;

    constructor(openingDelimiter: string = '[[', closingDelimiter: string = ']]') {
        this.openingDelimiter = openingDelimiter;
        this.closingDelimiter = closingDelimiter;
        this.delimiterLength = openingDelimiter.length;
    }

    /**
     * Main parsing method - handles complex nested structures
     * 
     * Algorithm:
     * 1. Scan text character by character
     * 2. Use stack to track opening delimiters
     * 3. When closing delimiter found, pop from stack and create node
     * 4. Build parent-child relationships based on stack depth
     */
    public parse(text: string): ParseResult {
        const nodes: TagNode[] = [];
        const stack: Array<{
            startPos: number;
            depth: number;
            children: TagNode[];
        }> = [];

        let i = 0;
        let documentOrderCounter = 0;

        while (i < text.length) {
            // Check for opening delimiter
            if (this.matchesDelimiter(text, i, this.openingDelimiter)) {
                stack.push({
                    startPos: i,
                    depth: stack.length,
                    children: []
                });
                i += this.delimiterLength;
                continue;
            }

            // Check for closing delimiter
            if (this.matchesDelimiter(text, i, this.closingDelimiter) && stack.length > 0) {
                const opening = stack.pop()!;
                const outerStart = opening.startPos;
                const outerEnd = i + this.delimiterLength;
                const innerStart = outerStart + this.delimiterLength;
                const innerEnd = i;

                const node: TagNode = {
                    outerStart,
                    outerEnd,
                    innerStart,
                    innerEnd,
                    content: text.substring(innerStart, innerEnd),
                    depth: opening.depth,
                    children: opening.children,
                    parent: null,
                    documentOrder: documentOrderCounter++
                };

                // Set parent references for children
                for (const child of node.children) {
                    child.parent = node;
                }

                // Add this node to parent's children or to root nodes
                if (stack.length > 0) {
                    stack[stack.length - 1].children.push(node);
                } else {
                    nodes.push(node);
                }

                i += this.delimiterLength;
                continue;
            }

            i++;
        }

        // Build flattened depth-first traversal
        const flattenedNodes = this.flattenDepthFirst(nodes);

        return {
            nodes,
            rootNodes: nodes,
            flattenedNodes
        };
    }

    /**
     * Check if delimiter matches at position
     */
    private matchesDelimiter(text: string, pos: number, delimiter: string): boolean {
        if (pos + delimiter.length > text.length) {
            return false;
        }
        return text.substring(pos, pos + delimiter.length) === delimiter;
    }

    /**
     * Flatten tree structure into depth-first order
     * This is crucial for parent->child selection order
     */
    private flattenDepthFirst(nodes: TagNode[]): TagNode[] {
        const result: TagNode[] = [];

        const traverse = (node: TagNode) => {
            result.push(node);
            for (const child of node.children) {
                traverse(child);
            }
        };

        for (const node of nodes) {
            traverse(node);
        }

        return result;
    }

    /**
     * Find the deepest tag containing a given position
     * Used for "current tag" detection when cursor is inside a tag
     */
    public findTagAtPosition(parseResult: ParseResult, offset: number): TagNode | null {
        let deepestNode: TagNode | null = null;
        let maxDepth = -1;

        const checkNode = (node: TagNode) => {
            // Check if position is within this tag's outer bounds
            if (offset >= node.outerStart && offset < node.outerEnd) {
                if (node.depth > maxDepth) {
                    maxDepth = node.depth;
                    deepestNode = node;
                }
            }

            // Recursively check children
            for (const child of node.children) {
                checkNode(child);
            }
        };

        for (const node of parseResult.rootNodes) {
            checkNode(node);
        }

        return deepestNode;
    }

    /**
     * Find next tag after a given position in document order
     */
    public findNextTag(parseResult: ParseResult, offset: number): TagNode | null {
        // Find the first tag whose outerStart is after offset
        for (const node of parseResult.flattenedNodes) {
            if (node.outerStart > offset) {
                return node;
            }
        }
        return null; // No more tags
    }

    /**
     * Find previous tag before a given position
     */
    public findPreviousTag(parseResult: ParseResult, offset: number): TagNode | null {
        // Reverse search for first tag whose outerEnd is before offset
        for (let i = parseResult.flattenedNodes.length - 1; i >= 0; i--) {
            const node = parseResult.flattenedNodes[i];
            if (node.outerEnd <= offset) {
                return node;
            }
        }
        return null;
    }

    /**
     * Get all child tags in depth-first order for a given parent
     */
    public getChildrenInOrder(parent: TagNode): TagNode[] {
        return this.flattenDepthFirst(parent.children);
    }

    /**
     * Visualize the tag structure for debugging
     */
    public visualize(parseResult: ParseResult): string {
        const lines: string[] = [];

        const visualizeNode = (node: TagNode, indent: string = '') => {
            lines.push(
                `${indent}[${node.outerStart}-${node.outerEnd}] ` +
                `depth=${node.depth} order=${node.documentOrder} ` +
                `content="${node.content.replace(/\n/g, '\\n')}"`
            );
            for (const child of node.children) {
                visualizeNode(child, indent + '  ');
            }
        };

        for (const node of parseResult.rootNodes) {
            visualizeNode(node);
        }

        return lines.join('\n');
    }
}
