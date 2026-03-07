# IntentText Project Audit (Docs + Core)

Date: 2026-03-08
Scope reviewed:

- `IntentText` (core parser/types/tests/docs)
- `intenttext-docs` (reference keyword docs + docs keyword table)

## Executive Assessment (Honest)

IntentText has a strong core and a clear differentiated idea: human-writable structured text with machine-usable semantics. The parser/test foundation is real and better than most DSL prototypes.

The main weakness right now is not parser quality, it is **language contract drift** between implementation and docs. Your docs present one language surface (57 keywords, 49 aliases, several data/agent keywords), while the runtime accepts a different one. This creates trust friction for users and for ecosystem packages that depend on a stable keyword contract.

Overall project status:

- Core engine maturity: **Good**
- Documentation accuracy: **Needs immediate correction**
- Language stability signal to users: **Mixed / risky**

## What Is Strong

- Parser architecture is robust and well-structured (`IntentText/packages/core/src/parser.ts`).
- Alias mechanism is clean and centralized (`IntentText/packages/core/src/aliases.ts`).
- There is substantial test coverage across versions and keyword expansions (`IntentText/packages/core/tests/*`).
- Trust/history system is implemented and tested (`v2.12` tests and trust/history modules).
- Docs are extensive and thoughtfully written; this is an asset once aligned with runtime behavior.

## Critical Gaps (Docs vs Runtime Behavior)

### 1. Keyword inventory mismatch

Docs keyword table and category pages define canonical keywords that are not parser keywords.

Documented as canonical but not in core `KEYWORDS`:

- `cite`
- `group`
- `input`
- `output`
- `memory`
- `prompt`
- `tool`
- `table` (docs treat this as canonical keyword, parser uses `headers:`/`row:` and markdown pipe table detection)
- `history` (supported as boundary behavior, but not in `KEYWORDS` set)

Core `KEYWORDS` include many that docs keyword table does not list as canonical:

- `agent`, `model`
- `ask`
- `task`
- `info`, `success`
- `headers`, `row`
- `embed`, `end`
- `loop`, `checkpoint`, `import`, `export`, `progress`
- `result`, `handoff`, `wait`, `parallel`, `retry`, `call`
- `byline`, `caption`, `epigraph`, `dedication`, `footnote`, `toc`
- legacy/compat entries: `question`, `subsection`, `status`

Impact:

- Users can write docs-valid files that parse as unknown/body text.
- Users can write runtime-valid files that appear undocumented.
- Tooling (VS Code, MCP, Python wrappers) can diverge by taking docs literally.

### 2. Docs count claims are internally inconsistent

Observed in docs:

- `All 57 Keywords` claim (`intenttext-docs/docs/reference/keywords/index.md`)
- alias page claims `49 aliases` (`intenttext-docs/docs/reference/keywords/aliases.md`)

But docs keyword table source contains:

- 52 table rows, 51 unique names (duplicate `context`) (`intenttext-docs/src/components/KeywordTable.tsx`)

Alias table rows/counts in docs do not align with implementation map shape and include aliases not implemented.

### 3. Alias contract mismatch (significant)

Implementation alias map (`IntentText/packages/core/src/aliases.ts`) has 54 aliases.

Docs alias table includes aliases that are not in implementation (examples):

- `abstract`, `content`, `excerpt`, `pullquote`, `highlight`
- `alert`, `caution`, `hint`, `advice`
- `snippet`, `img`, `photo`, `picture`, `url`, `href`
- `illustration`, `visual`, `entity`, `chapter`, `xref`, `by`, `indicator`

Implementation has aliases not represented in docs (examples):

- `h1`, `h2`, `h3`, `p`
- `action`, `check`, `item`, `todo`, `completed`, `finished`
- `if`, `on`, `run`, `status`
- `references`, `related`, `stat`, `due-date`
- `sig`, `sign-here`, `signature-line`, `cite`

Impact:

- High confusion in authoring and query behavior.
- Aliases become unpredictable by channel (docs vs runtime vs editor hints).

### 4. `history:` boundary is implemented but treated inconsistently in keyword systems

- Runtime has explicit `history:` boundary behavior in parser/trust logic.
- Tests cover it in `v2.12`.
- But it is not in `KEYWORDS` array.

Risk:

- Any code path that relies on `KEYWORDS` as source of truth may misclassify `history:`.
- Safe parser pre-processing (`parseIntentTextSafe`) uses `KEYWORDS` set for unknown keyword handling; this can produce edge-case behavior drift around `history:`.

## Missing Functionality / Missing Contract Pieces

### A. Missing language governance artifact (highest leverage)

You need one generated source of truth for the language contract:

