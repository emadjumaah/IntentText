# IntentText Python SDK — Full Parity with TypeScript Core

## Prompt for Opus — `intenttext-python/` only

---

## OBJECTIVE

The Python SDK is currently ~1,530 lines. The TypeScript core is ~10,000.
This prompt brings Python to full parity — every public function, every
module, every feature that exists in TypeScript must exist in Python.

Python dominates AI tooling. LangChain, CrewAI, AutoGen, LlamaIndex —
all Python. If IntentText is AI-native, Python must be a first-class SDK,
not a subset.

**Parity target:** Every function exported from `packages/core/index.ts`
must have an identical Python equivalent with identical behavior.

## DEPENDENCY: Complete PROMPT_WORKFLOW_EXECUTOR first

`executor.py` mirrors `packages/core/src/executor.ts`.
That file does not exist until PROMPT_WORKFLOW_EXECUTOR is executed.
Run that prompt first. Then return to this one.

---

## READ FIRST — ALL OF THESE

```
packages/core/index.ts               ← complete public API surface
packages/core/src/types.ts           ← all types and interfaces
packages/core/src/parser.ts          ← parsing behavior
packages/core/src/renderer.ts        ← HTML rendering
packages/core/src/aliases.ts         ← alias map
packages/core/src/language-registry.ts ← keyword registry
packages/core/src/validate.ts        ← all validation rules and codes
packages/core/src/query.ts           ← query engine with all operators
packages/core/src/diff.ts            ← diff algorithm
packages/core/src/merge.ts           ← template merge
packages/core/src/source.ts          ← document → .it serializer
packages/core/src/trust.ts           ← seal / verify / amend
packages/core/src/executor.ts        ← workflow executor (build first!)
packages/core/src/index-builder.ts   ← .it-index shallow index
packages/core/src/workflow.ts        ← extractWorkflow / graph
packages/core/src/ask.ts             ← natural language query
packages/core/tests/                 ← all TypeScript tests (behavior spec)

intenttext-python/                   ← current Python SDK (read what exists)
```

Read every TypeScript test file. They are the behavioral contract.
Port every single test to Python.

---

## PROJECT STRUCTURE

```
intenttext-python/
├── pyproject.toml
├── README.md
├── intenttext/
│   ├── __init__.py          ← public API (mirrors index.ts)
│   ├── types.py             ← all dataclasses and types
│   ├── keywords.py          ← keyword set and alias map (mirrors language-registry.ts)
│   ├── parser.py            ← core parser
│   ├── inline.py            ← inline formatting parser (NEW — does not exist yet)
│   ├── renderer.py          ← HTML renderer
│   ├── merge.py             ← template merge
│   ├── query.py             ← query engine
│   ├── validate.py          ← semantic validation
│   ├── diff.py              ← document diff (NEW — does not exist yet)
│   ├── source.py            ← document → .it serializer
│   ├── trust.py             ← seal / verify / amend
│   ├── executor.py          ← workflow executor (NEW — mirrors executor.ts)
│   ├── index_builder.py     ← .it-index builder (NEW — does not exist yet)
│   ├── workflow.py          ← workflow graph extraction (NEW — does not exist yet)
│   ├── ask.py               ← natural language query (NEW — does not exist yet)
│   ├── language_registry.py ← keyword registry (NEW — does not exist yet)
│   └── cli.py               ← CLI entry point (NEW)
└── tests/
    ├── test_parser.py
    ├── test_inline.py        ← NEW
    ├── test_renderer.py
    ├── test_query.py
    ├── test_validate.py
    ├── test_diff.py          ← NEW
    ├── test_merge.py
    ├── test_source.py
    ├── test_trust.py
    ├── test_executor.py      ← NEW
    ├── test_workflow.py      ← NEW
    ├── test_index_builder.py ← NEW
    └── test_parity.py        ← NEW: exact parity with TS test fixtures
```

---

## PYPROJECT.TOML

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "intenttext"
version = "2.14.0"
description = "IntentText (.it) — the document language for humans and AI agents"
license = { text = "MIT" }
requires-python = ">=3.10"
dependencies = []   # zero required dependencies — pure Python

[project.optional-dependencies]
trust = ["cryptography>=41.0"]        # for future asymmetric signing
ai = ["anthropic>=0.25", "openai>=1.0", "google-generativeai>=0.5"]
dev = ["pytest>=8.0", "pytest-asyncio>=0.23", "mypy>=1.9", "ruff>=0.4"]

[project.scripts]
intenttext = "intenttext.cli:main"

[tool.hatch.build.targets.wheel]
packages = ["intenttext"]

[tool.mypy]
strict = true
python_version = "3.10"

[tool.ruff]
line-length = 100
```

Zero required dependencies. Pure Python stdlib for all core features.
SHA-256 hashing uses `hashlib` (stdlib) — no `cryptography` needed for basic sealing.
`trust` extra reserved for future asymmetric signing key management.
`ai` extra pulls in provider SDKs for `ask()`.

---

## PART 1 — TYPES (`intenttext/types.py`)

Mirror `types.ts` exactly using Python dataclasses.
**Read `packages/core/src/types.ts` in full before writing this file.**
The existing `intenttext/types.py` is incomplete — it is missing the full
`DocumentMetadata`, trust types, history types, and workflow types.

```python
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Literal, Union

