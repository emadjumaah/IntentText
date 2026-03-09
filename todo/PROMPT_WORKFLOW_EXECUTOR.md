# IntentText — Workflow Executor

## Prompt for Opus — `packages/core` only

---

## CONTEXT

IntentText has agentic workflow keywords. The parser extracts them
correctly. `extractWorkflow()` in `workflow.ts` already produces a
dependency graph with a topological execution order.

The gap: nothing runs the workflow.

This prompt adds `executeWorkflow()` — a pure async function, same
pattern as the existing `mergeData()` function. The caller provides
tool implementations. IntentText provides structure and execution order.

**Philosophy: the format describes intent, the runtime handles execution.**
The executor is the bridge. It does not implement tools — it calls them.

**In scope for this executor (handle these block types):**
`step`, `decision`, `gate`, `trigger`, `result`, `audit`

**Out of scope (skip silently, log as 'skipped'):**
`loop`, `parallel`, `retry`, `wait`, `handoff`, `call`, `checkpoint`,
`import`, `export`, `progress`, `signal`, `tool`, `prompt`, `memory`,
`context`, `error`, `policy`
These are intentionally deferred. The executor must not crash on them —
it logs them as `status: 'skipped'` and moves on.

**Read every one of these before touching anything:**

```
packages/core/src/merge.ts            ← follow this pattern exactly
packages/core/src/types.ts            ← all block types and interfaces
packages/core/src/utils.ts            ← flattenBlocks() — use this
packages/core/src/parser.ts           ← how blocks are structured
packages/core/src/workflow.ts         ← extractWorkflow(), CRITICAL: read fully
packages/core/src/validate.ts         ← validation error codes
packages/core/src/index.ts            ← public API exports
```

## CRITICAL: Read workflow.ts Before Writing Anything

`WorkflowGraph.executionOrder` is `string[][]` — an array of BATCHES,
not a flat array of IDs.

```typescript
// From workflow.ts:
executionOrder: string[][];  // each inner array is a parallel batch
```

Each batch is a group of steps that can run concurrently (they have no
dependency on each other within the batch). The executor must iterate
batches, then within each batch run steps. This is NOT the same as
a flat `string[]`.

---

## THE MENTAL MODEL

```
mergeData(document, data)
→ walks blocks
→ replaces {{variables}} with data values
→ returns new document

executeWorkflow(document, runtime)
→ extracts workflow graph (batches of parallel steps)
→ for each batch in executionOrder:
    → for each blockId in batch:
        → calls runtime.tools[tool](input, context)
        → stores output in context
        → evaluates decision conditions
        → pauses at gates
→ returns document with status: written back to each block
```

The output is the same `.it` document with execution state written
back onto each block. The `.it` file is simultaneously the workflow
definition and the execution record. No separate logs. No external
state. Everything lives in the document.

---

## NEW FILE: `packages/core/src/executor.ts`

### Types

```typescript
/**
 * A tool handler — provided by the caller, called by the executor.
 * Receives the resolved input value and full context.
 * Returns the output value (stored in context under output: key).
 */
export type ToolHandler = (
  input: unknown,
  context: ExecutionContext,
) => Promise<unknown> | unknown;

/**
 * Runtime provided by the caller
 */
export interface WorkflowRuntime {
  // Tool implementations — keyed by tool: property value
  // e.g. 'crm.lookup', 'email.send', 'orders.get'
  tools?: Record<string, ToolHandler>;

  // Initial context variables — merged with context: blocks
  context?: Record<string, unknown>;

  // Gate handler — called when a gate: block is reached
  // Caller decides how to handle approval (UI prompt, webhook, etc.)
  // Resolve with true (approved) or false (rejected)
  onGate?: (gate: IntentBlock, context: ExecutionContext) => Promise<boolean>;

  // Step lifecycle hooks (optional)
  onStepStart?: (step: IntentBlock, context: ExecutionContext) => void;
  onStepComplete?: (
    step: IntentBlock,
    output: unknown,
    context: ExecutionContext,
  ) => void;
  onStepError?: (
    step: IntentBlock,
    error: Error,
    context: ExecutionContext,
  ) => void;

  // Audit hook — called when audit: block is reached
  onAudit?: (audit: IntentBlock, context: ExecutionContext) => void;

  // Execution options
  options?: ExecutionOptions;
}

export interface ExecutionOptions {
  // Maximum steps to execute (prevent infinite loops)
  maxSteps?: number; // default: 1000
  // Timeout per step in ms
  stepTimeout?: number; // default: 30000
  // What to do when a tool is not registered
  unknownTool?: "skip" | "error" | "warn"; // default: 'warn'
  // Dry run — evaluate decisions and validate but do not call tools
  dryRun?: boolean; // default: false
}

/**
 * Live execution context — variables available to steps and decisions
 */
export type ExecutionContext = Record<string, unknown>;

/**
 * Result of running a workflow
 */
export interface ExecutionResult {
  // The document with status: written back to each block
  document: IntentDocument;
  // Final execution context (all outputs)
  context: ExecutionContext;
  // Execution log — one entry per block processed
  log: ExecutionLogEntry[];
  // Overall status
  status: "completed" | "gate_blocked" | "error" | "dry_run";
  // Error if status is 'error'
  error?: Error;
  // Gate block if status is 'gate_blocked'
  blockedAt?: IntentBlock;
}

export interface ExecutionLogEntry {
  blockId: string;
  blockType: string;
  content: string;
  status:
    | "skipped"
    | "running"
    | "completed"
    | "failed"
    | "blocked"
    | "dry_run";
  input?: unknown;
  output?: unknown;
  error?: string;
  durationMs?: number;
  timestamp: string;
}
```

