# Step 4 Renderer Parity Blockers (Rust-Only Cutover)

Last updated: `10/03/2026`
Source run: `pnpm -C packages/core test -- rust-core-telemetry.test.ts rust-core-theme-parity.test.ts v2.12.test.ts`
Mode: temporary no-renderer-fallback validation (captured before emergency fallback was restored)

Summary:

- Total failing tests when TS renderer fallback was removed: `25`
- Current open blockers after item-3 burn-down: `0`
- Remaining failing files in no-fallback renderer validation: `none`
- Blocking condition for Step 4 exit: `renderHTML` emergency TS fallback must stay removed (validated)

## Blockers By Suite

### `tests/document-generation.test.ts` (`10`)

- [x] `Layout Blocks > renderHTML() does not render font: or page: blocks as visible content`
- [x] `Writer Blocks > byline: renders as <div class='it-byline'> with correct child elements`
- [x] `Writer Blocks > epigraph: renders as <blockquote class='it-epigraph'>`
- [x] `Writer Blocks > caption: renders as <figcaption class='it-caption'>`
- [x] `Writer Blocks > footnote: blocks are collected and rendered as footnotes section`
- [x] `Writer Blocks > dedication: renders with it-dedication class`
- [x] `Integration > full book chapter: dedication, toc, epigraph, byline, footnote all render`
- [x] `Integration > full journalism article: byline, caption, [^1] inline ref, footnote`
- [x] `Integration > renderHTML includes footnotes section at end`
- [x] `Integration > multiple footnote refs link to correct footnotes`

### `tests/v2.11.test.ts` (`15`)

- [x] `v2.11 ref: — cross-document reference > ref: renders correctly in web output with link`
- [x] `v2.11 def: — definitions and glossary terms > def: with abbr: renders abbreviation`
- [x] `v2.11 def: — definitions and glossary terms > grouped def: blocks in a section render as glossary`
- [x] `v2.11 figure: — document figures > figure: renders as <figure> with <img> and <figcaption> in web output`
- [x] `v2.11 figure: — document figures > auto-numbering: multiple figures each render with captions`
- [x] `v2.11 signline: — physical signature placeholders > signline: renders signature line, name, role in web output`
- [x] `v2.11 signline: — physical signature placeholders > date-line: true renders date line in web output`
- [x] `v2.11 signline: — physical signature placeholders > date-line: false or absent renders no date line`
- [x] `v2.11 signline: — physical signature placeholders > signline: with no content renders Signature label`
- [x] `v2.11 contact: — contact information > contact: with email renders clickable mailto: link`
- [x] `v2.11 contact: — contact information > contact: with phone renders clickable tel: link`
- [x] `v2.11 contact: — contact information > multiple contact: blocks in a section render as contact list`
- [x] `v2.11 deadline: — temporal commitments > deadline: with near-future date renders with urgency styling`
- [x] `v2.11 deadline: — temporal commitments > deadline: with far-future date renders normally`
- [x] `v2.11 deadline: — temporal commitments > deadline: with consequence renders consequence text`

## Burn-Down Order

All batches complete.

## Exit Criteria Mapping

- Renderer parity side of Step 4 is complete: list is `0` open and `renderHTML` emergency fallback is removed from `packages/core/src/rust-core.ts`.