@dataclass
class TableData:
    headers: list[str] | None = None
    rows: list[list[str]] = field(default_factory=list)

@dataclass
class IntentBlock:
    id: str
    type: str
    content: str
    properties: dict[str, Any] = field(default_factory=dict)
    inline: list[Any] | None = None       # list[InlineNode] — forward ref
    children: list['IntentBlock'] | None = None
    table: TableData | None = None
    line: int | None = None

# Trust metadata — mirrors IntentDocumentMetadata in types.ts
@dataclass
class TrackingInfo:
    version: str | None = None
    by: str | None = None
    at: str | None = None

@dataclass
class SignatureInfo:
    signer: str
    role: str | None = None
    at: str | None = None
    hash: str | None = None

@dataclass
class FreezeInfo:
    status: str | None = None
    at: str | None = None

@dataclass
class RegistryEntry:
    id: str
    type: str
    content: str
    hash: str
    at: str

@dataclass
class RevisionEntry:
    version: str
    at: str
    by: str
    note: str | None = None

@dataclass
class DocumentMetadata:
    title: str | None = None
    summary: str | None = None
    agent: str | None = None
    model: str | None = None
    # Context variables from context: block
    context: dict[str, str] | None = None
    theme: str | None = None
    # Trust metadata
    tracking: TrackingInfo | None = None
    signatures: list[SignatureInfo] = field(default_factory=list)
    freeze: FreezeInfo | None = None
    # Free-form meta: block properties
    meta: dict[str, str] | None = None

@dataclass
class HistoryEntry:
    type: str
    content: str
    properties: dict[str, Any] = field(default_factory=dict)

@dataclass
class HistorySection:
    entries: list[HistoryEntry] = field(default_factory=list)

@dataclass
class IntentDocument:
    version: str
    metadata: DocumentMetadata
    blocks: list[IntentBlock]
    diagnostics: list['ParseDiagnostic'] = field(default_factory=list)
    history: HistorySection | None = None

# Inline nodes — mirror InlineNode union from types.ts exactly
@dataclass
class TextNode:
    type: Literal['text'] = 'text'
    value: str = ''

@dataclass
class BoldNode:
    type: Literal['bold'] = 'bold'
    value: str = ''

@dataclass
class ItalicNode:
    type: Literal['italic'] = 'italic'
    value: str = ''

@dataclass
class StrikeNode:
    type: Literal['strike'] = 'strike'
    value: str = ''

@dataclass
class CodeNode:
    type: Literal['code'] = 'code'
    value: str = ''

@dataclass
class HighlightNode:
    type: Literal['highlight'] = 'highlight'
    value: str = ''

@dataclass
class LinkNode:
    type: Literal['link'] = 'link'
    value: str = ''
    href: str = ''

@dataclass
class MentionNode:
    type: Literal['mention'] = 'mention'
    value: str = ''

@dataclass
class TagNode:
    type: Literal['tag'] = 'tag'
    value: str = ''

