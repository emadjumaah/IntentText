# intenttext-rs — Rust Core Implementation

## Prompt for Opus — Single Session (v2, supersedes PROMPT_RUST_CORE (1).md)

---

## OBJECTIVE

Implement `intenttext-rs` — a complete, production-grade Rust crate that is
the canonical high-performance implementation of the IntentText language.
This crate is the foundation for:

- `intenttext-cli-rs` — native binary replacing the Node.js CLI
- `intenttext-tauri` — desktop app Rust backend
- `intenttext-wasm` — WASM build replacing `@intenttext/core` in the browser
- Python bindings via PyO3

**Parity target:** The TypeScript implementation (`@intenttext/core` v2.13.4)
is the reference. Every parsing behavior, every keyword, every alias, every
validation error and warning code must produce identical output.

**This is not a port — it is a re-implementation from the SPEC and source.**
Read the TypeScript source as an authoritative behavioral reference.

---

## ⚠ CRITICAL CORRECTIONS FROM OLD PROMPT

The previous prompt (`PROMPT_RUST_CORE (1).md`) contained several inaccuracies.
**Use this document exclusively. Do not reference the old prompt.**

| Old prompt said                                          | Correct value                                                                                                                                                                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 718 tests                                                | **815+ tests** (pre-executor baseline; add executor tests once executor.ts lands)                                                                                                                                                          |
| `group` in KEYWORDS                                      | `group` was removed — not a keyword                                                                                                                                                                                                        |
| `emit` in KEYWORDS                                       | `emit` is a **deprecated alias** for `signal` — not a keyword                                                                                                                                                                              |
| `sha256:` hash prefix in index                           | **`hash:`** prefix (32-bit polynomial, not SHA-256)                                                                                                                                                                                        |
| `emit: ["event", "data"]` in PROPERTY_ORDER              | **`signal: ["event", "data"]`**                                                                                                                                                                                                            |
| `("status", "emit")` in alias map                        | `emit` → `signal` AND `status` → `signal` (both deprecated)                                                                                                                                                                                |
| `at:` as image property                                  | **`src:`** is canonical; `at:` is **deprecated** (parser normalizes + warns)                                                                                                                                                               |
| DiagnosticCode enum ~15 codes                            | **62 unique codes** across parser + validator                                                                                                                                                                                              |
| DocumentMetadata missing fields                          | Must include `tracking`, `signatures`, `freeze`, `meta`, `context`                                                                                                                                                                         |
| Aliases list was wrong                                   | All aliases derived from `language-registry.ts` (source of truth)                                                                                                                                                                          |
| `warning`/`danger`/`tip`/`success` as canonical keywords | After KEYWORD_FREEZE: `info:` is canonical; the four callout keywords are **type-injecting aliases** — they normalize to `info` AND inject `properties.type = "warning"` etc. This is a new alias variant, distinct from standard aliases. |
| No executor module                                       | `executor.rs` implements `execute_workflow()` — read `executor.ts` before writing it                                                                                                                                                       |

---

## READ FIRST

Before writing a single line of Rust, read these files in this order:

```
IntentText/packages/core/src/language-registry.ts  ← SINGLE SOURCE OF TRUTH for keywords + aliases + keyword categories
IntentText/packages/core/src/types.ts               ← BlockType, InlineNode, IntentDocument interfaces
IntentText/packages/core/src/parser.ts              ← parsing behavior reference
IntentText/packages/core/src/renderer.ts            ← HTML rendering reference
IntentText/packages/core/src/validate.ts            ← validation rules and ALL error codes
IntentText/packages/core/src/query.ts               ← query engine
IntentText/packages/core/src/merge.ts               ← template merge engine
IntentText/packages/core/src/source.ts              ← documentToSource (round-trip serializer)
IntentText/packages/core/src/trust.ts               ← seal, verify, amend operations
IntentText/packages/core/src/index-builder.ts       ← .it-index builder
IntentText/packages/core/src/workflow.ts            ← workflow graph extraction (WorkflowGraph, executionOrder)
IntentText/packages/core/src/executor.ts            ← workflow execution engine (executeWorkflow, WorkflowRuntime)
IntentText/packages/core/tests/                     ← all 815+ tests (behavioral spec)
```

---

## PROJECT SETUP

### Repository Structure

```
intenttext-rs/
├── Cargo.toml
├── Cargo.lock
├── README.md
├── src/
│   ├── lib.rs              ← public API re-exports
│   ├── types.rs            ← all types and structs (exact match to types.ts)
│   ├── keywords.rs         ← keyword set, alias map, compat-only, deprecated sets
│   ├── language_registry.rs← keyword category registry (canonical/extension/internal/alias architecture)
│   ├── parser.rs           ← core parser (line-by-line, block-by-block)
│   ├── inline.rs           ← inline formatting parser (bold, italic, links, etc.)
│   ├── renderer.rs         ← HTML renderer
│   ├── merge.rs            ← {{variable}} template merge engine
│   ├── query.rs            ← query engine (filter, sort, count, group by type)
│   ├── validate.rs         ← semantic validation (all 62 diagnostic codes)
│   ├── source.rs           ← documentToSource (JSON → .it round-trip)
│   ├── trust.rs            ← sign, freeze, verify, amend operations
│   ├── index.rs            ← .it-index builder (shallow document index)
│   ├── diff.rs             ← document diff/patch
│   └── executor.rs         ← workflow execution engine (executeWorkflow) [implement after executor.ts lands]
├── tests/
│   ├── parser_tests.rs
│   ├── inline_tests.rs
│   ├── renderer_tests.rs
│   ├── query_tests.rs
│   ├── validate_tests.rs
│   ├── source_tests.rs
│   ├── trust_tests.rs
│   ├── merge_tests.rs
│   ├── diff_tests.rs
│   └── parity_tests.rs     ← exact parity with TypeScript test fixtures
└── benches/
    └── parser_bench.rs
```

### Cargo.toml

