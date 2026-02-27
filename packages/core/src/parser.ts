import { v4 as uuidv4 } from "uuid";
import {
  IntentBlock,
  BlockType,
  IntentDocument,
  Diagnostic,
  InlineNode,
  ParseOptions,
  IntentExtension,
} from "./types";

// Reserved keywords (case-insensitive)
const KEYWORDS = [
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

// Helper function to detect Arabic text (RTL)
function detectArabic(text: string): boolean {
  const arabicRegex = /[\u0600-\u06FF]/;
  return arabicRegex.test(text);
}

function splitPipeMetadata(rest: string): string[] {
  // Split on unescaped " | " (space-pipe-space). Escaped pipes ("\|") must not split.
  const parts: string[] = [];
  let current = "";

  for (let i = 0; i < rest.length; i++) {
    // Delimiter candidate at i+1 == '|' with surrounding spaces
    if (
      i + 2 < rest.length &&
      rest[i] === " " &&
      rest[i + 1] === "|" &&
      rest[i + 2] === " "
    ) {
      // Check if the pipe is escaped by an odd number of backslashes.
      let backslashes = 0;
      for (let j = i; j - 1 >= 0 && rest[j - 1] === "\\"; j--) backslashes++;
      const escaped = backslashes % 2 === 1;

      if (!escaped) {
        parts.push(current);
        current = "";
        i += 2;
        continue;
      }
    }

    current += rest[i];
  }

  parts.push(current);
  return parts;
}

function splitTableRow(text: string): string[] {
  // Split on unescaped '|' and then unescape cell contents.
  const cells: string[] = [];
  let current = "";
  let escaping = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escaping) {
      current += ch;
      escaping = false;
      continue;
    }

    if (ch === "\\") {
      current += ch;
      escaping = true;
      continue;
    }

    if (ch === "|") {
      cells.push(unescapeIntentText(current.trim()));
      current = "";
      continue;
    }

    current += ch;
  }

  cells.push(unescapeIntentText(current.trim()));
  return cells.filter((c) => c !== "");
}

function parseInlineNodes(text: string): {
  content: string;
  inline: InlineNode[];
} {
  const inline: InlineNode[] = [];
  let content = "";

  const pushText = (value: string) => {
    if (!value) return;
    inline.push({ type: "text", value });
    content += value;
  };

  const pushNode = (type: InlineNode["type"], value: string) => {
    inline.push({ type: type as any, value });
    content += value;
  };

  let i = 0;
  while (i < text.length) {
    // Triple backtick code span
    if (text.startsWith("```", i)) {
      const end = text.indexOf("```", i + 3);
      if (end === -1) {
        // Unmatched delimiter -> literal
        pushText("```");
        i += 3;
        continue;
      }

      const value = text.slice(i + 3, end);
      pushNode("code", value);
      i = end + 3;
      continue;
    }

    const ch = text[i];
    if (ch === "*" || ch === "_" || ch === "~") {
      const end = text.indexOf(ch, i + 1);
      if (end === -1) {
        pushText(ch);
        i += 1;
        continue;
      }

      const value = text.slice(i + 1, end);
      const type = ch === "*" ? "bold" : ch === "_" ? "italic" : "strike";
      pushNode(type, value);
      i = end + 1;
      continue;
    }

    // Plain text run
    let next = i + 1;
    while (
      next < text.length &&
      !text.startsWith("```", next) &&
      text[next] !== "*" &&
      text[next] !== "_" &&
      text[next] !== "~"
    ) {
      next++;
    }
    pushText(text.slice(i, next));
    i = next;
  }

  return { content, inline };
}

function unescapeIntentText(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\\" && i + 1 < text.length) {
      const next = text[i + 1];
      if (next === "\\" || next === "|") {
        result += next;
        i++;
        continue;
      }
    }
    result += ch;
  }
  return result;
}