InlineNode = Union[
    TextNode, BoldNode, ItalicNode, StrikeNode,
    CodeNode, HighlightNode, LinkNode, MentionNode, TagNode
]
```

    href: str = ''

@dataclass
class MentionNode:
type: Literal['mention'] = 'mention'
value: str = ''

@dataclass
class TagNode:
type: Literal['tag'] = 'tag'
value: str = ''

InlineNode = Union[
TextNode, BoldNode, ItalicNode, StrikeNode,
CodeNode, HighlightNode, LinkNode, MentionNode, TagNode
]

# Parse result types

# Parse result types — use str Enum for JSON serialization compatibility

from enum import Enum

class DiagnosticSeverity(str, Enum):
ERROR = 'error'
WARNING = 'warning'
INFO = 'info'

class DiagnosticCode(str, Enum): # Parse
LINE_TRUNCATED = 'LINE_TRUNCATED'
UNKNOWN_KEYWORD = 'UNKNOWN_KEYWORD'
MAX_BLOCKS_REACHED = 'MAX_BLOCKS_REACHED'
DEPRECATED_KEYWORD = 'DEPRECATED_KEYWORD' # Validation errors
STEP_REF_MISSING = 'STEP_REF_MISSING'
DEPENDS_REF_MISSING = 'DEPENDS_REF_MISSING'
PARALLEL_REF_MISSING = 'PARALLEL_REF_MISSING'
CALL_LOOP = 'CALL_LOOP'
RESULT_NOT_TERMINAL = 'RESULT_NOT_TERMINAL'
DUPLICATE_STEP_ID = 'DUPLICATE_STEP_ID' # Validation warnings
GATE_NO_APPROVER = 'GATE_NO_APPROVER'
STEP_NO_TOOL = 'STEP_NO_TOOL'
HANDOFF_NO_TO = 'HANDOFF_NO_TO'
RETRY_NO_MAX = 'RETRY_NO_MAX'
UNRESOLVED_VARIABLE = 'UNRESOLVED_VARIABLE'
EMPTY_SECTION = 'EMPTY_SECTION'
HISTORY_WITHOUT_FREEZE = 'HISTORY_WITHOUT_FREEZE' # Info
DOCUMENT_NO_TITLE = 'DOCUMENT_NO_TITLE'
TEMPLATE_HAS_UNRESOLVED = 'TEMPLATE_HAS_UNRESOLVED' # Trust
SEAL_VERIFICATION_FAILED = 'SEAL_VERIFICATION_FAILED'
SEAL_NOT_FOUND = 'SEAL_NOT_FOUND'

@dataclass
class ParseDiagnostic:
code: DiagnosticCode
message: str
severity: DiagnosticSeverity
line: int | None = None

@dataclass
class SafeParseResult:
document: IntentDocument
warnings: list[ParseDiagnostic]
errors: list[ParseDiagnostic]

@dataclass
class ValidationResult:
valid: bool
issues: list[ParseDiagnostic]

@dataclass
class DocumentDiff:
added: list[IntentBlock]
removed: list[IntentBlock]
modified: list[ModifiedBlock]
unchanged: list[IntentBlock]
summary: str

@dataclass
class ModifiedBlock:
before: IntentBlock
after: IntentBlock
content_changed: bool
properties_changed: list[str]
type_changed: bool

# Parse options

class UnknownKeywordMode(str, Enum):
NOTE = 'note'
SKIP = 'skip'
THROW = 'throw'

@dataclass
class ParseOptions:
unknown_keyword: UnknownKeywordMode = UnknownKeywordMode.NOTE
max_blocks: int = 10_000
max_line_length: int = 50_000
strict: bool = False

# Query options

@dataclass
class QueryOptions:
block_type: str | list[str] | None = None
content: str | None = None
content_regex: str | None = None
properties: dict[str, Any] | None = None
section: str | None = None
sort_by: str | None = None
sort_dir: Literal['asc', 'desc'] = 'asc'
limit: int | None = None
offset: int | None = None

# Render options

@dataclass
class RenderOptions:
theme: str | None = None
print_mode: bool = False
include_styles: bool = True

# Trust types

@dataclass
class SealResult:
hash: str
sealed_at: str

@dataclass
class VerifyResult:
valid: bool
hash: str
computed_hash: str
sealed_at: str | None = None
sealed_by: str | None = None

@dataclass
class AmendOptions:
section: str
was: str
now: str
amendment_ref: str
amended_by: str
amended_role: str | None = None

# Executor types

from typing import Callable, Awaitable

ToolHandler = Callable[[Any, dict[str, Any]], Any]

@dataclass
class ExecutionOptions:
max_steps: int = 1000
step_timeout: float = 30.0
unknown_tool: Literal['skip', 'error', 'warn'] = 'warn'
dry_run: bool = False

@dataclass
class ExecutionLogEntry:
block_id: str
block_type: str
content: str
status: str
timestamp: str
input: Any = None
output: Any = None
error: str | None = None
duration_ms: float | None = None

@dataclass
class ExecutionResult:
document: IntentDocument
context: dict[str, Any]
log: list[ExecutionLogEntry]
status: Literal['completed', 'gate_blocked', 'error', 'dry_run']
error: Exception | None = None
blocked_at: IntentBlock | None = None

# Index types — mirror index-builder.ts exactly

@dataclass
class IndexBlockEntry:
type: str
content: str
section: str | None = None
properties: dict[str, Any] = field(default_factory=dict)

@dataclass
class IndexFileEntry:
hash: str
modified_at: str
metadata: dict[str, Any] = field(default_factory=dict)
blocks: list[IndexBlockEntry] = field(default_factory=list)

@dataclass
class ItIndex:
version: Literal['1']
scope: Literal['shallow']
folder: str
built_at: str
core_version: str
files: dict[str, IndexFileEntry] = field(default_factory=dict)

@dataclass
class ComposedResult:
file: str
block: IndexBlockEntry

# Workflow types — mirror workflow.ts exactly

@dataclass
class WorkflowStep:
block: IntentBlock
depends_on: list[str] = field(default_factory=list)
depended_on_by: list[str] = field(default_factory=list)
is_gate: bool = False
is_terminal: bool = False
is_parallel: bool = False

@dataclass
class WorkflowGraph:
entry_points: list[str]
steps: dict[str, WorkflowStep]
execution_order: list[list[str]] # list[list[str]] — batches of parallel steps
gate_positions: list[int]
has_terminal: bool
warnings: list[str]

````

---

## PART 2 — KEYWORDS (`intenttext/keywords.py`)

```python
# 33 canonical keywords — mirror CANONICAL_KEYWORDS from TypeScript
CANONICAL_KEYWORDS: frozenset[str] = frozenset([
    'title', 'summary', 'meta',
    'section', 'sub', 'divider', 'toc',
    'text', 'warning', 'quote', 'code', 'image', 'link',
    'task', 'done', 'ask',
    'table', 'metric',
    'step', 'decision', 'gate', 'trigger', 'result', 'policy', 'audit',
    'track', 'approve', 'sign', 'freeze', 'amendment',
    'font', 'page', 'watermark',
])