```toml
[package]
name = "intenttext"
version = "2.13.4"
edition = "2021"
rust-version = "1.74"
description = "The IntentText (.it) document language — parser, renderer, query engine, trust"
license = "MIT"
repository = "https://github.com/intenttext/intenttext-rs"
keywords = ["document", "parser", "intenttext", "semantic", "format"]
categories = ["parser-implementations", "text-processing"]

[lib]
name = "intenttext"
crate-type = ["cdylib", "rlib"]   # cdylib for WASM/FFI, rlib for Rust use

[features]
default = ["renderer", "query", "validate"]
renderer = []
query = []
validate = []
trust = ["sha2", "hex"]
wasm = ["wasm-bindgen", "js-sys", "serde-wasm-bindgen"]
python = ["pyo3"]
c_ffi = []

[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
once_cell = "1"
thiserror = "1"
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1", features = ["v4"] }

# Trust feature
sha2 = { version = "0.10", optional = true }
hex = { version = "0.4", optional = true }

# WASM feature
wasm-bindgen = { version = "0.2", optional = true }
js-sys = { version = "0.3", optional = true }
serde-wasm-bindgen = { version = "0.6", optional = true }

# Python bindings
pyo3 = { version = "0.21", features = ["extension-module"], optional = true }

[dev-dependencies]
criterion = { version = "0.5", features = ["html_reports"] }

[[bench]]
name = "parser_bench"
harness = false
```

---

## PART 1 — TYPES (`src/types.rs`)

All types must exactly mirror `packages/core/src/types.ts`.

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// A parsed IntentText document
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct IntentDocument {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    pub blocks: Vec<IntentBlock>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<DocumentMetadata>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub diagnostics: Option<Vec<Diagnostic>>,
    /// v2.8: Populated only when ParseOptions::include_history_section = true
    #[serde(skip_serializing_if = "Option::is_none")]
    pub history: Option<HistorySection>,
}

/// Document-level metadata extracted from header blocks (v2.8+ fields required)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct DocumentMetadata {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub summary: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub language: Option<String>,  // "ltr" | "rtl"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agent: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    /// Scoped context variables from context: blocks
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    /// v2.8: Document history tracking state from track: block
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tracking: Option<TrackingState>,
    /// v2.8: Cryptographic signatures from sign: blocks
    #[serde(skip_serializing_if = "Option::is_none")]
    pub signatures: Option<Vec<Signature>>,
    /// v2.8: Freeze (seal) state from freeze: block
    #[serde(skip_serializing_if = "Option::is_none")]
    pub freeze: Option<FreezeState>,
    /// v2.8.1: Free-form metadata from meta: blocks
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meta: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TrackingState {
    pub version: String,
    pub by: String,
    pub active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Signature {
    pub signer: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
    pub at: String,
    pub hash: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valid: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FreezeState {
    pub at: String,
    pub hash: String,
    pub status: String,  // "locked"
}

/// A single parsed block — mirrors IntentBlock in types.ts
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct IntentBlock {
    pub id: String,
    #[serde(rename = "type")]
    pub block_type: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub original_content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub properties: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inline: Option<Vec<InlineNode>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<IntentBlock>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub table: Option<TableData>,
}

// NOTE: properties values in the TypeScript are `Record<string, string | number>`.
// In Rust, store them as String (all properties are string in the format).
// Numeric coercion for rendering is a renderer-level concern.

/// Inline rich text node — all variants must match types.ts InlineNode union
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum InlineNode {
    Text { value: String },
    Bold { value: String },
    Italic { value: String },
    Strike { value: String },
    InlineQuote { value: String },
    Highlight { value: String },
    Code { value: String },
    InlineNote { value: String },
    Date { value: String, iso: String },
    Mention { value: String },
    Tag { value: String },
    Label { value: String },
    Link { value: String, href: String },
    FootnoteRef { value: String },
}

/// Table data for columnar blocks
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TableData {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub headers: Option<Vec<String>>,
    pub rows: Vec<Vec<String>>,
}

/// A diagnostic from parsing or validation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Diagnostic {
    pub severity: DiagnosticSeverity,
    pub message: String,
    pub line: usize,
    pub column: usize,
    pub code: DiagnosticCode,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DiagnosticSeverity {
    Error,
    Warning,
    Info,
}

/// All 62 diagnostic codes — exact match to TypeScript implementation.
/// Parser-phase codes (10) come from `parser.ts` / `types.ts`.
/// Validate-phase codes (52) come from `validate.ts`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum DiagnosticCode {
    // ── Parser codes (from types.ts Diagnostic.code union) ────────────────
    UnterminatedCodeBlock,
    UnexpectedEnd,
    InvalidPropertySegment,
    HeadersWithoutRows,
    RowWithoutHeaders,
    UnknownExtensionKeyword,
    ExtensionValidation,
    LegacyHistoryBoundary,
    DeprecatedKeyword,
    DeprecatedProperty,

    // ── Workflow validation errors ─────────────────────────────────────────
    DuplicateStepId,
    StepRefMissing,
    DependsRefMissing,
    ParallelRefMissing,
    CallLoop,
    ResultNotTerminal,

    // ── Trust validation errors ────────────────────────────────────────────
    MultipleFreeze,
    FreezeNotLast,
    TrackNoVersion,
    SecretMissingName,
    ApprovNoBy,          // APPROVE_NO_BY
    SignNoHash,
    SignNoAt,
    RefMissingTarget,
    DefMissingMeaning,
    MetricMissingValue,
    AmendmentWithoutFreeze,
    AmendmentMissingRef,
    AmendmentMissingNow,
    FigureMissingSrc,
    DeadlineMissingDate,

    // ── Workflow validation warnings ───────────────────────────────────────
    EmptySection,
    GateNoApprover,
    StepNoTool,
    HandoffNoTo,
    RetryNoMax,
    PolicyNoCondition,
    PolicyNoAction,
    CiteMissingTitle,
    InputMissingName,
    OutputMissingName,
    ToolMissingApi,
    PromptMissingContent,
    AssertMissingCondition,
    HistoryWithoutFreeze,
    TrackWithoutTitle,
    FreezeUnsigned,
    SignHashInvalid,
    MetaAfterSection,
    HeaderWithoutPage,
    FooterWithoutPage,
    WatermarkWithoutPage,
    MultipleWatermarks,
    RefMissingRel,
    DefDuplicateTerm,
    MetricInvalidTrend,
    FigureMissingCaption,
    ContactNoReach,
    DeadlinePast,
    UnresolvedVariable,

    // ── Validation info ────────────────────────────────────────────────────
    DocumentNoTitle,
    TemplateHasUnresolved,
}

impl DiagnosticCode {
    /// Returns the string key as used in the TypeScript implementation.
    /// Used for JSON serialization and cross-language parity checks.
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::UnterminatedCodeBlock    => "UNTERMINATED_CODE_BLOCK",
            Self::UnexpectedEnd            => "UNEXPECTED_END",
            Self::InvalidPropertySegment   => "INVALID_PROPERTY_SEGMENT",
            Self::HeadersWithoutRows       => "HEADERS_WITHOUT_ROWS",
            Self::RowWithoutHeaders        => "ROW_WITHOUT_HEADERS",
            Self::UnknownExtensionKeyword  => "UNKNOWN_EXTENSION_KEYWORD",
            Self::ExtensionValidation      => "EXTENSION_VALIDATION",
            Self::LegacyHistoryBoundary    => "LEGACY_HISTORY_BOUNDARY",
            Self::DeprecatedKeyword        => "DEPRECATED_KEYWORD",
            Self::DeprecatedProperty       => "DEPRECATED_PROPERTY",
            Self::DuplicateStepId          => "DUPLICATE_STEP_ID",
            Self::StepRefMissing           => "STEP_REF_MISSING",
            Self::DependsRefMissing        => "DEPENDS_REF_MISSING",
            Self::ParallelRefMissing       => "PARALLEL_REF_MISSING",
            Self::CallLoop                 => "CALL_LOOP",
            Self::ResultNotTerminal        => "RESULT_NOT_TERMINAL",
            Self::MultipleFreeze           => "MULTIPLE_FREEZE",
            Self::FreezeNotLast            => "FREEZE_NOT_LAST",
            Self::TrackNoVersion           => "TRACK_NO_VERSION",
            Self::SecretMissingName        => "SECRET_MISSING_NAME",
            Self::ApprovNoBy               => "APPROVE_NO_BY",
            Self::SignNoHash               => "SIGN_NO_HASH",
            Self::SignNoAt                 => "SIGN_NO_AT",
            Self::RefMissingTarget         => "REF_MISSING_TARGET",
            Self::DefMissingMeaning        => "DEF_MISSING_MEANING",
            Self::MetricMissingValue       => "METRIC_MISSING_VALUE",
            Self::AmendmentWithoutFreeze   => "AMENDMENT_WITHOUT_FREEZE",
            Self::AmendmentMissingRef      => "AMENDMENT_MISSING_REF",
            Self::AmendmentMissingNow      => "AMENDMENT_MISSING_NOW",
            Self::FigureMissingSrc         => "FIGURE_MISSING_SRC",
            Self::DeadlineMissingDate      => "DEADLINE_MISSING_DATE",
            Self::EmptySection             => "EMPTY_SECTION",
            Self::GateNoApprover           => "GATE_NO_APPROVER",
            Self::StepNoTool               => "STEP_NO_TOOL",
            Self::HandoffNoTo              => "HANDOFF_NO_TO",
            Self::RetryNoMax               => "RETRY_NO_MAX",
            Self::PolicyNoCondition        => "POLICY_NO_CONDITION",
            Self::PolicyNoAction           => "POLICY_NO_ACTION",
            Self::CiteMissingTitle         => "CITE_MISSING_TITLE",
            Self::InputMissingName         => "INPUT_MISSING_NAME",
            Self::OutputMissingName        => "OUTPUT_MISSING_NAME",
            Self::ToolMissingApi           => "TOOL_MISSING_API",
            Self::PromptMissingContent     => "PROMPT_MISSING_CONTENT",
            Self::AssertMissingCondition   => "ASSERT_MISSING_CONDITION",
            Self::HistoryWithoutFreeze     => "HISTORY_WITHOUT_FREEZE",
            Self::TrackWithoutTitle        => "TRACK_WITHOUT_TITLE",
            Self::FreezeUnsigned           => "FREEZE_UNSIGNED",
            Self::SignHashInvalid          => "SIGN_HASH_INVALID",
            Self::MetaAfterSection         => "META_AFTER_SECTION",
            Self::HeaderWithoutPage        => "HEADER_WITHOUT_PAGE",
            Self::FooterWithoutPage        => "FOOTER_WITHOUT_PAGE",
            Self::WatermarkWithoutPage     => "WATERMARK_WITHOUT_PAGE",
            Self::MultipleWatermarks       => "MULTIPLE_WATERMARKS",
            Self::RefMissingRel            => "REF_MISSING_REL",
            Self::DefDuplicateTerm         => "DEF_DUPLICATE_TERM",
            Self::MetricInvalidTrend       => "METRIC_INVALID_TREND",
            Self::FigureMissingCaption     => "FIGURE_MISSING_CAPTION",
            Self::ContactNoReach           => "CONTACT_NO_REACH",
            Self::DeadlinePast             => "DEADLINE_PAST",
            Self::UnresolvedVariable       => "UNRESOLVED_VARIABLE",
            Self::DocumentNoTitle          => "DOCUMENT_NO_TITLE",
            Self::TemplateHasUnresolved    => "TEMPLATE_HAS_UNRESOLVED",
        }
    }
}

