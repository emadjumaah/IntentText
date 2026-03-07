# Opus Engineering Prompt — IntentText Core Language Contract Fix

## Your role

You are an expert TypeScript/language-design engineer. You will fix the IntentText core library at `packages/core/src/` to resolve the language contract drift identified in the project audit. Every ecosystem tool (VS Code extension, MCP server, Python package, docs site, editor) derives its keyword contract from this core — fix it once here, and everything downstream becomes consistent.

This is an early-stage project. Fix it correctly now, not quickly with patches.

## Project location

```
/Users/emad/projects/dotit/IntentText/packages/core/src/
  types.ts          ← KEYWORDS array + BlockType union
  aliases.ts        ← ALIASES map
  parser.ts         ← block parsing logic
  renderer.ts       ← HTML rendering
  validate.ts       ← semantic validation
  /tests/           ← vitest test files
```

Read all six files completely before writing any code.

---

## The core problem

The authoritative keyword list lives in TWO places that diverge:

- `types.ts` `KEYWORDS` array (parser recognizes these)
- `intenttext-docs` keyword table (users/tools read these)

The fix has four parts, done in this exact order:

1. Create `language-registry.ts` — the single new source of truth
2. Rewrite `types.ts` to derive `KEYWORDS` and `BlockType` from the registry
3. Rewrite `aliases.ts` to add all missing aliases, classified by status
4. Update `parser.ts`, `renderer.ts`, `validate.ts` for new block types
5. Add parity tests

---

## Part 1 — Create `packages/core/src/language-registry.ts`

Create this new file. It is the single source of truth. All other files derive their data from it.

