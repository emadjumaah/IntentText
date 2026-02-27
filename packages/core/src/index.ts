export { parseIntentText } from "./parser";
export { renderHTML } from "./renderer";
export { convertMarkdownToIntentText } from "./markdown";
export { queryBlocks, parseQuery, formatQueryResult } from "./query";
export {
  validateDocument,
  createSchema,
  formatValidationResult,
  PREDEFINED_SCHEMAS,
} from "./schema";
export {
  extractTemplates,
  expandTemplates,
  processIncludes,
  processDocument,
  loadTemplateLibrary,
} from "./templates";
export { buildStaticSite, formatExportResult } from "./export";
export {
  buildKnowledgeGraph,
  findRelatedDocuments,
  generateRelatedDocsBlock,
  findPath,
  visualizeGraph,
  formatGraphSummary,
} from "./knowledge-graph";
export {
  extractAIInstructions,
  processUncertainty,
  extractSynthesisTasks,
  processAIDocument,
  formatAIResult,
  generateSynthesis,
} from "./ai-features";
export {
  extractMentions,
  extractComments,
  trackChanges,
  processCollaboration,
  formatCollaborationSummary,
  renderMentions,
} from "./collaboration";
export type {
  IntentBlock,
  IntentDocument,
  BlockType,
  InlineMark,
  InlineNode,
  IntentExtension,
  ParseOptions,
  Diagnostic,
  QueryOptions,
  QueryResult,
  QueryClause,
  QuerySort,
  DocumentSchema,
  BlockSchema,
  PropertySchema,
  ValidationResult,
  ValidationError,
  Template,
  TemplateRegistry,
  ExportOptions,
  ExportResult,
  KnowledgeGraph,
  DocumentNode,
  GraphBuildOptions,
  AIBlock,
  UncertainBlock,
  SynthesizeBlock,
  AIProcessingResult,
  Mention,
  Comment,
  ChangeRecord,
  CollaborationData,
} from "./types";
