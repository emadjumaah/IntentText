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
  "code",
  "end",
];

export type BlockType =
  | "title"
  | "summary"
  | "section"
  | "sub"
  | "divider"
  | "note"
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
  | "code"
  | "end"
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
  | { type: "code"; value: string };

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