```typescript
/**
 * IntentText Language Registry
 *
 * Single source of truth for the IntentText keyword contract.
 * KEYWORDS array, BlockType union, and ALIASES map are all derived from this.
 *
 * Every keyword in existence — canonical, alias, deprecated, compat, boundary —
 * is defined here with its full metadata.
 */

export type KeywordCategory =
  | "identity"
  | "content"
  | "structure"
  | "data"
  | "agent"
  | "trust"
  | "layout";

/**
 * Lifecycle status of a keyword.
 *
 * stable      — canonical, user-facing, documented in reference
 * alias       — input-only shorthand that resolves to a canonical keyword
 * deprecated  — will be removed in a future major version; emit warning
 * compat-only — kept for back-compat; never show in docs or completion hints
 * boundary    — structural marker that produces no block output (e.g. history:)
 */
export type KeywordStatus =
  | "stable"
  | "alias"
  | "deprecated"
  | "compat-only"
  | "boundary";

export interface KeywordDefinition {
  /** The canonical name written in a .it file, without the trailing colon. */
  canonical: string;
  category: KeywordCategory;
  /** Semver string of the version when this was introduced. */
  since: string;
  status: KeywordStatus;
  /** One-line description for tooling and docs generation. */
  description: string;
  /**
   * Input-only aliases that resolve to this canonical keyword.
   * Classified as 'alias' | 'compat-only' | 'deprecated'.
   */
  aliases: Array<{
    alias: string;
    status: "alias" | "compat-only" | "deprecated";
  }>;
}

export const LANGUAGE_REGISTRY: KeywordDefinition[] = [
  // ── Document Identity ────────────────────────────────────────────────────
  {
    canonical: "title",
    category: "identity",
    since: "1.0",
    status: "stable",
    description: "Document title — renders as H1",
    aliases: [{ alias: "h1", status: "compat-only" }],
  },
  {
    canonical: "summary",
    category: "identity",
    since: "1.0",
    status: "stable",
    description: "Brief document description",
    aliases: [{ alias: "abstract", status: "alias" }],
  },
  {
    canonical: "meta",
    category: "identity",
    since: "2.8.1",
    status: "stable",
    description: "Free-form document metadata key-value pairs",
    aliases: [],
  },
  {
    canonical: "context",
    category: "identity",
    since: "2.0",
    status: "stable",
    description: "Agent execution context and scoped variables",
    aliases: [],
  },
  {
    canonical: "track",
    category: "identity",
    since: "2.8",
    status: "stable",
    description: "Activate document history tracking",
    aliases: [],
  },

  // ── Content ──────────────────────────────────────────────────────────────
  {
    canonical: "text",
    category: "content",
    since: "1.0",
    status: "stable",
    description:
      "General body text — the default block type. Not a callout; for callouts use info:, tip:, warning:, danger:",
    aliases: [
      { alias: "note", status: "alias" },
      { alias: "body", status: "alias" },
      { alias: "content", status: "alias" },
      { alias: "paragraph", status: "alias" },
      { alias: "p", status: "compat-only" },
    ],
  },
  {
    canonical: "quote",
    category: "content",
    since: "1.0",
    status: "stable",
    description: "Block quotation with optional attribution",
    aliases: [
      { alias: "blockquote", status: "alias" },
      { alias: "excerpt", status: "alias" },
      { alias: "pullquote", status: "alias" },
    ],
  },
  {
    canonical: "cite",
    category: "content",
    since: "1.0",
    status: "stable",
    description: "Bibliographic citation with author, date, and URL",
    aliases: [
      { alias: "citation", status: "alias" },
      { alias: "source", status: "alias" },
      { alias: "reference", status: "alias" },
    ],
  },
  {
    canonical: "warning",
    category: "content",
    since: "1.0",
    status: "stable",
    description: "Warning or caution block — renders with visual emphasis",
    aliases: [
      { alias: "alert", status: "alias" },
      { alias: "caution", status: "alias" },
    ],
  },
  {
    canonical: "danger",
    category: "content",
    since: "1.0",
    status: "stable",
    description: "Danger callout — for irreversible actions or data loss risk",
    aliases: [
      { alias: "critical", status: "alias" },
      { alias: "destructive", status: "alias" },
    ],
  },
  {
    canonical: "tip",
    category: "content",
    since: "1.0",
    status: "stable",
    description: "Helpful tip or suggestion",
    aliases: [
      { alias: "hint", status: "alias" },
      { alias: "advice", status: "alias" },
    ],
  },
  {
    canonical: "info",
    category: "content",
    since: "1.0",
    status: "stable",
    description: "Informational callout block",
    aliases: [],
  },
  {
    canonical: "success",
    category: "content",
    since: "1.0",
    status: "stable",
    description: "Success or confirmation callout block",
    aliases: [],
  },
  {
    canonical: "code",
    category: "content",
    since: "1.0",
    status: "stable",
    description: "Code block with optional language for syntax highlighting",
    aliases: [{ alias: "snippet", status: "alias" }],
  },
  {
    canonical: "image",
    category: "content",
    since: "1.0",
    status: "stable",
    description: "Inline image — no caption, no number",
    aliases: [
      { alias: "img", status: "alias" },
      { alias: "photo", status: "alias" },
      { alias: "picture", status: "alias" },
    ],
  },
  {
    canonical: "link",
    category: "content",
    since: "1.0",
    status: "stable",
    description: "Hyperlink to an external resource",
    aliases: [
      { alias: "url", status: "alias" },
      { alias: "href", status: "alias" },
    ],
  },
  {
    canonical: "def",
    category: "content",
    since: "2.11",
    status: "stable",
    description: "Term definition — inline or glossary entry",
    aliases: [
      { alias: "define", status: "alias" },
      { alias: "term", status: "alias" },
      { alias: "glossary", status: "alias" },
    ],
  },
  {
    canonical: "figure",
    category: "content",
    since: "2.11",
    status: "stable",
    description: "Numbered, captioned figure",
    aliases: [
      { alias: "fig", status: "alias" },
      { alias: "diagram", status: "alias" },
      { alias: "chart", status: "alias" },
      { alias: "illustration", status: "alias" },
      { alias: "visual", status: "alias" },
    ],
  },
  {
    canonical: "contact",
    category: "content",
    since: "2.11",
    status: "stable",
    description: "Person or organization contact information",
    aliases: [
      { alias: "person", status: "alias" },
      { alias: "party", status: "alias" },
      { alias: "entity", status: "alias" },
    ],
  },

  // ── Structure ────────────────────────────────────────────────────────────
  {
    canonical: "section",
    category: "structure",
    since: "1.0",
    status: "stable",
    description: "Section heading — renders as H2",
    aliases: [
      { alias: "heading", status: "alias" },
      { alias: "chapter", status: "alias" },
      { alias: "h2", status: "compat-only" },
    ],
  },
  {
    canonical: "sub",
    category: "structure",
    since: "1.0",
    status: "stable",
    description: "Subsection heading — renders as H3",
    aliases: [
      { alias: "subheading", status: "alias" },
      { alias: "subsection", status: "compat-only" },
      { alias: "h3", status: "compat-only" },
    ],
  },
  {
    canonical: "group",
    category: "structure",
    since: "1.0",
    status: "stable",
    description: "Logical grouping of blocks — no visual output",
    aliases: [],
  },
  {
    canonical: "break",
    category: "structure",
    since: "1.0",
    status: "stable",
    description: "Page break for print — invisible in web",
    aliases: [],
  },
  {
    canonical: "ref",
    category: "structure",
    since: "2.11",
    status: "stable",
    description: "Cross-document reference with typed relationship",
    aliases: [
      { alias: "references", status: "alias" },
      { alias: "see", status: "alias" },
      { alias: "related", status: "alias" },
      { alias: "xref", status: "alias" },
    ],
  },
  {
    canonical: "deadline",
    category: "structure",
    since: "2.11",
    status: "stable",
    description: "Date-bound milestone or due date",
    aliases: [
      { alias: "due", status: "alias" },
      { alias: "milestone", status: "alias" },
      { alias: "by", status: "alias" },
      { alias: "due-date", status: "compat-only" },
    ],
  },
  {
    canonical: "embed",
    category: "structure",
    since: "1.0",
    status: "stable",
    description: "Embed a referenced external resource",
    aliases: [],
  },

  // ── Data ─────────────────────────────────────────────────────────────────
  {
    canonical: "table",
    category: "data",
    since: "1.0",
    status: "stable",
    description:
      "Explicit table block; can also be auto-built from columns:/row: blocks",
    aliases: [],
  },
  {
    canonical: "columns",
    category: "data",
    since: "1.0",
    status: "stable",
    description:
      "Table column definitions — declares column names for the following row: blocks",
    aliases: [{ alias: "headers", status: "compat-only" }],
  },
  {
    canonical: "row",
    category: "data",
    since: "1.0",
    status: "stable",
    description: "Table data row — pipe-separated cell values",
    aliases: [],
  },
  {
    canonical: "input",
    category: "data",
    since: "1.3",
    status: "stable",
    description: "Declared input parameter for templates and workflows",
    aliases: [],
  },
  {
    canonical: "output",
    category: "data",
    since: "1.3",
    status: "stable",
    description: "Declared output parameter for templates and workflows",
    aliases: [],
  },
  {
    canonical: "metric",
    category: "data",
    since: "2.11",
    status: "stable",
    description: "Quantitative measurement or KPI",
    aliases: [
      { alias: "kpi", status: "alias" },
      { alias: "measure", status: "alias" },
      { alias: "indicator", status: "alias" },
      { alias: "stat", status: "compat-only" },
    ],
  },

  // ── Agent ────────────────────────────────────────────────────────────────
  {
    canonical: "step",
    category: "agent",
    since: "2.0",
    status: "stable",
    description: "Workflow step — the basic unit of agent work",
    aliases: [{ alias: "run", status: "alias" }],
  },
  {
    canonical: "gate",
    category: "agent",
    since: "2.2",
    status: "stable",
    description: "Conditional checkpoint — blocks until condition is met",
    aliases: [],
  },
  {
    canonical: "trigger",
    category: "agent",
    since: "2.0",
    status: "stable",
    description: "Event-based workflow activation",
    aliases: [{ alias: "on", status: "alias" }],
  },
  {
    canonical: "signal",
    category: "agent",
    since: "2.2",
    status: "stable",
    description: "Emit a named workflow signal or event",
    aliases: [
      { alias: "emit", status: "deprecated" },
      { alias: "status", status: "deprecated" },
    ],
  },
  {
    canonical: "decision",
    category: "agent",
    since: "2.0",
    status: "stable",
    description: "Conditional branching",
    aliases: [{ alias: "if", status: "alias" }],
  },
  {
    canonical: "memory",
    category: "agent",
    since: "2.0",
    status: "stable",
    description: "Agent memory or persistent state declaration",
    aliases: [],
  },
  {
    canonical: "prompt",
    category: "agent",
    since: "2.0",
    status: "stable",
    description: "LLM prompt template",
    aliases: [],
  },
  {
    canonical: "tool",
    category: "agent",
    since: "2.0",
    status: "stable",
    description: "External tool or API declaration",
    aliases: [],
  },
  {
    canonical: "audit",
    category: "agent",
    since: "2.0",
    status: "stable",
    description: "Audit log entry",
    aliases: [{ alias: "log", status: "alias" }],
  },
  {
    canonical: "done",
    category: "agent",
    since: "2.0",
    status: "stable",
    description: "Completed task item — the resolved state of a task: block",
    aliases: [
      { alias: "completed", status: "compat-only" },
      { alias: "finished", status: "compat-only" },
    ],
  },
  {
    canonical: "error",
    category: "agent",
    since: "2.0",
    status: "stable",
    description: "Error record with severity and retry metadata",
    aliases: [],
  },
  {
    canonical: "result",
    category: "agent",
    since: "2.1",
    status: "stable",
    description: "Terminal workflow result — final output block",
    aliases: [],
  },
  {
    canonical: "handoff",
    category: "agent",
    since: "2.1",
    status: "stable",
    description: "Transfer control to another agent",
    aliases: [],
  },
  {
    canonical: "wait",
    category: "agent",
    since: "2.1",
    status: "stable",
    description: "Pause execution until an event or timeout",
    aliases: [],
  },
  {
    canonical: "parallel",
    category: "agent",
    since: "2.1",
    status: "stable",
    description: "Run multiple steps concurrently",
    aliases: [],
  },
  {
    canonical: "retry",
    category: "agent",
    since: "2.1",
    status: "stable",
    description: "Retry a failed step with backoff",
    aliases: [],
  },
  {
    canonical: "call",
    category: "agent",
    since: "2.2",
    status: "stable",
    description: "Invoke a sub-workflow by file reference",
    aliases: [],
  },
  {
    canonical: "loop",
    category: "agent",
    since: "2.0",
    status: "stable",
    description: "Iterate over a collection",
    aliases: [],
  },
  {
    canonical: "checkpoint",
    category: "agent",
    since: "2.0",
    status: "stable",
    description: "Named workflow checkpoint for resume and rollback",
    aliases: [],
  },
  {
    canonical: "import",
    category: "agent",
    since: "2.0",
    status: "stable",
    description: "Import a workflow from a file",
    aliases: [],
  },
  {
    canonical: "export",
    category: "agent",
    since: "2.0",
    status: "stable",
    description: "Export data or workflow output",
    aliases: [],
  },
  {
    canonical: "progress",
    category: "agent",
    since: "2.0",
    status: "stable",
    description: "Progress indicator for long-running operations",
    aliases: [],
  },

  // ── Task (human-facing workflow) ─────────────────────────────────────────
  {
    canonical: "task",
    category: "agent",
    since: "1.0",
    status: "stable",
    description: "Actionable task item with owner and due date",
    aliases: [
      { alias: "check", status: "alias" },
      { alias: "todo", status: "alias" },
      { alias: "action", status: "alias" },
      { alias: "item", status: "alias" },
    ],
  },
  {
    canonical: "ask",
    category: "agent",
    since: "1.0",
    status: "stable",
    description: "Question or open item requiring a response",
    aliases: [{ alias: "question", status: "compat-only" }],
  },

  // ── Agent metadata (pre-section) ─────────────────────────────────────────
  {
    canonical: "agent",
    category: "identity",
    since: "2.0",
    status: "stable",
    description: "Agent name/identifier — pre-section metadata",
    aliases: [],
  },
  {
    canonical: "model",
    category: "identity",
    since: "2.0",
    status: "stable",
    description: "Default AI model for this document — pre-section metadata",
    aliases: [],
  },

  // ── Trust ────────────────────────────────────────────────────────────────
  {
    canonical: "approve",
    category: "trust",
    since: "2.8",
    status: "stable",
    description: "Approval stamp with signatory and role",
    aliases: [],
  },
  {
    canonical: "sign",
    category: "trust",
    since: "2.8",
    status: "stable",
    description: "Cryptographic digital signature",
    aliases: [],
  },
  {
    canonical: "freeze",
    category: "trust",
    since: "2.8",
    status: "stable",
    description: "Seal document — prevents further edits",
    aliases: [{ alias: "lock", status: "alias" }],
  },
  {
    canonical: "revision",
    category: "trust",
    since: "2.8",
    status: "stable",
    description: "Auto-generated revision record in history section",
    aliases: [],
  },
  {
    canonical: "policy",
    category: "agent",
    since: "2.7",
    status: "stable",
    description: "Enforceable constraint or rule",
    aliases: [
      { alias: "rule", status: "alias" },
      { alias: "constraint", status: "alias" },
      { alias: "guard", status: "alias" },
      { alias: "requirement", status: "alias" },
    ],
  },
  {
    canonical: "amendment",
    category: "trust",
    since: "2.11",
    status: "stable",
    description: "Formal change record for a frozen document",
    aliases: [
      { alias: "amend", status: "alias" },
      { alias: "change", status: "alias" },
    ],
  },
  {
    canonical: "history",
    category: "trust",
    since: "2.12",
    status: "boundary",
    description: "History boundary — separates document body from revision log",
    aliases: [],
  },

  // ── Layout ───────────────────────────────────────────────────────────────
  {
    canonical: "page",
    category: "layout",
    since: "2.5",
    status: "stable",
    description: "Page size, margins, and orientation for print",
    aliases: [],
  },
  {
    canonical: "font",
    category: "layout",
    since: "2.5",
    status: "stable",
    description: "Typography settings for print",
    aliases: [],
  },
  {
    canonical: "header",
    category: "layout",
    since: "2.9",
    status: "stable",
    description: "Page header for print output",
    aliases: [],
  },
  {
    canonical: "footer",
    category: "layout",
    since: "2.9",
    status: "stable",
    description: "Page footer for print output",
    aliases: [],
  },
  {
    canonical: "watermark",
    category: "layout",
    since: "2.9",
    status: "stable",
    description: "Background watermark for print output",
    aliases: [],
  },
  {
    canonical: "signline",
    category: "layout",
    since: "2.11",
    status: "stable",
    description: "Physical signature line for print",
    aliases: [
      { alias: "signature-line", status: "alias" },
      { alias: "sign-here", status: "alias" },
      { alias: "sig", status: "compat-only" },
    ],
  },
  {
    canonical: "divider",
    category: "layout",
    since: "2.12",
    status: "stable",
    description: "Visible horizontal rule — also written as ---",
    aliases: [
      { alias: "hr", status: "alias" },
      { alias: "separator", status: "alias" },
    ],
  },

  // ── Document generation writer blocks ────────────────────────────────────
  {
    canonical: "byline",
    category: "content",
    since: "2.5",
    status: "stable",
    description: "Author byline with date and publication",
    aliases: [],
  },
  {
    canonical: "epigraph",
    category: "content",
    since: "2.5",
    status: "stable",
    description: "Introductory quotation at the start of a document",
    aliases: [],
  },
  {
    canonical: "caption",
    category: "content",
    since: "2.5",
    status: "stable",
    description: "Figure or table caption",
    aliases: [],
  },
  {
    canonical: "footnote",
    category: "content",
    since: "2.5",
    status: "stable",
    description: "Numbered footnote",
    aliases: [],
  },
  {
    canonical: "toc",
    category: "structure",
    since: "2.5",
    status: "stable",
    description: "Auto-generated table of contents",
    aliases: [],
  },
  {
    canonical: "dedication",
    category: "content",
    since: "2.5",
    status: "stable",
    description: "Document dedication page",
    aliases: [],
  },
];

// ── Derived helpers ─────────────────────────────────────────────────────────

/** All canonical keyword names (for parser KEYWORDS set). */
export const CANONICAL_KEYWORDS: string[] = LANGUAGE_REGISTRY.map(
  (k) => k.canonical,
);

/** Flat alias → canonical map (for ALIASES). Mirrors the current ALIASES shape. */
export const ALIAS_MAP: Record<string, string> = Object.fromEntries(
  LANGUAGE_REGISTRY.flatMap((k) =>
    k.aliases.map((a) => [a.alias, k.canonical]),
  ),
);

/** All deprecated aliases (for parser warnings). */
export const DEPRECATED_ALIASES: Set<string> = new Set(
  LANGUAGE_REGISTRY.flatMap((k) =>
    k.aliases.filter((a) => a.status === "deprecated").map((a) => a.alias),
  ),
);

/** Compat-only aliases (never show in completion hints or docs). */
export const COMPAT_ONLY_ALIASES: Set<string> = new Set(
  LANGUAGE_REGISTRY.flatMap((k) =>
    k.aliases.filter((a) => a.status === "compat-only").map((a) => a.alias),
  ),
);

/** Boundary keywords — consumed by the parser but produce no block output. */
export const BOUNDARY_KEYWORDS: Set<string> = new Set(
  LANGUAGE_REGISTRY.filter((k) => k.status === "boundary").map(
    (k) => k.canonical,
  ),
);

/** Keywords stable enough to show in editor hints and completion. */
export const PUBLIC_KEYWORDS: KeywordDefinition[] = LANGUAGE_REGISTRY.filter(
  (k) => k.status === "stable" || k.status === "boundary",
);
```