/// v2.8: History section below the `history:` boundary keyword
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HistorySection {
    pub registry: Vec<RegistryEntry>,
    pub revisions: Vec<RevisionEntry>,
    pub raw: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RegistryEntry {
    pub id: String,
    pub block_type: String,
    pub section: String,
    pub fingerprint: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dead: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RevisionEntry {
    pub version: String,
    pub at: String,
    pub by: String,
    pub change: String,  // "added" | "removed" | "modified" | "moved"
    pub id: String,
    pub block: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub section: Option<String>,
}

/// Parse options
#[derive(Debug, Clone, Default)]
pub struct ParseOptions {
    pub extensions: Vec<Box<dyn IntentExtension>>,
    /// v2.8: If true, parse the history section and populate document.history
    pub include_history_section: bool,
}
```

---

## PART 2 — KEYWORDS & ALIASES (`src/keywords.rs`)

**Source of truth:** `packages/core/src/language-registry.ts`

The `language-registry.ts` file is the ONLY authoritative source for keywords
and aliases. Do not hardcode any alias list — derive it from the registry structure
described here. Every alias entry types are: `"alias"` (standard), `"compat-only"`,
or `"deprecated"`.

### Canonical Keywords (78 total)

Organized by category. The Rust `KEYWORDS` set must contain ALL of these.

```
// Identity (7)
title, summary, meta, context, track, agent, model

// Content (19)
text, quote, cite, warning, danger, tip, info, success, code, image, link,
def, figure, contact, byline, epigraph, caption, footnote, dedication

// Structure (7)
section, sub, break, ref, deadline, embed, toc

// Data (5)
columns, row, input, output, metric

// Agent (27)
step, gate, trigger, signal, decision, memory, prompt, tool, audit, done,
error, result, handoff, wait, parallel, retry, call, loop, checkpoint,
import, export, progress, assert, secret, task, ask, policy

// Trust (6)
approve, sign, freeze, revision, amendment, history

// Layout (7)
page, font, header, footer, watermark, signline, divider
```

**Total: 78 canonical keywords.**

### Alias Table (complete, from language-registry.ts)

All aliases are additional strings the parser accepts and NORMALIZES to the
canonical form. The normalized `block.type` is always the canonical keyword.

```
// Standard aliases (alias → canonical):
"abstract"          → summary
"note"              → text
"body"              → text
"content"           → text
"paragraph"         → text
"blockquote"        → quote
"excerpt"           → quote
"pullquote"         → quote
"citation"          → cite
"source"            → cite
"reference"         → cite
"alert"             → warning
"caution"           → warning
"critical"          → danger
"destructive"       → danger
"hint"              → tip
"advice"            → tip
"snippet"           → code
"img"               → image
"photo"             → image
"picture"           → image
"url"               → link
"href"              → link
"define"            → def
"term"              → def
"glossary"          → def
"fig"               → figure
"diagram"           → figure
"chart"             → figure
"illustration"      → figure
"visual"            → figure
"person"            → contact
"party"             → contact
"entity"            → contact
"heading"           → section
"chapter"           → section
"subheading"        → sub
"references"        → ref
"see"               → ref
"related"           → ref
"xref"              → ref
"due"               → deadline
"milestone"         → deadline
"by"                → deadline
"kpi"               → metric
"measure"           → metric
"indicator"         → metric
"on"                → trigger
"if"                → decision
"log"               → audit
"run"               → step
"lock"              → freeze
"rule"              → policy
"constraint"        → policy
"guard"             → policy
"requirement"       → policy
"amend"             → amendment
"change"            → amendment
"signature-line"    → signline
"sign-here"         → signline
"hr"                → divider
"separator"         → divider
"check"             → task
"todo"              → task
"action"            → task
"item"              → task
"expect"            → assert
"verify"            → assert
"credential"        → secret
"token"             → secret

// Compat-only aliases (accepted + normalized, but NEVER shown in docs or hints):
"h1"                → title
"p"                 → text
"h2"                → section
"h3"                → sub
"subsection"        → sub
"due-date"          → deadline
"headers"           → columns
"stat"              → metric
"completed"         → done
"finished"          → done
"question"          → ask
"sig"               → signline

// Deprecated aliases (accepted + normalized, but parser emits DEPRECATED_KEYWORD warning):
"emit"              → signal      ← DEPRECATED (was keyword in v2.2, renamed in v2.6)
"status"            → signal      ← DEPRECATED
```

### Rust implementation

```rust
use once_cell::sync::Lazy;
use std::collections::{HashMap, HashSet};

pub static CANONICAL_KEYWORDS: Lazy<HashSet<&'static str>> = Lazy::new(|| {
    [
        // Identity
        "title", "summary", "meta", "context", "track", "agent", "model",
        // Content
        "text", "quote", "cite", "warning", "danger", "tip", "info", "success",
        "code", "image", "link", "def", "figure", "contact",
        "byline", "epigraph", "caption", "footnote", "dedication",
        // Structure
        "section", "sub", "break", "ref", "deadline", "embed", "toc",
        // Data
        "columns", "row", "input", "output", "metric",
        // Agent
        "step", "gate", "trigger", "signal", "decision", "memory", "prompt",
        "tool", "audit", "done", "error", "result", "handoff", "wait",
        "parallel", "retry", "call", "loop", "checkpoint", "import", "export",
        "progress", "assert", "secret", "task", "ask", "policy",
        // Trust
        "approve", "sign", "freeze", "revision", "amendment", "history",
        // Layout
        "page", "font", "header", "footer", "watermark", "signline", "divider",
    ]
    .into()
});

