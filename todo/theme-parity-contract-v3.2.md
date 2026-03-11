# Theme Parity Contract (v3.2)

Purpose:

- Define exact parity expectations between TS renderer theme behavior and Rust renderer theme behavior.
- Serve as the acceptance contract before removing TS theme fallback.

Scope:

- `@intenttext/core` render path only.
- Applies to `renderHTML(doc, options)` and metadata theme selection via `doc.metadata.meta.theme`.

## Resolution Order

Theme resolution must follow this precedence (highest to lowest):

1. `renderHTML(doc, { theme })` explicit option
2. `doc.metadata.meta.theme`
3. renderer default theme

If explicit option exists and resolves successfully, metadata theme must not override it.

## Supported Theme Inputs

- Theme name string (builtin)
- Theme object (IntentTheme)

Behavior:

- Unknown theme name: fallback to default theme, emit deterministic warning/diagnostic path (no crash).
- Invalid theme object shape: fallback to default theme, no panic.

## CSS Output Invariants

Given identical document + theme input, Rust and TS renderers must match on:

- selected theme identity
- generated CSS variable set keys
- semantic style intent for headings/body/code/callouts/links

Allowed difference window:

- insignificant whitespace/order differences in CSS text.

Not allowed:

- different computed color tokens for same key
- missing required typography tokens
- missing layout spacing tokens

## Metadata Theme Fallback Removal Gate

Before removing `metadata.meta.theme` TS fallback path:

- Snapshot parity suite must pass for all builtin themes.
- At least one fixture per document shape:
  - simple title/section/text
  - callout-heavy doc
  - code + quote + link doc
  - print-layout doc with page/header/footer/watermark

## Test Matrix

For each builtin theme:

- TS render output snapshot
- Rust render output snapshot
- Normalized diff check (ignoring whitespace and declaration ordering)

Required pass criteria:

- 100% pass on normalized parity checks.
- zero critical visual regressions in manual spot checks (top 3 themes by usage).

## Failure Policy

If parity fails:

- keep fallback path active
- create blocker ticket with fixture id, theme name, and differing CSS keys
- rerun parity suite after patch

## Exit Criteria (Step 3)

- Theme contract is implemented in Rust.
- Parity suite green for all builtin themes.
- `renderer_theme_fallback_to_ts` counter remains zero in CI.
