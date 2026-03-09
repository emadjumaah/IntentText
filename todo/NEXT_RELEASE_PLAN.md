# NEXT_RELEASE_PLAN

## Goal

Ship a stable Rust-first core now, then move to a smaller Rust-only core safely in later releases.

Baseline release: `3.1.0` (Rust default in core is shipped).

## Current State

- Rust parser/renderer are default in core routing.
- TS fallback paths still exist for safety and compatibility.
- Full suite is green in default mode.
- CLI is still JavaScript (`cli.js`) and should migrate to Rust in phases.

## Notes To Keep

- Python cutover note: remaining failures were narrowed to Rust output shape differences (alias normalization, table structure, and metadata-only keywords).
- Action note: normalize Rust block payloads in the Python bridge so existing Python helpers/tests keep working while Rust stays the source of truth.
- Packaging direction note: npm core package should keep only a thin compatibility layer around Rust/WASM implementation.
- Packaging direction note: Python package should keep only a thin bridge layer and remove duplicated Python parser/runtime implementation over time.
- Date format policy note: default format is UK style `DD/MM/YYYY` (example: `14/03/2026`), not US `MM/DD/YYYY`.

## Release Phases

### Phase 1: Stabilize Rust Default (Next Release)

- Keep current behavior: Rust default, TS override/fallback available.
- Add runtime counters/logging for fallback usage:
  - parser option fallback to TS
  - renderer option fallback to TS
  - `metadata.meta.theme` fallback to TS renderer
  - WASM load/call failure fallback to TS
- Document known fallback triggers and expected environments.

Exit criteria:

- No critical regressions in Rust default mode.
- Fallback usage is measured and visible.

### Phase 2: Reduce TS Surface (Release +1)

- Move theme rendering behavior to Rust (or define exact parity contract).
- Remove parser/renderer fallback paths that are no longer used in production.
- Keep only a minimal emergency fallback switch if needed.
- Start npm package slimming:
  - remove non-essential TS runtime code from published core package
  - keep only thin JS/TS loader + compatibility surface over Rust/WASM core
- Start Rust CLI rewrite (`intenttext-rust` binary):
  - implement `parse`, `render`, `query`, `validate`, `index`, `ask`
  - keep JS wrapper as thin compatibility launcher during transition
- Run parity tests in CI for:
  - Rust default path
  - Optional forced-TS path (temporary)

Exit criteria:

- Theme path has Rust parity.
- TS fallback usage is near-zero or justified only by edge environments.

### Phase 3: Rust-Only Core (Release +2)

- Remove TS parser/renderer runtime code from core package.
- Remove env/global routing for engine selection if no longer needed.
- Keep one architecture path: Rust/WASM.
- Complete npm thin-layer target:
  - ship only bridge/loader code in npm package
  - avoid shipping redundant TS parser/renderer logic
- Start Python thin-layer target:
  - deprecate/remove duplicated Python parser/renderer logic
  - keep bridge package focused on Rust-core invocation and Python-friendly API mapping
- Update docs to declare Rust-only core.
- Complete Rust CLI migration:
  - port trust/amend/history/seal/verify command behavior
  - deprecate and remove heavy JS CLI logic after parity sign-off

Exit criteria:

- Package size reduced measurably.
- No remaining runtime dependency on TS parser/renderer.
- npm and Python packages both verified as thin-layer bridges over Rust-core.

### Phase 4: Format and Locale Contract (Release +3)

- Define and enforce canonical date format across parser/render/docs/examples:
  - default: UK `DD/MM/YYYY`
  - include migration/lint guidance for old US-style examples
- Add explicit tests for date parsing/rendering and locale-sensitive examples.
- Update docs, templates, and sample files to UK-first defaults.

Exit criteria:

- UK date format is the default in docs/templates/output examples.
- No ambiguous default date examples remain in core docs and SDK docs.

## CI and Quality Gates

- Add required checks per PR:
  - full unit/integration suite
  - Rust/WASM build validation
  - snapshot/parity checks for parser and renderer output
- Keep a weekly parity dashboard:
  - failed parity cases
  - fallback-trigger counts
  - top regressions and owners

## Package Size Work

- Track baseline package size before each phase.
- Track size after each change (compressed + unpacked).
- Set target reductions for each phase and fail CI if size regresses unexpectedly.

## Risks and Mitigations

- Risk: subtle behavior regressions in niche formatting or metadata.
  - Mitigation: expand fixture coverage before removing TS code paths.
- Risk: WASM runtime compatibility edge cases.
  - Mitigation: keep temporary emergency switch until confidence window closes.
- Risk: removal done too early.
  - Mitigation: require fallback telemetry threshold before deletion.
- Risk: dependency bump exposed a behavioral regression test under Rust-default validation in MCP.
  - Mitigation: patch MCP to force TS validation path for that tool until Rust semantic parity for this case is complete.

## Suggested Milestones

- M1: telemetry + docs complete.
- M1.5: Rust CLI skeleton (`main.rs` + command parser) with parity tests for parse/render/query/validate.
- M2: theme in Rust + fallback usage near-zero.
- M3: TS parser/renderer runtime removed.
- M4: JS CLI reduced to thin wrapper (or removed), docs updated for Rust CLI.
- M5: npm + Python thin-layer packaging complete.
- M6: UK date-format contract (`DD/MM/YYYY`) rolled out across ecosystem docs/templates.

## Owner Checklist

- [ ] Add fallback telemetry.
- [ ] Define theme parity contract.
- [ ] Port theme behavior to Rust or remove TS dependency.
- [ ] Implement Rust CLI skeleton and command parser.
- [ ] Reach parity for core CLI commands (`parse`, `render`, `query`, `validate`, `index`, `ask`).
- [ ] Port trust CLI commands (`seal`, `verify`, `history`, `amend`).
- [ ] Keep or remove JS wrapper based on adoption and compatibility data.
- [ ] Add CI gates for parity and size.
- [ ] Remove parser/renderer TS fallback.
- [ ] Remove engine routing flags.
- [ ] Slim npm core package to thin layer only (Rust/WASM bridge + compatibility API).
- [ ] Slim Python package to thin layer only (Rust bridge + compatibility API mapping).
- [ ] Add and enforce UK date-format default (`DD/MM/YYYY`) across parser/render/docs/templates.
- [ ] Final docs and changelog updates.
