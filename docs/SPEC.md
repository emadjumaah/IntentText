# IntentText (`.it`) v1.0 — Official Specification

> **Status:** Stable · **Version:** 1.0 · **Source of Truth**

IntentText is a human-friendly, AI-semantic document language. It combines plain-language keywords, WhatsApp-style inline formatting, and agentic metadata — so that any writer can produce machine-readable documents without learning technical markup.

---

## 1. Design Philosophy

| Principle                         | Description                                                                                                |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Human-first**                   | Every line reads naturally in plain text.                                                                  |
| **Semantic, not structural**      | Keywords declare _intent_, not just appearance.                                                            |
| **AI-ready**                      | Every block is a typed, parseable data unit.                                                               |
| **Pipe-extensible**               | Metadata stays on the same line via `\|` — no extra files.                                                 |
| **Internationalization-friendly** | UTF-8, line-by-line parsing, no confusing symbols → RTL/Arabic and accented languages are fully supported. |

---

## 2. File Format

- Extension: `.it`
- Encoding: UTF-8
- Line endings: LF or CRLF (both supported)

---

## 3. Keyword Reference

Every semantic block follows this pattern:

```
[Keyword]: [Content] | [Property]: [Value] | [Property]: [Value]
```

### 3.1 Document Identity

| Keyword    | Description                        | Example                                     |
| ---------- | ---------------------------------- | ------------------------------------------- |
| `title:`   | Unique document identifier / title | `title: *Project Dalil* Launch Plan`        |
| `summary:` | Short description of the document  | `summary: Finalizing deployment in _Doha_.` |

### 3.2 Structure

| Keyword    | Description                               | Example                                 |
| ---------- | ----------------------------------------- | --------------------------------------- |
| `section:` | Opens a new named context / major heading | `section: Logistics & Equipment`        |
| `sub:`     | Sub-section within a section              | `sub: Technical Details`                |
| `divider:` | Visual separator; optional label          | `divider:` or `divider: End of Section` |

> **Note on deeper hierarchy:** `sub:` covers H3-level nesting. If a document requires H4+, use nested `sub:` blocks contextually. A `sub2:` keyword is reserved for v1.1 to keep v1.0 clean.

### 3.3 Data & Tables

| Keyword    | Description                                  | Example                                    |
| ---------- | -------------------------------------------- | ------------------------------------------ |
| `headers:` | Defines column names for a table             | `headers: Item \| Location \| Status`      |
| `row:`     | A single data row (maps to headers in order) | `row: Dell Server \| Rack 04 \| Delivered` |
| `note:`    | A standalone, discrete fact                  | `note: Witness is 40 yrs old`              |

### 3.4 Tasks & Actions

| Keyword     | Description                                  | Example                                                   |
| ----------- | -------------------------------------------- | --------------------------------------------------------- |
| `task:`     | An actionable, trackable to-do               | `task: Database migration \| owner: Ahmed \| due: Sunday` |
| `done:`     | A completed task with a timestamp            | `done: Secure the domain name \| time: 09:00 AM`          |
| `question:` | An open question — AI can flag as unanswered | `question: Who has the _Master Key_?`                     |

**Inline task shorthand:** A `task:` keyword may also appear inside a list line for hybrid bullet/action items:

```
- task: Update README | owner: Sarah | due: Monday
```

The parser treats this identically to a standalone `task:` block, but preserves its position within the surrounding list context.

### 3.5 Media & Links

| Keyword  | Description        | Example                                                                 |
| -------- | ------------------ | ----------------------------------------------------------------------- |
| `image:` | An image reference | `image: Team Photo \| at: assets/photo.png \| caption: Team Day`        |
| `link:`  | A hyperlink        | `link: Google Search \| to: https://google.com \| title: Search Engine` |

Both `image:` and `link:` support optional accessibility properties (`caption:`, `title:`) via the pipe syntax.

### 3.7 References (Cross-Document Links)

| Keyword | Description              | Example                                        |
| ------- | ------------------------ | ---------------------------------------------- |
| `ref:`  | Cross-document reference | `ref: Related Doc \| to: doc.it#section:Tasks` |

The `ref:` keyword creates semantic connections between documents. Unlike `link:` which is for external URLs, `ref:` is specifically for internal/cross-document navigation.

**Properties:**

- `to:` — Target document path with optional anchor (e.g., `doc.it#section:Name`)

**Rendering:** References render as italicized links to distinguish them from regular external links.

### 3.6 Code

| Keyword | Description                              | Example   |
| ------- | ---------------------------------------- | --------- |
| `code:` | A code block (single-line or multi-line) | See below |
| `end:`  | Closes a multi-line `code:` block        | `end:`    |

**Single-line code** — content follows the keyword on the same line:

```
code: console.log("Hello")
```

