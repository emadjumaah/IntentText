export interface IntentBlock {
  id: string; // auto-generated UUID or sequential ID
  type: BlockType; // title | section | sub | task | done | question
  // note | headers | row | image | link | code
  // divider | summary | list-item | step-item | body-text
  content: string; // primary text value (inline marks already parsed)
  originalContent?: string; // original text with formatting marks
  properties?: Record<string, string | number>; // pipe metadata: owner, due, time, at, to, caption, title, ...
  marks?: InlineMark[]; // inline formatting marks
  children?: IntentBlock[]; // nested blocks (e.g. list-items inside a section)
}

export type BlockType =
  | "title"
  | "summary"
  | "section"
  | "sub"
  | "divider"
  | "note"
  | "headers"
  | "row"
  | "task"
  | "done"
  | "question"
  | "image"
  | "link"
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

export interface IntentDocument {
  blocks: IntentBlock[];
  metadata?: {
    title?: string;
    summary?: string;
    language?: "ltr" | "rtl";
  };
}