---

## Part 2 — Update `packages/core/src/types.ts`

### 2a. Replace the manually maintained `KEYWORDS` array

Remove the hardcoded `export const KEYWORDS = [...]` block entirely and replace it with:

```typescript
import { CANONICAL_KEYWORDS, ALIAS_MAP } from "./language-registry";

/** All recognized keywords (canonical + all aliases). Used by the parser. */
export const KEYWORDS: string[] = [
  ...CANONICAL_KEYWORDS,
  ...Object.keys(ALIAS_MAP),
];
```

### 2b. Update the `BlockType` union

**Step 1 — Rename** these existing entries in the union:

- `"note"` → `"text"` (canonical rename; `note` becomes an alias)
- `"emit"` → `"signal"` (canonical rename; `emit` and `status` become deprecated aliases)
- `"headers"` → `"columns"` (canonical rename; `headers` becomes a compat-only alias)

After renaming in the union, do a project-wide search for `=== "note"`, `=== "emit"`, `=== "headers"` (and `!==` variants) in the renderer, validator, and all switch statements, and update to the new names.

**Step 2 — Remove** from the union:

- `"end"` — `end:` is no longer a user-facing keyword (see Part 4g below)

**Step 3 — Add** the following missing types:

```typescript
  | "cite"       // v1.0 bibliographic citation (was wrongly aliased to quote)
  | "group"      // v1.0 logical grouping
  | "danger"     // v1.0 danger/critical callout
  | "text"       // v1.0 body text (renamed from "note")
  | "signal"     // v2.2 workflow signal (renamed from "emit")
  | "columns"    // v1.0 table column definitions (renamed from "headers")
  | "input"      // v1.3 declared input parameter
  | "output"     // v1.3 declared output parameter
  | "tool"       // v2.0 external tool declaration
  | "prompt"     // v2.0 LLM prompt template
  | "memory"     // v2.0 agent memory declaration
```