- canonical keywords
- aliases
- status (`stable`, `experimental`, `deprecated`, `compat-only`)
- since version
- category

Right now this truth is spread across:

- `types.ts` (`KEYWORDS`, `BlockType`)
- `aliases.ts`
- parser behavior
- docs table/component/category pages
- tests

Recommendation:

- Add one machine-readable registry (for example `packages/core/src/language-registry.ts` or JSON schema), and generate docs keyword table + alias docs from it.

### B. Missing explicit compatibility policy

You currently mix:

- canonical keywords
- docs-facing keywords
- internal/compat aliases (`question`, `subsection`, `status`)

Recommendation:

- mark each keyword/alias with policy tags:
  - `canonical`
  - `alias`
  - `deprecated`
  - `compat-only`
- expose this policy in docs and editor hover/completion.

### C. Missing conformance tests between docs and runtime

Recommendation:

- Add a CI test that parses docs keyword registry and asserts equality with core registry.
- Add an alias parity test to fail when docs aliases and runtime aliases diverge.

### D. Feature docs that look implemented but are not parser-level features

Examples in current docs surface:

- `input:`, `output:`, `tool:`, `prompt:`, `memory:`, `group:` as if first-class parser keywords

Recommendation:

- Either implement now, or mark clearly as `planned`/`proposal` and remove from canonical reference pages.

## Keyword Quality Review (Naming + Selection)

## Good keyword choices

- Strong, intuitive: `title`, `summary`, `section`, `sub`, `note`, `quote`, `deadline`, `approve`, `freeze`, `amendment`.
- Good trust vocabulary: `track`, `sign`, `history`.
- Good workflow vocabulary: `step`, `decision`, `gate`, `emit`, `handoff`, `retry`.

## Keywords to reconsider (naming clarity)

- `break`:
  - Meaning is page break/print control, not generic structural break.
  - Consider clearer canonical naming in future (`page-break`) while keeping `break` as alias.

- `done`:
  - Overloaded between task completion semantics and agent workflow completion.
  - Keep for compatibility, but consider guidance to prefer `result` in agent workflows.

- `status` alias to `emit`:
  - Ambiguous and overloaded (status appears as property elsewhere).
  - Keep only as deprecated alias with explicit docs warning.

- `headers` / `row` vs `table`:
  - Runtime model is powerful, but docs marketing “table keyword” as canonical causes confusion.
  - Either add real `table:` keyword or make docs consistently teach `headers:` + `row:` and markdown-pipe rows.

- `cite` as canonical docs keyword while runtime maps `cite` to `quote`:
  - This is one of the biggest semantic mismatches.
  - Decide one model: either implement true `cite` block type or document it as alias only.

## Keywords you should likely add (or officially reject)

These appear intentional in docs and likely needed by users:

- `input`
- `output`
- `tool`
- `prompt`
- `memory`
- `group`
- `table` (as actual keyword, not only inferred structure)

If not implementing soon, move them into a `Planned Keywords` page and remove from canonical reference.

## Keywords/aliases that are probably not ideal as canonical

Keep as aliases or compat-only, not canonical-first in docs:

- `h1`, `h2`, `h3`, `p`
- `question`, `subsection`, `status`
- shorthand variants with punctuation-like semantics (`sig`, etc.)

## Priority Action Plan

1. Freeze language contract for next release:

- Define authoritative keyword+alias registry in core.

2. Reconcile docs in one pass:

- Regenerate keyword table and alias table from registry.
- Correct counts and remove duplicate `context` counting confusion.

3. Decide docs-only keywords (`input/output/group/tool/prompt/memory/table`):

- either implement parser support + tests,
- or mark as planned and remove from canonical reference.

4. Add CI parity tests:

- runtime registry vs docs artifacts parity.

5. Publish keyword lifecycle policy:

- stable/alias/deprecated/compat-only labels.

## Suggested Immediate Backlog Tickets

- `language-registry`: create canonical machine-readable registry and export helpers.
- `docs-sync`: generate `KeywordTable` and aliases docs from registry.
- `keyword-parity-test`: failing test when docs/runtime drift.
- `history-keyword-consistency`: include `history` in keyword introspection path or clearly isolate boundary keywords.
- `table-keyword-decision`: either implement `table:` canonical or de-canonicalize it in docs.
- `docs-keyword-cleanup-v212`: align category pages with actual parser behavior.

## Bottom Line

The project itself is promising and technically credible. The immediate risk is language trust: users need one exact answer to “what keywords are valid?”.

Fixing keyword/alias governance and docs-runtime parity will produce a disproportionate gain in reliability, adoption confidence, and ecosystem stability.
