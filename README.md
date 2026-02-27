# IntentText (.it) - v1.0 Parser & HTML Renderer

The Semantic Document Language for the Agentic Age.

IntentText is a human-friendly, AI-ready document language that turns plain text into structured data. Unlike Markdown, which focuses on how text looks, IntentText focuses on what text means.

## 🎯 What is IntentText?

IntentText combines:

- **Plain-language keywords** (`title:`, `task:`, `section:`)
- **WhatsApp-style formatting** (`*bold*`, `_italic_`, `~strike~`)
- **Pipe metadata** (`| owner: John | due: Friday`)
- **AI-ready JSON output** with semantic structure

## 🚀 Quick Start

### 1. Create an .it file

```it
title: *Project Dalil* Launch Plan
summary: Finalizing deployment in _Doha_.

section: Team Tasks
task: Database migration | owner: Ahmed | due: Sunday
done: Setup repository | time: Monday

section: Resources
link: *Documentation* | to: https://dalil.ai/docs
image: Launch Banner | at: banner.png | caption: Project artwork
```

### 2. Parse it to JSON & HTML

```bash
# Using the CLI tools
npm run demo                    # See complete demo
npm run parse:html             # Parse sample to HTML
npm run parse:output           # Generate HTML file

# Interactive preview
open preview.html              # Live editor in browser
```

### 3. Use in Your Code

```javascript
const { parseIntentText, renderHTML } = require("./packages/core/dist");

const content = fs.readFileSync("document.it", "utf-8");
const document = parseIntentText(content);
const html = renderHTML(document);

console.log(JSON.stringify(document, null, 2));
```

## 📊 Output Examples

### JSON Structure

```json
{
  "blocks": [
    {
      "id": "uuid-123",
      "type": "title",
      "content": "Project Dalil Launch Plan",
      "originalContent": "*Project Dalil* Launch Plan",
      "marks": [{ "type": "bold", "start": 0, "end": 12 }]
    },
    {
      "id": "uuid-456",
      "type": "task",
      "content": "Database migration",
      "properties": {
        "owner": "Ahmed",
        "due": "Sunday"
      }
    }
  ],
  "metadata": {
    "title": "Project Dalil Launch Plan",
    "summary": "Finalizing deployment in Doha.",
    "language": "ltr"
  }
}
```

### HTML Output

Beautifully rendered document with:

- ✅ Semantic HTML structure
- ✅ Interactive task checkboxes
- ✅ Styled tables and lists
- ✅ Formatted text (bold, italic, strikethrough, code)
- ✅ Responsive design
- ✅ RTL/LTR support

## 📚 Complete Syntax Reference

| Feature                | Syntax               | Example                     |
| ---------------------- | -------------------- | --------------------------- | ----------------- | ----------------- | -------------------- | ---------------------- |
| **Document Structure** |                      |                             |
| Title                  | `title: Text`        | `title: *My Document*`      |
| Summary                | `summary: Text`      | `summary: Project overview` |
| Section                | `section: Text`      | `section: Action Items`     |
| **Content Blocks**     |                      |                             |
| Task                   | `task: Text          | owner: X                    | due: Y`           | `task: Write docs | owner: John          | due: Friday`           |
| Done                   | `done: Text          | time: X`                    | `done: Setup repo | time: Monday`     |
| Question               | `question: Text`     | `question: Who has access?` |
| Note                   | `note: Text`         | `note: Remember to backup`  |
| **Data & Media**       |                      |                             |
| Headers                | `headers: Col1       | Col2                        | Col3`             | `headers: Name    | Age                  | City`                  |
| Row                    | `row: Val1           | Val2                        | Val3`             | `row: John        | 30                   | Dubai`                 |
| Image                  | `image: Text         | at: path                    | caption: X`       | `image: Logo      | at: logo.png         | caption: Company logo` |
| Link                   | `link: Text          | to: url                     | title: X`         | `link: Docs       | to: https://docs.com | title: Documentation`  |
| **Code**               |                      |                             |
| Code Block             | `code:` ... `end:`   | Multi-line code blocks      |
| **Lists**              |                      |                             |
| Unordered              | `- Item` or `* Item` | `- First item`              |
| Ordered                | `1. Item`            | `1. First step`             |
| **Formatting**         |                      |                             |
| Bold                   | `*text*`             | `*important*`               |
| Italic                 | `_text_`             | `_emphasized_`              |
| Strikethrough          | `~text~`             | `~deleted~`                 |
| Inline Code            | `` `code` ``         | `` `console.log()` ``       |
| **Structure**          |                      |                             |
| Divider                | `divider: Text`      | `divider: End of section`   |