// Helper function to parse a single line
function parseLine(
  line: string,
  ctx: {
    keywords: Set<string>;
    extensions: IntentExtension[];
    lineNumber: number;
    diagnostics: Diagnostic[];
    parseInline: (text: string) => { content: string; inline: InlineNode[] };
  },
): IntentBlock | null {
  const trimmed = line.trim();

  if (!trimmed) return null;

  // Check for keyword blocks
  const keywordMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9-]*):\s*(.*)$/);
  if (keywordMatch) {
    const keyword = keywordMatch[1].toLowerCase();
    const rest = keywordMatch[2];

    const isKnown = ctx.keywords.has(keyword);
    const isCoreKeyword = KEYWORDS.includes(keyword);
    const looksLikeExtension =
      keyword.startsWith("x-") || keyword.startsWith("ext-");

    if (!isKnown) {
      if (looksLikeExtension) {
        ctx.diagnostics.push({
          severity: "warning",
          code: "UNKNOWN_EXTENSION_KEYWORD",
          message: `Unknown extension keyword '${keyword}:'`,
          line: ctx.lineNumber,
          column: 1,
        });

        const { content: cleanContent, inline } = ctx.parseInline(trimmed);
        return {
          id: uuidv4(),
          type: "extension",
          content: cleanContent,
          originalContent: trimmed,
          inline,
          properties: { keyword },
        };
      }

      const { content: cleanContent, inline } = ctx.parseInline(trimmed);
      return {
        id: uuidv4(),
        type: "body-text",
        content: cleanContent,
        originalContent: trimmed,
        inline,
      };
    }

    // Spec rule: split on " | " (space-pipe-space). Non key:value segments
    // after the first are treated as content continuation.
    // But NOT for headers and rows which use | as data separator.
    let content: string;
    const properties: Record<string, string | number> = {};

    if (keyword === "headers" || keyword === "row") {
      content = rest;
    } else {
      const parts = splitPipeMetadata(rest);
      content = unescapeIntentText(parts[0] || "");

      for (let i = 1; i < parts.length; i++) {
        const segment = parts[i];
        const propMatch = segment.match(/^([^:]+):\s*(.*)$/);
        if (propMatch) {
          const key = propMatch[1].trim();
          const rawValue = propMatch[2].trim();

          // v1 policy: property keys are not escapable (keep simple + deterministic).
          if (key.includes("\\") || key.includes("|")) {
            ctx.diagnostics.push({
              severity: "warning",
              code: "INVALID_PROPERTY_SEGMENT",
              message: `Invalid property key '${key}'. Property keys must not contain escapes.`,
              line: ctx.lineNumber,
              column: 1,
            });
            content += ` | ${unescapeIntentText(segment)}`;
            continue;
          }

          properties[key] = unescapeIntentText(rawValue);
        } else {
          ctx.diagnostics.push({
            severity: "warning",
            code: "INVALID_PROPERTY_SEGMENT",
            message: `Invalid property segment '${segment.trim()}'. Expected 'key: value'.`,
            line: ctx.lineNumber,
            column: 1,
          });
          content += ` | ${unescapeIntentText(segment)}`;
        }
      }
    }

    const { content: cleanContent, inline } = ctx.parseInline(content);

    // Let extensions override keyword block construction.
    let handledByExtension = false;
    for (const ext of ctx.extensions) {
      const wantsKeyword = (ext.keywords || []).some(
        (k) => k.toLowerCase() === keyword,
      );
      if (!wantsKeyword || !ext.parseBlock) continue;

      const overridden = ext.parseBlock({
        keyword,
        content,
        properties: Object.keys(properties).length > 0 ? properties : undefined,
        line: ctx.lineNumber,
        column: 1,
        parseInline: ctx.parseInline,
      });

      handledByExtension = true;
      if (overridden) return overridden;
      if (overridden === null) return null;
    }

    // If this is an extension keyword (registered or prefixed) and not handled by an
    // extension, emit a generic extension block.
    if (!isCoreKeyword && (handledByExtension || looksLikeExtension)) {
      return {
        id: uuidv4(),
        type: "extension",
        content: cleanContent,
        originalContent: content,
        properties: {
          ...(Object.keys(properties).length > 0 ? properties : {}),
          keyword,
        },
        inline,
      };
    }

    return {
      id: uuidv4(),
      type: keyword as BlockType,
      content: cleanContent,
      originalContent: content, // Store original content with formatting
      properties: Object.keys(properties).length > 0 ? properties : undefined,
      inline,
    };
  }

  // Check for list items
  if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
    const payload = trimmed.substring(2);

    // Inline task shorthand: "- task: ..." should parse the same as a
    // standalone keyword block, but preserve list positioning.
    const embedded = parseLine(payload, {
      ...ctx,
      // embedded content shares same line number
    });
    if (
      embedded &&
      embedded.type !== "list-item" &&
      embedded.type !== "step-item"
    ) {
      return {
        id: uuidv4(),
        type: "list-item",
        content: embedded.content,
        originalContent: embedded.originalContent,
        properties: embedded.properties,
        inline: embedded.inline,
        children: [embedded],
      };
    }

    const unescaped = unescapeIntentText(payload);
    const { content: cleanContent, inline } = ctx.parseInline(unescaped);
    return {
      id: uuidv4(),
      type: "list-item",
      content: cleanContent,
      originalContent: unescaped,
      inline,
    };
  }

  // Check for ordered list items
  const orderedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
  if (orderedMatch) {
    const content = unescapeIntentText(orderedMatch[2]);
    const { content: cleanContent, inline } = ctx.parseInline(content);

    return {
      id: uuidv4(),
      type: "step-item",
      content: cleanContent,
      originalContent: content,
      inline,
    };
  }

  // Default to body-text
  const unescaped = unescapeIntentText(trimmed);
  const { content: cleanContent, inline } = ctx.parseInline(unescaped);

  return {
    id: uuidv4(),
    type: "body-text",
    content: cleanContent,
    originalContent: unescaped,
    inline,
  };
}

