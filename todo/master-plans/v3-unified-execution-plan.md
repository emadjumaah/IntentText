# v3 Concrete Execution Plan (Rust Core First)

Date: 2026-03-12
Status: active execution
Owner: Emad

This plan replaces the previous unified roadmap with a strict execution flow.
Follow only the phases and checklists below, in order.

## 1) Ground Rules

1. Order is fixed: `v3.3` -> `v3.4` -> `v3.5`.
2. Rust core is the source of truth for parser/merge/render behavior.
3. No new TS or Python language features.
4. TS/Python are compatibility shells only until removal checkpoints in this plan.
5. No shortcut syntax, no multiline grammar redesign, no generalized `end:` redesign.

## 2) Carry-Over Items (Not Completed Yet)

These are the remaining open items inherited from the previous plan:

1. Confirm phase trigger: parity gates green for two consecutive cycles on Rust-backed flow.
2. Execute `v3.3` implicit text delivery (not started).
3. Execute `v3.4` property continuation delivery (not started).
4. Replace deferred-language release-note placeholder with concrete shipped versions.
5. Remove extra TS/Python implementation files once Rust parity and adoption gates pass.

## 3) Entry Gate Before v3.3

Do not start implementation for `v3.3` until all items below are checked.

- [ ] Run cycle 1 gates (Rust-backed): parity, replay, determinism, migration, runtime-error, pdf-smoke, erp-contract.
- [ ] Run cycle 2 gates (same suite, separate CI cycle).
- [ ] Record both cycle run IDs and outcomes in release notes draft.
- [ ] Confirm no preview/PDF drift regressions in golden fixtures.

Command baseline for each cycle (from `intenttext-builder`):

- `npm run parity:check`
- `npm run replay:check`
- `npm run determinism:check`
- `npm run migration:check`
- `npm run runtime-error:check`
- `npm run pdf:smoke`
- `npm run erp-contract:check`

## 4) Phase v3.3 - Implicit Text (Rust Parser Only)

Objective:
Ship additive implicit text behavior without changing trust/hash stability for explicit source.

Scope:

- parser-only additive behavior
- no serializer rewrite
- unknown `word:` behavior unchanged
- empty-line behavior unchanged

Work packages:

1. Spec freeze (`v3.3`):

- [ ] Write final grammar examples and edge-case matrix.
- [ ] Mark exact acceptance examples for `implicit text` in docs.

2. Rust implementation:

- [ ] Implement parser changes in `intenttext-rust/src/parser.rs` (and related modules only as needed).
- [ ] Add/adjust parser tests in `intenttext-rust/tests/` for positive and negative cases.
- [ ] Verify trust/hash invariants for explicit syntax remain unchanged.

3. Cross-runtime compatibility checks (temporary):

- [ ] Run fixture comparisons between Rust output and existing JS/Python consumers.
- [ ] Patch adapters only if required to consume Rust-compatible output.
- [ ] Do not add new parsing logic in TS/Python.

4. Release and docs:

- [ ] Update docs for `v3.3` behavior with before/after examples.
- [ ] Add migration notes: explicit syntax remains canonical and stable.
- [ ] Tag `v3.3` as shipped.

TS/Python removal placement in v3.3:

- [ ] Remove TS/Python duplicate parser branches for behaviors now guaranteed by Rust `v3.3`.
- [ ] Keep only thin wrappers and compatibility interfaces needed by downstream packages.

Exit gate (`v3.3`):

- [ ] Rust tests green.
- [ ] Golden parity unchanged where behavior is not meant to change.
- [ ] New `v3.3` fixtures pass.
- [ ] No trust/hash regressions for explicit-source artifacts.

## 5) Phase v3.4 - Property Continuation (Strict Additive)

Objective:
Add strict indented continuation property lines: `| key: value`.

Scope:

- strict grammar only
- default serializer remains canonical one-line
- no implicit state blocks
- no multiline content grammar redesign

Work packages:

1. Spec freeze (`v3.4`):

- [ ] Define exact indentation and continuation validity rules.
- [ ] Define deterministic normalization expectations.
- [ ] Define invalid-form diagnostics.

2. Rust implementation:

- [ ] Implement continuation parse rules in Rust core.
- [ ] Add fixtures for valid/invalid continuation lines.
- [ ] Add diagnostics tests for malformed continuation syntax.

3. Runtime and toolchain alignment:

- [ ] Ensure render/replay/migration paths accept `v3.4` artifacts.
- [ ] Verify builder import/export handles `v3.4` content without side effects.
- [ ] Keep style/property mapping aligned with core compatibility rules.

4. Release and docs:

- [ ] Document `v3.4` syntax and constraints with examples.
- [ ] Publish upgrade notes from `v3.3` to `v3.4`.
- [ ] Tag `v3.4` as shipped.

TS/Python removal placement in v3.4:

- [ ] Remove TS/Python continuation parsing code paths (if any) and route fully through Rust-backed behavior.
- [ ] Keep only API clients, transport glue, and type wrappers that do not duplicate grammar logic.

Exit gate (`v3.4`):

- [ ] Rust tests green including continuation diagnostics.
- [ ] Replay/determinism unchanged for previously valid artifacts.
- [ ] `v3.4` fixtures pass in runtime and builder flows.

## 6) Phase v3.5 - Runtime Convergence and Cleanup

Objective:
Complete migration to Rust core and remove extra TS/Python language implementation files.

Scope:

- remove duplicate language logic outside Rust core
- keep supported SDK/client surfaces
- lock governance for future syntax changes

Work packages:

1. Inventory and removal plan:

- [ ] Inventory TS/Python files that implement parser/merge/query/render language logic.
- [ ] Classify each file: remove, keep-as-wrapper, or move.
- [ ] Approve deletion list.

2. Code cleanup:

- [ ] Remove duplicate TS language implementation files.
- [ ] Remove duplicate Python language implementation files.
- [ ] Keep only wrappers that call Rust-backed functionality or stable APIs.

3. CI and packaging cleanup:

- [ ] Update CI to stop running removed TS/Python language tests.
- [ ] Keep CI for Rust core, runtime contract, replay/determinism/parity/pdfs.
- [ ] Update package manifests and docs for removed modules/files.

4. Documentation and release notes:

- [ ] Replace "deferred until PDF beta stability" language with actual `v3.3`/`v3.4`/`v3.5` outcomes.
- [ ] Publish migration guide for integrators affected by TS/Python removals.
- [ ] Tag `v3.5` as shipped.

Exit gate (`v3.5`):

- [ ] No duplicate grammar logic remains outside Rust core.
- [ ] All contract gates green.
- [ ] Integrator docs updated and examples validated.

## 7) Decision Protocol (Strict)

Before opening a phase, verify previous phase exit gate is fully checked.
If any gate fails, stop and fix before continuing.
No side initiatives are allowed outside this plan.

## 8) Current Execution Position

Current position on 2026-03-12:

- Phase B delivery scope: complete.
- Next actionable step: complete section 3 entry gate (two consecutive parity-green cycles) before any `v3.3` code changes.