**Multi-line code** — use an empty `code:` opener, a fenced block, then `end:` to close:

````
code:
```
SELECT *
FROM users
WHERE active = true
```
end:
````

This makes multi-line blocks unambiguous for parsers without requiring backtick counting.

**Inline code** within any block — use triple backticks:

````
note: Footage saved at ```/logs/cam1```.
````

---

## 4. List Syntax

Lists use familiar WhatsApp / Markdown syntax — no new keywords required.

```
- Unordered list item
- Another item

1. First ordered step
2. Second ordered step
```

- Lines starting with `-` or `*` → **list-items** (unordered)
- Lines starting with `1.` / `2.` etc. → **step-items** (ordered; AI treats sequence as critical)

---

## 5. Inline Formatting

Inline marks follow WhatsApp conventions and apply inside any block content.

| Syntax         | Result            | Notes                        |
| -------------- | ----------------- | ---------------------------- |
| `*text*`       | **Bold**          | WhatsApp standard            |
| `_text_`       | _Italic_          | WhatsApp standard            |
| `~text~`       | ~~Strikethrough~~ | WhatsApp standard            |
| ` ```text``` ` | `Code`            | Inline code / path / literal |

### 5.1 Inline Mark Constraints (v1.0)

- Marks are processed **within a single line** (they do not span lines).
- Marks are **non-nesting** for v1.0. If nested or overlapping marks occur, parsers should treat the ambiguous region as plain text.
- Unmatched delimiters are treated as literal characters.

---

## 5.2 Escaping

To keep parsing deterministic while allowing literal delimiter characters, IntentText supports escaping.

- `\|` represents a literal pipe character `|`.
- `\\` represents a literal backslash `\`.

Escaping applies inside:

- Block content
- Pipe metadata segments
- Table cells (`headers:` / `row:`)

Escaping is evaluated **before** semantic splitting (pipe metadata, table cells), so escaped pipes do not create new segments.

## 6. Pipe Metadata

The `|` symbol appends structured metadata to any keyword line without breaking readability.

**Pattern:**

```
[Keyword]: [Content] | [Property]: [Value] | [Property]: [Value]
```

**Standard properties:**

| Property   | Used With | Description                      |
| ---------- | --------- | -------------------------------- |
| `owner:`   | `task:`   | Person responsible               |
| `due:`     | `task:`   | Deadline                         |
| `time:`    | `done:`   | Completion timestamp             |
| `at:`      | `image:`  | File path or URL to the asset    |
| `caption:` | `image:`  | Accessibility caption / alt text |
| `to:`      | `link:`   | Destination URL                  |
| `title:`   | `link:`   | Accessible link title            |

Properties are open-ended — writers may define custom properties as needed. Parsers must preserve unknown properties without error.

### 6.1 Typed Conventions (Recommended)

IntentText v1.0 treats all property values as strings, but recommends conventions for interoperability:

- `due:` SHOULD use ISO 8601 dates (e.g. `2026-02-27`).
- `time:` SHOULD use 24-hour time (e.g. `09:00`).

Future versions may introduce typed wrappers (reserved syntax examples):

- `due: @date(2026-02-27)`
- `time: @time(09:00)`

Parsers MUST treat these as plain strings unless a higher-level tool explicitly interprets them.

---

## 7. Parsing Rules (For Implementors)

### Rule 1 — Block Detection

Any line matching `[Keyword]:` at the start is a **semantic block**. Parse the keyword, then split the remainder on `|` to extract content and metadata pairs. Keywords are case-insensitive; content is preserved as-is.

### Rule 2 — Symbol Mapping

- Lines starting with `-` or `*` → `list-item` (unordered)
- Lines starting with `- task:` → `list-item` with embedded `task` block
- Lines starting with a digit followed by `.` → `step-item` (ordered)
- Blank lines → ignored / block separator
- All other non-blank, non-keyword lines → `body-text`

### Rule 3 — Inline Processing

After block detection, scan all text values for inline marks (`*`, `_`, `~`, ` ``` `) and convert them to rich-text marks. Inline processing runs _after_ pipe splitting so that marks in both content and property values are handled correctly.

### Rule 4 — Pipe Splitting

Split on `|` (space-pipe-space). The first segment is the primary `content`. Each remaining segment must match `key: value` and is stored as a property. Segments that do not match this pattern are treated as a continuation of content.

Pipe splitting must respect escaping: an escaped pipe `\|` must not be treated as a separator.

### Rule 5 — Multi-line Code Blocks

When a `code:` keyword has no inline content, the parser enters **code-capture mode** and collects all subsequent lines verbatim until it encounters an `end:` keyword on its own line. The captured content is stored as the block's `content`.

### Rule 6 — Scoping and Grouping (v1.0)