# Internal parser types — not user-facing
INTERNAL_BLOCK_TYPES: frozenset[str] = frozenset([
    'list-item', 'step-item', 'body-text',
    'row', 'columns', 'extension',
])

# Complete alias map — must match aliases.ts exactly
ALIASES: dict[str, str] = {
    # text variants
    'note': 'text', 'paragraph': 'text', 'p': 'text',
    # warning variants
    'danger': 'warning',
    # info/tip/success → text + type: property (handled in parser)
    'info': 'text', 'tip': 'text', 'success': 'text',
    # quote variants
    'cite': 'quote', 'blockquote': 'quote',
    # section variants
    'h1': 'section', 'heading': 'section', 'chapter': 'section',
    # sub variants
    'h2': 'sub', 'h3': 'sub', 'subheading': 'sub', 'subsection': 'sub',
    # divider variants
    'hr': 'divider', 'separator': 'divider', 'break': 'divider',
    # task variants
    'todo': 'task', 'action': 'task', 'item': 'task',
    # done variants
    'completed': 'done', 'finished': 'done',
    # ask variants
    'question': 'ask',
    # sign variants
    'sig': 'sign', 'sign-here': 'sign',
    # amendment variants
    'amend': 'amendment', 'correction': 'amendment',
    # image variants
    'img': 'image', 'photo': 'image', 'figure': 'image',
    # link variants
    'url': 'link', 'href': 'link',
    # metric variants
    'stat': 'metric', 'kpi': 'metric',
    # freeze variants
    'lock': 'freeze',
    # table variants
    'headers': 'table',
    # step variants
    'run': 'step',
    # trigger variants
    'on': 'trigger', 'if': 'trigger',
}

# Properties whose values should be auto-coerced to numbers
NUMERIC_PROPERTIES: frozenset[str] = frozenset([
    'max', 'delay', 'retries', 'priority', 'value',
    'total', 'confidence', 'opacity', 'columns', 'depth',
])

# Callout aliases that add type: property
CALLOUT_TYPE_ALIASES: dict[str, str] = {
    'info': 'info',
    'tip': 'tip',
    'success': 'success',
    'danger': 'danger',
}

def resolve_keyword(raw: str) -> str:
    """Resolve a keyword: normalize, apply alias if present."""
    lower = raw.lower().strip()
    if lower in ALIASES:
        return ALIASES[lower]
    if lower in CANONICAL_KEYWORDS:
        return lower
    return lower  # unknown — caller decides what to do

def is_known_keyword(s: str) -> bool:
    lower = s.lower().strip()
    return lower in CANONICAL_KEYWORDS or lower in ALIASES
````

---

## PART 3 — PARSER (`intenttext/parser.py`)

Full reimplementation matching TypeScript parser behavior exactly.
Every parsing rule from SPEC Section 7 must be implemented.

Key rules (implement all — do not skip any):

1. Block detection regex: `^([a-zA-Z][a-zA-Z0-9_-]*)\s*:`
2. Symbol lines: `-`/`*` → list-item, `1.` → step-item, `//` → skip
3. Pipe splitting on `|` (escaped `\|` preserved)
4. Multi-line code blocks: `code:` with no content → capture until `end:`
5. Pipe table rows: `/^\|.*\|$/`
6. Section scoping
7. Document metadata extraction (title, summary, agent, model)
8. history: boundary handling
9. ID generation: `block-{n}` or `step-{n}`
10. Numeric property coercion
11. Callout alias → adds `type:` property
12. Extension keyword → emits extension block with x-type/x-ns

```python
import re
from dataclasses import dataclass, field
from .types import *
from .keywords import *

BLOCK_RE = re.compile(r'^([a-zA-Z][a-zA-Z0-9_-]*)\s*:(.*)$')
LIST_RE = re.compile(r'^[-*]\s+(.*)$')
ORDERED_RE = re.compile(r'^\d+\.\s+(.*)$')
TABLE_ROW_RE = re.compile(r'^\|.*\|$')
COMMENT_RE = re.compile(r'^//')

class Parser:
    def __init__(self, options: ParseOptions | None = None):
        self.options = options or ParseOptions()
        self._reset()

    def _reset(self) -> None:
        self.block_counter = 0
        self.step_counter = 0
        self.current_section: str | None = None
        self.in_code_block = False
        self.code_content: list[str] = []
        self.code_block_id = ''
        self.code_block_props: dict[str, Any] = {}
        self.table_headers: list[str] | None = None
        self.table_rows: list[list[str]] = []
        self.pending_body_text: list[str] = []
        self.history_boundary_found = False
        self.diagnostics: list[ParseDiagnostic] = []

    def parse(self, source: str) -> IntentDocument:
        ...

    def _parse_line(self, line: str, line_num: int) -> IntentBlock | None:
        ...

    def _parse_keyword_line(self, keyword: str, rest: str, line_num: int) -> IntentBlock:
        ...

    def _parse_pipe_segments(self, text: str) -> tuple[str, dict[str, Any]]:
        ...

    def _parse_table_line(self, line: str) -> list[str]:
        ...

    def _flush_body_text(self) -> IntentBlock | None:
        ...

    def _flush_table(self) -> IntentBlock | None:
        ...

    def _generate_block_id(self) -> str:
        self.block_counter += 1
        return f'block-{self.block_counter}'

    def _generate_step_id(self) -> str:
        self.step_counter += 1
        return f'step-{self.step_counter}'

    def _apply_numeric_coercion(
        self, block_type: str, props: dict[str, Any]
    ) -> None:
        for key in NUMERIC_PROPERTIES:
            if key in props:
                try:
                    val = props[key]
                    if isinstance(val, str):
                        props[key] = int(val) if '.' not in val else float(val)
                except (ValueError, TypeError):
                    pass
```