/// All aliases → their canonical form.
/// Includes standard aliases, compat-only aliases, AND deprecated aliases.
pub static ALIAS_MAP: Lazy<HashMap<&'static str, &'static str>> = Lazy::new(|| {
    HashMap::from([
        ("abstract", "summary"),
        ("note", "text"), ("body", "text"), ("content", "text"), ("paragraph", "text"),
        ("blockquote", "quote"), ("excerpt", "quote"), ("pullquote", "quote"),
        ("citation", "cite"), ("source", "cite"), ("reference", "cite"),
        ("alert", "warning"), ("caution", "warning"),
        ("critical", "danger"), ("destructive", "danger"),
        ("hint", "tip"), ("advice", "tip"),
        ("snippet", "code"),
        ("img", "image"), ("photo", "image"), ("picture", "image"),
        ("url", "link"), ("href", "link"),
        ("define", "def"), ("term", "def"), ("glossary", "def"),
        ("fig", "figure"), ("diagram", "figure"), ("chart", "figure"),
        ("illustration", "figure"), ("visual", "figure"),
        ("person", "contact"), ("party", "contact"), ("entity", "contact"),
        ("heading", "section"), ("chapter", "section"),
        ("subheading", "sub"),
        ("references", "ref"), ("see", "ref"), ("related", "ref"), ("xref", "ref"),
        ("due", "deadline"), ("milestone", "deadline"), ("by", "deadline"),
        ("kpi", "metric"), ("measure", "metric"), ("indicator", "metric"),
        ("on", "trigger"),
        ("if", "decision"),
        ("log", "audit"),
        ("run", "step"),
        ("lock", "freeze"),
        ("rule", "policy"), ("constraint", "policy"), ("guard", "policy"), ("requirement", "policy"),
        ("amend", "amendment"), ("change", "amendment"),
        ("signature-line", "signline"), ("sign-here", "signline"),
        ("hr", "divider"), ("separator", "divider"),
        ("check", "task"), ("todo", "task"), ("action", "task"), ("item", "task"),
        ("expect", "assert"), ("verify", "assert"),
        ("credential", "secret"), ("token", "secret"),
        // Compat-only
        ("h1", "title"),
        ("p", "text"),
        ("h2", "section"),
        ("h3", "sub"), ("subsection", "sub"),
        ("due-date", "deadline"),
        ("headers", "columns"),
        ("stat", "metric"),
        ("completed", "done"), ("finished", "done"),
        ("question", "ask"),
        ("sig", "signline"),
        // Deprecated
        ("emit", "signal"),
        ("status", "signal"),
    ])
});

/// Aliases that the parser normalizes but emits a DEPRECATED_KEYWORD warning for.
pub static DEPRECATED_ALIASES: Lazy<HashSet<&'static str>> = Lazy::new(|| {
    ["emit", "status"].into()
});

/// Compat-only aliases — normalized silently, never shown in editor hints or docs.
pub static COMPAT_ONLY_ALIASES: Lazy<HashSet<&'static str>> = Lazy::new(|| {
    [
        "h1", "p", "h2", "h3", "subsection",
        "due-date", "headers", "stat",
        "completed", "finished", "question", "sig",
    ]
    .into()
});

