import { describe, it, expect } from "vitest";
import {
  extractTemplates,
  expandTemplates,
  processIncludes,
  processDocument,
} from "../src/templates";
import { IntentDocument, IntentBlock } from "../src/types";

describe("Templates & Includes (v1.2)", () => {
  describe("extractTemplates", () => {
    it("should extract template definition from document", () => {
      const doc: IntentDocument = {
        blocks: [
          {
            id: "1",
            type: "template",
            content: "meeting-note",
            properties: { params: "date,attendees" },
          },
          { id: "2", type: "section", content: "Meeting: {{date}}" },
          { id: "3", type: "note", content: "Attendees: {{attendees}}" },
          { id: "4", type: "end", content: "" },
          { id: "5", type: "title", content: "My Document" },
        ],
      };

      const result = extractTemplates(doc);

      expect(result.templates["meeting-note"]).toBeDefined();
      expect(result.templates["meeting-note"].params).toEqual([
        "date",
        "attendees",
      ]);
      expect(result.templates["meeting-note"].blocks).toHaveLength(2);
      expect(result.document.blocks).toHaveLength(1); // Only title remains
    });

    it("should handle template without params", () => {
      const doc: IntentDocument = {
        blocks: [
          { id: "1", type: "template", content: "simple-note" },
          { id: "2", type: "note", content: "Simple content" },
          { id: "3", type: "end", content: "" },
        ],
      };

      const result = extractTemplates(doc);

      expect(result.templates["simple-note"].params).toEqual([]);
    });
  });

  describe("expandTemplates", () => {
    it("should expand template usage with variable substitution", () => {
      const templates = {
        greeting: {
          name: "greeting",
          params: ["name"],
          blocks: [
            { id: "t1", type: "note" as const, content: "Hello, {{name}}!" },
          ],
        },
      };

      const doc: IntentDocument = {
        blocks: [
          {
            id: "1",
            type: "use",
            content: "greeting",
            properties: { name: "World" },
          },
        ],
      };

      const result = expandTemplates(doc, templates);

      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].type).toBe("note");
      expect(result.blocks[0].content).toBe("Hello, World!");
    });

    it("should leave unknown templates as body-text", () => {
      const doc: IntentDocument = {
        blocks: [{ id: "1", type: "use", content: "unknown-template" }],
      };

      const result = expandTemplates(doc, {});

      expect(result.blocks[0].type).toBe("body-text");
      expect(result.blocks[0].content).toContain("not found");
    });

    it("should substitute in nested children", () => {
      const templates = {
        nested: {
          name: "nested",
          params: ["title"],
          blocks: [
            {
              id: "t1",
              type: "section" as const,
              content: "{{title}}",
              children: [
                {
                  id: "t2",
                  type: "note" as const,
                  content: "Nested: {{title}}",
                },
              ],
            },
          ],
        },
      };

      const doc: IntentDocument = {
        blocks: [
          {
            id: "1",
            type: "use",
            content: "nested",
            properties: { title: "My Title" },
          },
        ],
      };

      const result = expandTemplates(doc, templates);

      expect(result.blocks[0].content).toBe("My Title");
      expect(result.blocks[0].children?.[0].content).toBe("Nested: My Title");
    });
  });

  describe("processIncludes", () => {
    it("should handle missing include files gracefully", () => {
      const doc: IntentDocument = {
        blocks: [{ id: "1", type: "include", content: "./nonexistent.it" }],
      };

      const result = processIncludes(doc, ".");

      expect(result.blocks[0].type).toBe("note");
      expect(result.blocks[0].content).toContain("not found");
    });
  });

  describe("processDocument", () => {
    it("should process full pipeline with templates", () => {
      const doc: IntentDocument = {
        blocks: [
          {
            id: "1",
            type: "template",
            content: "task-item",
            properties: { params: "owner" },
          },
          { id: "2", type: "task", content: "Task for {{owner}}" },
          { id: "3", type: "end", content: "" },
          { id: "4", type: "title", content: "Project" },
          {
            id: "5",
            type: "use",
            content: "task-item",
            properties: { owner: "Ahmed" },
          },
        ],
      };

      const result = processDocument(doc, ".");

      expect(result.blocks).toHaveLength(2); // title + expanded task
      expect(result.blocks[1].type).toBe("task");
      expect(result.blocks[1].content).toBe("Task for Ahmed");
    });
  });
});
