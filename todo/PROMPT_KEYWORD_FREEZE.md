# IntentText — Keyword Freeze to 37 Canonical Keywords

## Prompt for Opus — Core + Docs

---

## OBJECTIVE

The current keyword set has 82 block types. This is too many.
This prompt reduces the canonical public keyword set to 37,
moves everything else to either:

- Internal parser types (never user-facing)
- Aliases of canonical keywords (silently resolved)
- Extension blocks (emitted as `type: extension` with metadata)

**Zero breaking changes to existing `.it` files.**
Every keyword that existed before still parses — it either maps to a
canonical keyword or becomes an extension block. Nothing is rejected.

---

## BREAKING CHANGE WARNING — READ BEFORE STARTING

**Callout keywords (`warning:`, `danger:`, `tip:`, `success:`) each currently
produce their own `block.type` in the parser output** (e.g. `block.type === 'warning'`,
`block.type === 'danger'`, etc.). This prompt makes `info:` the single canonical
callout type. All callout variants become aliases that produce `block.type === 'info'`
with an added `properties.type: '<variant>'` property. This is a structural
JSON output change.

Any downstream code (Python SDK, MCP tools, user applications) that does
`block.type === 'warning'` or `block.type === 'danger'` etc. will break
silently. Handle this by:

1. Adding a `DEPRECATED_KEYWORD` warning when bare `warning:` / `danger:` / `tip:` / `success:` are parsed
2. Updating the renderer to read `properties.type` for callout variant styling
3. Noting the change clearly in the migration guide
4. Bumping the minor version

**`info:` is already a canonical type in the registry and the renderer.**
It stays `block.type === 'info'` — no change for existing `info:` users.
All other callouts (`warning:`, `danger:`, `tip:`, `success:`) become aliases
to `info:` and inject their own name as `properties.type`.

---

## READ FIRST

```
packages/core/src/types.ts
packages/core/src/aliases.ts        ← check what already exists before adding
packages/core/src/language-registry.ts  ← source of truth for all keywords
packages/core/src/parser.ts
packages/core/src/renderer.ts
intenttext-docs/docs/reference/keywords/
```

---

## THE 37 CANONICAL KEYWORDS

These are the only keywords that appear in the public language registry,
the docs keyword table, and IDE completions. Everything else is an alias
or an extension block.

**Why 37, not 36:** `cite:` (bibliographic citation) and `quote:` (block
quotation) are semantically distinct and both stay canonical. `columns:` +
`row:` are the user-facing data keywords (`table:` is an internal compiled
type). `header:` + `footer:` replace `font:` in the layout group. `context:`
stays canonical — it serves dual duty as document identity (scoped variables)
and agentic workflow context. `break:` stays canonical — it is a user-facing
print layout directive with its own distinct renderer output (invisible page
break div) that cannot be expressed through `divider:` or any other keyword.

```typescript
export const CANONICAL_KEYWORDS = [
  // DOCUMENT IDENTITY (4)
  "title", // unique document title
  "summary", // short description
  "meta", // document metadata (author, tags, theme, type)
  "context", // agent execution context and scoped variables

  // STRUCTURE (3)
  "section", // major heading / context boundary
  "sub", // sub-section
  "toc", // auto-generated table of contents (users write --- for dividers)

  // CONTENT (7)
  "text", // body paragraph (note: is alias)
  "info", // callout block (warning/danger/tip/success become aliases)
  "quote", // attributed block quotation
  "cite", // bibliographic citation (author, date, url) — NOT same as quote
  "code", // code block
  "image", // image with optional caption
  "link", // hyperlink

  // TASKS (3)
  "task", // actionable item
  "done", // completed item
  "ask", // open question

  // DATA (3)
  "columns", // table column definitions (declares headers for following row: blocks)
  "row", // table data row — pipe-separated cell values
  "metric", // named measurement with value

  // AGENTIC WORKFLOW (7)
  "step", // execute a tool or action
  "decision", // conditional branch
  "gate", // human approval checkpoint
  "trigger", // workflow entry point
  "result", // terminal workflow output
  "policy", // standing behavioural rule
  "audit", // immutable execution record

  // TRUST (5)
  "track", // start tracking document
  "approve", // approval record
  "sign", // signature / attestation record
  "freeze", // lock document against changes
  "amendment", // formal change to frozen document

  // LAYOUT (5)
  "page", // page layout declaration (document-level)
  "header", // page header for print output
  "footer", // page footer for print output
  "watermark", // watermark overlay (print)
  "break", // print page break — invisible in web, forces new page in print
] as const;

export type CanonicalKeyword = (typeof CANONICAL_KEYWORDS)[number];
// CANONICAL_KEYWORDS.length === 37
```