- A `section:` (or `sub:`) opens a context; subsequent blocks belong to that context until the next `section:` or `sub:` block.
- `headers:` opens a table; all immediately following `row:` blocks belong to that table.
- A `row:` without a preceding `headers:` is still valid and should be treated as a one-row table.

---

## 8. IntentBlock — Data Structure

Parsers should produce an `IntentBlock` for every detected block. This is ready for JSON serialization, CRM ingestion, or AI agent consumption.

```typescript
interface IntentBlock {
  id: string; // auto-generated UUID or sequential ID
  type: string; // title | section | sub | task | done | question
  // note | table | image | link | code
  // divider | summary | list-item | step-item | body-text
  content: string; // primary text value (inline marks already parsed)
  properties?: Record<string, string | number>; // pipe metadata: owner, due, time, at, to, caption, title, ...
  inline?: Array<
    // canonical inline model (v1.0+)
    | { type: "text"; value: string }
    | { type: "bold"; value: string }
    | { type: "italic"; value: string }
    | { type: "strike"; value: string }
    | { type: "code"; value: string }
  >;
  marks?: Array<{
    // legacy model (offsets may be unreliable)
    type: "bold" | "italic" | "strike" | "code";
    start: number;
    end: number;
  }>;
  children?: IntentBlock[]; // nested blocks (e.g. list-items inside a section)
  table?: {
    // for grouped tables
    headers?: string[];
    rows: string[][];
  };
}
```

## Legacy: `marks`

`marks` is retained for backward compatibility.

The canonical inline representation is `inline: InlineNode[]`.

New implementations MUST emit `inline`.
Renderers SHOULD prefer `inline` when present.

**Example — input:**

```
task: Database migration | owner: Ahmed | due: Sunday
```

**Example — output:**

```json
{
  "id": "blk_001",
  "type": "task",
  "content": "Database migration",
  "properties": {
    "owner": "Ahmed",
    "due": "Sunday"
  }
}
```

---

## 9. Comparison: IntentText vs. Markdown

| Feature         | Markdown         | IntentText                                   | Why IT Wins                            |
| --------------- | ---------------- | -------------------------------------------- | -------------------------------------- |
| Document title  | `# Title`        | `title: My Document`                         | AI identifies it as the unique Doc ID  |
| Main heading    | `## Header`      | `section: Strategy`                          | Explicitly defines a new "Context"     |
| Sub-heading     | `### Sub`        | `sub: Technicals`                            | Natural hierarchy without counting `#` |
| Standalone fact | `- Item`         | `note: Witness is 40 yrs old`                | Distinguishes "data" from "lists"      |
| Unordered list  | `- Item`         | `- Item`                                     | Familiar — same as WhatsApp / MD       |
| Ordered process | `1. Item`        | `1. Item`                                    | Familiar — AI knows order is critical  |
| Actionable task | `- [ ] Task`     | `task: Review File \| owner: Ali`            | Executable; can be tracked in a CRM    |
| Completed task  | `- [x] Task`     | `done: Review File \| time: 2pm`             | Historical; records _when_ it finished |
| Question        | _(none)_         | `question: Where is the key?`                | AI can flag unanswered items           |
| Image           | `![Alt](URL)`    | `image: Logo \| at: img.png \| caption: ...` | Human + accessible                     |
| Link            | `[Text](URL)`    | `link: Web \| to: site.com \| title: ...`    | Human + accessible                     |
| Table header    | `\| H1 \| H2 \|` | `headers: Name \| Role \| Date`              | Portable — no pipe-alignment pain      |
| Table row       | `\| D1 \| D2 \|` | `row: Ahmed \| Admin \| 2026`                | Data-ready — basically a CSV row       |
| Bold            | `**Text**`       | `*Text*`                                     | WhatsApp — everyone knows this         |
| Italic          | `_Text_`         | `_Text_`                                     | WhatsApp — familiar muscle memory      |
| Strikethrough   | `~~Text~~`       | `~Text~`                                     | WhatsApp — simple and fast             |
| Code block      | ` ```…``` `      | `code:` / `end:`                             | Explicit open/close — parser-safe      |
| Divider         | `---`            | `divider:` or `divider: Label`               | Optional label adds context            |

---

## 10. Full Example (`.it` File)

````
title: *Project Dalil* Launch Plan
summary: Finalizing the deployment for the AI-Agent hub in _Doha_.

section: Logistics & Equipment
headers: Item | Location | Status
row: Dell Server | Rack 04 | Delivered
row: Fiber Cables | Storage | ~Missing~ Ordered

section: Team Tasks
- Set up the environment.
- Configure the firewall.
- task: Update README | owner: Sarah | due: Monday
task: Database migration | owner: Ahmed | due: Sunday
done: Secure the domain name | time: 09:00 AM

