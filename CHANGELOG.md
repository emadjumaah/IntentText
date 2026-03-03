# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog.

## [Unreleased]

## [1.4.0] - 2026-03-03

### Changed

- Parser now emits `version: "1.4"` on parsed documents
- SPEC.md section 12 rewritten — separates implemented features from roadmap
- `html-to-it.ts` JSDoc updated to clarify Node.js-only requirement
- Fixture JSON files updated to match parser version output
- `fixtures.test.ts` normalize function now strips `undefined` values

### Removed

- Removed `vscode-extension/` directory (will be a separate repo)

### Fixed

- Fixture tests were asserting `version: "1.2"` while parser emitted `"1.3"` — now aligned

## [1.3.0] - 2026-03-02

### Added

- **`convertHtmlToIntentText(html)`** — new HTML-to-IntentText converter. Maps semantic HTML elements (`<h1>` → `title:`, `<h2>` → `section:`, `<ul>` → list items, `<table>` → pipe tables, `<blockquote>` → `quote:`, etc.) with full inline formatting support
- **`convertMarkdownToIntentText`** now exported from browser bundle
- Blockquote (`>`) → `quote:` conversion in markdown converter
- Horizontal rule (`---`, `***`) → `---` divider in markdown converter
- Markdown table support in markdown converter
- `subsection:` keyword alias for `sub:`
- `version` field on parsed `IntentDocument` (emits `"1.2"`)
- `info:`, `warning:`, `tip:`, `success:` added to exported KEYWORDS array
- `//` comment syntax — lines starting with `//` are silently ignored

### Changed

- **Breaking**: Removed stub modules `ai-features`, `knowledge-graph`, `collaboration`, `export`, `templates`, `dates` — these were never production-ready
- **Breaking**: `done:` normalizes to `{type: "task", properties: {status: "done"}}` instead of `{type: "done"}`
- Checkbox `[x]` also normalizes to `type: "task"` with `status: "done"`
- Removed deprecated `InlineMark` type and `marks` field from `IntentBlock`
- `flattenBlocks()` extracted to shared `utils.ts` (internal refactor)
- KEYWORDS array is now the single source of truth in `types.ts`
- Browser bundle reduced from ~60KB to ~21KB

### Fixed

- `//` comment lines inside code blocks are now preserved (previously swallowed)
- `**multiple** bold **segments**` in markdown converter now converts correctly
- `query.ts`: `total` field now counts all blocks including nested children
- `schema.ts`: `allowUnknownProperties` now only warns when explicitly set to `false`

## [1.2.0] - 2026-03-01

### Added

- `subsection:` alias for `sub:`
- `done:` normalization to `{type: "task", status: "done"}`
- `version: "1.1"` field on IntentDocument
- `//` comment syntax

## [1.1.0] - 2026-02-28

### Added

- Polished HTML renderer with callouts, tables, tasks, RTL support
- Query engine (`queryBlocks`, `parseQuery`)
- Schema validation (`validateDocument`, `createSchema`)

## [1.0.0] - 2026-02-27

### Added

- Initial public release of the IntentText v1.0 parser and HTML renderer.