---

## INTERNAL PARSER TYPES

These are block types the parser emits internally.
They are never user-facing keywords. They do not appear in docs or
IDE completions. They are valid `block.type` values in the parsed AST.

```typescript
export const INTERNAL_BLOCK_TYPES = [
  "list-item", // - item or * item
  "step-item", // 1. item
  "body-text", // non-keyword prose paragraph
  "divider", // what --- compiles to (not a user keyword — users write ---)
  "table", // compiled from columns: + row: blocks by the parser
  "extension", // x-*: blocks and demoted legacy keywords
] as const;
```

---

## ALIAS MAP CHANGES

**Before adding aliases, read `aliases.ts` and `language-registry.ts` to
check if these already exist.** The registry is the source of truth.
Add only what is missing.

```typescript
// Add to language-registry.ts (in the aliases array of the canonical keyword):

// text: variants
'note'          → 'text'   (likely already exists — check first)
'paragraph'     → 'text'
'p'             → 'text'   (compat-only)

// info: variants — callouts
// ⚠️  'warning', 'danger', 'tip', 'success' each currently produce their own
// block.type. Changing to aliases makes them all resolve to 'info'.
// The parser injects properties.type so the renderer can distinguish the variant.
// Update renderer to read block.properties?.type for callout styling.
'warning'       → 'info'    // parser adds { type: 'warning' } to properties
'danger'        → 'info'    // parser adds { type: 'danger' } to properties
'tip'           → 'info'    // parser adds { type: 'tip' } to properties
'success'       → 'info'    // parser adds { type: 'success' } to properties

// quote: variants
'blockquote'    → 'quote'
'excerpt'       → 'quote'

// ⚠️  Do NOT add: 'cite' → 'quote'
// cite: and quote: are DISTINCT keywords. cite: is bibliographic.

// section: variants
'h1'            → 'section'  (likely already compat-only — check)
'heading'       → 'section'
'chapter'       → 'section'

// sub: variants
'h2'            → 'sub'
'h3'            → 'sub'
'subheading'    → 'sub'

// task: variants
'todo'          → 'task'
'action'        → 'task'

// done: variants
'completed'     → 'done'
'finished'      → 'done'

// ask: variants
'question'      → 'ask'

// sign: variants
'sig'           → 'sign'

// amendment: variants
'amend'         → 'amendment'

// divider: — internal AST type (--- is the primary user syntax, not a keyword)
// 'divider:' is demoted from the public keyword set. Users write --- directly.
// The internal AST type 'divider' is preserved so legacy aliases still work.
'hr'            → 'divider'    // resolves to internal divider AST type
'separator'     → 'divider'    // resolves to internal divider AST type
// 'break:' is canonical — do NOT alias it to divider.
// break: renders as an invisible page-break div for print; divider: renders
// as a visible <hr>. These are semantically and visually different.

// link: variants
'url'           → 'link'
'href'          → 'link'

// image: variants
'img'           → 'image'
'photo'         → 'image'
// ⚠️  Do NOT alias 'figure' → 'image'.
// 'figure:' has a distinct renderer: numbered captioned figure with <figure>
// element, figcaption, num: property. Aliasing to image: destroys that.
// 'figure' is moved to x-writer: extension — see EXTENSION KEYWORDS below.

// metric: variants
'stat'          → 'metric'
'kpi'           → 'metric'
```

