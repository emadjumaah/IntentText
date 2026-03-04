# IntentText (.it)

**The Structured Interchange Format Between AI Agents and Humans.**

IntentText is a lightweight document language that is simultaneously readable by humans and deterministically parseable by AI agents. It bridges the gap between natural prose and machine-executable workflows — no YAML boilerplate, no JSON syntax noise, no ambiguity.

## What is IntentText?

IntentText combines:

- **Plain-language keywords** (`title:`, `task:`, `step:`, `decision:`)
- **WhatsApp-style formatting** (`*bold*`, `_italic_`, `~strike~`)
- **Pipe metadata** (`| owner: John | due: Friday | tool: email.send`)
- **Agentic workflow blocks** (`step:`, `decision:`, `trigger:`, `audit:`)
- **Deterministic JSON output** with semantic structure

Every block parses to a typed JSON object — making documents both human-readable plans and agent-executable specifications.

### The Problem

- **Plain text / Markdown** is great for humans, but AI agents have to _guess_ at structure.
- **JSON / YAML** is great for machines, but humans can't write or review it naturally.
- **No existing format** is designed to be both the _human-authored plan_ and the _agent-executable specification_ at the same time.

IntentText solves this.

## Quick Start

### 1. Create an .it file

```
// Comments start with // and are ignored by the parser.

title: *Project Dalil* Launch Plan
summary: Finalizing deployment in _Doha_.

section: Team Tasks
task: Database migration | owner: Ahmed | due: Sunday
done: Setup repository | time: Monday

---

section: Resources
link: *Documentation* | to: https://dalil.ai/docs
image: Launch Banner | at: banner.png | caption: Project artwork

quote: The best documentation is the kind you actually read. | by: Someone Wise
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

### 2.1. Web Converter Tool

You can also use our online converter tool to convert IntentText to JSON and HTML:

[![Web to IntentText Converter](https://res.cloudinary.com/drceui2nh/image/upload/v1772457511/webtoit_ctghye.png)](https://toit-psi.vercel.app/)

Visit [https://toit-psi.vercel.app/](https://toit-psi.vercel.app/) to convert your IntentText files online.

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
  "version": "1.4",
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

### Agentic Workflow JSON (v2)

```
title: User Onboarding Flow
agent: onboard-agent | model: claude-sonnet-4
context: userId = "u_123" | plan = "pro"

section: Verification
step: Verify email | tool: email.verify | input: userId | output: emailStatus
step: Create workspace | tool: ws.create | depends: step-1
decision: Check plan | if: plan == "pro" | then: step-3 | else: step-4
step: Enable pro features | id: step-3 | tool: features.enable
step: Send welcome email | id: step-4 | tool: email.send