section: Security Questions
question: Who has the _Master Key_ for the server room?
note: Surveillance footage is saved at ```/logs/cam1```.

section: Setup Script
code:
```
#!/bin/bash
apt-get update && apt-get install -y nginx
```
end:

divider: End of Technical Sections

link: *Full Documentation* | to: https://dalil.ai/docs | title: Dalil Docs
image: *Launch Banner* | at: assets/banner.png | caption: Project Dalil launch artwork
````

---

## 11. Reserved Keywords (v1.0)

`title` · `summary` · `section` · `sub` · `divider` · `note` · `headers` · `row` · `task` · `done` · `question` · `image` · `link` · `code` · `end`

All keywords are **case-insensitive** (`Title:` = `title:`). User content is always preserved as written.

**Implemented:** `ref` (cross-document references) — see §3.7.

**Reserved for future versions:** `sub2` (deeper hierarchy), `embed` (rich embeds).

### 11.1 Extension Keywords

To support safe experimentation without fragmenting the core format, extensions should use a prefixed keyword namespace:

- `x-<name>:` (experimental)
- `ext-<name>:` (tool/vendor-specific)

Parsers should preserve unknown extension blocks as `body-text` (or optionally emit a warning diagnostic) and must not crash.

---

## 12. Versioning

| Version  | Status    | Notes                                    |
| -------- | --------- | ---------------------------------------- |
| **v1.0** | ✅ Stable | Core format                              |
| **v1.3** | ✅ Stable | Query, Schema, Converters, Accessibility |
| **v1.4** | ✅ Stable | Cleanup, fixture accuracy, spec overhaul |

### 12.1 Implemented Features (v1.0 – v1.3)

#### Query Language (v1.2+)

Query IntentText documents using a SQL-like syntax.

```bash
node cli.js document.it --query "type=task owner=Ahmed due<2026-03-01 sort:due:asc limit:10"
```

| Operator             | Description     | Example                   |
| -------------------- | --------------- | ------------------------- |
| `=`                  | Equality        | `type=task`               |
| `!=`                 | Not equal       | `status!=done`            |
| `<`, `>`, `<=`, `>=` | Comparison      | `due<2026-03-01`          |
| `:contains`          | Substring match | `content:contains=urgent` |
| `:startsWith`        | Prefix match    | `content:startsWith=API`  |
| `?`                  | Field exists    | `priority?`               |
| `sort:field:dir`     | Sorting         | `sort:due:asc`            |
| `limit:N`            | Limit results   | `limit:10`                |
| `offset:N`           | Pagination      | `offset:5`                |

#### Schema Validation (v1.2+)

Validate documents against predefined or custom schemas.

```bash
node cli.js project.it --validate project
node cli.js article.it --validate article
```

| Schema      | Required Blocks    | Block Schemas                              |
| ----------- | ------------------ | ------------------------------------------ |
| `project`   | `title`            | task (owner, due, priority), done (time)   |
| `meeting`   | `title`, `section` | note, question, task (owner, due required) |
| `article`   | `title`, `summary` | image (at required), link, section         |
| `checklist` | `title`            | task, done                                 |

#### Converters (v1.3+)

- **Markdown → IntentText**: `convertMarkdownToIntentText(md)`
- **HTML → IntentText**: `convertHtmlToIntentText(html)` (Node.js only)

#### Accessibility Features (v1.3+)

- **Implicit paragraphs**: Lines without keywords become `body-text` blocks
- **Checkbox tasks**: `[ ] todo` and `[x] done` syntax
- **Inline links**: `[text](url)` inside any content
- **Property shortcuts**: `@owner`, `!high`, `!critical`
- **Callouts**: `info:`, `warning:`, `tip:`, `success:` blocks
- **Markdown-style tables**: `| col1 | col2 |` syntax
- **Emoji shortcuts**: 🚨 (priority), 📅 (due), ✅ (completed), ⏰ (time)

### 12.2 Roadmap (Not Yet Implemented)

The following features are under consideration for future versions. They are **not implemented** in the current release.

- **`sub2:`** — Deeper hierarchy (H4+ level nesting)
- **Nested lists** — Indentation-based list nesting
- **Templates** — `template:` / `use:` / `include:` for reusable content
- **Static site builder** — Build HTML sites from `.it` files
- **Knowledge graph** — Parse folders of `.it` files and build document relationships
- **AI-native features** — `ai:` and `synthesize:` blocks for LLM workflows
- **Collaboration** — `comment:`, `@mentions`, change tracking
- **Natural language dates** — Parse "tomorrow", "next Friday" to ISO dates

_Breaking changes require a major version bump. Additive features (new keywords, new standard properties) increment the minor version._

---

_IntentText — Non-technical. Data-rich. Human by design._