---

## EXTENSION KEYWORDS

Keywords that are NOT aliases of canonical keywords become extension blocks.
The parser accepts them as legacy bare keywords (backward compat) OR with
the `x-ns:` prefix (new preferred form).

**The `x-ns:` prefix syntax is a new parser feature.** The parser must be
updated to recognise any line matching `^x-[a-z]+:` as an extension block.

```typescript
// ⚠️  IMPORTANT: 'context:' is canonical (in DOCUMENT IDENTITY group).
// It has dual use: document identity (agent context vars) AND agentic
// workflow context. It is NOT in this extension list.

// ⚠️  IMPORTANT: 'history:' and 'revision:' are written by the CLI's
// sealDocument() function as bare keywords. If moving to extensions,
// update sealDocument() and amendDocument() in trust.ts to write
// 'x-trust: history' / 'x-trust: revision' instead. Also update the
// history boundary detector in history.ts.

// Writer extensions (x-writer: namespace)
"byline"; // → x-writer: byline
"epigraph"; // → x-writer: epigraph
"figure"; // → x-writer: figure (numbered captioned figure — NOT an alias for image:)
"caption"; // → x-writer: caption
"footnote"; // → x-writer: footnote
"dedication"; // → x-writer: dedication

// Document extensions (x-doc: namespace)
"def"; // → x-doc: def
"contact"; // → x-doc: contact
"deadline"; // → x-doc: deadline
"ref"; // → x-doc: ref
"signline"; // → x-doc: signline

// Agent extensions (x-agent: namespace)
"loop"; // → x-agent: loop
"parallel"; // → x-agent: parallel
"retry"; // → x-agent: retry
"wait"; // → x-agent: wait
"handoff"; // → x-agent: handoff
"call"; // → x-agent: call
"checkpoint"; // → x-agent: checkpoint
"error"; // → x-agent: error
"import"; // → x-agent: import
"export"; // → x-agent: export
"progress"; // → x-agent: progress
"agent"; // → x-agent: agent (document-level agent name/identifier config)
"model"; // → x-agent: model (default AI model for this document)
"tool"; // → x-agent: tool
"prompt"; // → x-agent: prompt
"memory"; // → x-agent: memory
"signal"; // → x-agent: signal
"embed"; // → x-agent: embed

// Trust extensions (x-trust: namespace)
"history"; // → x-trust: history (boundary marker — see warning above)
"revision"; // → x-trust: revision (see warning above)

// Layout extensions (x-layout: namespace)
"font"; // → x-layout: font (use page: properties for typography instead)

// Experimental (x-exp: namespace)
"assert"; // → x-exp: assert
"secret"; // → x-exp: secret
"input"; // → x-exp: input
"output"; // → x-exp: output
```

---

## PARSER CHANGES

### 1. Extension block handling

The `x-ns:` prefix is new parser syntax. Pattern: `^x-([a-z]+):\s*(.*)`
where the first capture group is the namespace.

When the parser encounters **a bare keyword in the extension list**:

- Emit the block with `type: 'extension'`
- Add property `x-type: <original keyword>`
- Add property `x-ns: <namespace>` (writer/doc/agent/trust/layout/exp)
- Emit `DEPRECATED_KEYWORD` warning with migration hint

When the parser encounters **an `x-ns:` prefixed line**:

- Match namespace from `x-ns:` prefix
- The content after the colon is treated as `x-type: content | properties...`
- Emit block with `type: 'extension'`, set `x-type` and `x-ns` from prefix
- No warning — this is the preferred form

```typescript
// User writes: "byline: Emad | date: 2026"  (legacy bare form)
// Parser emits:
{
  type: 'extension',
  content: 'Emad',
  properties: { 'x-type': 'byline', 'x-ns': 'writer', date: '2026' }
}
// + DiagnosticCode.DEPRECATED_KEYWORD warning

// User writes: "x-writer: byline | content: Emad | date: 2026"  (preferred)
// Parser emits same block — no warning
```