---

## PART 4 — INLINE PARSER (`intenttext/inline.py`)

Full inline formatting parser — identical to TypeScript `inline.ts`.

```python
import re
from .types import InlineNode, TextNode, BoldNode, ItalicNode, StrikeNode
from .types import CodeNode, HighlightNode, LinkNode, MentionNode, TagNode

def parse_inline(text: str) -> list[InlineNode]:
    """Parse inline formatting markers into InlineNode list."""
    ...

# Rules (implement all):
# *text*       → BoldNode
# _text_       → ItalicNode
# ~text~       → StrikeNode
# `text`       → CodeNode
# ^text^       → HighlightNode
# [[text]]     → InlineNoteNode
# @word        → MentionNode
# #word        → TagNode
# [label](url) → LinkNode
# [^1]         → FootnoteRefNode
# Single-line only, non-nesting, greedy, unmatched → literal
```

---

## PART 5 — RENDERER (`intenttext/renderer.py`)

Full HTML renderer — identical output to TypeScript renderer.
Every keyword renders to the same HTML class names and structure.

```python
def render_html(doc: IntentDocument, options: RenderOptions | None = None) -> str:
    """Render an IntentDocument to HTML."""
    ...

def render_block(block: IntentBlock, options: RenderOptions | None = None) -> str:
    """Render a single block to HTML."""
    ...

def render_inline(nodes: list[InlineNode]) -> str:
    """Render inline nodes to HTML."""
    ...
```

All 33 canonical block types rendered.
Extension blocks rendered as generic `it-extension` divs.
Inline styles applied from pipe properties.

---

## PART 6 — QUERY ENGINE (`intenttext/query.py`)

Full query engine — must match TypeScript query.ts exactly.
All operators, sort, limit, offset.

```python
def query_document(
    doc: IntentDocument,
    options: QueryOptions,
) -> list[IntentBlock]:
    """Query blocks from a document with filtering, sorting, pagination."""
    ...

def parse_query_string(query: str) -> QueryOptions:
    """
    Parse CLI query string to QueryOptions.
    Supports: type=X, content:contains=Y, owner=Z, due<2026-03-01
              sort:field:asc|desc, limit:N, offset:N
    """
    ...
```

Operators: `=`, `!=`, `<`, `>`, `<=`, `>=`, `:contains`, `:startsWith`, `?` (exists)
Sort: any property field, asc or desc
Limit and offset applied after all filtering and sorting.

---

## PART 7 — VALIDATE (`intenttext/validate.py`)

All validation rules — identical to TypeScript validate.ts.
Every diagnostic code. Same valid/warning/error classification.

```python
def validate_semantic(doc: IntentDocument) -> ValidationResult:
    """Run semantic validation on a parsed document."""
    ...
```

---

## PART 8 — DIFF (`intenttext/diff.py`)

Document diff — identical algorithm to TypeScript diff.ts.
Levenshtein distance for modified block detection (>80% similarity).

```python
def diff_documents(
    before: IntentDocument,
    after: IntentDocument,
) -> DocumentDiff:
    """Compute the diff between two IntentText documents."""
    ...

def _levenshtein(a: str, b: str) -> int:
    """Standard Levenshtein distance."""
    ...

def _similarity(a: str, b: str) -> float:
    """Return 0.0–1.0 similarity score."""
    ...
```

---

## PART 9 — MERGE (`intenttext/merge.py`)

Template merge — identical to TypeScript merge.ts.
All variable resolution rules including dot notation and array indexing.

```python
def merge_data(
    doc: IntentDocument,
    data: dict[str, Any],
) -> IntentDocument:
    """
    Merge template data into a document.
    Resolves {{variable}}, {{nested.path}}, {{items.0.key}}.
    """
    ...

def parse_and_merge(source: str, data: dict[str, Any]) -> IntentDocument:
    """Parse source then merge data — convenience function."""
    ...
```

---

## PART 10 — SOURCE (`intenttext/source.py`)

Document → .it source serializer.
Round-trip guarantee: `parse(document_to_source(doc)) == doc`

```python
def document_to_source(doc: IntentDocument) -> str:
    """Convert a parsed IntentDocument back to .it source text."""
    ...
```

