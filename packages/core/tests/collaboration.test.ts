import { describe, it, expect } from "vitest";
import {
  extractMentions,
  extractComments,
  trackChanges,
  processCollaboration,
  formatCollaborationSummary,
  renderMentions,
} from "../src/collaboration";
import { IntentDocument, IntentBlock } from "../src/types";

describe("Collaboration (v1.2)", () => {
  describe("extractMentions", () => {
    it("should extract @user mentions", () => {
      const doc: IntentDocument = {
        blocks: [
          { id: "1", type: "note" as const, content: "Hey @john, check this out" },
          { id: "2", type: "task" as const, content: "Assigned to @sarah and @mike" },
        ],
      };

      const mentions = extractMentions(doc);

      expect(mentions).toHaveLength(3);
      expect(mentions[0].type).toBe("user");
      expect(mentions[0].target).toBe("john");
      expect(mentions[1].target).toBe("sarah");
      expect(mentions[2].target).toBe("mike");
    });

    it("should extract @#group mentions", () => {
      const doc: IntentDocument = {
        blocks: [
          { id: "1", type: "note" as const, content: "Notify @#engineering-team" },
        ],
      };

      const mentions = extractMentions(doc);

      expect(mentions[0].type).toBe("group");
      expect(mentions[0].target).toBe("engineering-team");
    });

    it("should extract @[[Doc Name]] references", () => {
      const doc: IntentDocument = {
        blocks: [
          { id: "1", type: "note" as const, content: "See @[[Architecture Doc]] for details" },
        ],
      };

      const mentions = extractMentions(doc);

      expect(mentions[0].type).toBe("ref");
      expect(mentions[0].target).toBe("Architecture Doc");
    });

    it("should handle nested blocks", () => {
      const doc: IntentDocument = {
        blocks: [
          {
            id: "1",
            type: "section" as const,
            content: "Section",
            children: [
              { id: "2", type: "note" as const, content: "Mention @alice here" },
            ],
          },
        ],
      };

      const mentions = extractMentions(doc);

      expect(mentions).toHaveLength(1);
      expect(mentions[0].target).toBe("alice");
    });
  });

  describe("extractComments", () => {
    it("should extract comment blocks", () => {
      const doc: IntentDocument = {
        blocks: [
          { id: "1", type: "title" as const, content: "Doc" },
          {
            id: "2",
            type: "comment" as const,
            content: "This needs clarification",
            properties: { author: "john", on: "1" },
          },
        ],
      };

      const result = extractComments(doc);

      expect(result.comments).toHaveLength(1);
      expect(result.comments[0].author).toBe("john");
      expect(result.comments[0].content).toBe("This needs clarification");
      expect(result.comments[0].blockId).toBe("1");
    });

    it("should remove comments from document", () => {
      const doc: IntentDocument = {
        blocks: [
          { id: "1", type: "note" as const, content: "Content" },
          { id: "2", type: "comment" as const, content: "A comment" },
        ],
      };

      const result = extractComments(doc);

      expect(result.document.blocks).toHaveLength(1);
      expect(result.document.blocks[0].type).toBe("note");
    });

    it("should handle comment threads", () => {
      const doc: IntentDocument = {
        blocks: [
          {
            id: "1",
            type: "comment" as const,
            content: "Original comment",
            properties: { author: "john" },
            children: [
              { id: "2", type: "comment-reply" as const, content: "I agree", properties: { author: "sarah" } },
              { id: "3", type: "comment-reply" as const, content: "Me too", properties: { author: "mike" } },
            ],
          },
        ],
      };

      const result = extractComments(doc);

      expect(result.comments[0].thread).toHaveLength(2);
      expect(result.comments[0].thread?.[0].author).toBe("sarah");
    });
  });

  describe("trackChanges", () => {
    it("should track created blocks", () => {
      const oldDoc: IntentDocument = {
        blocks: [{ id: "1", type: "title" as const, content: "Old" }],
      };
      const newDoc: IntentDocument = {
        blocks: [
          { id: "1", type: "title" as const, content: "Old" },
          { id: "2", type: "note" as const, content: "New" },
        ],
      };

      const changes = trackChanges(oldDoc, newDoc, { currentUser: "john" });

      expect(changes).toHaveLength(1);
      expect(changes[0].action).toBe("create");
      expect(changes[0].author).toBe("john");
    });

    it("should track deleted blocks", () => {
      const oldDoc: IntentDocument = {
        blocks: [
          { id: "1", type: "title" as const, content: "Title" },
          { id: "2", type: "note" as const, content: "Note" },
        ],
      };
      const newDoc: IntentDocument = {
        blocks: [{ id: "1", type: "title" as const, content: "Title" }],
      };

      const changes = trackChanges(oldDoc, newDoc, {});

      expect(changes).toHaveLength(1);
      expect(changes[0].action).toBe("delete");
    });

    it("should track updated blocks", () => {
      const oldDoc: IntentDocument = {
        blocks: [{ id: "1", type: "note" as const, content: "Old content" }],
      };
      const newDoc: IntentDocument = {
        blocks: [{ id: "1", type: "note" as const, content: "New content" }],
      };

      const changes = trackChanges(oldDoc, newDoc, {});

      expect(changes).toHaveLength(1);
      expect(changes[0].action).toBe("update");
    });
  });

  describe("processCollaboration", () => {
    it("should process all collaboration data", () => {
      const doc: IntentDocument = {
        blocks: [
          { id: "1", type: "title" as const, content: "Doc by @author" },
          {
            id: "2",
            type: "comment" as const,
            content: "Great work!",
            properties: { author: "reviewer" },
          },
        ],
      };

      const result = processCollaboration(doc);

      expect(result.data.mentions).toHaveLength(1);
      expect(result.data.comments).toHaveLength(1);
      expect(result.data.contributors.has("author")).toBe(true);
      expect(result.data.contributors.has("reviewer")).toBe(true);
    });
  });

  describe("formatCollaborationSummary", () => {
    it("should format summary with all data", () => {
      const data = {
        mentions: [
          { type: "user" as const, target: "john", blockId: "1", blockType: "note" },
        ],
        comments: [
          { id: "c1", author: "sarah", content: "Good point", timestamp: "2026-01-01", blockId: "1" },
          { id: "c2", author: "mike", content: "Agreed", timestamp: "2026-01-02", blockId: "1", resolved: true },
        ],
        changes: [],
        contributors: new Set(["john", "sarah", "mike"]),
      };

      const formatted = formatCollaborationSummary(data);

      expect(formatted).toContain("Collaboration Summary");
      expect(formatted).toContain("3"); // contributors
      expect(formatted).toContain("1"); // unresolved comments
    });
  });

  describe("renderMentions", () => {
    it("should render user mentions as links", () => {
      const result = renderMentions("Hello @john");
      expect(result).toContain('<a href="/user/john"');
    });

    it("should render group mentions", () => {
      const result = renderMentions("Notify @#team");
      expect(result).toContain('<a href="/group/team"');
    });

    it("should render doc references", () => {
      const result = renderMentions("See @[[My Doc]]");
      expect(result).toContain('<a href="/doc/my-doc"');
    });
  });
});
