import { v4 as uuidv4 } from "uuid";
import { IntentBlock, BlockType, InlineMark, IntentDocument } from "./types";

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
  "code",
  "end",
];

// Helper function to detect Arabic text (RTL)
function detectArabic(text: string): boolean {
  const arabicRegex = /[\u0600-\u06FF]/;
  return arabicRegex.test(text);
}

// Helper function to parse inline formatting
function parseInlineFormatting(text: string): {
  content: string;
  marks: InlineMark[];
} {
  const marks: InlineMark[] = [];

  // Find all marks first, before modifying the text
  const boldMatches = [...text.matchAll(/\*([^*]+)\*/g)];
  const italicMatches = [...text.matchAll(/_([^_]+)_/g)];
  const strikeMatches = [...text.matchAll(/~([^~]+)~/g)];
  const codeMatches = [...text.matchAll(/`([^`]+)`/g)];

  // Add marks in order of appearance
  boldMatches.forEach((match) => {
    marks.push({
      type: "bold",
      start: match.index!,
      end: match.index! + match[0].length,
    });
  });

  italicMatches.forEach((match) => {
    marks.push({
      type: "italic",
      start: match.index!,
      end: match.index! + match[0].length,
    });
  });

  strikeMatches.forEach((match) => {
    marks.push({
      type: "strike",
      start: match.index!,
      end: match.index! + match[0].length,
    });
  });

  codeMatches.forEach((match) => {
    marks.push({
      type: "code",
      start: match.index!,
      end: match.index! + match[0].length,
    });
  });

  // Now remove formatting from content
  let result = text;
  result = result.replace(/\*([^*]+)\*/g, "$1");
  result = result.replace(/_([^_]+)_/g, "$1");
  result = result.replace(/~([^~]+)~/g, "$1");
  result = result.replace(/`([^`]+)`/g, "$1");

  return { content: result, marks };
}

// Helper function to parse a single line
function parseLine(line: string): IntentBlock | null {
  const trimmed = line.trim();

  if (!trimmed) return null;

  // Check for keyword blocks
  const keywordMatch = trimmed.match(/^([a-zA-Z]+):\s*(.*)$/);
  if (keywordMatch) {
    const keyword = keywordMatch[1].toLowerCase();
    const rest = keywordMatch[2];

    if (!KEYWORDS.includes(keyword)) {
      return null;
    }

    // Split by pipe | for metadata (only if it looks like key: value)
    // But NOT for headers and rows which use | as data separator
    let parts: string[];
    let content: string;
    const properties: Record<string, string | number> = {};

    if (keyword === "headers" || keyword === "row") {
      // For headers and rows, the entire rest is content (don't split on |)
      content = rest;
    } else {
      // For other keywords, split on | for metadata
      parts = rest.split(/\s*\|\s*/);
      content = parts[0] || "";

      // Parse properties (skip first element which is content)
      for (let i = 1; i < parts.length; i++) {
        const propMatch = parts[i].match(/^([^:]+):\s*(.+)$/);
        if (propMatch) {
          properties[propMatch[1].trim()] = propMatch[2].trim();
        }
      }
    }

    const { content: cleanContent, marks } = parseInlineFormatting(content);

    return {
      id: uuidv4(),
      type: keyword as BlockType,
      content: cleanContent,
      originalContent: content, // Store original content with formatting
      properties: Object.keys(properties).length > 0 ? properties : undefined,
      marks: marks.length > 0 ? marks : undefined,
    };
  }

  // Check for list items
  if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
    const content = trimmed.substring(2);
    const { content: cleanContent, marks } = parseInlineFormatting(content);

    return {
      id: uuidv4(),
      type: "list-item",
      content: cleanContent,
      originalContent: content,
      marks: marks.length > 0 ? marks : undefined,
    };
  }

  // Check for ordered list items
  const orderedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
  if (orderedMatch) {
    const content = orderedMatch[2];
    const { content: cleanContent, marks } = parseInlineFormatting(content);

    return {
      id: uuidv4(),
      type: "step-item",
      content: cleanContent,
      originalContent: content,
      marks: marks.length > 0 ? marks : undefined,
    };
  }

  // Default to body-text
  const { content: cleanContent, marks } = parseInlineFormatting(trimmed);

  return {
    id: uuidv4(),
    type: "body-text",
    content: cleanContent,
    originalContent: trimmed,
    marks: marks.length > 0 ? marks : undefined,
  };
}

// Main parser function
export function parseIntentText(fileContent: string): IntentDocument {
  const lines = fileContent.split(/\r?\n/);
  const blocks: IntentBlock[] = [];
  let currentSection: IntentBlock | null = null;
  let codeCaptureMode = false;
  let codeContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Handle multi-line code blocks
    if (codeCaptureMode) {
      if (trimmed.toLowerCase() === "end:") {
        // End code block
        const codeBlock: IntentBlock = {
          id: uuidv4(),
          type: "code",
          content: codeContent.join("\n"),
          properties: currentSection?.properties,
        };

        if (currentSection && currentSection.children) {
          currentSection.children.push(codeBlock);
        } else {
          blocks.push(codeBlock);
        }

        codeCaptureMode = false;
        codeContent = [];
      } else {
        codeContent.push(line);
      }
      continue;
    }

    // Check for code block start
    const codeMatch = trimmed.match(/^code:\s*(.*)$/);
    if (codeMatch) {
      const codeContent = codeMatch[1];
      if (codeContent === "") {
        // Start multi-line code capture
        codeCaptureMode = true;
      } else {
        // Single line code
        const codeBlock: IntentBlock = {
          id: uuidv4(),
          type: "code",
          content: codeContent,
          properties: currentSection?.properties,
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
    const block = parseLine(line);
    if (!block) continue;

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

  // Extract document metadata
  const titleBlock = blocks.find((b) => b.type === "title");
  const summaryBlock = blocks.find((b) => b.type === "summary");
  const hasArabic = blocks.some((b) => detectArabic(b.content));

  return {
    blocks,
    metadata: {
      title: titleBlock?.content,
      summary: summaryBlock?.content,
      language: hasArabic ? "rtl" : "ltr",
    },
  };
}
