# v3 Unified Execution Plan (PDF Product + Language Stability)

Date: 11/03/2026
Status: active execution
Owner: Emad

This roadmap unifies three tracks in one sequence:

- PDF product track (builder + `createPdf` runtime)
- `v3.3` implicit text track
- `v3.4` property continuation track

Guardrail source: `IntentText/todo/old.md`

Core rule: keep scope boring, stable, and professional. No shortcut syntax work in this roadmap.

## 1) Priority Order (Do Not Reorder)

1. M1 PDF/Core contract freeze and parity foundations.
2. M2-M5 PDF runtime + builder delivery.
3. `v3.3` implicit text (parser-only additive change).
4. `v3.4` continuation properties (strict, additive syntax).

Rationale:

- Product adoption risk is preview/PDF drift, not missing syntax sugar.
- Language-level grammar upgrades are useful but not blocking for PDF product value.

## 2) Phase Plan

## Phase A: M1 PDF/Core Contract Freeze (Start Now)

Duration: 1-2 weeks

Required outcomes:

- Single-renderer contract frozen (builder preview and runtime share same core path).
- Font policy frozen: bundled fonts only (no CDN/system dependency in render path).
- Template storage schema frozen.
- `validateTemplate()` structured output contract frozen.
- page layout contract frozen (header/footer/full-page background behavior).
- Golden parity harness baseline in place.

M1 hard gates:

- parity fixtures green
- unresolved-variable behavior stable
- font drift risk closed by design
- header/footer/background contract documented and enforced in builder/runtime inputs

## Phase B: PDF Product Delivery (M2-M5)

Duration: 6-7 weeks total (as planned)

Scope:

- `renderHtml` via `IntentText core` + `createPdf` via runtime wrapper package
- browser pool + ops hardening
- online builder MVP with variable panel and export
- deterministic versioning/replay
- quickstart + integration examples

Release target:

- usable V1 package and hosted builder MVP

## Phase C: v3.3 Implicit Text

Trigger:

- PDF V1 beta is stable and parity gates are green for two consecutive cycles.

Scope:

- parser-only additive implicit text behavior
- no serializer rewrite
- no new shortcuts

Must keep:

- unknown `word:` behavior unchanged
- empty line behavior unchanged
- trust/hash behavior unchanged for explicit source

## Phase D: v3.4 Property Continuation

Trigger:

- v3.3 shipped and stable

Scope:

- indented `| key: value` continuation lines
- strict grammar only
- default serializer remains canonical one-line

Must keep:

- no multiline content grammar redesign
- no implicit state/default blocks

## 3) Folder and Document Layout

Use this folder structure to keep planning clean:

- `IntentText/todo/master-plans/v3-unified-execution-plan.md` (this file)
- `IntentText/todo/print-builder-core-alignment-plan.md` (detailed PDF execution)
- `IntentText/todo/v3.3-implicit-text-plan.md` (language delta)
- `IntentText/todo/v3.4-property-continuation-plan.md` (language delta)

Rule:

- master plan controls order and gate criteria.
- detail plans contain implementation specifics.

## 4) Non-Goals for This Unified Plan

- no shortcut syntax (`#`, `>`, `-`, `!`, `@owner` shorthand)
- no generalized `end:` redesign
- no broad keyword expansion
- no parallel grammar initiatives during M1-M5 PDF delivery

## 5) Risk Control Checklist

Before starting any new feature, verify:

1. Does this reduce preview/PDF drift risk?
2. Does this improve deterministic rendering?
3. Is this required for ERP developer adoption now?
4. Does this avoid parser complexity growth?

If "no" to 1-3 and "yes" to 4, defer.

## 6) Immediate Next 10 Work Items (Action Queue)

1. Finalize bundled font set and commit font policy.
2. Finalize template storage schema (minimum + recommended fields).
3. Define `validateTemplate` response schema and error taxonomy.
4. Implement parity harness baseline (builder preview vs runtime HTML).
5. Create 10 golden document templates (invoice/receipt/quote set).
6. Build runtime package skeleton with browser pool controls.
7. Add runtime observability fields (duration, queue wait, crash count).
8. Build builder MVP shell (editor + variable panel + export).
9. Add CI gates for parity, PDF smoke, determinism.
10. Lock v3.3/v3.4 to "deferred until PDF beta stability" in release notes planning.
11. Finalize page layout contract for header/footer/full-page background and wire into template metadata validation.

## 7) Success Criteria