checkpoint: onboarding-complete
audit: Workflow initialized | by: {{agent}} | at: {{timestamp}}
```

Produces a v2 document with:

```json
{
  "version": "2.0",
  "metadata": {
    "title": "User Onboarding Flow",
    "agent": "onboard-agent",
    "model": "claude-sonnet-4",
    "context": { "userId": "u_123", "plan": "pro" }
  },
  "blocks": [
    {
      "id": "step-1",
      "type": "step",
      "content": "Verify email",
      "properties": {
        "id": "step-1",
        "tool": "email.verify",
        "input": "userId",
        "output": "emailStatus",
        "status": "pending"
      }
    }
  ]
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

| Keyword             | Syntax             | Example                     |
| ------------------- | ------------------ | --------------------------- |
| Title               | `title: Text`      | `title: *My Document*`      |
| Summary             | `summary: Text`    | `summary: Project overview` |
| Section             | `section: Text`    | `section: Action Items`     |
| Sub-section         | `sub: Text`        | `sub: Details`              |
| Sub-section (alias) | `subsection: Text` | `subsection: Details`       |
| Divider             | `---`              | `---`                       |
| Comment             | `// Text`          | `// ignored by parser`      |

### Content Blocks

| Keyword               | Syntax                             | Example                                          |
| --------------------- | ---------------------------------- | ------------------------------------------------ |
| Note / paragraph      | `note: Text`                       | `note: Remember to backup`                       |
| Task                  | `task: Text \| owner: X \| due: Y` | `task: Write docs \| owner: John \| due: Friday` |
| Done (completed task) | `done: Text \| time: X`            | `done: Setup repo \| time: Monday`               |
| Ask                   | `ask: Text`                        | `ask: Who has the access key?`                   |
| Quote                 | `quote: Text \| by: Author`        | `quote: Be concise. \| by: Strunk`               |

> **Note on `done:`:** In JSON output, `done:` normalizes to `{type: "task", status: "done"}`. Both open and completed tasks share the same type — the `status` property distinguishes them. This makes filtering straightforward: `blocks.filter(b => b.type === "task" && b.properties?.status === "done")`.

### Callouts

| Keyword | Syntax          |
| ------- | --------------- |
| Info    | `info: Text`    |
| Warning | `warning: Text` |
| Tip     | `tip: Text`     |
| Success | `success: Text` |

### Data & Media

| Keyword           | Syntax                                 | Example                                           |
| ----------------- | -------------------------------------- | ------------------------------------------------- |
| Table (preferred) | `\| Col1 \| Col2 \|`                   | `\| Name \| Role \|` then `\| Ahmed \| Lead \|`   |
| Table (keyword)   | `headers:` + `row:`                    | `headers: Name \| Role` then `row: Ahmed \| Lead` |
| Image             | `image: Alt \| at: path \| caption: X` | `image: Logo \| at: logo.png`                     |
| Link              | `link: Text \| to: url`                | `link: Docs \| to: https://docs.com`              |
| Ref               | `ref: Text \| to: target`              | `ref: See section 2 \| to: #s2`                   |

### Lists

| Type      | Syntax               | Example         |
| --------- | -------------------- | --------------- |
| Unordered | `- Item` or `* Item` | `- First item`  |
| Ordered   | `1. Item`            | `1. First step` |

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

| Style         | Syntax         | Example                    |
| ------------- | -------------- | -------------------------- |
| Bold          | `*text*`       | `*important*`              |
| Italic        | `_text_`       | `_emphasized_`             |
| Strikethrough | `~text~`       | `~deleted~`                |
| Inline code   | `` `code` ``   | `` `console.log()` ``      |
| Link          | `[label](url)` | `[Docs](https://docs.com)` |

### Agentic Workflow Blocks (v2)

| Keyword       | Purpose                      | Example                                                           |
| ------------- | ---------------------------- | ----------------------------------------------------------------- |
| `step:`       | Workflow step with tool call | `step: Send email \| tool: email.send \| input: userId`           |
| `decision:`   | Conditional branch           | `decision: Check \| if: x == "y" \| then: step-2 \| else: step-3` |
| `trigger:`    | What starts the workflow     | `trigger: webhook \| event: user.signup`                          |
| `loop:`       | Iterate over a collection    | `loop: Process \| over: items \| do: step-3`                      |
| `checkpoint:` | Resume point                 | `checkpoint: post-setup`                                          |
| `audit:`      | Immutable execution log      | `audit: Done \| by: {{agent}} \| at: {{timestamp}}`               |
| `error:`      | Error handler                | `error: Fail \| fallback: step-2 \| notify: admin`                |
| `context:`    | Scoped variables             | `context: userId = "u_123" \| plan = "pro"`                       |
| `progress:`   | Progress indicator           | `progress: 3/5 tasks completed`                                   |
| `import:`     | Import another `.it` file    | `import: ./auth.it \| as: auth`                                   |
| `export:`     | Export data                  | `export: userRecord \| format: json`                              |
| `schema:`     | Define custom block type     | `schema: custom \| extends: step`                                 |

**Step auto-IDs:** Steps without explicit `| id:` get sequential IDs (`step-1`, `step-2`, ...). Status defaults to `pending`.

**Document metadata:** `agent:` and `model:` lines before any section populate document-level metadata.

## Project Structure

```
IntentText/
├── packages/core/           # Main parser library (@intenttext/core)
│   ├── src/
│   │   ├── types.ts        # IntentBlock interfaces (v1 + v2 agentic)
│   │   ├── parser.ts       # Core parsing logic
│   │   ├── renderer.ts     # HTML rendering engine
│   │   ├── browser.ts      # Browser entry point
│   │   └── index.ts        # Public API (Node.js)
│   ├── tests/              # 187 tests across 9 files
│   ├── examples/           # Sample .it files
│   └── dist/               # Compiled TypeScript
├── docs/                   # Specification (SPEC.md)
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

# Run all tests (187/187 passing)
npm run test

# See demo output
npm run demo
```

### Available Scripts

| Script                  | Description              |
| ----------------------- | ------------------------ |
| `npm run build`         | Build TypeScript library |
| `npm run browser:build` | Build browser bundle     |
| `npm run test`          | Run all unit tests       |
| `npm run demo`          | Show complete demo       |
| `npm run preview`       | Open interactive editor  |

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

console.log(doc.version); // "1.4" or "2.0" for agentic docs

// Filter open tasks
const openTasks = doc.blocks.filter(
  (b) => b.type === "task" && b.properties?.status !== "done",
);

// Filter pending workflow steps (v2)
const pendingSteps = doc.blocks.filter(
  (b) => b.type === "step" && b.properties?.status === "pending",
);

// Access agentic metadata (v2)
console.log(doc.metadata?.agent); // "onboard-agent"
console.log(doc.metadata?.context); // { userId: "u_123" }

const html = renderHTML(doc);
```

## Specification

See `docs/SPEC.md` for the full IntentText specification including design philosophy, advanced features, and extension API.

## License

MIT
