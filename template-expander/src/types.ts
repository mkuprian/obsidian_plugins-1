export interface SnippetTemplate {
    key: string;
    template: string;
    description?: string;
}

export interface SnippetSettings {
    enableSpaceTrigger: boolean;
    enableTabTrigger: boolean;
    enableEnterTrigger: boolean;
    jsonFilePath: string;
    parseInlineSnippets: boolean;
    caseSensitive: boolean;
    minKeyLength: number;
    expandDelay: number; // Milliseconds delay before checking for expansion
}

export const DEFAULT_SETTINGS: SnippetSettings = {
    enableSpaceTrigger: true,
    enableTabTrigger: true,
    enableEnterTrigger: true,
    jsonFilePath: 'snippets.json',
    parseInlineSnippets: true,
    caseSensitive: false,
    minKeyLength: 2,
    expandDelay: 0
};

export interface TriggerKeys {
    Space: string;
    Tab: string;
    Enter: string;
}

export const TRIGGER_KEYS: TriggerKeys = {
    Space: ' ',
    Tab: 'Tab',
    Enter: 'Enter'
};