## 🏗️ Project Structure

```
IntentText/
├── packages/core/           # Main parser library
│   ├── src/
│   │   ├── types.ts        # IntentBlock interfaces
│   │   ├── parser.ts       # Core parsing logic
│   │   ├── renderer.ts     # HTML rendering engine
│   │   └── index.ts        # Public API
│   ├── tests/              # 18 comprehensive tests
│   ├── examples/           # Sample .it files
│   └── dist/               # Compiled TypeScript
├── info/                   # Specification docs
├── demo.js                 # Demo script
├── cli.js                  # Command line tool
├── preview.html            # Interactive live editor
└── README.md              # This file
```

## 🛠️ Development

### Setup & Build

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run all tests (18/18 passing)
npm run test

# See demo output
npm run demo
```

### Available Scripts

| Script                 | Description              |
| ---------------------- | ------------------------ |
| `npm run build`        | Build TypeScript library |
| `npm run test`         | Run all unit tests       |
| `npm run demo`         | Show complete demo       |
| `npm run preview`      | Open interactive editor  |
| `npm run parse`        | CLI tool usage           |
| `npm run parse:html`   | Parse sample to HTML     |
| `npm run parse:output` | Generate HTML file       |

### Testing

```bash
# Run test suite (18 tests, 100% passing)
cd packages/core
npm test

# Test with custom content
node cli.js your-file.it --html
```

## 🌐 Interactive Demo

Open `preview.html` in your browser for:

- **Live IntentText editor** (left panel)
- **Real-time HTML preview** (right panel)
- **Instant rendering** as you type
- **Test all features** interactively

## 📖 Specification

See `info/SPEC.md` for the complete IntentText v1.0 specification including:

- Design philosophy
- Complete keyword reference
- Advanced features
- Internationalization support

## ✨ Features Implemented

✅ **Full v1.0 Spec Compliance**

- All 15+ keywords supported
- Pipe metadata parsing
- Inline formatting (bold, italic, strikethrough, code)
- Tables, lists, code blocks
- RTL/Arabic language detection

✅ **Beautiful HTML Output**

- Semantic HTML structure
- Interactive task checkboxes
- Styled components with CSS
- Responsive design
- RTL/LTR direction support

✅ **Developer Friendly**

- TypeScript with full type definitions
- 100% test coverage (18/18 tests passing)
- CLI tools and interactive demo
- Clean API design

✅ **Production Ready**

- Robust error handling
- Performance optimized
- Monorepo structure
- Easy integration

## 🚀 Usage Examples

### Command Line

```bash
# Parse to JSON
node cli.js document.it

# Generate HTML
node cli.js document.it --html

# Save to file
node cli.js document.it --output
```

### Node.js Application

```javascript
const { parseIntentText, renderHTML } = require("@intenttext/core");

// Parse IntentText file
const content = fs.readFileSync("meeting.it", "utf-8");
const document = parseIntentText(content);

// Access specific blocks
const tasks = document.blocks.filter((b) => b.type === "task");
const sections = document.blocks.filter((b) => b.type === "section");

// Generate HTML for web display
const html = renderHTML(document);
fs.writeFileSync("meeting.html", html);
```

### Browser Integration

```html
<script src="node_modules/@intenttext/core/dist/index.js"></script>
<script>
  const { parseIntentText, renderHTML } = IntentText;
  // Use in browser...
</script>
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Add tests for new functionality
4. Ensure all tests pass: `npm test`
5. Submit a pull request

### Development Guidelines

- Follow TypeScript best practices
- Add comprehensive tests
- Update documentation
- Maintain 100% test coverage

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Links

- **Specification**: `info/SPEC.md`
- **Live Demo**: Open `preview.html`
- **Package**: `@intenttext/core`
- **Issues**: GitHub Issues

---

**IntentText v1.0** - Making semantic documents accessible to everyone, readable by AI. 🚀