**Step 4 — Verify** these are already present (do not add duplicates):
`"history"`, `"table"`, `"row"`, `"done"`, `"list-item"`, `"step-item"`, `"body-text"`, `"extension"`

The types `"list-item"`, `"step-item"`, `"body-text"`, and `"extension"` are parser-internal output types — never user-written keywords. They must stay in `BlockType` but must NOT appear in the language registry or `KEYWORDS` array.

---

## Part 3 — Rewrite `packages/core/src/aliases.ts`

Replace the entire file with this, deriving from the registry:

```typescript
/**
 * IntentText Keyword Aliases
 *
 * Generated from LANGUAGE_REGISTRY in language-registry.ts.
 * Do not edit manually — add aliases to language-registry.ts instead.
 *
 * Rules:
 *   - Aliases are input-only. documentToSource always writes canonical keywords.
 *   - Aliases resolve before validation, rendering, and history tracking.
 *   - An alias cannot point to another alias — only to canonical keywords.
 *   - Aliases are case-insensitive (handled by parser before lookup).
 */
import { ALIAS_MAP } from "./language-registry";

export const ALIASES: Record<string, string> = ALIAS_MAP;
```

That's it. All alias additions go into the registry from now on.

**Also remove the legacy `KEYWORD_ALIASES` map inside `parser.ts`** (the one with `question: "ask"`, `subsection: "sub"`, `done: "task"`, `status: "emit"`). Those entries must be moved into the registry definitions as aliases (most already are — verify and delete the local map).

