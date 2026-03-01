## What's Left (the real two-step path)

1.  **Publish `@intenttext/core` to npm** — run `npm publish` from `packages/core` with a public scope. That's it. Anyone can `npm install @intenttext/core`.
2.  **Package the VS Code extension** — `vsce package` generates a `.vsix`, then `vsce publish` puts it on the marketplace. The extension is now complete enough to ship.

The core is solid. Ship it.
