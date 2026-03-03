# IntentText — Project Assessment

> **Date:** March 3, 2026
> **Scope:** Full codebase audit — idea, architecture, implementation, gaps, market viability
> **Verdict:** See bottom of document

---

## 1. The Idea

### What IntentText Claims to Be

A **human-friendly, AI-semantic document language** — a new text format (`.it`) that sits between Markdown and structured data. Every line parses to a typed JSON block, making documents both readable by humans and consumable by machines (LLMs, agents, CRMs).

### Core Value Proposition

| Angle                 | Pitch                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **vs. Markdown**      | Markdown encodes _appearance_; IntentText encodes _intent_. A `task:` isn't just a bullet — it's a typed, queryable, trackable action item with owner/due metadata. |
| **vs. YAML/JSON**     | Those are machine-first. IntentText is human-first with machine output.                                                                                             |
| **vs. Notion/Linear** | Those are proprietary platforms. IntentText is a portable file format.                                                                                              |
| **AI-native**         | Every block is a first-class data object. An LLM can parse, query, and generate `.it` files without custom tooling.                                                 |

### Honest Assessment of the Idea

**Strengths:**

- The core insight is sound: there's a real gap between "readable text" and "structured data." Markdown produces HTML but not queryable data. YAML produces data but is unpleasant to write.
- The `keyword: content | prop: value` syntax is genuinely intuitive. Anyone who's used WhatsApp formatting can write it.
- The pipe-metadata pattern is elegant — it keeps structured data on a single line without nesting or indentation hell.
- RTL/Arabic support as a first-class concern is a differentiator.

**Weaknesses:**

- The market is crowded. Markdown has 30+ years of ecosystem (GitHub, VS Code, Obsidian, static site generators). Competing with that inertia is extremely hard.
- "AI-readable" is a weaker sell than it sounds — LLMs can already parse Markdown, YAML, and even messy prose. The advantage is marginal unless you build tooling that exploits the structured output.
- The name "IntentText" doesn't stick easily. The `.it` extension collides with Italian locale conventions and is generic.

---

## 2. Architecture & Code Quality

### Codebase Metrics

| Metric                   | Value                                      |
| ------------------------ | ------------------------------------------ |
| Source code (TypeScript) | ~2,900 lines across 10 files               |
| Test code                | ~1,600 lines across 8 files                |
| Tests passing            | **132/132** (100%)                         |
| Dependencies             | Only 2 runtime: `uuid`, `node-html-parser` |
| Build target             | Node.js + browser (esbuild IIFE bundle)    |
| Monorepo                 | npm workspaces with `packages/core`        |

### Module Breakdown

| Module          | Lines | Purpose                             | Quality                                                               |
| --------------- | ----- | ----------------------------------- | --------------------------------------------------------------------- |
| `parser.ts`     | 847   | Core `.it` → JSON parser            | **Good**. Single-pass, line-by-line. Handles edge cases.              |
| `renderer.ts`   | 362   | JSON → HTML renderer                | **Good**. Clean block-to-HTML mapping. Embedded CSS.                  |
| `schema.ts`     | 547   | Document validation against schemas | **Solid**. Predefined schemas (project, meeting, article, checklist). |
| `query.ts`      | 339   | SQL-like query engine for blocks    | **Solid**. Supports WHERE, SORT, LIMIT, OFFSET.                       |
| `html-to-it.ts` | 389   | HTML → `.it` converter              | **Good**. Full semantic mapping, XSS-safe.                            |
| `markdown.ts`   | 162   | Markdown → `.it` converter          | **Adequate**. Handles common patterns, not edge cases.                |
| `types.ts`      | 210   | TypeScript interfaces               | **Good**. Well-defined, clean discriminated unions.                   |
| `utils.ts`      | 12    | Shared helpers                      | Minimal — just `flattenBlocks`.                                       |
| `browser.ts`    | 12    | Browser entry point                 | Thin re-export.                                                       |
| `index.ts`      | 29    | Node.js public API                  | Clean barrel export.                                                  |

### What's Done Well

1. **Parser robustness**: The parser handles escaping (`\|`, `\\`), multi-line code blocks, table grouping, section hierarchy, inline formatting, and extension hooks — all in a single pass. Diagnostics are emitted for malformed input rather than crashing.