---

## Part 4 — Update `packages/core/src/parser.ts`

### 4a. Remove the local `KEYWORD_ALIASES` block

Delete this block that appears near the top of the file:

```typescript
const KEYWORD_ALIASES: Record<string, string> = {
  question: "ask",
  subsection: "sub",
  done: "task",
  status: "emit",
};
```

These are now handled in the registry. Update the alias-resolution line that references it:

```typescript
// Before:
const aliasResolved = ALIASES[keyword] ?? keyword;
const resolvedType = (KEYWORD_ALIASES[aliasResolved] ??
  aliasResolved) as BlockType;

// After:
const resolvedType = (ALIASES[keyword] ?? keyword) as BlockType;
```

### 4b. Add a deprecation warning for deprecated aliases

After alias resolution, add:

```typescript
import { DEPRECATED_ALIASES } from "./language-registry";

// After resolving keyword but before building the block:
if (DEPRECATED_ALIASES.has(keyword)) {
  ctx.diagnostics.push({
    severity: "warning",
    code: "DEPRECATED_KEYWORD",
    message: `'${keyword}:' is deprecated. Use '${resolvedType}:' instead.`,
    line: ctx.lineNumber,
    column: 1,
  });
}
```

Also add `"DEPRECATED_KEYWORD"` to the `Diagnostic` code union in `types.ts`.

### 4c. Add handling for new canonical block types

Add these blocks in `parser.ts` (the section that processes post-alias-resolution logic, near where `step:`, `gate:`, `emit:`, etc. are handled):

**`input:` and `output:` blocks** — no special processing, just pass through as typed blocks.

**`group:` block** — no visual output, used for semantic grouping. Treat the same as `section` for child collection purposes but do not render as a heading.

**`cite:` block** — remove the line in the old `KEYWORD_ALIASES` / aliases that mapped `cite → quote`. The `cite` block type now has its own canonical identity. It takes `author:`, `date:`, `url:` pipe properties.

**`tool:`, `prompt:`, `memory:` blocks** — no special processing. They are content blocks within agent workflows. Pass through as typed blocks with their pipe properties.

**`table:` as an explicit keyword** — the parser already produces `table` blocks from `headers:`/`row:` grouping and markdown pipe rows. Add `table:` as an accepted keyword that can explicitly declare a table title or start a table group. When a `table:` keyword is encountered, store its content as the table label and wait for subsequent `headers:` / pipe rows.

### 4d. Update `V211_BLOCK_TYPES` and `AGENTIC_BLOCK_TYPES`

Add `tool`, `prompt`, `memory` to `AGENTIC_BLOCK_TYPES`. They were documented as v2.0 agent keywords.

Add `input`, `output` to a new constant `DATA_BLOCK_TYPES` (or just leave them as a set alongside the others for version detection).

Add `group` to a new constant or handle it in the version detection pass.

Add `cite` to the v1 content block pass (same version bucket as `quote`).

### 4e. Update `parseIntentTextSafe` unknown keyword check

Replace the hardcoded `Set(KEYWORDS)` lookup with the imported `CANONICAL_KEYWORDS` + alias keys from the registry. Currently `parseIntentTextSafe` builds its own `knownKeywords` set from `KEYWORDS` — since `KEYWORDS` now derives from the registry, this should continue to work correctly. Verify it does.

### 4f. Apply the three canonical renames throughout parser.ts

Search for every reference to the old names and update:

- `"emit"` → `"signal"` — update `V22_BLOCK_TYPES` and `AGENTIC_BLOCK_TYPES` sets (change the `"emit"` entry to `"signal"`). Update any `case "emit":` or `resolvedType === "emit"` checks.
- `"note"` → `"text"` — update any `case "note":` or `resolvedType === "note"` checks. (`note` does not appear in the named block-type sets like `AGENTIC_BLOCK_TYPES` so this should be minimal.)
- `"headers"` → `"columns"` — wherever the parser checks `resolvedType === "headers"` to begin table construction, change to `"columns"`. Update the `V211_BLOCK_TYPES` set if it contains `"headers"`.