### The executor function

```typescript
/**
 * Execute an IntentText workflow document.
 *
 * Same pattern as mergeData() — pure function, takes document + runtime,
 * returns a new document with execution state written back.
 *
 * The caller provides tool implementations.
 * IntentText provides structure and execution order.
 *
 * @example
 * const result = await executeWorkflow(doc, {
 *   tools: {
 *     'crm.lookup': async (input) => fetchCustomer(input),
 *     'email.send': async (input) => sendEmail(input),
 *   },
 *   context: { phone: '0501234567' },
 *   onGate: async (gate) => promptUserForApproval(gate),
 * })
 * console.log(result.status) // 'completed' | 'gate_blocked' | 'error'
 */
export async function executeWorkflow(
  document: IntentDocument,
  runtime: WorkflowRuntime = {},
): Promise<ExecutionResult> {
  // implementation below
}
```

### Implementation logic

```typescript
async function executeWorkflow(
  document: IntentDocument,
  runtime: WorkflowRuntime = {},
): Promise<ExecutionResult> {
  const options: Required<ExecutionOptions> = {
    maxSteps: 1000,
    stepTimeout: 30_000,
    unknownTool: "warn",
    dryRun: false,
    ...runtime.options,
  };

  // 1. Extract workflow graph (already implemented)
  const workflow = extractWorkflow(document);

  // 2. Build execution context
  //    Start with runtime.context, then merge context: blocks
  //    Use flattenBlocks() — context: blocks may live inside sections
  const context: ExecutionContext = { ...runtime.context };
  const allBlocks = flattenBlocks(document.blocks);
  for (const block of allBlocks) {
    if (block.type === "context" && block.properties) {
      // Only merge agentic context: blocks — not document-identity context:
      // Agentic context: blocks have properties like goal:, constraints:, etc.
      Object.assign(context, block.properties);
    }
  }

  // 3. Apply policy: blocks — store as named rules in context
  const policies: IntentBlock[] = [];
  for (const block of allBlocks) {
    if (block.type === "policy") {
      policies.push(block);
    }
  }
  context.__policies = policies;

  // 4. Walk executionOrder — it is string[][], not string[]
  //    Each inner array is a batch of steps that can be run concurrently.
  //    Within a batch, run steps sequentially for now (parallelism is v2).
  const log: ExecutionLogEntry[] = [];
  const resultDoc = structuredClone(document); // immutable — work on clone
  let stepCount = 0;

  for (const batch of workflow.executionOrder) {
    for (const blockId of batch) {
      if (stepCount >= options.maxSteps) {
        return {
          document: resultDoc,
          context,
          log,
          status: "error",
          error: new Error(`Max steps (${options.maxSteps}) reached`),
        };
      }

      const block = findBlock(resultDoc, blockId);
      if (!block) continue;

      const entry: ExecutionLogEntry = {
        blockId: block.id,
        blockType: block.type,
        content: block.content,
        status: "running",
        timestamp: new Date().toISOString(),
      };

      const start = Date.now();

      try {
        switch (block.type) {
          case "step": {
            const toolName = block.properties?.tool as string;
            const inputKey = block.properties?.input as string;
            const outputKey = block.properties?.output as string;

            // Resolve input from context (handles {{variable}} refs)
            const input = resolveValue(inputKey, context);
            entry.input = input;

            if (options.dryRun) {
              entry.status = "dry_run";
              writeStatus(resultDoc, blockId, "dry_run");
              break;
            }

            const handler = runtime.tools?.[toolName];
            if (!handler) {
              if (options.unknownTool === "error") {
                throw new Error(`No tool handler registered for: ${toolName}`);
              }
              if (options.unknownTool === "warn") {
                console.warn(
                  `[intenttext] No handler for tool: ${toolName} — skipping`,
                );
              }
              entry.status = "skipped";
              writeStatus(resultDoc, blockId, "skipped");
              break;
            }

            runtime.onStepStart?.(block, context);

            // Execute with timeout
            const output = await withTimeout(
              Promise.resolve(handler(input, context)),
              options.stepTimeout,
              `Step "${block.content}" timed out after ${options.stepTimeout}ms`,
            );

            // Store output in context
            if (outputKey) {
              context[outputKey] = output;
            }

            runtime.onStepComplete?.(block, output, context);

            entry.output = output;
            entry.status = "completed";
            writeStatus(resultDoc, blockId, "done");
            stepCount++;
            break;
          }

          case "decision": {
            // Evaluate condition against context
            const condition = block.properties?.if as string;
            const thenTarget = block.properties?.then as string;
            const elseTarget = block.properties?.else as string;

            const result = evaluateCondition(condition, context);
            const nextTarget = result ? thenTarget : elseTarget;

            // Skip blocks not on the chosen branch
            // (workflow.executionOrder already handles branching —
            //  decision just records which branch was taken)
            context.__lastDecision = { condition, result, took: nextTarget };

            entry.status = "completed";
            entry.output = { condition, result, branch: nextTarget };
            writeStatus(resultDoc, blockId, "done");
            break;
          }

          case "gate": {
            const approver = block.properties?.approver as string;
            const timeout = block.properties?.timeout as string;

            writeStatus(resultDoc, blockId, "blocked");
            entry.status = "blocked";

            if (options.dryRun) {
              entry.status = "dry_run";
              writeStatus(resultDoc, blockId, "dry_run");
              break;
            }

            if (!runtime.onGate) {
              // No gate handler — block execution here
              log.push({ ...entry, durationMs: Date.now() - start });
              return {
                document: resultDoc,
                context,
                log,
                status: "gate_blocked",
                blockedAt: block,
              };
            }

            const approved = await runtime.onGate(block, context);
            if (!approved) {
              writeStatus(resultDoc, blockId, "rejected");
              return {
                document: resultDoc,
                context,
                log,
                status: "gate_blocked",
                blockedAt: block,
              };
            }

            writeStatus(resultDoc, blockId, "approved");
            entry.status = "completed";
            break;
          }

          case "audit": {
            // Resolve template variables in audit content
            const resolved = resolveTemplate(block.content, context);
            updateBlockContent(resultDoc, blockId, resolved);
            runtime.onAudit?.(block, context);
            entry.status = "completed";
            writeStatus(resultDoc, blockId, "done");
            break;
          }

          case "trigger": {
            // Entry point — just mark as processed
            entry.status = "completed";
            writeStatus(resultDoc, blockId, "done");
            break;
          }

          case "result": {
            // Terminal block — resolve template, write final status
            const resolved = resolveTemplate(block.content, context);
            updateBlockContent(resultDoc, blockId, resolved);
            entry.status = "completed";
            writeStatus(resultDoc, blockId, "done");
            break;
          }

          default:
            // All other block types (loop, parallel, retry, wait,
            // handoff, call, checkpoint, error, signal, etc.) are
            // skipped silently in this version — logged as 'skipped'.
            entry.status = "skipped";
            break;
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        entry.status = "failed";
        entry.error = error.message;
        writeStatus(resultDoc, blockId, "failed");
        runtime.onStepError?.(block, error, context);

        log.push({ ...entry, durationMs: Date.now() - start });
        return { document: resultDoc, context, log, status: "error", error };
      }

      entry.durationMs = Date.now() - start;
      log.push(entry);
    } // end batch loop
  } // end executionOrder loop

  return { document: resultDoc, context, log, status: "completed" };
}
```

