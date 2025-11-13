# Obsidian Plugins Collection

A collection of powerful Obsidian plugins designed to enhance text navigation, manipulation, and automation within your notes. This repository contains two main plugins that streamline common text editing workflows in Obsidian.

## 🔧 Plugins Overview

### 1. **Hotkey Tag Navigator** 
Advanced navigation and manipulation for custom-delimited tags with nested support and keyboard-driven workflows.

### 2. **Snippet Expander**
Intelligent text snippet expansion with customizable triggers for rapid content creation and templating.

## 📦 Installation

### Prerequisites
- **Obsidian**: Version 1.4.0 or higher
- **Node.js**: Version 16+ (for development)
- **TypeScript**: Version 4.4+ (for development)

### Manual Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/mkuprian/obsidian_plugins.git
   cd obsidian_plugins
   ```

2. For each plugin, navigate to its directory and build:
   ```bash
   # Hotkey Tag Navigator
   cd hotkey-tag-navigation
   npm install
   npm run build
   
   # Snippet Expander
   cd ../template-expander
   npm install
   npm run build
   ```

3. Copy the built files to your Obsidian plugins folder:
   ```
   .obsidian/plugins/hotkey-tag-navigator/
   .obsidian/plugins/snippet-expander/
   ```

## 🏷️ Hotkey Tag Navigator

Navigate and manipulate nested user-defined tags with advanced keyboard shortcuts and selection capabilities.

### ✨ Features
- **Custom Delimiters**: Define your own tag delimiters (default: `|<` and `>|`)
- **Nested Tag Support**: Handle complex nested tag structures
- **Keyboard Navigation**: Jump between tags with configurable hotkeys
- **Wrap-around Navigation**: Seamlessly cycle from last to first tag
- **Smart Selection**: Select tag content with or without delimiters
- **Tag Removal**: Remove tags while preserving inner content.
- **Debug Logging**: Optional console and file logging for troubleshooting

### 🎯 Use Cases
- **Template Navigation**: Move through placeholders in document templates
- **Content Highlighting**: Mark and navigate important sections
- **Form Fields**: Create fillable forms with navigable fields
- **Code Snippets**: Navigate through variable placeholders
- **Documentation**: Mark sections for review or completion

### ⌨️ Default Hotkeys
- **Next Tag**: `Cmd/Ctrl + Shift + →`
- **Previous Tag**: `Cmd/Ctrl + Shift + ←` 
- **Select Inner Content**: `Cmd/Ctrl + Shift + I` 
- **Remove Tag**: `Cmd/Ctrl + Shift + Backspace` 

### 📝 Usage Example
```markdown
I need to buy |<groceries>| and visit the |<bank>|.
Meeting scheduled for |<date>| at |<time>| in |<location>|.
```

Navigate through tags using hotkeys to quickly fill in placeholders or review tagged content.

### ⚙️ Configuration
Access settings through **Settings > Community Plugins > Hotkey Tag Navigator**:
- Custom opening/closing delimiters
- Wrap-around navigation toggle
- Default inner content selection
- Debug information display

### 🔒 Limitations
- Only works in Markdown editing mode
- Requires manual tag delimiter setup
- Performance may degrade with extremely large documents (>10MB)
- Nested tags must use the same delimiter pair

## 📄 Snippet Expander

Automatically expand predefined text snippets with customizable triggers for rapid content creation.

### ✨ Features
- **Multiple Triggers**: Space, Tab, or Enter key expansion
- **JSON Configuration**: External snippet definition file
- **Inline Snippets**: Define snippets directly in documents
- **Case Sensitivity Options**: Flexible matching behavior
- **Debounced Expansion**: Configurable delay to prevent accidental triggers
- **Live Reload**: Automatic snippet updates when files change
- **Manual Override**: Force expansion with command palette

### 🎯 Use Cases
- **Email Templates**: Quick insertion of common responses
- **Code Boilerplate**: Instant code structure generation
- **Meeting Notes**: Standardized meeting templates
- **Contact Information**: Rapid contact detail insertion
- **Legal Disclaimers**: Consistent legal text insertion
- **Academic Citations**: Quick citation format insertion


### ⚙️ Configuration
Create a `snippets.json` file in your vault root:
```json
{
    "snippets": [
        {
            "key": "addr",
            "template": "123 Main St\nAnytown, ST 12345",
            "description": "My address"
        },
        {
            "key": "sig",
            "template": "Best regards,\nJohn Doe\njohn@example.com",
            "description": "Email signature"
        }
    ]
}
```

### 🔧 Settings
- **Trigger Keys**: Enable/disable Space, Tab, Enter triggers
- **File Path**: Custom location for snippets.json
- **Inline Parsing**: Parse snippets from current document
- **Case Sensitivity**: Match exactly or ignore case
- **Minimum Key Length**: Prevent short accidental matches
- **Expansion Delay**: Milliseconds before checking for expansion

### 🔒 Limitations
- Requires JSON file for external snippets
- Performance impact with large snippet collections (>1000 snippets)
- Inline snippet parsing may slow down large documents
- No snippet variables/interpolation (planned feature)

## 🛠️ Development

### Building from Source
```bash
# Install dependencies
npm install

# Development build with watch
npm run dev

# Production build
npm run build
```

### Dependencies
- **obsidian**: Core Obsidian API (v1.10.2+)
- **typescript**: Type checking and compilation (v4.4+)
- **esbuild**: Fast bundling and minification
- **@types/node**: Node.js type definitions

### Project Structure
```
obsidian_plugins/
├── hotkey-tag-navigation/
│   ├── src/
│   │   ├── main.ts       # Plugin entry point
│   │   ├── parser.ts     # Tag parsing logic
│   │   ├── settings.ts   # Configuration UI
│   │   └── logger.ts     # Debug logging
│   └── manifest.json     # Plugin metadata
├── template-expander/
│   ├── src/
│   │   ├── main.ts           # Plugin entry point
│   │   ├── snippetManager.ts # Snippet handling
│   │   ├── eventHandler.ts   # Keyboard events
│   │   └── types.ts          # Type definitions
│   └── manifest.json         # Plugin metadata
└── README.md
```

## 📋 System Requirements

### Runtime Requirements
- **Obsidian**: v1.4.0+
- **Operating System**: Windows, macOS, or Linux
- **Memory**: 100MB+ available RAM
- **Storage**: 10MB+ available space

### Development Requirements
- **Node.js**: v16.0.0+
- **npm**: v8.0.0+
- **TypeScript**: v4.4.0+
- **Git**: v2.20.0+

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit with descriptive messages: `git commit -m "Add feature description"`
5. Push to your fork: `git push origin feature-name`
6. Open a Pull Request with detailed description

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🐛 Issues & Support

- **Bug Reports**: Use GitHub Issues with detailed reproduction steps
- **Feature Requests**: Open GitHub Issues with clear use case descriptions
- **Questions**: Check existing issues or open new discussions

## 🔗 Related Resources

- [Obsidian Plugin Development Guide](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [Obsidian API Documentation](https://docs.obsidian.md/Reference/TypeScript+API)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

---

**Created by**: [mkuprian](https://github.com/mkuprian)  
**Last Updated**: November 2025