Also confirm: the legacy `KEYWORD_ALIASES` had `done: "task"` — this is removed in 4a (the whole map is deleted). `done:` now resolves through `ALIASES` to its own canonical type `"done"`, not `"task"`. Verify no other code path still forces `done` to `task`.

### 4g. Remove the `code: ... end:` pattern

The `end:` keyword closed multi-line code blocks in the form `code:\n...\nend:`. Backtick fences (` ``` `) do the same job and are universally understood. Remove the keyword form:

1. `"end"` will no longer be in `CANONICAL_KEYWORDS` (not in registry), so the derived `KEYWORDS` array will no longer include it.
2. In the `codeCaptureMode` loop, remove the `isEndKeyword` branch entirely — keep only `isEndFence` (backtick detection).
3. The stray `end:` handler that currently emits an `UNEXPECTED_END` warning — change it to fall through to the normal unknown-keyword path so it emits `UNKNOWN_KEYWORD` like any other unrecognized keyword.
4. Add a one-line note to `CHANGELOG.md`: `end:` keyword removed — use backtick fences for multi-line code blocks.

---

## Part 5 — Update `packages/core/src/renderer.ts`

Add HTML rendering for each new block type. Follow the same pattern as adjacent existing blocks.

### `cite:` block

```typescript
case "cite": {
  const author = props?.author ? `<span class="it-cite-author">${escapeHtml(String(props.author))}</span>` : "";
  const date = props?.date ? `<span class="it-cite-date">${escapeHtml(String(props.date))}</span>` : "";
  const url = props?.url ? ` href="${escapeHtml(String(props.url))}"` : "";
  const title = url
    ? `<a class="it-cite-title"${url} target="_blank" rel="noopener noreferrer">${inlineHtml}</a>`
    : `<span class="it-cite-title">${inlineHtml}</span>`;
  return `<div class="it-cite">${title}${author ? ` — ${author}` : ""}${date ? `, ${date}` : ""}</div>`;
}
```

### `group:` block

```typescript
case "group": {
  // Renders children only — group itself produces no wrapping element
  const childHtml = (block.children ?? []).map((c) => renderBlock(c, options)).join("\n");
  return `<div class="it-group" data-group="${escapeHtml(block.content)}">${childHtml}</div>`;
}
```

### `input:` block

```typescript
case "input": {
  const type = props?.type ? escapeHtml(String(props.type)) : "string";
  const required = props?.required === "true" || props?.required === true;
  const def = props?.default != null ? `<span class="it-input-default">= ${escapeHtml(String(props.default))}</span>` : "";
  return `<div class="it-input"><span class="it-input-name">${inlineHtml}</span><span class="it-input-type">${type}</span>${required ? '<span class="it-input-required">required</span>' : ""}${def}</div>`;
}
```

### `output:` block

```typescript
case "output": {
  const type = props?.type ? escapeHtml(String(props.type)) : "any";
  const format = props?.format ? `<span class="it-output-format">${escapeHtml(String(props.format))}</span>` : "";
  return `<div class="it-output"><span class="it-output-name">${inlineHtml}</span><span class="it-output-type">${type}</span>${format}</div>`;
}
```

### `tool:` block

```typescript
case "tool": {
  const api = props?.api ? `<code class="it-tool-api">${escapeHtml(String(props.api))}</code>` : "";
  const method = props?.method ? `<span class="it-tool-method">${escapeHtml(String(props.method))}</span>` : "";
  return `<div class="it-tool"><span class="it-tool-name">${inlineHtml}</span>${api}${method}</div>`;
}
```

### `prompt:` block

```typescript
case "prompt": {
  const model = props?.model ? `<span class="it-prompt-model">${escapeHtml(String(props.model))}</span>` : "";
  return `<div class="it-prompt">${model}<div class="it-prompt-content">${inlineHtml}</div></div>`;
}
```

### `memory:` block

```typescript
case "memory": {
  const scope = props?.scope ? escapeHtml(String(props.scope)) : "session";
  return `<div class="it-memory"><span class="it-memory-scope">${scope}</span><span class="it-memory-content">${inlineHtml}</span></div>`;
}
```

### `danger:` block (new)

```typescript
case "danger": {
  return `<div class="it-callout it-danger" role="alert"><span class="it-callout-icon" aria-hidden="true">⛔</span><div class="it-callout-body">${inlineHtml}</div></div>`;
}
```

### Rename three existing renderer cases

Find these existing `case` entries in the renderer switch statement and apply the renames. The HTML structure stays identical — only the case label and the CSS class name change:

- `case "note":` → `case "text":` — change CSS class from `it-note` to `it-text`
- `case "emit":` → `case "signal":` — change CSS class from `it-emit` to `it-signal`
- `case "headers":` → `case "columns":` — change CSS class from `it-headers` to `it-columns` (if the class exists; otherwise leave the inner HTML unchanged)

---

## Part 6 — Update `packages/core/src/validate.ts`

Add validation rules for the new block types where sensible:

```typescript
// cite: should have either content (title) or a url
if (block.type === "cite" && !block.content && !block.properties?.url) {
  issues.push({
    blockId: block.id,
    blockType: "cite",
    type: "warning",
    code: "CITE_MISSING_TITLE",
    message: "cite block has no title and no url",
  });
}

// input: should have a name (content)
if (block.type === "input" && !block.content) {
  issues.push({
    blockId: block.id,
    blockType: "input",
    type: "warning",
    code: "INPUT_MISSING_NAME",
    message: "input block has no parameter name",
  });
}

// output: should have a name (content)
if (block.type === "output" && !block.content) {
  issues.push({
    blockId: block.id,
    blockType: "output",
    type: "warning",
    code: "OUTPUT_MISSING_NAME",
    message: "output block has no parameter name",
  });
}

// tool: should have api: or content
if (block.type === "tool" && !block.content && !block.properties?.api) {
  issues.push({
    blockId: block.id,
    blockType: "tool",
    type: "warning",
    code: "TOOL_MISSING_API",
    message: "tool block has no name and no api property",
  });
}

// prompt: should have content
if (block.type === "prompt" && !block.content) {
  issues.push({
    blockId: block.id,
    blockType: "prompt",
    type: "warning",
    code: "PROMPT_MISSING_CONTENT",
    message: "prompt block has no prompt text",
  });
}
```

Add the new diagnostic codes to the `Diagnostic` code union in `types.ts`:
`"CITE_MISSING_TITLE"`, `"INPUT_MISSING_NAME"`, `"OUTPUT_MISSING_NAME"`, `"TOOL_MISSING_API"`, `"PROMPT_MISSING_CONTENT"`, `"DEPRECATED_KEYWORD"`.

---

## Part 7 — Add parity tests

Create `packages/core/tests/language-registry.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  LANGUAGE_REGISTRY,
  CANONICAL_KEYWORDS,
  ALIAS_MAP,
  DEPRECATED_ALIASES,
  BOUNDARY_KEYWORDS,
} from "../src/language-registry";
import { KEYWORDS } from "../src/types";