/// Boundary keywords — the parser consumes these but produces NO block output.
/// `history:` marks the start of the history section (below-the-fold audit log).
pub static BOUNDARY_KEYWORDS: Lazy<HashSet<&'static str>> = Lazy::new(|| {
    ["history"].into()
});

/// Check if a raw keyword string is valid (canonical or alias), and return canonical.
/// Returns None for completely unknown keywords.
pub fn resolve_keyword(raw: &str) -> Option<&'static str> {
    if CANONICAL_KEYWORDS.contains(raw) {
        return Some(
            // Safety: all canonical keywords are 'static &str in the set
            CANONICAL_KEYWORDS.get(raw).copied().unwrap()
        );
    }
    ALIAS_MAP.get(raw).copied()
}
```

---

## PART 3 — LANGUAGE SYNTAX

### Block syntax

A block is a single logical unit. The canonical form is:

```
keyword: content text here | property: value | property2: value2
```

Rules:

1. `keyword:` must appear at the start of a line (no leading whitespace)
2. Everything after `keyword: ` (one space) up to the first `|` is `content`
3. Properties are `key: value` segments separated by `|` (space-pipe-space)
4. Property values are trimmed strings; no quoting syntax
5. Continuation lines (indented with 2 or more spaces) extend the previous block's content
6. A blank line separates blocks (not strictly required — new keyword starts a new block)
7. `---` on its own line is a `divider` block (syntactic sugar)
8. Fenced code blocks: `opens a code block,` on its own line closes it
9. Everything inside a code fence is literal content (no keyword or inline parsing)

### Inline formatting

Parsed from block `content` and continuation lines:

| Syntax        | Type         | Notes                                         |
| ------------- | ------------ | --------------------------------------------- |
| `**text**`    | bold         |                                               |
| `_text_`      | italic       |                                               |
| `~~text~~`    | strike       |                                               |
| `` `code` ``  | code         |                                               |
| `"text"`      | inline-quote | curly or straight quotes                      |
| `==text==`    | highlight    |                                               |
| `((note))`    | inline-note  |                                               |
| `@name`       | mention      | word characters after @                       |
| `#tag`        | tag          | word characters after #                       |
| `[label]`     | label        | square brackets, single word                  |
| `[text](url)` | link         |                                               |
| `^[text]`     | footnote-ref |                                               |
| `2024-01-15`  | date         | ISO 8601 date tokens, with parsed `iso` field |

Inline parsing runs after block parsing, on `content` field only (not property values).

### Property coercion

Property values are always strings in the source format. The parser stores them as strings.
Renderers and query engines may coerce to numbers when semantically appropriate (e.g., `time: 30`).

### Continuation lines

Lines starting with 2+ spaces or a tab that follow a keyword line extend the
previous block's content. Content is joined with a newline.

```
text: First paragraph line
  continuation of the same block
  second continuation line
```

### The `history:` boundary keyword

`history:` followed by optional content (and `---` dividers) marks the start of
the audit history section. This section is below the main document body.

- The parser consumes `history:` and produces **no block** (it is a boundary keyword)
- Everything below `history:` is the history section
- The history section is only parsed when `ParseOptions::include_history_section = true`
- The history section contains `revision:` and `registry:` entries

---

## PART 4 — PARSER (`src/parser.rs`)

### Algorithm

The parser is a **line-by-line, single-pass** parser. No backtracking.

````
1. Split input into lines
2. For each line:
   a. If in code fence: collect as code content until closing ```
   b. If line matches /^([a-z][a-z0-9-]*):(.*)/ → new block start
      - Extract keyword (before colon), rest (after colon + space)
      - Resolve keyword via resolve_keyword():
        - Canonical: use as-is
        - Alias: normalize to canonical, emit DEPRECATED_KEYWORD if deprecated
        - Unknown: emit UNKNOWN_KEYWORD diagnostic, create "extension" block
   c. If line is `---` → divider block
   d. If line starts with 2+ spaces → continuation of current block
   e. Otherwise: start new text block (or discard if blank)
3. After all lines, run inline parser on each block's content
4. If include_history_section: parse history section
````

### Block ID generation

Every block gets a unique `id`. Use UUID v4 for new blocks in `parse()`.
When round-tripping (source → parse → source), IDs are preserved.

### Serialization forms

These block types are produced by the round-trip serializer (`source.rs`) but
are NOT valid input syntax — they are canonical serialization forms:

| Serialization type | Meaning                                         |
| ------------------ | ----------------------------------------------- |
| `list-item`        | An item in an unordered list (child of section) |
| `step-item`        | A numbered step (child of section)              |
| `body-text`        | Plain paragraph text (child of section)         |

These types appear in `IntentBlock.block_type` in the parsed AST when a section
contains nested plain-text items. The TypeScript parser produces these. The Rust
parser must produce them identically.

---

## PART 5 — SOURCE SERIALIZER (`src/source.rs`)

Converts an `IntentDocument` back to `.it` text. This is the round-trip path.

### Property ordering

Use `PROPERTY_ORDER` to emit properties in canonical order for each block type.
Properties not in the list are appended **alphabetically**.

```rust
pub fn property_order(block_type: &str) -> &'static [&'static str] {
    match block_type {
        "step"     => &["tool", "input", "output", "depends", "id", "status", "timeout"],
        "task"     => &["owner", "due", "priority", "status"],
        "done"     => &["owner", "time"],
        "decision" => &["if", "then", "else"],
        "trigger"  => &["event", "condition"],
        "loop"     => &["over", "do", "max"],
        "wait"     => &["timeout", "fallback"],
        "parallel" => &["steps", "join"],
        "retry"    => &["max", "delay", "backoff"],
        "gate"     => &["approver", "timeout"],
        "call"     => &["to", "input", "output"],
        "handoff"  => &["from", "to"],
        "signal"   => &["event", "data"],  // NOTE: NOT "emit" — signal is canonical
        "policy"   => &["if", "always", "never", "action", "requires", "notify",
                        "priority", "scope", "after", "id"],
        "image"    => &["src", "at", "caption", "width", "height"],
        // NOTE: "at" remains in image's property order for legacy round-trips,
        //        but "src" is the canonical property. Parser normalizes at→src
        //        and emits DEPRECATED_PROPERTY when "at" is encountered.
        "link"     => &["to"],
        "ref"      => &["to"],
        "embed"    => &["to"],
        "quote"    => &["by"],
        "font"     => &["size", "family", "weight", "color"],
        "page"     => &["size", "margin", "orientation"],
        "sign"     => &["role", "at", "hash"],
        "approve"  => &["by", "role", "at", "ref"],
        "freeze"   => &["at", "hash", "status"],
        "track"    => &["version", "by"],
        "meta"     => &[],  // empty = preserve insertion order
        "header"   => &["left", "center", "right", "skip-first"],
        "footer"   => &["left", "center", "right", "skip-first"],
        "watermark"=> &["color", "angle", "size"],
        _          => &[],  // all other types: alphabetical order
    }
}
```

### Round-trip contract

`parse(source(parse(input))) == parse(input)`

The serializer must be deterministic. Same input always produces same output.
The `id` property on blocks is an **internal** field — skip it during serialization.

---

## PART 6 — TRUST SYSTEM (`src/trust.rs`)

### Architecture

The trust system provides tamper-evident document sealing. It uses SHA-256
(not a digital signature scheme — no key pairs). The model is:

1. **sign:** — records the SHA-256 hash of the document body at signing time,
   plus signer name, role, and timestamp
2. **freeze:** — seals the document and locks further edits
3. **verify:** — recomputes the SHA-256 hash and compares against recorded value
4. **amend:** — creates a formal change record for a frozen document

### Hash computation

```rust
use sha2::{Sha256, Digest};