2. **Extension system**: The `IntentExtension` interface allows registering custom keywords, overriding block parsing, custom inline processing, and custom validation. This is well-designed and forward-looking.

3. **Security**: The HTML renderer sanitizes URLs (blocks `javascript:` schemes), escapes all output, and strips dangerous content. This is production-grade.

4. **Bidirectional converters**: Import _from_ Markdown/HTML, export _to_ HTML. This lowers the adoption barrier significantly.

5. **Test coverage**: 132 tests across 8 files covering parser, renderer, schema, query, markdown converter, HTML converter, fixtures, and v1.3 accessibility features. All green.

6. **Clean TypeScript**: No `any` abuse, proper discriminated unions, exported types alongside implementations.

### What's Concerning

1. **Monorepo with one package**: The `packages/*` structure and npm workspaces setup suggests plans for multiple packages, but only `core` exists. This adds complexity without benefit today.

2. **CLI references dead code**: `cli.js` imports `buildStaticSite`, `buildKnowledgeGraph`, `processAIDocument`, `processCollaboration` — these were removed in v1.3.0 (per CHANGELOG: "Removed stub modules"). The CLI will crash on those features.

3. **Version inconsistency**: `package.json` says v1.3.0, the parser emits `version: "1.2"`, the spec references v1.0/v1.1/v1.2, the README shows `"1.1"` in example output.

4. **`uuid` dependency for block IDs**: Every block gets a UUID v4. For a parser library this is unusual overhead — sequential IDs or caller-provided IDs would be lighter. The `uuid` package adds ~6KB to the browser bundle.

5. **Embedded CSS in renderer**: The HTML renderer includes ~3KB of inline CSS in every render call. There's no way to use external stylesheets or customize the theme.

6. **`node-html-parser` as a runtime dependency**: This is only needed for the HTML-to-IT converter, but it's a top-level dependency. It's also Node-only (uses `require`), which means the HTML-to-IT converter can't work in the browser despite the browser bundle existing.

---

## 3. Specification vs. Implementation Gap

The SPEC.md is ambitious — it describes features across v1.0 through v1.3. Here's the reality:

