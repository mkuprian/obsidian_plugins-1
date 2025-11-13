/*
* The parser of this application will trigger on a hotkey and then look from the current cursor position forward or back.
* It will find the next or previous occurrence of a tag defined by opening and closing delimiters.
* For nested tags, it will correctly identify the outermost tag. However if the opening and closing tags are the same,
* it will treat them as separate tags.
*
* Once a tag is found, the parser will select the entire tag so the author can either overwrite, delete or remove the tag itself via hotkey,
*/

import { AdvanceTagSettings } from './settings';
import { Editor, Modifier } from 'obsidian';
import { Logger } from './logger';

export interface NavigateTagHotkey {
    modifiers: Modifier[];
    key: string;
}

export interface TagStruct {
    parentStart: number;
    parentEnd: number;
    innerStart: number;
    innerEnd: number;
    content: string;
    openingTagPos: number[]; // This will identify any opening tags that are found, this will allow for addressing nested tags as we can pop off the last opening tag found to handle nesting
    closingTagPos: number[]; // This will identify any closing tags that are found, this will allow for addressing nested tags as we can pop off the last closing tag found to handle nesting
}

export class Parser {
    logger!: Logger
    settings: AdvanceTagSettings;
    openingDelimiter: string;
    closingDelimiter: string;
    tagStruct: TagStruct | null = null;

    constructor(settings: AdvanceTagSettings, openingDelimiter: string, closingDelimiter: string) {
        this.settings = settings;
        this.openingDelimiter = openingDelimiter;
        this.closingDelimiter = closingDelimiter;
    }
    public reset(): void {
        this.tagStruct = null;
    }
    public setLogger(logger: Logger): void {
        this.logger = logger;
    }
    public setOpeningDelimiter(delimiter: string): void {
        this.openingDelimiter = delimiter;
    }
    public setClosingDelimiter(delimiter: string): void {
        this.closingDelimiter = delimiter;
    }
    public getTagPosition(): { parentStart: number; parentEnd: number } | null {
        if (this.tagStruct) {
            return {
                parentStart: this.tagStruct.parentStart,
                parentEnd: this.tagStruct.parentEnd
            };
        }
        return null;
    }
    public checkInTag(editor: Editor): boolean {
        // first - is text highlighted
        const cursorStartPos = editor.getCursor('from');
        const cursorEndPos = editor.getCursor('to');
        const cursorStartIndex = editor.posToOffset(cursorStartPos);
        const cursorEndIndex = editor.posToOffset(cursorEndPos)
        if ((cursorEndIndex - cursorStartIndex) > 0) {
            //we have selected text
            //Check if it starts with deliminator
            const selectedText = editor.getSelection();
            if (selectedText.startsWith(this.openingDelimiter) && selectedText.endsWith(this.closingDelimiter)) {
                return true;
            }
            return false;
        }
        return false
    }
    public getTagContent(): string | null {
        return this.tagStruct ? this.tagStruct.content : null;
    }

    public getInnerTagPosition(): { innerStart: number; innerEnd: number } | null {
        if (this.tagStruct) {
            return {
                innerStart: this.tagStruct.innerStart,
                innerEnd: this.tagStruct.innerEnd
            };
        }
        return null;
    }
    public getInnerTagContent(): string | null {
        if (this.tagStruct) {
            return this.tagStruct.content;
        }
        return null;
    }

    public highlightTag(editor: Editor): boolean {
        if (this.tagStruct) {
            const startPos = editor.offsetToPos(this.tagStruct.parentStart);
            const endPos = editor.offsetToPos(this.tagStruct.parentEnd);
            editor.setSelection(startPos, endPos);
            return true;
        }
        return false;
    }
    public highlightInnerTag(editor: Editor): boolean {
        if (this.tagStruct) {
            const startPos = editor.offsetToPos(this.tagStruct.innerStart);
            const endPos = editor.offsetToPos(this.tagStruct.innerEnd);
            editor.setSelection(startPos, endPos);
            return true;
        }
        return false;
    }