### Helper functions (implement all)

```typescript
// Resolve a value from context
// Handles: plain string, {{variable}}, {{nested.path}}, {{items.0.key}}
function resolveValue(
  value: string | undefined,
  context: ExecutionContext,
): unknown;

// Resolve all {{variables}} in a template string
function resolveTemplate(template: string, context: ExecutionContext): string;

// Evaluate a condition string against context
// Handles: ==, !=, <, >, <=, >=, &&, ||
// e.g. "{{order.status}} == 'paid'" → true/false
//
// ⚠️  SAFETY: Do NOT use eval() or Function().
// Implement a simple recursive descent parser that only handles:
//   - string literals ('...' or "...")
//   - number literals (42, 3.14)
//   - boolean literals (true, false)
//   - null
//   - {{variable}} references resolved from context
//   - comparison operators: == != < > <= >=
//   - logical operators: && ||
// Reject any expression that doesn't match this grammar — return false.
function evaluateCondition(
  condition: string,
  context: ExecutionContext,
): boolean;

// Write status: property back to a block in the document (mutates clone)
function writeStatus(
  doc: IntentDocument,
  blockId: string,
  status: string,
): void;

// Update block content (for audit: and result: resolution)
function updateBlockContent(
  doc: IntentDocument,
  blockId: string,
  content: string,
): void;

// Find a block by id in a document (searches recursively through children)
// Use flattenBlocks() from utils.ts for implementation
function findBlock(
  doc: IntentDocument,
  blockId: string,
): IntentBlock | undefined;

// Use structuredClone() — available in Node 17+ and all modern runtimes.
// Do NOT implement a custom deep clone.
function cloneDocument(doc: IntentDocument): IntentDocument {
  return structuredClone(doc);
}

// Execute a promise with a timeout
async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T>;
```