/// Compute the SHA-256 hash of the document body for signing.
/// The hash covers all content blocks EXCLUDING:
///   - history: section (below the boundary)
///   - amendment: blocks (added after freeze, so excluded by design)
///   - sign: blocks themselves
///   - freeze: block itself
pub fn compute_document_hash(blocks: &[IntentBlock]) -> String {
    let mut hasher = Sha256::new();
    for block in blocks {
        if matches!(block.block_type.as_str(), "sign" | "freeze" | "amendment") {
            continue;
        }
        hasher.update(block.block_type.as_bytes());
        hasher.update(b":");
        hasher.update(block.content.as_bytes());
        if let Some(props) = &block.properties {
            let mut sorted: Vec<_> = props.iter().collect();
            sorted.sort_by_key(|(k, _)| k.as_str());
            for (k, v) in sorted {
                hasher.update(k.as_bytes());
                hasher.update(b"=");
                hasher.update(v.as_bytes());
            }
        }
        hasher.update(b"\n");
    }
    hex::encode(hasher.finalize())
}
```

### Caveats

- **Multi-signer note**: multiple `sign:` blocks are valid; each records its own
  hash at its own point in time. If the document was edited between signings,
  earlier sign hashes will be invalid.
- **Amendment exclusion**: `amendment:` blocks are explicitly excluded from the
  hash so they can be added to frozen documents without invalidating signatures.
- This is NOT cryptographically signed — there are no private keys. The model
  provides tamper-evidence, not authentication.

### .it-index hash (different from SHA-256 above)

The `.it-index` uses a **fast non-cryptographic** 32-bit polynomial hash for
change detection. This is NOT SHA-256.

```rust
/// Fast 32-bit polynomial hash for .it-index change detection.
/// Prefix: "hash:" followed by 8 lowercase hex digits.
pub fn simple_hash(content: &str) -> String {
    let mut h: u32 = 0;
    for byte in content.bytes() {
        h = h.wrapping_mul(31).wrapping_add(byte as u32);
    }
    format!("hash:{:08x}", h)
}
```

---

## PART 7 — QUERY ENGINE (`src/query.rs`)

Mirrors TypeScript `query.ts`.

```rust
pub struct QueryOptions {
    pub block_type: Option<String>,        // filter by type
    pub section: Option<String>,           // filter by parent section
    pub properties: HashMap<String, String>, // filter by property value
    pub search: Option<String>,            // text search in content
    pub limit: Option<usize>,
    pub offset: Option<usize>,
    pub sort_by: Option<String>,           // property name
    pub sort_order: Option<SortOrder>,
}

pub enum SortOrder {
    Asc,
    Desc,
}

/// Execute a query against a document's blocks.
pub fn query(document: &IntentDocument, options: QueryOptions) -> Vec<&IntentBlock>;
```

---

## PART 8 — VALIDATION (`src/validate.rs`)

Semantic validation runs AFTER parsing. Returns a list of `Diagnostic` items.
Refer to `packages/core/src/validate.ts` for the exact rules for each code.

Key groups:

- **Workflow graph**: step IDs, step refs, depends refs, parallel refs, call loops
- **Trust**: multiple freeze, freeze-not-last, track-without-title, sign-hash-invalid
- **Layout**: header/footer/watermark must be paired with a page: block
- **Content**: empty sections, missing required properties (cite title, tool api, etc.)
- **Variable resolution**: `{{var}}` references must be defined in context
- **Amendment rules**: amendment: requires freeze: to exist; must have ref: and now: properties

All 62 diagnostic codes must be implemented. See Part 1 for the complete enum.

---

## PART 9 — PUBLIC API (`src/lib.rs`)

```rust
/// Parse `.it` source text into a structured IntentDocument.
/// Never panics. All errors are returned as diagnostics on the document.
pub fn parse(source: &str, options: Option<ParseOptions>) -> IntentDocument;

/// Render an IntentDocument to HTML string.
#[cfg(feature = "renderer")]
pub fn render(document: &IntentDocument, options: Option<RenderOptions>) -> String;

/// Validate an IntentDocument semantically (post-parse).
#[cfg(feature = "validate")]
pub fn validate(document: &IntentDocument) -> Vec<Diagnostic>;

/// Query blocks from a document.
#[cfg(feature = "query")]
pub fn query(document: &IntentDocument, options: QueryOptions) -> Vec<IntentBlock>;

/// Merge template variables into a document.
pub fn merge(document: &IntentDocument, vars: HashMap<String, String>) -> IntentDocument;

/// Convert a parsed IntentDocument back to .it source text (round-trip).
pub fn to_source(document: &IntentDocument) -> String;

/// Compute the SHA-256 hash of the document body (for sign/verify).
#[cfg(feature = "trust")]
pub fn seal_hash(document: &IntentDocument) -> String;

/// Verify all sign: blocks in the document.
/// Returns list of (signer, is_valid) pairs.
#[cfg(feature = "trust")]
pub fn verify(document: &IntentDocument) -> Vec<(String, bool)>;

/// Add an amendment: block to a frozen document.
#[cfg(feature = "trust")]
pub fn amend(document: &IntentDocument, ref_id: &str, description: &str) -> IntentDocument;

/// Build a .it-index entry for a single document.
pub fn index_entry(source: &str, path: &str) -> IndexEntry;
```

---

## PART 10 — WASM BINDINGS (`src/lib.rs`, behind `#[cfg(feature = "wasm")]`)