### 2. Callout `type:` property injection

When alias resolves `warning`/`danger`/`tip`/`success`:

- Parser automatically adds `type: <callout-type>` to the block's properties
- The canonical AST type is always `'info'` for all callout variants

```typescript
// User writes: "warning: Check this carefully"
// Parser: resolves alias → 'info', injects properties.type = 'warning'
// Block emitted:
{ type: 'info', content: 'Check this carefully', properties: { type: 'warning' } }

// User writes: "info: This is informational"
// Parser: info: is canonical — no alias resolution, no type injection
// Block emitted:
{ type: 'info', content: 'This is informational' }
```

### 3. New diagnostic codes

```typescript
"DEPRECATED_KEYWORD"; // bare extension keyword used — suggest x-ns: form
// 'UNKNOWN_KEYWORD' already exists — keyword not in canonical OR extension list
```

---

## RENDERER CHANGES

### Extension blocks

```html
<div
  class="it-extension it-ext-writer it-ext-byline"
  data-x-type="byline"
  data-x-ns="writer"
>
  <!-- content -->
</div>
```

### Callout rendering — `info:` is the canonical callout type

The renderer's `case "info":` handles all callout blocks. Read `properties.type`
to select the visual variant. **Remove** the separate `case "warning":`,
`case "danger":`, `case "tip":`, `case "success":` branches — these are now
aliases that all resolve to `type: 'info'`.

```typescript
// In renderBlock() — replace all separate callout cases with a single handler:
case "info": {
  const CALLOUT_VARIANTS = new Set(["info", "warning", "danger", "tip", "success"]);
  const subtype = (block.properties?.type as string) || "info";
  const variant = CALLOUT_VARIANTS.has(subtype) ? subtype : "info";
  return `<div class="it-callout it-${variant}">${renderIcon(variant)}${content}</div>`;
}
```

**The old `renderWarning()` is removed.** Its CSS classes (`intent-warning`,
`intent-callout-label: Caution`) are now driven by the `it-warning` variant
class on the unified `it-callout` div. Preserve all existing visual styles —
just consolidate them under the variant class system.

---

## LANGUAGE REGISTRY CHANGES

Update `language-registry.ts`:

- `LANGUAGE_REGISTRY` contains exactly 37 canonical keyword entries
- Add `EXTENSION_REGISTRY` for all extension keywords

```typescript
export const EXTENSION_REGISTRY: ExtensionEntry[] = [
  /* all extension entries */
];

export interface ExtensionEntry {
  keyword: string; // legacy bare keyword (e.g. 'byline')
  namespace: string; // writer | doc | agent | trust | layout | exp
  xForm: string; // x-ns: form (e.g. 'x-writer: byline')
  since: string;
  description: string;
}

export const KEYWORD_COUNT = LANGUAGE_REGISTRY.length; // 37
export const EXTENSION_COUNT = EXTENSION_REGISTRY.length;
```

---

## DOCS CHANGES

### `docs/reference/keywords/index.md`

- Update count to 37
- Update the KeywordTable to show only 37 canonical keywords
- Add a new section: "Extension Keywords" with link to extensions page

### `docs/reference/keywords/extensions.md` — NEW PAGE

- What extensions are
- The `x-ns:` prefix format
- All 5 namespaces: writer, doc, agent, trust, layout, exp
- Complete table of all extension keywords with their namespace
- How to use (legacy bare form vs `x-ns:` form)

### Update all code examples:

Any example using `warning:`, `danger:`, `tip:`, `success:` — add a comment
noting these are aliases of `info:`. `info:` itself is canonical — no annotation needed.
Do NOT rewrite working examples — just annotate the alias forms.

---

## MIGRATION GUIDE

Create `docs/guide/migrating-keyword-freeze.md`:

