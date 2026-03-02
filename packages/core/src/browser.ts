// Browser entry point — only exports what runs in the browser.
// Excludes Node.js-only modules (export, knowledge-graph, templates).
export { parseIntentText } from "./parser";
export { renderHTML } from "./renderer";
export type {
  IntentDocument,
  IntentBlock,
  BlockType,
  InlineNode,
  ParseOptions,
  Diagnostic,
} from "./types";
