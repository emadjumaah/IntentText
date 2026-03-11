# Print Builder + Core Alignment Execution Plan

Target outcome: ship a production-ready online builder and runtime PDF API that both use the same IntentText core rendering pipeline.

Status: proposed
Date: 11/03/2026
Owner: Emad

## 1) Product Contract (Non-Negotiable)

1. Builder preview and `createPdf(template, data)` must produce visually equivalent output.
2. Template rendering behavior is defined by one shared core path only.
3. No separate ad-hoc frontend renderer/CSS fork.
4. Template artifacts are opaque to users (format hidden in product UX).

## 2) V1 API Contract

Primary package: `@intenttext/pdf` (name can change later)

- `validateTemplate(template: string): ValidationResult`
- `renderHtml(template: string, data: object, options?): string`
- `createPdf(template: string, data: object, options?): Promise<Uint8Array | Buffer>`

V1 options (operational only):

- `timeoutMs`
- `debug`
- `locale`
- `paper` override (optional, only if explicitly allowed by product policy)

V1 non-goals:

- exposing raw `.it` format requirements to end users
- shortcut grammar additions
- multiline grammar redesign

## 3) Execution Streams

### Stream A: Core Readiness

Goal: harden core for builder/runtime use at ERP scale.

Tasks:

- lock template merge/render behavior for invoice-like docs
- confirm `each:` table expansion semantics and edge cases
- add strict template validation report (`missing vars`, `type hints`, `unknown blocks/properties`)
- add deterministic rendering mode for preview/PDF parity
- define template metadata contract for page, margins, fonts, theme
- finalize font policy in M1 (bundled fonts only for V1 runtime path)

Deliverables:

- core validation API output schema
- rendering parity fixtures (preview vs PDF HTML preflight)
- deterministic mode documentation

Exit gate:

- regression suite green
- parity fixtures green
- no unresolved variable behavior drift in V1 templates
- font policy frozen and documented (no system-font dependency)

### Stream B: PDF Runtime Package

Goal: ship easy API for ERP devs.

Tasks:

- implement `renderHtml()` wrapper over shared core
- implement `createPdf()` wrapper (Chromium/Puppeteer backend for V1)
- support font registration and deterministic font loading
- add serverless/container guidance and fallback config
- add structured errors (template error, data error, render error, pdf backend error)
- add browser pool controls (max browsers/pages, queueing)
- add crash recovery and retry policy for browser/page failures
- add memory and timeout guards per request and per browser worker

Deliverables:

- `@intenttext/pdf` package
- examples for Node server route + storage
- operational docs (Docker/serverless)

Exit gate:

- runtime tests pass in local + CI container
- PDF generation stable across at least 3 sample template families (invoice, receipt, quote)
- load/concurrency smoke tests pass with browser pool enabled

### Stream C: Online Builder

Goal: business users create templates without learning format internals.

Tasks:

- visual block editor + variable insertion UI
- live preview powered by same `renderHtml()` path
- variable inventory panel (`required`, `optional`, `repeated`)
- export/import template artifact (opaque string/json blob)
- template test-data panel for quick preview checks

Deliverables:

- hosted builder MVP (`print.intenttext.dev`)
- template artifact export flow
- template validation display (human-readable issues)

Exit gate:

- builder preview snapshots match runtime HTML snapshots for golden templates
- no client-only CSS divergence

### Stream D: Versioning + Determinism

Goal: prevent visual drift over time.

Tasks:

- embed `template_version`, `renderer_version`, `theme_version` in artifact metadata
- add replay endpoint/test: same template+data+versions => same HTML structure
- freeze V1 theme token set
- add migration hooks for future renderer versions

Deliverables:

- versioning spec
- replay tests

Exit gate:

- deterministic replay green on golden templates

### Stream E: Adoption Path

Goal: make ERP integration trivial.

Tasks:

- starter SDK examples for Express/Nest/Fastify
- DB schema snippet for template storage + versioning
- production checklist (fonts, cache, timeouts, retry)
- template marketplace starter pack (invoice/receipt/purchase order)

Deliverables:

- quickstart docs
- 5-minute integration guide

Exit gate:

