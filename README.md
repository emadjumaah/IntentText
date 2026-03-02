# IntentText (.it)

The Semantic Document Language for the Agentic Age.

IntentText is a human-friendly, AI-ready document language that turns plain text into structured data. Unlike Markdown, which focuses on how text *looks*, IntentText focuses on what text *means*.

## What is IntentText?

IntentText combines:

- **Plain-language keywords** (`title:`, `task:`, `section:`)
- **WhatsApp-style formatting** (`*bold*`, `_italic_`, `~strike~`)
- **Pipe metadata** (`| owner: John | due: Friday`)
- **AI-ready JSON output** with semantic structure

Every block parses to a typed JSON object — making documents machine-readable without sacrificing human readability.

## Quick Start

### 1. Create an .it file

```
title: *Project Dalil* Launch Plan
summary: Finalizing deployment in _Doha_.

section: Team Tasks
task: Database migration | owner: Ahmed | due: Sunday
done: Setup repository | time: Monday

---

section: Resources
link: *Documentation* | to: https://dalil.ai/docs
image: Launch Banner | at: banner.png | caption: Project artwork

quote: The best documentation is the kind you actually read.
  | by: Someone Wise
```

### 2. Parse it to JSON & HTML

```bash
# See complete demo
npm run demo

# Interactive live editor (browser)
npm run preview

# CLI: parse to JSON or HTML
node cli.js document.it
node cli.js document.it --html
```

### 3. Use in Your Code

```javascript
const { parseIntentText, renderHTML } = require("@intenttext/core");

const content = fs.readFileSync("document.it", "utf-8");
const document = parseIntentText(content);
const html = renderHTML(document);

console.log(JSON.stringify(document, null, 2));
```

## Output Examples

### JSON Structure

```json
{
  "blocks": [
    {
      "id": "uuid-123",
      "type": "title",
      "content": "Project Dalil Launch Plan",
      "originalContent": "*Project Dalil* Launch Plan",
      "inline": [
        { "type": "bold", "value": "Project Dalil" },
        { "type": "text", "value": " Launch Plan" }
      ]
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

- Semantic HTML structure
- Interactive task checkboxes
- Styled tables and lists
- Formatted text (bold, italic, strikethrough, code)
- Responsive design
- RTL/LTR support

## Syntax Reference

### Document Structure

| Keyword | Syntax | Example |
| --- | --- | --- |
| Title | `title: Text` | `title: *My Document*` |
| Summary | `summary: Text` | `summary: Project overview` |
| Section | `section: Text` | `section: Action Items` |
| Sub-section | `sub: Text` | `sub: Details` |
| Divider | `---` | `---` |

### Content Blocks

| Keyword | Syntax | Example |
| --- | --- | --- |
| Note / paragraph | `note: Text` | `note: Remember to backup` |
| Task | `task: Text \| owner: X \| due: Y` | `task: Write docs \| owner: John \| due: Friday` |
| Done | `done: Text \| time: X` | `done: Setup repo \| time: Monday` |
| Ask | `ask: Text` | `ask: Who has the access key?` |
| Quote | `quote: Text \| by: Author` | `quote: Be concise. \| by: Strunk` |

### Callouts

| Keyword | Syntax |
| --- | --- |
| Info | `info: Text` |
| Warning | `warning: Text` |
| Tip | `tip: Text` |
| Success | `success: Text` |

### Data & Media

| Keyword | Syntax | Example |
| --- | --- | --- |
| Table (preferred) | `\| Col1 \| Col2 \|` | `\| Name \| Role \|` then `\| Ahmed \| Lead \|` |
| Table (keyword) | `headers:` + `row:` | `headers: Name \| Role` then `row: Ahmed \| Lead` |
| Image | `image: Alt \| at: path \| caption: X` | `image: Logo \| at: logo.png` |
| Link | `link: Text \| to: url` | `link: Docs \| to: https://docs.com` |
| Ref | `ref: Text \| to: target` | `ref: See section 2 \| to: #s2` |

### Lists

| Type | Syntax | Example |
| --- | --- | --- |
| Unordered | `- Item` or `* Item` | `- First item` |
| Ordered | `1. Item` | `1. First step` |

### Code

````
```
const x = 1;
const y = 2;
```
````

Or with the keyword form (less preferred):

```
code:
const x = 1;
end:
```

### Inline Formatting

| Style | Syntax | Example |
| --- | --- | --- |
| Bold | `*text*` | `*important*` |
| Italic | `_text_` | `_emphasized_` |
| Strikethrough | `~text~` | `~deleted~` |
| Inline code | `` `code` `` | `` `console.log()` `` |
| Link | `[label](url)` | `[Docs](https://docs.com)` |

## Project Structure

```
IntentText/
├── packages/core/           # Main parser library
│   ├── src/
│   │   ├── types.ts        # IntentBlock interfaces
│   │   ├── parser.ts       # Core parsing logic
│   │   ├── renderer.ts     # HTML rendering engine
│   │   ├── browser.ts      # Browser entry point
│   │   └── index.ts        # Public API (Node.js)
│   ├── tests/              # 143 tests across 11 files
│   ├── examples/           # Sample .it files
│   └── dist/               # Compiled TypeScript
├── vscode-extension/        # VS Code extension (syntax, preview)
├── docs/                   # Specification
├── demo.js                 # Demo script
├── cli.js                  # Command line tool
├── preview.html            # Interactive live editor
├── intenttext.browser.js   # Pre-built browser bundle
└── README.md
```

## Development

### Setup & Build

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Build browser bundle
npm run browser:build

# Run all tests (143/143 passing)
npm run test

# See demo output
npm run demo
```

### Available Scripts

| Script | Description |
| --- | --- |
| `npm run build` | Build TypeScript library |
| `npm run browser:build` | Build browser bundle |
| `npm run test` | Run all unit tests |
| `npm run demo` | Show complete demo |
| `npm run preview` | Open interactive editor |

### Testing

```bash
# Run test suite
cd packages/core
npm test
```

## Interactive Demo

Open `preview.html` in your browser for a live editor with real-time preview. It uses the actual parser — no mocks.

Or use the VS Code extension for live preview inside your editor (`Cmd+Shift+V` / `Ctrl+Shift+V`).

## Browser Integration

```html
<script src="intenttext.browser.js"></script>
<script>
  const { parseIntentText, renderHTML } = IntentText;

  const doc = parseIntentText("title: Hello\nnote: World");
  document.getElementById("preview").innerHTML = renderHTML(doc);
</script>
```

## Node.js / npm

```javascript
const { parseIntentText, renderHTML } = require("@intenttext/core");

const content = fs.readFileSync("meeting.it", "utf-8");
const doc = parseIntentText(content);

// Access specific blocks
const tasks = doc.blocks.filter(b => b.type === "task");
const html = renderHTML(doc);
```

## Specification

See `docs/SPEC.md` for the full IntentText specification including design philosophy, advanced features, and extension API.

## License

MIT
