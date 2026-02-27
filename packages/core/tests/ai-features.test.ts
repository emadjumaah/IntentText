import { describe, it, expect } from "vitest";
import {
  extractAIInstructions,
  processUncertainty,
  extractSynthesisTasks,
  processAIDocument,
  formatAIResult,
} from "../src/ai-features";
import { IntentDocument, IntentBlock } from "../src/types";

describe("AI-Native Features (v1.2)", () => {
  describe("extractAIInstructions", () => {
    it("should extract ai blocks and remove from document", () => {
      const doc: IntentDocument = {
        blocks: [
          { id: "1", type: "title" as const, content: "My Doc" },
          { id: "2", type: "ai" as const, content: "Summarize this section" },
          { id: "3", type: "note" as const, content: "Some content" },
        ],
      };

      const result = extractAIInstructions(doc);

      expect(result.instructions).toHaveLength(1);
      expect(result.instructions[0].instruction).toBe("Summarize this section");
      expect(result.document.blocks).toHaveLength(2);
      expect(result.document.blocks.every((b) => b.type !== "ai")).toBe(true);
    });

    it("should extract ai blocks with properties", () => {
      const doc: IntentDocument = {
        blocks: [
          { id: "1", type: "title" as const, content: "My Doc" },
          {
            id: "2",
            type: "ai" as const,
            content: "Generate summary",
            properties: {
              model: "gpt-4",
              temperature: "0.7",
              maxTokens: "500",
              target: "section-1",
            },
          },
        ],
      };

      const result = extractAIInstructions(doc);

      expect(result.instructions[0].model).toBe("gpt-4");
      expect(result.instructions[0].temperature).toBe(0.7);
      expect(result.instructions[0].maxTokens).toBe(500);
      expect(result.instructions[0].target).toBe("section-1");
    });

    it("should handle nested ai blocks", () => {
      const doc: IntentDocument = {
        blocks: [
          {
            id: "1",
            type: "section" as const,
            content: "Section",
            children: [
              { id: "2", type: "ai" as const, content: "Analyze sentiment" },
              { id: "3", type: "note" as const, content: "Content" },
            ],
          },
        ],
      };

      const result = extractAIInstructions(doc);

      expect(result.instructions).toHaveLength(1);
      expect(result.document.blocks[0].children).toHaveLength(1);
      expect(result.document.blocks[0].children?.[0].type).toBe("note");
    });
  });

  describe("processUncertainty", () => {
    it("should flag blocks starting with ? as uncertain", () => {
      const doc: IntentDocument = {
        blocks: [
          { id: "1", type: "note" as const, content: "?This might be wrong" },
          { id: "2", type: "note" as const, content: "This is certain" },
        ],
      };

      const result = processUncertainty(doc);

      expect(result.uncertainBlocks).toHaveLength(1);
      expect(result.uncertainBlocks[0].content).toBe("?This might be wrong");
      expect(result.uncertainBlocks[0].confidence).toBe(0.5);
      expect(result.uncertainBlocks[0].needsVerification).toBe(true);
    });

    it("should strip ? prefix from rendered content", () => {
      const doc: IntentDocument = {
        blocks: [
          { id: "1", type: "note" as const, content: "?Uncertain info" },
        ],
      };

      const result = processUncertainty(doc);

      expect(result.document.blocks[0].content).toBe("Uncertain info");
      expect(result.document.blocks[0].properties?._uncertain).toBe("true");
    });

    it("should use custom confidence from properties", () => {
      const doc: IntentDocument = {
        blocks: [
          {
            id: "1",
            type: "note" as const,
            content: "?Maybe",
            properties: { confidence: "0.3" },
          },
        ],
      };

      const result = processUncertainty(doc);

      expect(result.uncertainBlocks[0].confidence).toBe(0.3);
    });
  });

  describe("extractSynthesisTasks", () => {
    it("should extract synthesis blocks", () => {
      const doc: IntentDocument = {
        blocks: [
          { id: "1", type: "section" as const, content: "Section 1" },
          {
            id: "2",
            type: "synthesize" as const,
            content: "Generate summary",
            properties: { scope: "section", output: "summary" },
          },
        ],
      };

      const result = extractSynthesisTasks(doc);

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].scope).toBe("section");
      expect(result.tasks[0].outputType).toBe("summary");
    });

    it("should render synthesis block as placeholder", () => {
      const doc: IntentDocument = {
        blocks: [
          {
            id: "1",
            type: "synthesize" as const,
            content: "Generate",
            properties: { output: "key-points" },
          },
        ],
      };

      const result = extractSynthesisTasks(doc);

      expect(result.document.blocks[0].type).toBe("note");
      expect(result.document.blocks[0].content).toContain("AI will generate");
      expect(result.document.blocks[0].properties?._synthesis).toBe("pending");
    });

    it("should remove synthesis blocks when render=false", () => {
      const doc: IntentDocument = {
        blocks: [
          {
            id: "1",
            type: "synthesize" as const,
            content: "Generate",
            properties: { render: "false" },
          },
        ],
      };

      const result = extractSynthesisTasks(doc);

      expect(result.document.blocks).toHaveLength(0);
    });
  });

  describe("processAIDocument", () => {
    it("should process all AI features", () => {
      const doc: IntentDocument = {
        blocks: [
          { id: "1", type: "title" as const, content: "Doc" },
          { id: "2", type: "ai" as const, content: "Analyze" },
          { id: "3", type: "note" as const, content: "?Uncertain data" },
          { id: "4", type: "synthesize" as const, content: "Summarize" },
        ],
      };

      const result = processAIDocument(doc);

      expect(result.metadata.aiBlockCount).toBe(1);
      expect(result.metadata.uncertainCount).toBe(1);
      expect(result.metadata.synthesisCount).toBe(1);
      expect(result.instructions).toHaveLength(1);
      expect(result.uncertainBlocks).toHaveLength(1);
      expect(result.synthesisTasks).toHaveLength(1);
    });
  });

  describe("formatAIResult", () => {
    it("should format processing summary", () => {
      const result = {
        document: { blocks: [] },
        instructions: [
          {
            id: "1",
            type: "ai" as const,
            content: "Analyze",
            instruction: "Analyze text",
          },
        ],
        synthesisTasks: [
          {
            id: "2",
            type: "synthesize" as const,
            content: "Summarize",
            scope: "section" as const,
            outputType: "summary" as const,
          },
        ],
        uncertainBlocks: [
          {
            id: "3",
            type: "note" as const,
            content: "?Maybe",
            confidence: 0.5,
            needsVerification: true,
          },
        ],
        metadata: {
          aiBlockCount: 1,
          uncertainCount: 1,
          synthesisCount: 1,
        },
      };

      const formatted = formatAIResult(result);

      expect(formatted).toContain("AI Processing Summary");
      expect(formatted).toContain("1");
      expect(formatted).toContain("Analyze");
    });

    it("should handle empty results", () => {
      const result = {
        document: { blocks: [] },
        instructions: [],
        synthesisTasks: [],
        uncertainBlocks: [],
        metadata: {
          aiBlockCount: 0,
          uncertainCount: 0,
          synthesisCount: 0,
        },
      };

      const formatted = formatAIResult(result);

      expect(formatted).toContain("AI Processing Summary");
      expect(formatted).toContain("0");
    });
  });
});
