// Browser entry point — exports what runs in the browser.
export { parseIntentText } from "./parser";
export { renderHTML } from "./renderer";
export { convertMarkdownToIntentText } from "./markdown";
export type {
  IntentDocument,
  IntentBlock,
  BlockType,
  InlineNode,
  ParseOptions,
  Diagnostic,
} from "./types";