The WASM build replaces `@intenttext/core` in the browser.

```rust
#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn parse_wasm(source: &str) -> JsValue {
    let doc = parse(source, None);
    serde_wasm_bindgen::to_value(&doc).unwrap()
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn render_wasm(doc_json: &str) -> String {
    let doc: IntentDocument = serde_json::from_str(doc_json).unwrap_or_default();
    render(&doc, None)
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn validate_wasm(doc_json: &str) -> JsValue {
    let doc: IntentDocument = serde_json::from_str(doc_json).unwrap_or_default();
    let diags = validate(&doc);
    serde_wasm_bindgen::to_value(&diags).unwrap()
}
```

---

## PART 11 — TESTING REQUIREMENTS

### Parity target

Port all TypeScript tests (baseline: **815** as of `@intenttext/core` v2.13.4;
if `executor.ts` has landed, include executor tests as well) to Rust.

Test files location: `IntentText/packages/core/tests/`

Every test file has a Rust equivalent in `intenttext-rs/tests/`.

### Test categories

| TypeScript test file | Rust test file      | Count (approx.) |
| -------------------- | ------------------- | --------------- |
| `parser.test.ts`     | `parser_tests.rs`   | ~200            |
| `inline.test.ts`     | `inline_tests.rs`   | ~80             |
| `renderer.test.ts`   | `renderer_tests.rs` | ~120            |
| `validate.test.ts`   | `validate_tests.rs` | ~100            |
| `query.test.ts`      | `query_tests.rs`    | ~60             |
| `source.test.ts`     | `source_tests.rs`   | ~80             |
| `trust.test.ts`      | `trust_tests.rs`    | ~80             |
| `merge.test.ts`      | `merge_tests.rs`    | ~50             |
| `diff.test.ts`       | `diff_tests.rs`     | ~45             |
| `executor.test.ts`   | `executor_tests.rs` | ~30 (if exists) |

**All tests from the TypeScript baseline must pass before the crate is considered complete.**

### Critical test cases to verify