    public acceptDefaultText(editor: Editor): boolean {
        if (this.tagStruct) {
            //slice out the tag delimiters and select only the inner content
            const innerContent = this.tagStruct.content;
            editor.replaceRange(innerContent, editor.offsetToPos(this.tagStruct.parentStart), editor.offsetToPos(this.tagStruct.parentEnd));
            //need to offset the cursor to be around the inner content
            const startPos = editor.offsetToPos(this.tagStruct.innerStart - this.openingDelimiter.length);
            const endPos = editor.offsetToPos(this.tagStruct.innerEnd - this.closingDelimiter.length);
            editor.setSelection(startPos, endPos);
            return true;
        }
        return false;
    }

    public parse(editor: Editor, forward: boolean = true, wrapCheck: boolean = false): boolean {
        this.logger.debug(`Starting parse in ${forward ? 'forward' : 'backward'} direction, wrapCheck: ${wrapCheck}`);

        // Safety check to prevent infinite recursion
        if (wrapCheck && this.tagStruct === null) {
            this.logger.debug('Wrap-around completed, no tags found');
            return false;
        }

        // Get the current cursor position and content
        let initTag: boolean = false;
        const direction = forward ? 1 : -1;
        const cursorStartPos = editor.getCursor('from');
        const cursorEndPos = editor.getCursor('to');
        const content = editor.getValue();
        console.log(`from: ${editor.posToOffset(cursorStartPos)}`);
        console.log(`to: ${editor.posToOffset(cursorEndPos)}`);
        let cursorIndex;
        if (!forward) {
            cursorIndex = editor.posToOffset(cursorStartPos) - 1;
        } else {
            cursorIndex = editor.posToOffset(cursorEndPos);
        }
        console.log(`Cursor position: ${cursorStartPos.line}, ${cursorStartPos.ch} (index ${cursorIndex})`);
        // Now walk forward through the document in an optimized manner to find the next or previous tag (based on the 'forward' parameter)

        //Need to handle wrap around if enabled in settings
        const wrapAround = this.settings.wrapAroundEnabled;
        console.log(`We are starting to walk the document ${forward ? 'forwards' : 'backwards'} with a start index of ${cursorIndex} and wrapAround set to ${wrapAround}`);
        for (let i = cursorIndex; forward ? i < content.length : i >= 0; i += direction) {
            // Check for opening and closing delimiters
            // Handle nested tags by maintaining a stack of opening tags found
            // When a closing tag is found, check if it matches the last opening tag in the stack
            // If it does, we have found a complete tag
            // Logic flow:
            // Forwards Search:
            // First opening tag found -> set initTag true, set parentStart position
            // Nested opening tags found -> push to openingTagPos stack do not modify parent start
            // Any closing tag found -> push to closingTagPos stack and update parentEnd and innerEnd (this will be a running tally and the final tag will give us position)

            //Backwards Search:
            // First closing tag found -> set initTag true, set parentEnd position
            // Nested closing tags found -> push to closingTagPos stack do not modify parent end
            // Any opening tag found -> push to openingTagPos stack and update parentStart and innerStart (this will be a running tally and the final tag will give us position)

            if (content.startsWith(this.openingDelimiter, i)) {
                this.logger.debug(`Found opening delimiter at index ${i} with initTag=${initTag}`);
                console.log(`Found opening delimiter at index ${i} with initTag=${initTag} and direction of ${forward ? 'forward' : 'backward'}`);
                // Depending on direction handle or ignore (ie if we are walking backward we want the first tracked tag to be a closing tag)
                if (!initTag && !forward) { //we are still searching for the first tag and going backward so ignore any opening tags
                    console.log('Ignoring opening tag while searching backward');
                    continue;
                } else if (!initTag && forward) { //we are still searching for the first tag and going forward so we found our opening tag
                    console.log(`Found first opening tag at index ${i} setting initTag to true`);
                    initTag = true;
                    this.tagStruct = {
                        parentStart: i,
                        parentEnd: -1,
                        innerStart: (i + this.openingDelimiter.length),
                        innerEnd: -1,
                        content: '',
                        openingTagPos: [i],
                        closingTagPos: []
                    };
                } else if (initTag) { //we have already found our first tag so we are tracking nested tags
                    console.log(`Found nested opening tag at index ${i}`);
                    this.tagStruct?.openingTagPos.push(i);
                    if (!forward && this.tagStruct) {
                        console.log(`Found nested opening tag at index ${i} updating innerStart and parentStart`);
                        //we are going backwards so update innerStart and parentStart
                        this.tagStruct.innerStart = i + this.openingDelimiter.length;
                        this.tagStruct.parentStart = i;
                    }
                    //now check if we can pop off any closing tags if we have found a matching pair
                    if (this.tagStruct && this.tagStruct.closingTagPos.length > 0) {
                        this.tagStruct.openingTagPos.pop(); //Since we already added the opening tag we need to pop it off
                        this.tagStruct.closingTagPos.pop(); // and pop off the last closing tag since we have matched it
                        // If after popping there are no more nested tags, we have found our complete tag
                        console.log('Checking for complete tag after nested opening tag, current openingTagPos length:', this.tagStruct.openingTagPos.length);
                        console.log('Current closingTagPos length:', this.tagStruct.closingTagPos.length);
                        if (this.tagStruct.openingTagPos.length === 0 && this.tagStruct.closingTagPos.length === 0) {
                            console.log('Complete tag found:', this.tagStruct);
                            this.tagStruct.content = content.substring(this.tagStruct.innerStart, this.tagStruct.innerEnd);
                            return true;
                        }
                    }
                }
            } else if (content.startsWith(this.closingDelimiter, i)) {
                console.log(`Found closing delimiter at index ${i} with initTag=${initTag} and direction of ${forward ? 'forward' : 'backward'}`);
                // Depending on direction handle or ignore (ie if we are walking forward we want the first tracked tag to be an opening tag)
                if (!initTag && forward) { //we are still searching for the first tag and going forward so ignore any closing tags
                    console.log('Ignoring closing tag while searching forward');
                    continue;
                } else if (!initTag && !forward) { //we are still searching for the first tag and going backward so we found our closing tag
                    console.log(`Found init closing tag at index ${i} setting initTag to true`);
                    initTag = true;
                    this.tagStruct = {
                        parentStart: -1,
                        parentEnd: i + this.closingDelimiter.length,
                        innerStart: -1,
                        innerEnd: i,
                        content: '',
                        openingTagPos: [],
                        closingTagPos: [i]
                    };
                } else if (initTag) { //we have already found our first tag so we are tracking nested tags
                    console.log(`Found nested closing tag at index ${i}`);
                    this.tagStruct?.closingTagPos.push(i);
                    if (forward && this.tagStruct) {
                        console.log(`Found nested closing tag at index ${i} updating innerEnd and parentEnd`);
                        //we are going forwards so update innerEnd and parentEnd
                        this.tagStruct.innerEnd = i;
                        this.tagStruct.parentEnd = i + this.closingDelimiter.length;
                    }
                    console.log(`Now check if we can pop off any opening tags if we have found a matching pair`);
                    console.log(`Current openingTagPos length: ${this.tagStruct ? this.tagStruct.openingTagPos.length : `tag not found`}`);
                    if (this.tagStruct && this.tagStruct.openingTagPos.length > 0) {
                        this.tagStruct.closingTagPos.pop(); //Since we already added the closing tag we need to pop it off
                        this.tagStruct.openingTagPos.pop(); // and pop off the last opening tag since we have matched it
                        // If after popping there are no more nested tags, we have found our complete tag
                        console.log('Checking for complete tag after nested opening tag, current openingTagPos length:', this.tagStruct.openingTagPos.length);
                        console.log('Current closingTagPos length:', this.tagStruct.closingTagPos.length);
                        if (this.tagStruct.closingTagPos.length === 0 && this.tagStruct.openingTagPos.length === 0) {
                            console.log('Complete tag found:', this.tagStruct);
                            this.tagStruct.content = content.substring(this.tagStruct.innerStart, this.tagStruct.innerEnd);
                            return true;
                        }
                    }
                }
            }

        }
        // At end of for loop check if we found a tag, if not and wrap around is enabled try again from the other end of the document
        if (this.tagStruct === null && wrapAround && !wrapCheck) {
            console.log('No tag found, attempting wrap-around search');
            if (forward) {
                //Restart from beginning of document
                editor.setCursor(editor.offsetToPos(0));
                return this.parse(editor, true, true); // Pass wrapCheck as true
            } else {
                //Restart from end of document
                editor.setCursor(editor.offsetToPos(editor.getValue().length));
                return this.parse(editor, false, true); // Pass wrapCheck as true
            }
        } else {
            //No tag found reset tagStruct and return false
            this.tagStruct = null;
            return false;
        }
        return false;
    }
}