- PDF product track reaches V1 without rendering drift incidents.
- External developer can generate PDF with one API call and stable output.
- Language upgrades (`v3.3`, `v3.4`) ship later as controlled additive improvements.

## 8) M1 Progress Notes

11/03/2026 updates:

- Completed #2: template storage schema contract documented with SQL snippet (`intenttext-builder/docs/TEMPLATE_STORAGE_SCHEMA.md`).
- Completed #3: `validateTemplate` contract formalized with issue taxonomy and variable inventory (`intenttext-builder/docs/VALIDATION_CONTRACT.md`).
- Implemented contract in both local API server and Vercel API routes (`variables.all|required|optional|repeated`, issue `category`).
- Added page layout contract baseline for builder/runtime parity (`intenttext-builder/docs/PAGE_LAYOUT_CONTRACT.md`).
- Enforced page-layout contract validation in `validate-template` (page size, margins, safe area, header/footer/background fit and image constraints, opacity rules).
- Started #4: added initial golden fixture pack (`invoice/receipt/quote + repeat + letterhead`) and parity harness skeleton (`intenttext-builder/scripts/parity-check.mjs`).
- Expanded #4 fixture pack to 10 templates and added CI gate (`intenttext-builder/.github/workflows/ci.yml`) to run `build` + `parity:check`.
- Completed #6 baseline: runtime package skeleton added at `intenttext-builder/packages/pdf-runtime` with typed browser pool controls.
- Started #7 baseline: runtime metrics contract (`durationMs`, `queueWaitMs`, `crashCount`) exposed from `createPdf` in skeleton docs/code.
- Added `/api/render-pdf` in local API and Vercel API routes, wired to runtime package output (`pdfBase64` + metrics).
- Added PDF smoke harness (`intenttext-builder/scripts/pdf-smoke.mjs`) and CI step (`npm run pdf:smoke`) after runtime build.
- Implemented runtime retry behavior in `createPdf` using `retryAttempts` with bounded backoff.
- Added retry-focused unit test harness in `packages/pdf-runtime` and CI execution (`npm --prefix packages/pdf-runtime test`).
- Added `createPdf` integration-style retry tests (first-attempt failure, second-attempt success path) using test hooks in runtime package.
- Added determinism gate (`intenttext-builder/scripts/determinism-check.mjs`) and CI step (`npm run determinism:check`).
- Added optional smoke PDF artifact output and CI artifact upload for inspection (`pdf-smoke-artifact`).
- Completed #1: font policy freeze and enforcement (`intenttext-builder/docs/FONT_POLICY.md`, `npm run font-policy:check`, CI gate).
- Added builder template artifact export/import UI with version metadata (`intenttext-builder/src/App.tsx`, `docs/TEMPLATE_ARTIFACT_FORMAT.md`).
- Added artifact checksum/signature generation and import verification (`checksum_sha256`, `integrity_signature`) in builder export/import flow.
- Added artifact export modes (`template_only`, `template_with_sample_data`) with integrity-preserving canonical hashing.
- Added structured `render-pdf` runtime error contract (`template_error`, `data_error`, `render_error`, `pdf_backend_error`) with CI contract checks.
- Added `template_version` metadata to builder artifacts with integrity-preserving hashing and import verification.
- Added `/replay-html` endpoint + `replay:check` CI gate for versioned deterministic replay (`template_version`, `renderer_version`, `theme_version`).
- Added migration-hook skeleton (`intenttext-builder/api/migration-hooks.js`) and wired replay flow to return migration metadata (`from`, `to`, `applied_hooks`).
- Added first concrete migration hooks for legacy artifact version metadata (camelCase key normalization and deterministic default version fill), with replay gate coverage.

## 9) Core Language Notes (Post-PDF Gate)

- Table-canonical proposal captured for post-PDF evaluation: prefer `table:` for repeated row modeling and keep `each:`/`repeat:` interoperable.
- Header-as-row patterns should remain backward compatible during any transition and only be deprecated after migration tooling + parity proof.
- Governing update rules documented in `todo/core-update-rules.md` and anchored to `todo/old.md` guardrails.

## 10) Current Position (As Of 11/03/2026)

Current phase checkpoint:

- Phase A (M1 contract freeze): effectively complete and gated.
- Phase B (M2-M5): exit checklist executed; delivery scope can be marked complete.
- Phase C trigger status: pending confirmation of "parity green for two consecutive cycles" before grammar work starts.

Completed in current sequence:

1. Runtime error contract for `render-pdf` + CI gate.
2. Replay endpoint contract (`/replay-html`) + deterministic replay gate.
3. Migration framework:
   - shared migration hooks module
   - replay migration metadata (`from`, `to`, `applied_hooks`)
   - concrete legacy version hooks (camelCase normalization + deterministic default fill)