1. **Deprecated alias normalization**: `emit: foo` parses as `signal` block + DEPRECATED_KEYWORD diagnostic
2. **Status deprecated alias**: `status: waiting` parses as `signal` block + DEPRECATED_KEYWORD
3. **Image src vs at**: `image: | src: /img.png` is valid; `image: | at: /img.png` normalizes to `src:` + DEPRECATED_PROPERTY warning
4. **history: boundary**: `history:` creates NO block in `document.blocks`; everything below is in `document.history`
5. **list-item/step-item/body-text**: round-trip: `to_source(parse(source)) == source` for docs containing these types
6. **Amendment hash exclusion**: verifying a signed+frozen doc with an amendment block returns valid (amendment excluded from hash)
7. **index simple_hash**: `simple_hash("hello")` must equal `"hash:3610a686"` (match TypeScript `simpleHash` output exactly)
8. **Multi-section nesting**: sections with children contain nested blocks; accessing them via query requires child traversal
9. **Compat-only aliases**: `h1:`, `h2:`, `h3:`, `p:` are all parsed without any diagnostic
10. **code blocks**: fenced ``` blocks preserve content literally — no inline parsing, no keyword detection

---

## PART 12 — KEYWORD ARCHITECTURE (`src/language_registry.rs`)

The registry distinguishes four keyword classes. The parser's `CANONICAL_KEYWORDS`
set (78 total) is for tokenizing `.it` source. The registry adds a classification
layer used by documentation export, editor hints, and extension validation.

### Keyword classes

| Class       | Count | Description                                                                                                                          |
| ----------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `Standard`  | 37    | User-facing built-in keywords. Documented publicly. No prefix.                                                                       |
| `Extension` | 36    | Namespace-prefixed keywords (`x-writer:`, `x-agent:`, etc.). Valid only when the extension is registered.                            |
| `Internal`  | 6     | Block types produced by the parser but not valid user input: `list-item`, `step-item`, `body-text`, `divider`, `table`, `extension`. |
| `Alias`     | —     | All entries in `ALIAS_MAP` (standard aliases, compat-only, type-injecting, deprecated).                                              |

### Type-injecting callout aliases

`info:` is the canonical callout keyword. `warning:`, `danger:`, `tip:`, and
`success:` are **type-injecting aliases**: the parser normalizes `block_type` to
`"info"` AND sets `properties["type"] = "warning"` (or `"danger"`, `"tip"`, `"success"`).

This is different from standard aliases (which only rename the block type).

```rust
/// Resolve a keyword and apply any type injection.
/// Returns (canonical_type, injected_properties).
pub fn resolve_with_injection(raw: &str) -> (&'static str, HashMap<&'static str, &'static str>) {
    let mut injected = HashMap::new();
    let canonical = match raw {
        "warning" | "danger" | "tip" | "success" => {
            injected.insert("type", raw);
            "info"
        }
        other => resolve_keyword(other).unwrap_or(other),
    };
    (canonical, injected)
}
```

The renderer maps `info` blocks to CSS classes based on `properties["type"]`:

- no type or `"info"` → `callout-info`
- `"warning"` → `callout-warning`
- `"danger"` → `callout-danger`
- `"tip"` → `callout-tip`
- `"success"` → `callout-success`

### Extension keyword prefixes

Extension keywords use `x-{namespace}:` prefix. The parser tokenizes them as
`UnknownExtensionKeyword` unless a matching extension is registered. Namespaces:

| Namespace | Prefix      | Examples                              |
| --------- | ----------- | ------------------------------------- |
| `writer`  | `x-writer:` | `x-writer:figure`, `x-writer:byline`  |
| `doc`     | `x-doc:`    | `x-doc:toc`, `x-doc:embed`            |
| `agent`   | `x-agent:`  | `x-agent:agent`, `x-agent:model`      |
| `trust`   | `x-trust:`  | `x-trust:approve`, `x-trust:sign`     |
| `layout`  | `x-layout:` | `x-layout:font`, `x-layout:watermark` |
| `exp`     | `x-exp:`    | experimental / unstable keywords      |

### Rust struct

```rust
#[derive(Debug, Clone, PartialEq)]
pub enum KeywordClass {
    Standard,
    Extension { namespace: &'static str },
    Internal,
    Alias { target: &'static str, injects: Option<(&'static str, &'static str)> },
    Deprecated { target: &'static str },
    CompatOnly { target: &'static str },
}

pub struct RegistryEntry {
    pub keyword: &'static str,
    pub class: KeywordClass,
    pub since: &'static str,  // format version when introduced
}
```

---

## PART 13 — EXECUTOR (`src/executor.rs`)

> ⚠ **Implement `executor.rs` only after `executor.ts` exists in the TypeScript core.**
> Read `executor.ts` and `workflow.ts` before writing any Rust.
> If those files do not exist yet, skip this part and leave a TODO.

The executor runs a parsed IntentText workflow document — stepping through blocks
in dependency order, calling registered tool handlers, and writing execution state
back to the document.

### Key types

```rust
/// Caller-supplied tool implementations and lifecycle hooks.
pub struct WorkflowRuntime {
    /// Tool functions: tool name → async fn(input: HashMap<String, String>) → Result<String>
    pub tools: HashMap<String, Box<dyn ToolHandler>>,
    /// Called when a gate: block is reached. Returns true to continue, false to block.
    pub on_gate: Option<Box<dyn Fn(&IntentBlock) -> bool>>,
    pub on_step_start: Option<Box<dyn Fn(&IntentBlock)>>,
    pub on_step_complete: Option<Box<dyn Fn(&IntentBlock, &str)>>,
    pub on_step_error: Option<Box<dyn Fn(&IntentBlock, &str)>>,
    pub on_audit: Option<Box<dyn Fn(&ExecutionLogEntry)>>,
    pub options: ExecutionOptions,
}

pub struct ExecutionOptions {
    pub dry_run: bool,    // validate + plan, do not call tools
    pub max_steps: usize, // default: 1000
}

pub struct ExecutionResult {
    pub document: IntentDocument,   // with execution state written back
    pub context: HashMap<String, String>,
    pub log: Vec<ExecutionLogEntry>,
    pub status: ExecutionStatus,
    pub error: Option<String>,
    pub blocked_at: Option<IntentBlock>, // the gate: block that blocked execution
}

pub enum ExecutionStatus {
    Completed,
    GateBlocked,
    Error,
    DryRun,
}

pub struct ExecutionLogEntry {
    pub step_id: String,
    pub block_type: String,
    pub content: String,
    pub started_at: String,     // ISO 8601
    pub completed_at: String,   // ISO 8601
    pub status: String,         // "completed" | "skipped" | "error" | "blocked"
    pub output: Option<String>,
    pub error: Option<String>,
}
```

### Execution model

- `WorkflowGraph::execution_order` is `Vec<Vec<String>>` — batches of step IDs that can run in parallel.
- The executor processes batches sequentially. Within a batch, steps run in order (not actually parallel in v1).
- Execution-relevant block types: `step`, `decision`, `gate`, `trigger`, `result`, `audit`.
- Block types skipped silently: `loop`, `parallel`, `retry`, `wait`, `handoff`, `call`, `checkpoint`, `import`, `export`, `progress`, `signal`, `tool`, `prompt`, `memory`, `context`, `error`, `policy`.
- After each step runs, write `status: completed` (or `error`) back to the block's properties.
- `audit:` blocks become immutable execution records — write timestamp and executor metadata back.

### Public API addition

```rust
/// Execute a workflow document using the provided runtime.
/// Returns the document with execution state written back.
pub async fn execute_workflow(
    document: &IntentDocument,
    runtime: WorkflowRuntime,
) -> ExecutionResult;
```

Add to `src/lib.rs` behind `#[cfg(feature = "executor")]` and add `executor = []` to
`[features]` in `Cargo.toml`.

---

## PART 12 (old) — IMPORTANT NOTES

### Format version vs library version

- Library version: `2.13.2` (the `@intenttext/core` npm package version)
- Format version: `1.4` (the IntentText format specification version)
- These are intentionally different. The format version advances slowly. Do not conflate them.

### Columns and rows

`columns:` declares column names for subsequent `row:` blocks. The parser groups
them into `IntentBlock.table` on the first `row:` block. The TypeScript reference
parser manages this in a state machine — replicate exactly.

### Extension blocks

If a keyword is completely unknown (not canonical, not an alias), the parser
creates a block with `block_type = "extension"` and emits `UNKNOWN_EXTENSION_KEYWORD`.
Extensions are not errors — they are extensibility points.

### Variable interpolation

`{{variable_name}}` in content is replaced during `merge()`. If a variable is
referenced but not defined, validate() emits `UNRESOLVED_VARIABLE`. Template
documents track via `document.metadata.context`.

### The `id` property

Every block has an `id` field (UUID v4 or sequential). The `id` is:

- Generated during parse
- Preserved in round-trip serialization
- Used by the diff and history tracking systems
- **NOT emitted** in `to_source()` output unless explicitly set in the source

### Inline date parsing

The inline parser detects ISO 8601 dates (`2024-01-15`, `2024-01-15T10:30:00Z`)
and converts them to `InlineNode::Date { value: "...", iso: "..." }` where
`iso` is the normalized ISO string.

---

## CHECKLIST

Before considering the implementation complete:

- [ ] All 78 canonical keywords in `CANONICAL_KEYWORDS` (includes warning/danger/tip/success as type-injecting aliases of info)
- [ ] `language_registry.rs` — KeywordClass enum, RegistryEntry, Standard/Extension/Internal classification
- [ ] Type-injecting callout aliases: `warning`/`danger`/`tip`/`success` → `info` + `properties.type` injection
- [ ] `executor.rs` implemented (if executor.ts exists) — or marked TODO
- [ ] All 78 canonical keywords in `CANONICAL_KEYWORDS` (parser tokenizer set)
- [ ] All aliases in `ALIAS_MAP` (including all compat-only and deprecated)
- [ ] `emit` → `signal` (deprecated alias, not a canonical keyword)
- [ ] `status` → `signal` (deprecated alias)
- [ ] `history:` is a boundary keyword — no block produced
- [ ] All 62 `DiagnosticCode` variants implemented
- [ ] `DocumentMetadata` has all fields: tracking, signatures, freeze, meta, context
- [ ] `PROPERTY_ORDER` uses `signal:` not `emit:`
- [ ] `simple_hash()` uses 32-bit polynomial, `"hash:"` prefix (not `"sha256:"`)
- [ ] `compute_document_hash()` uses SHA-256, excludes sign/freeze/amendment blocks
- [ ] `image:` uses `src:` canonical; `at:` is deprecated property → DEPRECATED_PROPERTY
- [ ] Round-trip: `list-item`, `step-item`, `body-text` serialize correctly
- [ ] 815 tests ported and passing
- [ ] `wasm` feature builds with `wasm-bindgen`
- [ ] `python` feature builds with `pyo3`

---

_Generated against `@intenttext/core` v2.13.4 — IntentText format v1.4_
_Last verified: 815+ tests passing; executor.ts subject to addition — verify test count before running_
