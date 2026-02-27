import { describe, it, expect } from "vitest";
import {
  buildKnowledgeGraph,
  findRelatedDocuments,
  generateRelatedDocsBlock,
  findPath,
  visualizeGraph,
} from "../src/knowledge-graph";
import { IntentDocument } from "../src/types";

describe("Knowledge Graph (v1.2)", () => {
  describe("buildKnowledgeGraph", () => {
    it("should return empty graph for non-existent directory", () => {
      const graph = buildKnowledgeGraph({ dir: "./nonexistent" });
      expect(graph.nodes.size).toBe(0);
      expect(graph.edges.length).toBe(0);
    });

    it("should handle empty directory", () => {
      const graph = buildKnowledgeGraph({ dir: "./empty" });
      expect(graph.nodes.size).toBe(0);
    });
  });

  describe("findRelatedDocuments", () => {
    it("should return empty array for unknown document", () => {
      const graph = {
        nodes: new Map(),
        edges: [],
        clusters: new Map(),
      };
      const related = findRelatedDocuments(graph, "/unknown.it");
      expect(related).toEqual([]);
    });

    it("should find documents by shared tags", () => {
      const graph = {
        nodes: new Map([
          ["/doc1.it", {
            id: "doc1",
            path: "/doc1.it",
            title: "Doc 1",
            tags: ["project", "backend"],
            outgoingRefs: [],
            incomingRefs: [],
            blocks: [],
          }],
          ["/doc2.it", {
            id: "doc2",
            path: "/doc2.it",
            title: "Doc 2",
            tags: ["project", "frontend"],
            outgoingRefs: [],
            incomingRefs: [],
            blocks: [],
          }],
          ["/doc3.it", {
            id: "doc3",
            path: "/doc3.it",
            title: "Doc 3",
            tags: ["backend", "database"],
            outgoingRefs: [],
            incomingRefs: [],
            blocks: [],
          }],
        ]),
        edges: [],
        clusters: new Map([
          ["project", ["/doc1.it", "/doc2.it"]],
          ["backend", ["/doc1.it", "/doc3.it"]],
          ["frontend", ["/doc2.it"]],
          ["database", ["/doc3.it"]],
        ]),
      };

      const related = findRelatedDocuments(graph, "/doc1.it");
      
      expect(related.length).toBeGreaterThan(0);
      expect(related.some((r) => r.path === "/doc2.it")).toBe(true); // shared #project
      expect(related.some((r) => r.path === "/doc3.it")).toBe(true); // shared #backend
    });

    it("should find documents by references", () => {
      const graph = {
        nodes: new Map([
          ["/doc1.it", {
            id: "doc1",
            path: "/doc1.it",
            title: "Doc 1",
            tags: [],
            outgoingRefs: ["/doc2.it"],
            incomingRefs: [],
            blocks: [],
          }],
          ["/doc2.it", {
            id: "doc2",
            path: "/doc2.it",
            title: "Doc 2",
            tags: [],
            outgoingRefs: [],
            incomingRefs: ["/doc1.it"],
            blocks: [],
          }],
        ]),
        edges: [
          { from: "/doc1.it", to: "/doc2.it", type: "ref" as const, strength: 1 },
        ],
        clusters: new Map(),
      };

      const related = findRelatedDocuments(graph, "/doc1.it");
      
      expect(related.length).toBe(1);
      expect(related[0].path).toBe("/doc2.it");
      expect(related[0].reason).toContain("referenced");
    });
  });

  describe("generateRelatedDocsBlock", () => {
    it("should generate section with refs", () => {
      const graph = {
        nodes: new Map([
          ["/doc1.it", {
            id: "doc1",
            path: "/doc1.it",
            title: "Doc 1",
            tags: ["project"],
            outgoingRefs: [],
            incomingRefs: [],
            blocks: [],
          }],
          ["/doc2.it", {
            id: "doc2",
            path: "/doc2.it",
            title: "Doc 2",
            tags: ["project"],
            outgoingRefs: [],
            incomingRefs: [],
            blocks: [],
          }],
        ]),
        edges: [],
        clusters: new Map([
          ["project", ["/doc1.it", "/doc2.it"]],
        ]),
      };

      const block = generateRelatedDocsBlock(graph, "/doc1.it", "Related");

      expect(block.type).toBe("section");
      expect(block.content).toBe("Related");
      expect(block.children).toBeDefined();
      expect(block.children!.length).toBeGreaterThan(0);
      expect(block.children![0].type).toBe("ref");
    });

    it("should return note when no related docs found", () => {
      const graph = {
        nodes: new Map([
          ["/doc1.it", {
            id: "doc1",
            path: "/doc1.it",
            title: "Doc 1",
            tags: [],
            outgoingRefs: [],
            incomingRefs: [],
            blocks: [],
          }],
        ]),
        edges: [],
        clusters: new Map(),
      };

      const block = generateRelatedDocsBlock(graph, "/doc1.it");

      expect(block.type).toBe("note");
      expect(block.content).toContain("No related");
    });
  });

  describe("findPath", () => {
    it("should find direct path between connected documents", () => {
      const graph = {
        nodes: new Map([
          ["/a.it", { id: "a", path: "/a.it", title: "A", tags: [], outgoingRefs: ["/b.it"], incomingRefs: [], blocks: [] }],
          ["/b.it", { id: "b", path: "/b.it", title: "B", tags: [], outgoingRefs: [], incomingRefs: ["/a.it"], blocks: [] }],
        ]),
        edges: [{ from: "/a.it", to: "/b.it", type: "ref" as const, strength: 1 }],
        clusters: new Map(),
      };

      const path = findPath(graph, "/a.it", "/b.it");

      expect(path).toEqual(["/a.it", "/b.it"]);
    });

    it("should find multi-hop path", () => {
      const graph = {
        nodes: new Map([
          ["/a.it", { id: "a", path: "/a.it", title: "A", tags: [], outgoingRefs: ["/b.it"], incomingRefs: [], blocks: [] }],
          ["/b.it", { id: "b", path: "/b.it", title: "B", tags: [], outgoingRefs: ["/c.it"], incomingRefs: ["/a.it"], blocks: [] }],
          ["/c.it", { id: "c", path: "/c.it", title: "C", tags: [], outgoingRefs: [], incomingRefs: ["/b.it"], blocks: [] }],
        ]),
        edges: [
          { from: "/a.it", to: "/b.it", type: "ref" as const, strength: 1 },
          { from: "/b.it", to: "/c.it", type: "ref" as const, strength: 1 },
        ],
        clusters: new Map(),
      };

      const path = findPath(graph, "/a.it", "/c.it");

      expect(path).toEqual(["/a.it", "/b.it", "/c.it"]);
    });

    it("should return null for unreachable documents", () => {
      const graph = {
        nodes: new Map([
          ["/a.it", { id: "a", path: "/a.it", title: "A", tags: [], outgoingRefs: [], incomingRefs: [], blocks: [] }],
          ["/b.it", { id: "b", path: "/b.it", title: "B", tags: [], outgoingRefs: [], incomingRefs: [], blocks: [] }],
        ]),
        edges: [],
        clusters: new Map(),
      };

      const path = findPath(graph, "/a.it", "/b.it");

      expect(path).toBeNull();
    });

    it("should respect maxDepth", () => {
      const graph = {
        nodes: new Map([
          ["/a.it", { id: "a", path: "/a.it", title: "A", tags: [], outgoingRefs: ["/b.it"], incomingRefs: [], blocks: [] }],
          ["/b.it", { id: "b", path: "/b.it", title: "B", tags: [], outgoingRefs: ["/c.it"], incomingRefs: ["/a.it"], blocks: [] }],
          ["/c.it", { id: "c", path: "/c.it", title: "C", tags: [], outgoingRefs: ["/d.it"], incomingRefs: ["/b.it"], blocks: [] }],
          ["/d.it", { id: "d", path: "/d.it", title: "D", tags: [], outgoingRefs: [], incomingRefs: ["/c.it"], blocks: [] }],
        ]),
        edges: [
          { from: "/a.it", to: "/b.it", type: "ref" as const, strength: 1 },
          { from: "/b.it", to: "/c.it", type: "ref" as const, strength: 1 },
          { from: "/c.it", to: "/d.it", type: "ref" as const, strength: 1 },
        ],
        clusters: new Map(),
      };

      const path = findPath(graph, "/a.it", "/d.it", 2); // maxDepth 2

      expect(path).toBeNull(); // Too deep
    });
  });

  describe("visualizeGraph", () => {
    it("should generate Mermaid diagram", () => {
      const graph = {
        nodes: new Map([
          ["/doc1.it", {
            id: "doc1",
            path: "/doc1.it",
            title: "Document 1",
            tags: [],
            outgoingRefs: [],
            incomingRefs: [],
            blocks: [],
          }],
          ["/doc2.it", {
            id: "doc2",
            path: "/doc2.it",
            title: "Document 2",
            tags: [],
            outgoingRefs: [],
            incomingRefs: [],
            blocks: [],
          }],
        ]),
        edges: [
          { from: "/doc1.it", to: "/doc2.it", type: "ref" as const, strength: 1 },
        ],
        clusters: new Map(),
      };

      const mermaid = visualizeGraph(graph);

      expect(mermaid).toContain("graph TD;");
      expect(mermaid).toContain("Document 1");
      expect(mermaid).toContain("Document 2");
      expect(mermaid).toContain("-->");
    });
  });
});