```markdown
# Keyword Freeze — Migration Guide

IntentText v2.14 freezes the canonical keyword set at 37 keywords.

## Nothing breaks

Every existing .it file continues to parse correctly.
Extension keywords are accepted and emit a DEPRECATED_KEYWORD warning.

## What changed

Keywords previously canonical but not in the 37 now produce
`type: extension` blocks. Four callout keywords become aliases of `info:`.

## Aliases (JSON output unchanged for most)

| Old keyword | Maps to                            | JSON change            |
| ----------- | ---------------------------------- | ---------------------- |
| note:       | text:                              | none — same block.type |
| cite:       | **stays canonical**                | none                   |
| info:       | **stays canonical**                | none                   |
| warning:    | info: + properties.type: 'warning' | ⚠️ block.type changes  |
| danger:     | info: + properties.type: 'danger'  | ⚠️ block.type changes  |
| tip:        | info: + properties.type: 'tip'     | ⚠️ block.type changes  |
| success:    | info: + properties.type: 'success' | ⚠️ block.type changes  |

## Extensions (block.type changes to 'extension')

| Old keyword | New x-ns: form     | block.type changes |
| ----------- | ------------------ | ------------------ |
| byline:     | x-writer: byline   | ⚠️ yes             |
| footnote:   | x-writer: footnote | ⚠️ yes             |
| loop:       | x-agent: loop      | ⚠️ yes             |
| deadline:   | x-doc: deadline    | ⚠️ yes             |
| contact:    | x-doc: contact     | ⚠️ yes             |
| ...         | ...                | ...                |

## Timeline

- v2.14: All keywords accepted, DEPRECATED_KEYWORD warning for extensions
- v3.0: Bare extension keywords rejected (far future)
```

---

## DONE CRITERIA

**Core**

- [x] `CANONICAL_KEYWORDS` array has exactly 37 entries
- [x] `cite:` remains canonical — NOT an alias for `quote:`
- [x] `context:` remains canonical — NOT moved to x-agent:
- [x] `INTERNAL_BLOCK_TYPES` separated from public keywords
- [x] New alias mappings added (check existing registry first — no duplicates)
- [x] Callout aliases (`warning`, `danger`, `tip`, `success`) → `info:` and inject `type:` property
- [x] Extension keywords emit their real type directly (e.g. `type: "signal"`) — DESIGN CHANGE: no `type: "extension"` wrapping for known extensions. Only unknown `x-ns:` blocks get `type: "extension"`.
- [x] `effectiveType()` indirection layer completely removed — clean core
- [x] Dead `BlockType` union members removed (`warning`, `danger`, `tip`, `success`)
- [x] `x-ns:` prefix form accepted with no warning (new parser feature)
- [x] `EXTENSION_REGISTRY` added to language-registry.ts
- [x] `history:` / `revision:` kept as internal types (boundary + compat-only) — documented decision: these are written by sealDocument() as bare keywords and stay recognized by the parser
- [x] All 815 existing tests still pass
- [x] New tests for callout → `type:` property injection
- [x] New tests for extension block emission
- [x] New tests for `x-ns:` prefix parsing
- [N/A] `DEPRECATED_KEYWORD` warning for bare extension keywords — REMOVED by design: project is fresh, no backward compat needed

**Renderer**

- [x] `case "info":` in `renderBlock()` reads `properties.type` for callout variant
- [x] Separate `renderWarning()` / `renderDanger()` / `renderTip()` / `renderSuccess()` cases removed
- [x] Extension blocks render as `it-extension it-ext-{ns} it-ext-{type}` divs (for unknown x-ns: blocks only)

**Docs**

- [ ] Keyword count updated to 37 everywhere
- [ ] KeywordTable shows only 37 canonical keywords
- [ ] New `extensions.md` page created with full extension table
- [ ] Migration guide created at `docs/guide/migrating-keyword-freeze.md`

**Backward Compatibility**

- [ ] Every keyword that existed before still parses
- [ ] No existing .it files produce parse errors
- [ ] `npm test` — zero failures