Property serialization order per block type must match TypeScript source.ts.

---

## PART 11 — TRUST (`intenttext/trust.py`)

Full trust system — identical to TypeScript trust.ts.

```python
# Requires: pip install intenttext[trust]
# Uses: hashlib (stdlib) for SHA-256 — no external dependency needed

import hashlib

def seal_document(
    doc: IntentDocument,
    signer: str,
    role: str | None = None,
) -> SealResult:
    """Seal a document — compute hash, write freeze: and history: blocks."""
    ...

def verify_document(doc: IntentDocument) -> VerifyResult:
    """Verify a sealed document's integrity."""
    ...

def amend_document(
    doc: IntentDocument,
    options: AmendOptions,
) -> IntentDocument:
    """Formally amend a sealed document."""
    ...

def _compute_content_hash(doc: IntentDocument) -> str:
    """
    Compute SHA-256 hash of content above history: boundary.
    Identical algorithm to TypeScript computeDocumentHash().
    """
    ...
```

Note: Use `hashlib.sha256` from stdlib — no `cryptography` package needed
for basic sealing. Reserve `cryptography` extra for future asymmetric signing.

---

## PART 12 — EXECUTOR (`intenttext/executor.py`)

Workflow executor — async-first, mirrors TypeScript executor.ts exactly.

```python
import asyncio
from typing import Callable, Any
from .types import *
from .workflow import extract_workflow

ToolHandler = Callable[[Any, dict[str, Any]], Any]

@dataclass
class WorkflowRuntime:
    tools: dict[str, ToolHandler] = field(default_factory=dict)
    context: dict[str, Any] = field(default_factory=dict)
    on_gate: Callable[[IntentBlock, dict], Any] | None = None
    on_step_start: Callable[[IntentBlock, dict], None] | None = None
    on_step_complete: Callable[[IntentBlock, Any, dict], None] | None = None
    on_step_error: Callable[[IntentBlock, Exception, dict], None] | None = None
    on_audit: Callable[[IntentBlock, dict], None] | None = None
    options: ExecutionOptions = field(default_factory=ExecutionOptions)

async def execute_workflow(
    doc: IntentDocument,
    runtime: WorkflowRuntime | None = None,
) -> ExecutionResult:
    """
    Execute an IntentText workflow document.

    Same pattern as merge_data() — pure function, takes document + runtime,
    returns new document with execution state written back.

    Example:
        result = await execute_workflow(doc, WorkflowRuntime(
            tools={
                'crm.lookup': lambda input, ctx: fetch_customer(input),
                'email.send': lambda input, ctx: send_email(input),
            },
            context={'phone': '0501234567'},
        ))
    """
    ...

def execute_workflow_sync(
    doc: IntentDocument,
    runtime: WorkflowRuntime | None = None,
) -> ExecutionResult:
    """Synchronous wrapper for execute_workflow."""
    return asyncio.run(execute_workflow(doc, runtime))
```

Both async and sync variants — Python AI frameworks use both.

---

## PART 13 — WORKFLOW (`intenttext/workflow.py`)

Workflow graph extraction — mirrors TypeScript workflow.ts.

```python
def extract_workflow(doc: IntentDocument) -> WorkflowGraph:
    """
    Extract workflow graph from a document.
    Returns dependency graph with execution order.
    """
    ...
```

---

## PART 14 — INDEX BUILDER (`intenttext/index_builder.py`)

Shallow .it-index builder — mirrors TypeScript index-builder.ts.
**Read `packages/core/src/index-builder.ts` in full** before implementing.
The index is shallow — each `.it-index` file covers only the `.it` files
directly in its own folder. Never subfolders.

```python
import json
from pathlib import Path
from datetime import datetime, timezone
from .types import ItIndex, IndexFileEntry, IndexBlockEntry, ComposedResult
from .parser import parse

CORE_VERSION = '2.14.0'

def build_index_entry(
    doc: Any,   # IntentDocument
    source: str,
    modified_at: str,
) -> IndexFileEntry:
    """Build an index entry from a parsed document."""
    ...

def build_index(directory: Path) -> ItIndex:
    """
    Build a shallow .it-index for all .it files in directory.
    Does NOT recurse into subdirectories.
    """
    ...

def load_index(path: Path) -> ItIndex:
    """Load an existing .it-index file."""
    ...

def save_index(index: ItIndex, directory: Path) -> None:
    """Save index to directory/.it-index in JSON format."""
    ...

def compose_results(
    index: ItIndex,
    query_fn: Any,   # callable
) -> list[ComposedResult]:
    """Apply a query function across all files in the index."""
    ...

def compose_across_indexes(
    indexes: list[ItIndex],
    query_fn: Any,
) -> list[ComposedResult]:
    """Compose results from multiple shallow indexes."""
    ...
```

---

## PART 15 — NATURAL LANGUAGE QUERY (`intenttext/ask.py`)

Mirror TypeScript ask.ts — multi-provider support.
**The TypeScript version hardcodes claude-sonnet-4-20250514. Do NOT hardcode
any model name. Default to configurable models with sensible defaults.**