// Main parser function
export function parseIntentText(
  fileContent: string,
  options?: ParseOptions,
): IntentDocument {
  const lines = fileContent.split(/\r?\n/);
  const blocks: IntentBlock[] = [];
  const diagnostics: Diagnostic[] = [];
  let currentSection: IntentBlock | null = null;
  let codeCaptureMode = false;
  let codeContent: string[] = [];
  let codeStartLine = 0;

  const extensions = options?.extensions || [];
  const keywords = new Set(KEYWORDS);
  for (const ext of extensions) {
    for (const k of ext.keywords || []) {
      keywords.add(k.toLowerCase());
    }
  }

  const defaultParseInline = (text: string) => parseInlineNodes(text);
  const parseInline = (text: string) => {
    for (const ext of extensions) {
      if (!ext.parseInline) continue;
      const result = ext.parseInline({ text, defaultParseInline });
      if (result) return result;
    }
    return defaultParseInline(text);
  };

  // Table grouping state
  let pendingTable: {
    headers?: string[];
    rows: string[][];
    originalHeaders?: string;
    headerLine?: number;
  } | null = null;

  function flushPendingTable() {
    if (!pendingTable) return;

    if (
      pendingTable.headers &&
      pendingTable.headers.length > 0 &&
      pendingTable.rows.length === 0
    ) {
      diagnostics.push({
        severity: "warning",
        code: "HEADERS_WITHOUT_ROWS",
        message: "Table headers found with no following rows.",
        line: pendingTable.headerLine || 1,
        column: 1,
      });
    }

    const block: IntentBlock = {
      id: uuidv4(),
      type: "table",
      content: pendingTable.originalHeaders || "",
      table: {
        headers: pendingTable.headers,
        rows: pendingTable.rows,
      },
    };

    if (currentSection && currentSection.children) {
      currentSection.children.push(block);
    } else {
      blocks.push(block);
    }

    pendingTable = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // If we have a pending table and current line is not a row, flush it.
    if (pendingTable && !/^row:\s*/i.test(trimmed)) {
      flushPendingTable();
    }

    // Handle multi-line code blocks
    if (codeCaptureMode) {
      if (trimmed.toLowerCase() === "end:") {
        // End code block
        const codeBlock: IntentBlock = {
          id: uuidv4(),
          type: "code",
          content: codeContent.join("\n"),
        };

        if (currentSection && currentSection.children) {
          currentSection.children.push(codeBlock);
        } else {
          blocks.push(codeBlock);
        }

        codeCaptureMode = false;
        codeContent = [];
        codeStartLine = 0;
      } else {
        codeContent.push(line);
      }
      continue;
    }

    // Stray end: outside code capture mode
    if (trimmed.toLowerCase() === "end:") {
      diagnostics.push({
        severity: "warning",
        code: "UNEXPECTED_END",
        message: "Unexpected 'end:' outside of a code block.",
        line: i + 1,
        column: 1,
      });
      continue;
    }

    // Check for code block start
    const codeMatch = trimmed.match(/^code:\s*(.*)$/);
    if (codeMatch) {
      const codeContent = codeMatch[1];
      if (codeContent === "") {
        // Start multi-line code capture
        codeCaptureMode = true;
        codeStartLine = i + 1;
      } else {
        // Single line code
        const codeBlock: IntentBlock = {
          id: uuidv4(),
          type: "code",
          content: codeContent,
        };

        if (currentSection && currentSection.children) {
          currentSection.children.push(codeBlock);
        } else {
          blocks.push(codeBlock);
        }
      }
      continue;
    }

    // Parse regular line
    const block = parseLine(line, {
      keywords,
      extensions,
      lineNumber: i + 1,
      diagnostics,
      parseInline,
    });
    if (!block) continue;

    // Table grouping: headers starts a table, rows are appended.
    if (block.type === "headers") {
      flushPendingTable();
      pendingTable = {
        headers: splitTableRow(block.originalContent || block.content),
        rows: [],
        originalHeaders: block.originalContent || block.content,
        headerLine: i + 1,
      };
      continue;
    }

    if (block.type === "row") {
      const rowCells = splitTableRow(block.originalContent || block.content);
      if (pendingTable) {
        pendingTable.rows.push(rowCells);
      } else {
        diagnostics.push({
          severity: "warning",
          code: "ROW_WITHOUT_HEADERS",
          message: "Table row found without preceding headers.",
          line: i + 1,
          column: 1,
        });
        // Row without headers becomes a single-row table.
        pendingTable = { rows: [rowCells] };
        flushPendingTable();
      }
      continue;
    }

    // Handle section hierarchy
    if (block.type === "section" || block.type === "sub") {
      currentSection = block;
      currentSection.children = [];
      blocks.push(currentSection);
    } else if (
      currentSection &&
      (block.type === "list-item" ||
        block.type === "step-item" ||
        block.type === "task" ||
        block.type === "done" ||
        block.type === "question" ||
        block.type === "note")
    ) {
      // Add to current section
      if (!currentSection.children) currentSection.children = [];
      currentSection.children.push(block);
    } else {
      // Add to main blocks
      blocks.push(block);

      // Reset section if we encounter certain top-level blocks
      if (block.type === "title" || block.type === "summary") {
        // These can appear anywhere, don't reset section
      } else {
        currentSection = null;
      }
    }
  }

  // Flush any remaining table at EOF
  flushPendingTable();

  // EOF while still capturing code
  if (codeCaptureMode) {
    diagnostics.push({
      severity: "error",
      code: "UNTERMINATED_CODE_BLOCK",
      message: "Unterminated code block. Expected 'end:' before end of file.",
      line: codeStartLine || lines.length,
      column: 1,
    });

    // Best-effort: still emit the code block we captured.
    const codeBlock: IntentBlock = {
      id: uuidv4(),
      type: "code",
      content: codeContent.join("\n"),
    };

    if (currentSection && currentSection.children) {
      currentSection.children.push(codeBlock);
    } else {
      blocks.push(codeBlock);
    }
  }

  // Extract document metadata
  const titleBlock = blocks.find((b) => b.type === "title");
  const summaryBlock = blocks.find((b) => b.type === "summary");
  const hasArabic = blocks.some((b) => detectArabic(b.content));

  const document: IntentDocument = {
    blocks,
    metadata: {
      title: titleBlock?.content,
      summary: summaryBlock?.content,
      language: hasArabic ? "rtl" : "ltr",
    },
    diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
  };

  // Extension validations
  for (const ext of extensions) {
    if (!ext.validate) continue;
    const extDiags = ext.validate(document);
    if (extDiags && extDiags.length > 0) {
      if (!document.diagnostics) document.diagnostics = [];
      document.diagnostics.push(...extDiags);
    }
  }

  return document;
}