describe("Language registry parity", () => {
  it("all canonical keywords are in parser KEYWORDS", () => {
    for (const canonical of CANONICAL_KEYWORDS) {
      expect(KEYWORDS).toContain(canonical);
    }
  });

  it("all alias keys are in parser KEYWORDS", () => {
    for (const alias of Object.keys(ALIAS_MAP)) {
      expect(KEYWORDS).toContain(alias);
    }
  });

  it("KEYWORDS contains no entries not in registry", () => {
    const registryAll = new Set([
      ...CANONICAL_KEYWORDS,
      ...Object.keys(ALIAS_MAP),
    ]);
    for (const kw of KEYWORDS) {
      expect(registryAll.has(kw)).toBe(true);
    }
  });

  it("no alias points to a non-canonical keyword", () => {
    const canonicalSet = new Set(CANONICAL_KEYWORDS);
    for (const [alias, canonical] of Object.entries(ALIAS_MAP)) {
      expect(canonicalSet.has(canonical)).toBe(
        true,
        `Alias '${alias}' points to '${canonical}' which is not canonical`,
      );
    }
  });

  it("no duplicate canonical keywords in registry", () => {
    const seen = new Set<string>();
    for (const def of LANGUAGE_REGISTRY) {
      expect(seen.has(def.canonical)).toBe(false);
      seen.add(def.canonical);
    }
  });

  it("no alias appears as both alias and canonical", () => {
    const canonicalSet = new Set(CANONICAL_KEYWORDS);
    for (const alias of Object.keys(ALIAS_MAP)) {
      expect(canonicalSet.has(alias)).toBe(false);
    }
  });

  it("deprecated aliases are all in ALIAS_MAP", () => {
    for (const dep of DEPRECATED_ALIASES) {
      expect(ALIAS_MAP).toHaveProperty(dep);
    }
  });

  it("boundary keywords produce no block output", () => {
    // Verify that boundary keywords are handled as boundaries, not blocks
    for (const boundary of BOUNDARY_KEYWORDS) {
      expect(CANONICAL_KEYWORDS).toContain(boundary);
    }
  });
});
```

Also add these spot tests to the appropriate existing test files:

In `parser.test.ts` — add tests confirming these previously-undocumented keywords now parse correctly:

- `cite: The Pragmatic Programmer | author: Hunt | date: 2019` → type `"cite"`, not `"quote"`
- `input: customer_id | type: string | required: true` → type `"input"`
- `output: report | type: object | format: JSON` → type `"output"`
- `group: Financial Summary` → type `"group"`
- `tool: Slack | api: https://hooks.slack.com | method: POST` → type `"tool"`
- `prompt: Summarize this | model: claude-3` → type `"prompt"`
- `memory: migration progress | scope: session` → type `"memory"`

In `renderer.test.ts` — add render tests for each of the above confirming the HTML output contains the expected class names.

In `parser.test.ts` — add a deprecation warning test:

- parsing `status: pipeline_complete` produces a diagnostic with `code: "DEPRECATED_KEYWORD"`.

---

## Part 8 — Update `packages/core/src/index.ts`

Export the new registry helpers so ecosystem packages can consume them:

```typescript
export {
  LANGUAGE_REGISTRY,
  CANONICAL_KEYWORDS,
  ALIAS_MAP,
  DEPRECATED_ALIASES,
  COMPAT_ONLY_ALIASES,
  BOUNDARY_KEYWORDS,
  PUBLIC_KEYWORDS,
} from "./language-registry";
export type {
  KeywordDefinition,
  KeywordCategory,
  KeywordStatus,
} from "./language-registry";
```

---

## Part 9 — Add `{label}` inline node type

IntentText inline text uses `{Name}` to produce a badge/pill label. No conflicts with any existing inline token.

### 9a. Add to `InlineNode` union in `types.ts`

```typescript
| { type: "label"; value: string }
```

### 9b. Add detection in `parseInlineNodes` in `parser.ts`

Add this block inside the `while (i < text.length)` loop, just before the final "Regular character" fallback:

```typescript
// Inline label {Name} — renders as a badge/pill
if (text[i] === "{") {
  const end = text.indexOf("}", i + 1);
  if (end > i + 1) {
    const labelText = text.slice(i + 1, end).trim();
    if (labelText && !labelText.includes("{")) {
      addNode({ type: "label", value: labelText });
      i = end + 1;
      continue;
    }
  }
}
```

### 9c. Add rendering in `renderer.ts`

In the inline node rendering switch (where `bold`, `italic`, `mention`, etc. are rendered to HTML strings):

```typescript
case "label":
  return `<span class="it-label">${escapeHtml(node.value)}</span>`;
```

### 9d. Add tests in `parser.test.ts`