```python
from .types import IntentDocument
from .index_builder import ComposedResult

# Default models per provider — use these if model is not specified
DEFAULT_MODELS = {
    'anthropic': 'claude-3-5-sonnet-latest',   # use API's latest alias
    'openai': 'gpt-4o',
    'google': 'gemini-1.5-pro',
}

def serialize_context(results: list[ComposedResult]) -> str:
    """Serialize composed results to compact context string for LLM."""
    ...

def ask(
    results: list[ComposedResult],
    question: str,
    provider: str = 'anthropic',
    model: str | None = None,       # None → use DEFAULT_MODELS[provider]
    api_key: str | None = None,     # None → read from env var
    max_tokens: int = 1024,
    response_format: str = 'text',  # 'text' | 'json'
) -> str:
    """
    Ask a natural language question about documents.
    Requires: pip install intenttext[ai]

    Environment variables:
        ANTHROPIC_API_KEY  (for provider='anthropic')
        OPENAI_API_KEY     (for provider='openai')
        GOOGLE_API_KEY     (for provider='google')
    """
    ...
```

---

## PART 16 — LANGUAGE REGISTRY (`intenttext/language_registry.py`)

Mirror TypeScript language-registry.ts — single source of truth.

```python
from dataclasses import dataclass
from typing import Literal

LifecycleStatus = Literal['stable', 'beta', 'planned', 'deprecated']

@dataclass
class KeywordEntry:
    keyword: str
    category: str
    description: str
    since: str
    status: LifecycleStatus
    properties: list[str]
    aliases: list[str]
    example: str

LANGUAGE_REGISTRY: list[KeywordEntry] = [
    # Exactly 33 entries — one per canonical keyword
    # ... full registry
]

KEYWORD_COUNT = len(LANGUAGE_REGISTRY)   # must be 33

def get_keyword(keyword: str) -> KeywordEntry | None:
    ...

def get_by_category(category: str) -> list[KeywordEntry]:
    ...
```

---

## PART 17 — PUBLIC API (`intenttext/__init__.py`)

Mirror `packages/core/index.ts` exactly — every exported function.

```python
"""
IntentText (.it) — the document language for humans and AI agents.

Quick start:
    from intenttext import parse, query_document, QueryOptions

    doc = parse("title: My Document\\n\\ntask: Write tests | owner: Ahmed")
    tasks = query_document(doc, QueryOptions(block_type='task'))
    print(tasks[0].content)  # "Write tests"
"""

# Core parse functions
from .parser import parse, parse_with_options, parse_safe

# Query
from .query import query_document, parse_query_string

# Validate
from .validate import validate_semantic

# Render
from .renderer import render_html, render_block, RenderOptions

# Merge
from .merge import merge_data, parse_and_merge

# Diff
from .diff import diff_documents

# Source
from .source import document_to_source

# Trust
from .trust import seal_document, verify_document, amend_document

# Executor
from .executor import execute_workflow, execute_workflow_sync, WorkflowRuntime

# Workflow
from .workflow import extract_workflow

# Index
from .index_builder import build_index, load_index, save_index, query_index

# Ask
from .ask import ask

# Types — all public types exported
from .types import (
    IntentDocument, DocumentMetadata, IntentBlock, TableData,
    InlineNode, TextNode, BoldNode, ItalicNode, StrikeNode,
    CodeNode, HighlightNode, LinkNode, MentionNode, TagNode,
    ParseOptions, ParseDiagnostic, SafeParseResult, DiagnosticCode,
    DiagnosticSeverity, UnknownKeywordMode,
    QueryOptions, RenderOptions,
    ValidationResult, DocumentDiff, ModifiedBlock,
    SealResult, VerifyResult, AmendOptions,
    ExecutionOptions, ExecutionResult, ExecutionLogEntry,
    WorkflowGraph, WorkflowStep,
    ItIndex, IndexEntry,
)

# Keywords
from .keywords import (
    CANONICAL_KEYWORDS, ALIASES, resolve_keyword, is_known_keyword,
)

# Registry
from .language_registry import LANGUAGE_REGISTRY, KEYWORD_COUNT, get_keyword

__version__ = '2.14.0'
__all__ = [
    'parse', 'parse_with_options', 'parse_safe',
    'query_document', 'parse_query_string',
    'validate_semantic',
    'render_html', 'render_block',
    'merge_data', 'parse_and_merge',
    'diff_documents',
    'document_to_source',
    'seal_document', 'verify_document', 'amend_document',
    'execute_workflow', 'execute_workflow_sync',
    'extract_workflow',
    'build_index', 'load_index', 'save_index', 'ask',
    # types
    'IntentDocument', 'DocumentMetadata', 'IntentBlock', 'TableData',
    'TrackingInfo', 'SignatureInfo', 'FreezeInfo', 'HistorySection',
    'ParseOptions', 'ParseDiagnostic', 'SafeParseResult',
    'DiagnosticCode', 'DiagnosticSeverity', 'UnknownKeywordMode',
    'QueryOptions', 'RenderOptions',
    'ValidationResult', 'DocumentDiff', 'ModifiedBlock',
    'SealResult', 'VerifyResult', 'AmendOptions',
    'ExecutionOptions', 'ExecutionResult', 'ExecutionLogEntry',
    'WorkflowRuntime',
    'WorkflowGraph', 'WorkflowStep',
    'ItIndex', 'IndexFileEntry', 'IndexBlockEntry', 'ComposedResult',
    # keywords
    'CANONICAL_KEYWORDS', 'ALIASES', 'resolve_keyword', 'is_known_keyword',
    # registry
    'LANGUAGE_REGISTRY', 'KEYWORD_COUNT', 'get_keyword',
]
```

