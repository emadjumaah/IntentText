# Contributing to IntentText

Thanks for your interest in contributing.

## Development setup

- Install dependencies:

  ```bash
  npm install
  ```

- Build:

  ```bash
  npm run build
  ```

- Test:

  ```bash
  npm run test
  ```

## Making changes

- Keep changes small and focused.
- Add or update tests in `packages/core/tests` for any behavior change.
- Keep the implementation aligned with the canonical spec in `docs/SPEC.md`.

## Pull requests

- Describe the change and the motivation.
- Include before/after examples for any syntax or rendering changes.
- Ensure `npm run build` and `npm run test` pass.