- external dev can integrate generate-and-download PDF flow in < 30 minutes

### Stream F: Runtime Operations Hardening

Goal: ensure PDF generation survives real production load.

Tasks:

- define browser pool defaults and hard limits
- implement queue/backpressure behavior under burst traffic
- add health checks and graceful degradation when browser workers fail
- add observability: render duration, queue wait, crash count, OOM/timeouts

Deliverables:

- operations runbook
- default production config profile
- stress-test report

Exit gate:

- sustained concurrency test passes without crash loops
- crash recovery verified in automated fault-injection test

## 4) Milestones

M1 - Core contract freeze (1-2 weeks)

- validation schema finalized
- `each:` behavior and edge cases documented
- deterministic rendering flags finalized
- font policy finalized (bundled V1 font set, no CDN/system fallback in render path)
- template storage schema finalized

M2 - Runtime package beta (2 weeks)

- `validateTemplate`, `renderHtml`, `createPdf` working
- CI-tested in Linux container

M3 - Builder MVP alpha (2 weeks)

- block editor + live preview + variable panel + export
- parity tests wired

M4 - End-to-end beta (1-2 weeks)

- sample ERP integration complete
- golden snapshot parity gate active

M5 - V1 launch readiness (1 week)

- docs complete
- templates starter pack
- operational hardening

## 5) Critical Technical Decisions

1. Single source rendering:

- Builder preview must call shared rendering service/module, not custom frontend renderer.

2. Font policy:

- V1 decision: bundle a fixed font set (3-5 families) with the runtime.
- no Google Fonts CDN in render path.
- no host OS font dependency for parity-critical templates.

3. Template artifact format:

- opaque externally; internally versioned and signed.

4. Template storage schema (M1 contract):

- minimum fields: `id`, `name`, `content`, `renderer_version`, `theme_version`, `created_at`, `tenant_id`.
- recommended fields: `updated_at`, `status`, `checksum`, `metadata_json`.

5. Array/repeat policy:

- V1 uses existing `each:` table expansion.
- General block-level repeat deferred until real demand.

## 6) CI Gates

1. Golden template parity tests:

- builder preview HTML snapshot == runtime HTML snapshot (normalized)

2. PDF smoke tests:

- generate PDFs for golden templates in CI container

3. Validation contract tests:

- known invalid templates return expected structured errors

4. Determinism tests:

- repeated renders produce stable structure under pinned versions

## 7) Risks + Mitigation

Risk: preview/PDF drift

- Mitigation: single shared renderer + parity snapshot gate

Risk: font/layout drift across environments

- Mitigation: bundled fonts + containerized render runtime

Risk: template complexity explosion

- Mitigation: freeze V1 grammar scope; no shortcut/multiline changes in this initiative

Risk: performance under high volume

- Mitigation: template compile/cache layer + browser pool management

## 8) Immediate Next 7 Tasks (Execution Start)

1. Finalize V1 font bundle decision and ship assets in repo/package.
2. Define V1 template metadata schema (`page`, `font`, `theme`, `versions`).
3. Finalize template storage schema contract and add SQL snippet.
4. Add `validateTemplate()` structured output in core.
5. Build `renderHtml()` + `createPdf()` wrapper package skeleton with browser pool.
6. Create 10 golden templates and wire parity test harness (builder vs runtime).
7. Start builder MVP with export + variable panel.

## 9) Definition of Done (V1)

- Builder and runtime use the same core rendering behavior.
- External developer can generate PDF via one function call.
- Templates are editable visually and storable in DB.
- PDF output is stable and production-safe with documented constraints.

## 10) Next Iteration (Post-V1)

Repeat control cleanup for tables:

- Add property-based repeat contract on `table:` blocks (example: `repeat: names | as: name`).
- Keep current header-based `each:` behavior for backward compatibility during transition.
- Mark header-based `each:` as legacy in docs once property-based repeat ships.
- Add parity tests to ensure both forms produce identical row expansion output.

Rationale:

- Separate control metadata from presentation headers.
- Avoid hidden-header side effects in current `each:`-in-header approach.

table: | repeat: names | as: name
row: | col1: Name
row: | col1: {{name}}