| Spec Feature                                                     | Status              | Notes                                          |
| ---------------------------------------------------------------- | ------------------- | ---------------------------------------------- |
| Core keywords (title, section, task, etc.)                       | **Implemented**     | Full coverage                                  |
| Pipe metadata                                                    | **Implemented**     | With escaping                                  |
| Inline formatting (_bold_, _italic_, ~strike~, \`\`\`code\`\`\`) | **Implemented**     | WhatsApp-style                                 |
| Tables (headers/row + markdown-style)                            | **Implemented**     | Both syntaxes                                  |
| Code blocks (keyword + fenced)                                   | **Implemented**     | Both syntaxes                                  |
| Lists (ordered + unordered)                                      | **Implemented**     | Including embedded tasks                       |
| Section hierarchy (section → sub)                                | **Implemented**     | 2 levels                                       |
| Comments (`//`)                                                  | **Implemented**     |                                                |
| RTL detection                                                    | **Implemented**     | Arabic regex                                   |
| Query engine                                                     | **Implemented**     | Full SQL-like syntax                           |
| Schema validation                                                | **Implemented**     | 4 predefined schemas                           |
| Markdown → IT converter                                          | **Implemented**     |                                                |
| HTML → IT converter                                              | **Implemented**     |                                                |
| Inline links `[text](url)`                                       | **Implemented**     | v1.3                                           |
| Checkbox tasks `[ ]` / `[x]`                                     | **Implemented**     | v1.3                                           |
| Property shortcuts (`@user`, `!high`)                            | **Implemented**     | v1.3                                           |
| Emoji shortcuts                                                  | **Implemented**     | v1.3                                           |
| Callouts (info, warning, tip, success)                           | **Implemented**     | v1.3                                           |
| `ref:` / `embed:` keywords                                       | **Partially**       | Parser handles them, renderer has basic output |
| `sub2:` deeper hierarchy                                         | **Not implemented** | Spec reserves it                               |
| Templates (`template:` / `use:` / `include:`)                    | **Not implemented** | Spec describes it, stubs removed               |
| Static site builder                                              | **Not implemented** | Stubs removed                                  |
| Knowledge graph                                                  | **Not implemented** | Stubs removed                                  |
| AI features (`ai:`, `synthesize:`)                               | **Not implemented** | Stubs removed                                  |
| Collaboration (`comment:`, `@mentions`)                          | **Not implemented** | Stubs removed                                  |
| Nested lists (indentation)                                       | **Not implemented** | Spec describes it                              |
| Natural language dates                                           | **Not implemented** | Spec describes API                             |

**Bottom line**: The core (v1.0 + query/schema from v1.2 + accessibility from v1.3) is solid. Everything above that line is vaporware in the spec.

---

## 4. Gaps & Issues

### Critical (Must Fix Before Any Public Release)

1. **CLI is broken**: References 6+ removed modules. Running `node cli.js doc.it --ai` or `--graph` or `--collab` or `--build` will throw `TypeError`. Need to strip dead feature flags or replace with "not yet implemented" messages.

2. **Version mismatch**: Parser outputs `"1.2"` but package is `1.3.0`. The spec, README, and code all disagree. Pick one source of truth.

3. **`node-html-parser` in browser bundle**: The `html-to-it.ts` does `require("node-html-parser")` which will fail in a browser context. Either exclude it from the browser entry point or provide a browser-compatible parser path.

### Important (Should Fix)

4. **No npm publish config**: `packages/core/package.json` has no `publishConfig`, no `repository`, no `homepage`, no `bugs` fields. Not publishable to npm as-is.

5. **No `.npmignore` or `files` refinement**: The `"files": ["dist", "README.md"]` in core is correct but `dist/` probably doesn't exist in the repo (build artifact). No CI/CD pipeline visible.

6. **Markdown converter is lossy**: Does not handle nested lists, footnotes, definition lists, or front matter. This is acceptable for v1 but should be documented as a limitation.

7. **Schema system has no way to load custom schemas from files**: Only programmatic `createSchema()` or hardcoded predefined schemas. The CLI `--validate` only accepts predefined schema names.

8. **No round-trip guarantee**: `parse → render → parse` doesn't produce the same AST. The HTML renderer produces HTML, not `.it` text. There's no "serialize back to `.it`" function (JSON → `.it` text).

9. **Inline formatting doesn't support nesting**: `*bold _and italic_*` won't produce nested bold+italic — by spec design, but this is a common user expectation.

### Minor

10. **No error recovery in renderer**: If given an unknown block type, it wraps it in a `div.intent-unknown`. This is fine, but there's no way to register custom renderers for extension blocks.

11. **Query engine doesn't support OR logic**: Only AND (`where` clauses are ANDed). No grouping or OR support.

12. **Examples reference removed features**: `meeting-notes.it` uses `template:`, `use:`, `comment:`, `comment-reply:`, `sub2:`, `@#group-name` — none of which are implemented. These examples are misleading.

---

## 5. Adoption Viability

### Who Would Use This?

| Audience                           | Likelihood | Why                                                                                                                                              |
| ---------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **AI/LLM tool builders**           | Medium     | A structured, typed text format is useful for agent pipelines — but these teams usually invent their own DSLs.                                   |
| **Technical writers**              | Low        | They already have Markdown, AsciiDoc, reStructuredText. Switching cost is high.                                                                  |
| **Non-technical users**            | Medium     | The WhatsApp-style formatting is genuinely easier than Markdown. But they need a tool (editor/app), not a format.                                |
| **Internal tools / vertical SaaS** | **High**   | This is the sweet spot. A company building task management, meeting notes, or document processing tools could adopt IntentText as a wire format. |

### What Would Make It Adoptable?

1. **A killer app**: The format alone isn't enough. You need an application — a note-taking app, a meeting tool, a project tracker — where `.it` is the native format. The format is the implementation detail; the product is the sell.

2. **Obsidian/Notion plugin**: Meeting users where they are. An Obsidian plugin that renders `.it` files or a Notion import/export would demonstrate value without requiring users to switch tools.

3. **LLM function-calling integration**: Provide pre-built tool definitions for OpenAI/Anthropic function calling. "Parse this meeting transcript into IntentText" → structured JSON. That's the AI-native pitch made real.

4. **A web editor**: The `preview.html` is a start, but it needs to be a full editor (think StackEdit for Markdown) that non-technical users can use without installing anything.

---

## 6. Strengths Summary

- **The core parser + renderer is production-quality**. 132 passing tests, clean TypeScript, proper escaping and security.
- **The format design is genuinely thoughtful**. Pipe metadata, WhatsApp formatting, keyword-based blocks — these choices are well-reasoned.
- **Bidirectional converters** (MD → IT, HTML → IT) lower the adoption barrier.
- **Extension system** provides a clean path for customization without forking.
- **Schema validation + query engine** add real utility beyond just parsing.
- **Minimal dependencies** (2 runtime deps) keep it lightweight.

---

## 7. Weaknesses Summary

- **The spec over-promises** — templates, knowledge graphs, AI features, collaboration tools are all described but not implemented. This creates a credibility gap.
- **CLI is broken** — references removed modules, will crash on several documented features.
- **No distribution story** — not published to npm, no CI/CD, no documentation site beyond local files.
- **No round-trip serializer** — can parse `.it` to JSON, can render JSON to HTML, but cannot serialize JSON back to `.it`.
- **Browser compatibility incomplete** — `html-to-it` uses `require()` which fails in browsers.
- **No killer app** — the format is a solution looking for a product. Without an application that showcases it, adoption is unlikely.
- **Competing against Markdown's inertia** — which is essentially impossible to dislodge for general-purpose writing.

---

## 8. Recommended Actions

### If GO:

1. **Strip the spec down to reality**. Remove all unimplemented features from SPEC.md. Document them in a separate ROADMAP.md. credibility > ambition.
2. **Fix the CLI**. Remove dead imports and feature flags. Ship what works.
3. **Fix version consistency**. One version number everywhere.
4. **Publish `@intenttext/core` to npm**. It's ready. The code quality supports it.
5. **Add `serializeToIntentText(doc: IntentDocument): string`** — the missing reverse function. This unlocks round-trip workflows.
6. **Build the web editor**. Make `preview.html` into a serious tool — shareable URLs, copy-to-clipboard, export options.
7. **Target a vertical**: Pick one use case (meeting notes, PRDs, task management) and build the killer app on top.
8. **Write a blog post / demo** that shows: "Here's a meeting transcript → IntentText → queryable JSON → rendered HTML → task extraction" pipeline. That's the pitch.

### If NO-GO:

- The core code is clean enough to extract and reuse as a general-purpose "keyword-based text parser" library, even if the IntentText format itself doesn't take off.

---

## 9. Verdict

| Criteria                 | Score           | Notes                                                             |
| ------------------------ | --------------- | ----------------------------------------------------------------- |
| **Idea originality**     | 7/10            | Real gap identified, but competing in a saturated space           |
| **Code quality**         | 8/10            | Clean, tested, well-structured TypeScript                         |
| **Completeness**         | 5/10            | Core is solid; everything above v1.0 is partial or missing        |
| **Production readiness** | 4/10            | CLI broken, version mismatches, not published, no CI/CD           |
| **Market viability**     | 4/10            | Needs a product, not just a format. Format-only plays rarely win. |
| **Technical debt**       | 3/10 (low debt) | Codebase is clean. Most debt is in spec vs. reality gap.          |

### Overall: **Conditional GO**

The core is solid and worth shipping. But shipping the _format_ alone won't get traction. The recommendation is:

1. **Ship `@intenttext/core` to npm** — the code supports it today.
2. **Build one product on top** — a web-based meeting notes tool, a CLI task tracker, or an LLM-powered document processor.
3. **Stop expanding the spec** until the existing implementation is polished, published, and has real users.

The code is the strongest part of this project. The gap is between "working library" and "product people want to use." Close that gap, and it's a GO.

---

_Assessment by: GitHub Copilot — Full codebase audit of `/packages/core` (2,900 LoC), tests (1,600 LoC), spec, docs, CLI, and examples._