Next queued sequence (immediate):

1. Completed: migration fixture pack (legacy + canonical artifacts) for reproducible migration cases.
2. Completed: dedicated `migration:check` script and CI gate (separate from replay gate).
3. Completed: wired builder import path to shared migration pipeline so old artifacts upgrade consistently in UI and API.
4. Completed: added builder import migration visibility panel (applied hooks + version transition + integrity mode) for operator transparency.
5. Completed: added one-click "Re-export Upgraded Artifact" action after legacy/migrated import to normalize and re-sign artifacts immediately.

## 11) Core/Builder Alignment Rule (Critical)

ERP runtime model (non-negotiable):

- Builder is a template producer.
- ERP uses `IntentText core` (+ runtime wrapper for PDF) to produce final documents.
- Therefore any style/layout feature exposed in builder must be represented in core-readable template semantics, not builder-only UI state.

Current status:

- Aligned today for rendering path: builder preview and runtime APIs already call `core.parseAndMerge` + `core.renderHTML`.
- Clarification: `IntentText core` exposes parse/merge/render (HTML/print semantics), while `createPdf` is implemented in runtime package (`intenttext-builder/packages/pdf-runtime`) that converts core HTML to PDF.
- Partially aligned for style semantics: contracts for page/header/footer/background are documented and validated, but we still need a stricter "core-awareness gate" for any future builder style controls.

New hard rule for upcoming work:

1. No builder style control ships unless there is a mapped core keyword/property and fixture coverage.
2. No builder-only CSS metadata may affect final output unless persisted as core-readable template properties.
3. Every style feature must pass parity and PDF smoke gates from the same template artifact.

Immediate next sequence (core-style alignment):

1. Completed: added `intenttext-builder/docs/CORE_STYLE_COMPATIBILITY.md` mapping builder controls -> core properties/keywords.
2. Completed: added style-focused parity fixtures (layout zones + inline style properties) to golden pack and parity/core-style gates.
3. Completed: added `core-style:check` gate (local + CI) that rejects unsupported builder style metadata in templates.

## 12) Next Sequence (ERP Adoption)

1. Completed: added ERP integration flow guide (`intenttext-builder/docs/ERP_INTEGRATION_FLOW.md`) clarifying core HTML vs runtime PDF responsibilities.
2. Completed: added runnable backend integration example (`intenttext-builder/examples/erp-print-node.mjs`) for HTML and PDF paths.
3. Completed: added API-level ERP quickstart doc (`intenttext-builder/docs/ERP_API_QUICKSTART.md`) with payloads/responses for `/api/render-html` and `/api/render-pdf`.
4. Completed: added replay/versioning API quickstart (`intenttext-builder/docs/ERP_REPLAY_QUICKSTART.md`) for `/api/replay-html` audit/debug workflows.
5. Completed: added compact ERP production checklist (`intenttext-builder/docs/ERP_PRODUCTION_CHECKLIST.md`) covering fonts, assets, retries, timeouts, observability, replay, and security.
6. Completed: added copy-paste ERP backend handlers (Express/Fastify) and wiring guide (`examples/erp-express-handlers.mjs`, `examples/erp-fastify-handlers.mjs`, `docs/ERP_BACKEND_HANDLERS.md`).
7. Completed: added ERP contract check script (`npm run erp-contract:check`) and CI gate validating `/api/render-html`, `/api/render-pdf`, and `/api/replay-html` response shapes.
8. Completed: added minimal standalone ERP sample service package (`examples/erp-sample-service/`) with handlers + config + run instructions.
9. Completed: ran final Phase B exit checklist and marked Phase B delivery scope complete.

## 13) Phase B Exit Checklist (Final)

Checklist run from `intenttext-builder` root:

- `npm run build`
- `npm run parity:check`
- `npm run font-policy:check`
- `npm run core-style:check`
- `npm run determinism:check`
- `npm run migration:check`
- `npm run runtime-error:check`
- `npm run replay:check`
- `npm run pdf-runtime:build`
- `npm run pdf:smoke`
- `npm run erp-contract:check`

Result summary:

- All checks passed in local execution.
- ERP adoption package is complete, including standalone sample service (`examples/erp-sample-service/`).
- Decision: Phase B can be marked complete for roadmap delivery scope.
- Guardrail kept: Phase C work remains blocked until parity gates are green for two consecutive cycles (per section 2 trigger).