---

## TESTS: `packages/core/tests/executor.test.ts`

Write tests for every case:

```typescript
// Basic execution
test("executes steps in order and passes outputs between steps");
test("resolves {{variable}} in input: property from context");
test("stores step output in context under output: key");
test("skips steps with unregistered tools when unknownTool: warn");
test("throws when unknownTool: error and tool not registered");

// Decision
test("evaluates == condition correctly");
test("evaluates != condition correctly");
test("evaluates < > <= >= conditions");
test("takes then: branch when condition true");
test("takes else: branch when condition false");

// Gate
test("returns gate_blocked when onGate not provided");
test("returns gate_blocked when onGate resolves false");
test("continues execution when onGate resolves true");

// Context
test("merges context: blocks into execution context");
test("runtime.context takes precedence over context: blocks");

// Audit
test("resolves {{variables}} in audit: block content");

// Result
test("resolves {{variables}} in result: block content");

// Status write-back
test("writes status: done to completed step blocks");
test("writes status: failed to errored step blocks");
test("writes status: blocked to gate blocks when blocked");
test("writes status: approved to gate blocks when approved");

// Dry run
test("dry run does not call tool handlers");
test("dry run marks all steps as dry_run status");
test("dry run returns completed status");

// Error handling
test("returns error status when step throws");
test("returns error status when maxSteps exceeded");
test("step timeout returns error status");

// Output document
test("returned document has status written back to all processed blocks");
test("returned document is a new object — original not mutated");
test("execution log has one entry per processed block");
```

Minimum 25 tests. All must pass.

---

## PUBLIC API: update `packages/core/index.ts`

Add exports:

```typescript
export { executeWorkflow } from "./src/executor";
export type {
  WorkflowRuntime,
  ToolHandler,
  ExecutionContext,
  ExecutionResult,
  ExecutionLogEntry,
  ExecutionOptions,
} from "./src/executor";
```

---

## DONE CRITERIA

- [x] `src/executor.ts` created — all types and functions implemented
- [x] `executeWorkflow()` exported from `index.ts`
- [x] All 38 tests pass (exceeds minimum 25)
- [x] `step:` blocks call registered tool handlers
- [x] Outputs flow between steps via context
- [x] `decision:` conditions evaluated correctly (==, !=, <, >, <=, >=, &&, ||)
- [x] `gate:` blocks pause execution until `onGate` resolves
- [x] `audit:` and `result:` blocks have `{{variables}}` resolved
- [x] Status written back to every processed block
- [x] Original document not mutated — clone returned
- [x] Dry run mode works correctly
- [x] `npm test` — 853/853 tests pass (815 existing + 38 new)
- [x] Zero TypeScript errors