---

## PARITY TESTS (`tests/test_parity.py`)

Port every TypeScript test to Python. Same fixtures. Same expected output.

```python
import json
import pytest
from pathlib import Path
from intenttext import parse, render_html, query_document, QueryOptions

FIXTURES = Path(__file__).parent / 'fixtures'

def assert_parse_parity(source: str, expected: dict) -> None:
    """Parse source and compare to expected JSON output."""
    import dataclasses
    doc = parse(source)
    # Compare as dicts
    actual = json.loads(json.dumps(dataclasses.asdict(doc)))
    assert actual == expected, (
        f"Parity mismatch.\nActual:\n{json.dumps(actual, indent=2)}"
        f"\nExpected:\n{json.dumps(expected, indent=2)}"
    )

# Port ALL TypeScript tests here
# Minimum: one test per keyword, one test per diagnostic code,
# one test per query operator, one test per trust operation
```

---

## CLI (`intenttext/cli.py`)

Mirror the TypeScript CLI — all commands.

```python
import sys
import json
import argparse
from pathlib import Path
from . import (parse, render_html, query_document, parse_query_string,
               validate_semantic, diff_documents, document_to_source,
               seal_document, verify_document, build_index, query_index,
               execute_workflow_sync, WorkflowRuntime, ask)

def main() -> None:
    parser = argparse.ArgumentParser(prog='intenttext')
    sub = parser.add_subparsers(dest='command')

    # intenttext <file>           → parse to JSON
    # intenttext <file> --html    → render HTML
    # intenttext <file> --print   → render print HTML
    # intenttext query <dir>      → query
    # intenttext validate <file>  → validate
    # intenttext diff <f1> <f2>   → diff
    # intenttext seal <file>      → seal
    # intenttext verify <file>    → verify
    # intenttext index <dir>      → build index
    # intenttext ask <dir> "Q"    → natural language query
    # intenttext run <file>       → execute workflow (dry run by default)
    ...
```

---

## EXECUTION ORDER

1. `types.py` — all dataclasses
2. `keywords.py` — keyword set and alias map
3. `inline.py` — inline parser
4. `parser.py` — core parser
5. `tests/test_parser.py` — all parser tests passing before moving on
6. `renderer.py` — HTML renderer
7. `merge.py` — template merge
8. `query.py` — query engine with all operators
9. `validate.py` — semantic validation
10. `diff.py` — document diff
11. `source.py` — serializer
12. `trust.py` — seal/verify/amend
13. `workflow.py` — workflow graph
14. `executor.py` — workflow executor
15. `index_builder.py` — index builder
16. `language_registry.py` — registry
17. `ask.py` — NL query
18. `__init__.py` — public API
19. `cli.py` — CLI
20. `tests/test_parity.py` — full parity suite

---

## DONE CRITERIA

**Parity**

- [ ] Every function in `core/index.ts` has a Python equivalent
- [ ] All TypeScript tests ported to Python
- [ ] `pytest` — zero failures
- [ ] JSON output matches TypeScript output for all fixtures

**Quality**

- [ ] `mypy --strict` — zero errors
- [ ] `ruff check` — zero warnings
- [ ] Zero `Any` types in public API signatures
- [ ] All public functions have docstrings
- [ ] `parse_safe()` never raises — always returns SafeParseResult

**Completeness**

- [ ] `diff_documents()` implemented and tested
- [ ] `extract_workflow()` implemented and tested
- [ ] `build_index()` implemented and tested
- [ ] `query_document()` supports sort, offset, all operators
- [ ] `execute_workflow()` async + sync variants
- [ ] `ask()` supports anthropic, openai, google providers
- [ ] CLI implements all commands

**Zero dependencies**

- [ ] `pip install intenttext` — no required dependencies
- [ ] `pip install intenttext[trust]` — only `cryptography`
- [ ] `pip install intenttext[ai]` — only provider SDKs
- [ ] Core parse/render/query/validate works with stdlib only

**Compatibility**

- [ ] Python 3.10+
- [ ] Version: `2.14.0` — matches TypeScript core after executor prompt executes
- [ ] Compatibility matrix added to README (`intenttext-python/README.md`):
      | Python SDK | TS Core | Features |
      |---|---|---|
      | 2.14.0 | 2.14.0 | Full parity |
      | 2.x (current) | 2.13.x | Parse/render/trust/merge/query |
- [ ] `conftest.py` verifies version matches TS core version
