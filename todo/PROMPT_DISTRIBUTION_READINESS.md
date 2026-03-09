# IntentText — Distribution Readiness & Integration Surface

## Prompt for Opus — Multi-repo, runs AFTER the other three prompts

---

## PREREQUISITES

This prompt assumes the following prior prompts are complete:

1. `PROMPT_WORKFLOW_EXECUTOR` — executor.ts exists and tests pass
2. `PROMPT_KEYWORD_FREEZE` — canonical keywords frozen at 37

`PROMPT_PYTHON_PARITY` is **deferred indefinitely**. Python SDK will become a thin
wrapper around `intenttext-wasm` once `PROMPT_RUST_CORE` delivers the WASM build.
Do not require Python parity before running this prompt.

---

## OBJECTIVE

The core is strong. The executor runs. But IntentText is not reachable
by the people who should be using it.

This prompt fixes the four distribution gaps:

1. **`ask.ts` — fix hardcoded model name** (small, fix first)
2. **MCP server — expose `executeWorkflow` tool** (now that executor exists)
3. **VS Code extension — marketplace publishing checklist**
4. **End-to-end showcase demo** — one `.it` file that exercises all features

---

## TASK 1 — Fix `ask.ts` Model Hardcoding

**File:** `packages/core/src/ask.ts`

The current code hardcodes:

```typescript
model: "claude-sonnet-4-20250514",
```

This will break when Anthropic deprecates that model name.

**Fix:**

```typescript
// Default models per provider
const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-3-5-sonnet-latest", // Anthropic's stable alias
  openai: "gpt-4o",
  google: "gemini-1.5-pro",
};

export interface AskOptions {
  maxTokens?: number;
  format?: "text" | "json";
  provider?: "anthropic" | "openai" | "google"; // default: 'anthropic'
  model?: string; // default: per-provider default
}

export async function askDocuments(
  results: ComposedResult[],
  question: string,
  options: AskOptions = {},
): Promise<string> {
  const provider = options.provider ?? "anthropic";
  const model = options.model ?? DEFAULT_MODELS[provider];

  switch (provider) {
    case "anthropic":
      return callAnthropic(results, question, model, options);
    case "openai":
      return callOpenAI(results, question, model, options);
    case "google":
      return callGoogle(results, question, model, options);
    default:
      return `Error: Unknown provider: ${provider}`;
  }
}
```

Each provider function (`callAnthropic`, `callOpenAI`, `callGoogle`) uses
the same pattern as the current Anthropic implementation — direct fetch,
no SDK dependency, reads from the relevant env var.

Environment variables:

- `ANTHROPIC_API_KEY` for Anthropic
- `OPENAI_API_KEY` for OpenAI
- `GOOGLE_API_KEY` for Google

**Done criteria for Task 1:**

- [ ] No model name hardcoded anywhere in `ask.ts`
- [ ] `AskOptions` has `provider` and `model` fields
- [ ] OpenAI and Google provider stubs implemented (can return a 'not yet implemented' string if full impl is out of scope — but structure must exist)
- [ ] Updated tests in `tests/ask.test.ts` (or add to nearest test file)
- [ ] CLI `intenttext ask` passes `--provider` and `--model` flags through

---

## TASK 2 — MCP Server: Add `executeWorkflow` Tool

**File:** `intenttext-mcp/src/tools/workflow.ts`

The MCP server has 9 registered tool categories. It exposes `extractWorkflow`
(graph extraction) but NOT `executeWorkflow` (actually running it).

Now that `executeWorkflow` exists in the core, expose it via MCP.

**Read first:**

```
intenttext-mcp/src/tools/workflow.ts      ← existing workflow tool
intenttext-mcp/src/tools/parse.ts         ← follow this pattern for input parsing
intenttext-mcp/src/server.ts              ← server registration
packages/core/src/executor.ts             ← what we're wrapping
```

**The new MCP tool:**

```typescript
// Tool name: intenttext_execute_workflow
// Description: Execute an IntentText workflow document with registered tool handlers.
//              Returns the document with execution state and the execution log.

// Input schema:
{
  source: string,           // .it source text of the workflow document
  context?: object,         // initial context variables (key → value)
  dry_run?: boolean,        // if true, validates and evaluates but does not call tools
  max_steps?: number,       // default 1000
}

// The MCP tool executes in 'dry_run: true' mode by default.
// Full tool execution requires the caller to provide tool handlers which
// cannot come through the MCP protocol. Document this clearly.

// Output:
{
  status: 'completed' | 'gate_blocked' | 'error' | 'dry_run',
  document_source: string,      // the .it source with status: written back
  execution_log: ExecutionLogEntry[],
  context: object,
  error?: string,
  blocked_at?: { content: string, properties: object },
}
```

**Done criteria for Task 2:**

- [ ] `intenttext_execute_workflow` tool added to MCP server
- [ ] Default mode is `dry_run: true` (documented in tool description)
- [ ] Returns source with execution state written back (use `documentToSource`)
- [ ] Returns the execution log as structured JSON
- [ ] Error cases handled and returned cleanly (not thrown)
- [ ] Tool registered in `server.ts`
- [ ] Test added to `intenttext-mcp/tests/tools.test.ts`

---

## TASK 3 — VS Code Extension: Post-Core-Update Maintenance

**Directory:** `intenttext-vscode/`

**Context:** The VS Code extension is **already live on the Marketplace**.
This task is NOT about initial publishing. It is about keeping the extension
current after a new core ships.

**Read first:**

```
intenttext-vscode/package.json    ← check version, publisher, engines
intenttext-vscode/src/extension.ts
intenttext-vscode/README.md
```

**Check and fix each item:**

### package.json fixes

Bump `version` to match the new core version. Verify and update `intenttext-vscode/package.json`:

```jsonc
{
  "name": "intenttext",
  "displayName": "IntentText (.it)",
  "description": "Language support for IntentText — syntax highlighting, completion, preview, and trust tools",
  "version": "x.x.x", // must align with core version
  "publisher": "intenttext", // must match registered publisher on Marketplace
  "engines": { "vscode": "^1.85.0" },
  "categories": ["Programming Languages", "Formatters"],
  "keywords": ["intenttext", "it", "document", "ai", "structured"],
  "icon": "icon.png",
  "galleryBanner": { "color": "#1a1a2e", "theme": "dark" },
  "repository": {
    "type": "git",
    "url": "https://github.com/intenttext/intenttext-vscode",
  },
  "license": "MIT",
}
```

### README.md

The extension README is what Marketplace users see first.
Ensure it has:

1. A screenshot or GIF of the preview panel in action
2. The minimal usage example (open a `.it` file → preview → seal)
3. A list of all commands (`Ctrl+Shift+P` → "IntentText:")
4. How to install: `ext install intenttext.intenttext`

### Missing commands to add

Read `src/extension.ts` and add any missing commands:

- `intenttext.verify` — verify a sealed document (currently exists?)
- `intenttext.newDocument` — create a new `.it` file from a template prompt
- `intenttext.showKeywords` — open the keyword reference panel

For each missing command: implement in `extension.ts`, register in
`package.json` `contributes.commands`, add a keybinding suggestion
in `package.json` `contributes.keybindings`.

### `.vscodeignore` check

Ensure these are in `.vscodeignore`:

```
.vscode/**
src/**
tsconfig.json
node_modules/**
*.test.ts
```

The compiled `out/` or `dist/` directory must be included.

**Done criteria for Task 3:**

- [ ] `package.json` version bumped to match new core version
- [ ] `@intenttext/core` dependency updated to new version in `package.json`
- [ ] Extension re-compiles cleanly after core update (`vsce package` zero errors)
- [ ] Hover/completion/diagnostics smoke-tested against any new keywords or behaviors from KEYWORD_FREEZE
- [ ] `CHANGELOG.md` updated with latest version notes
- [ ] A new VSIX artifact built and verified (re-publish when ready)

---

## TASK 4 — End-to-End Showcase Demo

**Files to create:**

```
IntentText/examples/showcase/
├── contract.it           ← a complete, real-looking service agreement
├── pipeline.it           ← a complete agent workflow
├── run-demo.js           ← Node script that exercises every feature
└── README.md             ← how to run it
```

### `contract.it`

A complete, self-contained service agreement that demonstrates:
`meta`, `track`, `section`, `text`, `deadline`, `contact`, `def`,
`metric`, `approve`, `sign`, `freeze`

Use realistic-looking data (plausible company names, dates, etc.).
The document must be sealable and verifiable.

### `pipeline.it`

A complete agent workflow document that demonstrates:
`context`, `trigger`, `step`, `decision`, `gate`, `audit`, `result`

With properly connected `depends:` properties so `extractWorkflow()`
produces a meaningful graph.

### `run-demo.js`

A single Node.js script (`node run-demo.js`) that:

```javascript
// 1. Parse both documents
// 2. Render contract.it to HTML → write to out/contract.html
// 3. Query all deadlines from contract.it → print to console
// 4. Seal contract.it → write to out/contract-sealed.it
// 5. Verify the sealed document → print result
// 6. Diff original vs sealed → print summary
// 7. Extract workflow from pipeline.it → print execution order
// 8. Execute pipeline.it in dry_run mode → print log
// 9. Build a shallow .it-index over the showcase folder → write .it-index
```

Every step prints output to console. Zero external dependencies — uses
only `@intenttext/core` (locally linked).

**The test of success:** A developer who has never seen the project can
run `cd IntentText/examples/showcase && node run-demo.js` and see all
nine steps produce real output. No setup beyond `npm install` in core.

### `README.md`

````markdown
# IntentText Showcase

Run this to see every core feature in action:

```bash
cd IntentText/examples/showcase
node run-demo.js
```
````

What it demonstrates:

1. Parsing .it files to structured AST
2. Rendering to HTML
3. Querying for specific block types
4. Sealing and verifying documents
5. Computing document diffs
6. Extracting workflow graphs
7. Executing workflows in dry-run mode
8. Building folder indexes

```

**Done criteria for Task 4:**
- [ ] `contract.it` is a complete, realistic document
- [ ] `pipeline.it` is a complete workflow with connected steps
- [ ] `node run-demo.js` runs to completion with zero errors
- [ ] All 9 steps produce visible output
- [ ] No external network calls (works offline)
- [ ] `out/contract.html` is valid, themed HTML
- [ ] `out/contract-sealed.it` is a valid sealed document
- [ ] `.it-index` is written and valid JSON

---

## EXECUTION ORDER

Complete in this order — each task is independent but ordered by impact:

1. **Task 1** (ask.ts fix) — 30 min, small, unblocks Python ask.py
2. **Task 2** (MCP executor tool) — 1 hour, depends on executor existing
3. **Task 4** (showcase demo) — 2 hours, validates everything works together
4. **Task 3** (VS Code publishing) — 1 hour, final distribution step

---

## DONE CRITERIA (ALL TASKS)

- [ ] No model name hardcoded in ask.ts
- [ ] `intenttext_execute_workflow` MCP tool registered and tested
- [ ] VS Code extension packages with `vsce package` — zero errors
- [ ] VS Code extension README has screenshot and command list
- [ ] `examples/showcase/run-demo.js` runs to completion — zero errors
- [ ] All 9 demo steps produce output
- [ ] `npm test` in `packages/core` — 815+ tests still passing
- [ ] `npm test` in `intenttext-mcp` — all tests passing
```