```typescript
it("parses {Label} as inline label node", () => {
  const doc = parse("text: Review with {Legal} before {2026-Q2}");
  const block = doc.blocks[0];
  expect(block.type).toBe("text");
  const labels = block.inline!.filter((n) => n.type === "label");
  expect(labels).toHaveLength(2);
  expect(labels[0].value).toBe("Legal");
  expect(labels[1].value).toBe("2026-Q2");
});

it("label does not conflict with existing inline syntax", () => {
  const doc = parse("text: Hello *bold* {Tag} @alice");
  const block = doc.blocks[0];
  const types = block.inline!.map((n) => n.type);
  expect(types).toContain("bold");
  expect(types).toContain("label");
  expect(types).toContain("mention");
});
```

---

## Decisions already made for you (do not re-litigate)

| Issue                                              | Decision                                                                                                                                                                      |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cite:` canonical vs alias                         | `cite` is canonical with its own block type and properties (author, date, url). Remove `cite → quote` from aliases.                                                           |
| `state of docs-only keywords`                      | `input`, `output`, `tool`, `prompt`, `memory`, `group`, `table` all become real implemented block types in this pass.                                                         |
| `history:` in KEYWORDS                             | Add to `CANONICAL_KEYWORDS` via the registry (status: boundary). It was already in `BlockType` — just also list it in the parser's recognized set.                            |
| `stat` vs `indicator` alias for `metric`           | Keep `stat` as compat-only, add `indicator` as alias.                                                                                                                         |
| `by:` alias for `deadline`                         | Add `by` as alias.                                                                                                                                                            |
| `content:` alias for `text`                        | `content` is an alias for `text` (the canonical body text block, previously `note`).                                                                                          |
| `status` / `emit` deprecation                      | Both `status:` and `emit:` are deprecated aliases for `signal:`. All three trigger `DEPRECATED_KEYWORD` diagnostics. Users should migrate to `signal:`.                       |
| `h1`/`h2`/`h3`/`p`                                 | Keep as compat-only aliases, never surface in completion or docs.                                                                                                             |
| `note` → `text` rename                             | Canonical block type renamed to `text`; `note` stays as a first-class alias (visible in docs and completion). Block output type changes from `"note"` to `"text"` everywhere. |
| `emit` → `signal` rename                           | Canonical renamed to `signal`; both `emit` and `status` become deprecated aliases with `DEPRECATED_KEYWORD` warning.                                                          |
| `headers` → `columns` rename                       | Canonical renamed to `columns` to eliminate collision with `header` (layout keyword). `headers` becomes compat-only alias.                                                    |
| `done:` is canonical, not alias of task            | Remove `done: "task"` from `KEYWORD_ALIASES`. `done:` parses to its own `"done"` block type. `task:` = to-do, `done:` = completed.                                            |
| `danger:` new keyword                              | New canonical content keyword alongside `warning`. Aliases: `critical`, `destructive`.                                                                                        |
| `end:` removed                                     | `code: ... end:` pattern removed. Backtick fences are the only code block delimiter. Remove `end` from KEYWORDS and BlockType.                                                |
| `columns:` and `row:` in registry                  | Both were in KEYWORDS but missing from the language registry. Added as canonical `data` keywords.                                                                             |
| `policy` category                                  | Moved from `trust` to `agent` — it enforces workflow constraints, not document trust.                                                                                         |
| `{Label}` inline format                            | New inline node type `label`. Syntax: `{Name}` anywhere in text content. Renders as a badge/pill. Added to `InlineNode` union and `parseInlineNodes`.                         |
| `list-item`, `step-item`, `body-text`, `extension` | Parser-internal output types only. Stay in `BlockType`, must NOT be in the language registry or `KEYWORDS`.                                                                   |

---

## What you must NOT do

- Do not break any currently passing tests. Run `pnpm test` or `npm test` before and after.
- Do not change the HTML structure of any existing block types — only add new cases and apply the three approved CSS class renames (`it-note→it-text`, `it-emit→it-signal`, `it-headers→it-columns`).
- Do not rename any canonical keyword except the three explicitly approved renames: `note→text`, `emit→signal`, `headers→columns`.
- Do not add any features beyond what is specified here.
- Do not modify files outside `packages/core/src/` and `packages/core/tests/`.

---

## Order of execution

1. Create `language-registry.ts`
2. Update `types.ts` (KEYWORDS import, BlockType additions)
3. Rewrite `aliases.ts`
4. Update `parser.ts` (remove legacy map, add new block handling, deprecation warn)
5. Update `renderer.ts` (add new cases)
6. Update `validate.ts` (add new rules)
7. Update `index.ts` (new exports)
8. Add/update tests
9. Run the full test suite and fix any failures before declaring done

---

## Definition of done

- `pnpm test` passes with zero failures
- `language-registry.test.ts` all passing
- `cite:` parses to type `"cite"`, not `"quote"`, with author/date/url properties
- `input:`, `output:`, `tool:`, `prompt:`, `memory:`, `group:` all parse to their own block types
- `status:` emits `DEPRECATED_KEYWORD` warning
- `KEYWORDS` array is no longer a hardcoded list in `types.ts`
- `ALIASES` map is no longer a hardcoded object in `aliases.ts`
- All ecosystem consumers of `@intenttext/core` can import `LANGUAGE_REGISTRY` for their own keyword tables
- `note:` parses to block type `"text"`, not `"note"`; existing `note:` documents continue to work unchanged
- `emit:` and `status:` both emit `DEPRECATED_KEYWORD` diagnostic and parse to block type `"signal"`
- `headers:` parses to block type `"columns"`, not `"headers"`
- `done:` parses to its own `"done"` block type, not `"task"`
- `danger:` parses and renders as a danger callout with aliases `critical` and `destructive`
- `{Name}` in inline text produces `InlineNode` with `type: "label"`, `value: "Name"`
- `end:` keyword no longer accepted — backtick fences are the only multi-line code block delimiter
- `columns:` and `row:` are in the language registry as canonical `data` keywords
