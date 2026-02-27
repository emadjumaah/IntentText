export interface IntentBlock {
  id: string; // auto-generated UUID or sequential ID
  type: BlockType; // title | section | sub | task | done | question
  // note | headers | row | image | link | code
  // divider | summary | list-item | step-item | body-text
  content: string; // primary text value (inline marks already parsed)
  originalContent?: string; // original text with formatting marks
  properties?: Record<string, string | number>; // pipe metadata: owner, due, time, at, to, caption, title, ...
  /**
   * @deprecated Use `inline` instead.
   * Legacy formatting model. Renderers already prefer `inline` when present.
   * Planned removal in v2.0.
   */
  marks?: InlineMark[];
  inline?: InlineNode[];
  children?: IntentBlock[]; // nested blocks (e.g. list-items inside a section)
  table?: {
    headers?: string[];
    rows: string[][];
  };
}

export const KEYWORDS = [
  "title",
  "summary",
  "section",
  "sub",
  "divider",
  "note",
  "headers",
  "row",
  "task",
  "done",
  "question",
  "image",
  "link",
  "ref",
  "embed",
  "code",
  "end",
  "template",
  "use",
  "include",
  "ai",
  "synthesize",
  "comment",
  "comment-reply",
];

export type BlockType =
  | "title"
  | "summary"
  | "section"
  | "sub"
  | "sub2"
  | "divider"
  | "note"
  | "info"
  | "warning"
  | "tip"
  | "success"
  | "headers"
  | "row"
  | "table"
  | "extension"
  | "task"
  | "done"
  | "question"
  | "image"
  | "link"
  | "ref"
  | "embed"
  | "code"
  | "end"
  | "template"
  | "use"
  | "template-use"
  | "include"
  | "ai"
  | "synthesize"
  | "comment"
  | "comment-reply"
  | "list-item"
  | "step-item"
  | "body-text";

export interface InlineMark {
  type: "bold" | "italic" | "strike" | "code";
  start: number;
  end: number;
}

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "strike"; value: string }
  | { type: "code"; value: string }
  | { type: "link"; value: string; href: string };

export interface IntentExtension {
  keywords?: string[];
  parseBlock?: (args: {
    keyword: string;
    content: string;
    properties?: Record<string, string | number>;
    line: number;
    column: number;
    parseInline: (text: string) => { content: string; inline: InlineNode[] };
  }) => IntentBlock | null | undefined;
  parseInline?: (args: {
    text: string;
    defaultParseInline: (text: string) => {
      content: string;
      inline: InlineNode[];
    };
  }) => { content: string; inline: InlineNode[] } | null | undefined;
  validate?: (document: IntentDocument) => Diagnostic[];
}

export interface ParseOptions {
  extensions?: IntentExtension[];
}

export interface Diagnostic {
  severity: "error" | "warning";
  message: string;
  line: number;
  column: number;
  code:
    | "UNTERMINATED_CODE_BLOCK"
    | "UNEXPECTED_END"
    | "INVALID_PROPERTY_SEGMENT"
    | "HEADERS_WITHOUT_ROWS"
    | "ROW_WITHOUT_HEADERS"
    | "UNKNOWN_EXTENSION_KEYWORD"
    | "EXTENSION_VALIDATION";
}

export interface IntentDocument {
  blocks: IntentBlock[];
  metadata?: {
    title?: string;
    summary?: string;
    language?: "ltr" | "rtl";
  };
  diagnostics?: Diagnostic[];
}

// Query types (v1.2)
export interface QueryClause {
  field: string;
  operator:
    | "="
    | "!="
    | "<"
    | ">"
    | "<="
    | ">="
    | "contains"
    | "startsWith"
    | "exists";
  value?: string | number | boolean;
}

export interface QuerySort {
  field: string;
  direction: "asc" | "desc";
}

export interface QueryOptions {
  where?: QueryClause[];
  sort?: QuerySort[];
  limit?: number;
  offset?: number;
}

export interface QueryResult {
  blocks: IntentBlock[];
  total: number;
  matched: number;
}

// Schema types (v1.2)
export interface PropertySchema {
  type: "string" | "number" | "boolean" | "date" | "enum" | "url" | "email";
  required?: boolean;
  default?: string | number | boolean;
  enumValues?: string[];
  pattern?: string;
  min?: number;
  max?: number;
  format?: "iso-date" | "iso-datetime" | "time" | "url" | "email";
}

export interface BlockSchema {
  type: BlockType;
  content?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  properties?: Record<string, PropertySchema>;
  allowUnknownProperties?: boolean;
}

export interface DocumentSchema {
  name: string;
  description?: string;
  requiredBlocks?: BlockType[];
  blockSchemas?: Record<string, BlockSchema>;
  allowUnknownBlocks?: boolean;
}

export interface ValidationError {
  blockId: string;
  blockType: string;
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Template types (v1.2)
export interface Template {
  name: string;
  description?: string;
  params: string[];
  blocks: IntentBlock[];
}

export interface TemplateRegistry {
  [name: string]: Template;
}

// Export types (v1.2)
export interface ExportOptions {
  inputDir: string;
  outputDir: string;
  template?: string;
  baseUrl?: string;
  title?: string;
  description?: string;
  theme?: "default" | "minimal" | "docs";
  includeDrafts?: boolean;
}

export interface ExportResult {
  files: string[];
  errors: string[];
  warnings: string[];
}

// Knowledge Graph types (v1.2)
export interface DocumentNode {
  id: string;
  path: string;
  title: string;
  summary?: string;
  tags: string[];
  outgoingRefs: string[];
  incomingRefs: string[];
  blocks: IntentBlock[];
  metadata?: {
    author?: string;
    created?: string;
    updated?: string;
  };
}

export interface KnowledgeGraph {
  nodes: Map<string, DocumentNode>;
  edges: Array<{
    from: string;
    to: string;
    type: "ref" | "link" | "mention" | "similar";
    strength: number;
  }>;
  clusters: Map<string, string[]>;
}

export interface GraphBuildOptions {
  dir: string;
  includePatterns?: string[];
  excludePatterns?: string[];
  calculateSimilarity?: boolean;
  similarityThreshold?: number;
}

// AI types (v1.2)
export interface AIBlock extends IntentBlock {
  type: "ai";
  instruction: string;
  target?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface UncertainBlock extends IntentBlock {
  type: BlockType;
  confidence: number;
  needsVerification: boolean;
}

export interface SynthesizeBlock extends IntentBlock {
  type: "synthesize";
  scope: "section" | "document" | "custom";
  customRange?: string;
  outputType: "summary" | "qa" | "key-points" | "action-items" | "custom";
  customPrompt?: string;
}

export interface AIProcessingResult {
  document: IntentDocument;
  instructions: AIBlock[];
  synthesisTasks: SynthesizeBlock[];
  uncertainBlocks: UncertainBlock[];
  metadata: {
    aiBlockCount: number;
    uncertainCount: number;
    synthesisCount: number;
  };
}

// Collaboration types (v1.2)
export interface Mention {
  type: "user" | "group" | "ref";
  target: string;
  blockId: string;
  blockType: string;
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  blockId: string;
  resolved?: boolean;
  thread?: Comment[];
}

export interface ChangeRecord {
  id: string;
  timestamp: string;
  author: string;
  action: "create" | "update" | "delete";
  blockId: string;
  before?: IntentBlock;
  after?: IntentBlock;
}

export interface CollaborationData {
  mentions: Mention[];
  comments: Comment[];
  changes: ChangeRecord[];
  contributors: Set<string>;
}
