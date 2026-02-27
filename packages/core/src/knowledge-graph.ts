import * as fs from "fs";
import * as path from "path";
import { parseIntentText } from "./parser";
import { IntentDocument, IntentBlock, BlockType } from "./types";

export interface DocumentNode {
  id: string;
  path: string;
  title: string;
  summary?: string;
  tags: string[];
  outgoingRefs: string[]; // paths this doc references
  incomingRefs: string[]; // paths that reference this doc
  blocks: IntentBlock[];
  metadata?: {
    author?: string;
    created?: string;
    updated?: string;
  };
}

export interface KnowledgeGraph {
  nodes: Map<string, DocumentNode>; // keyed by path
  edges: Array<{
    from: string;
    to: string;
    type: "ref" | "link" | "mention" | "similar";
    strength: number; // 0-1
  }>;
  clusters: Map<string, string[]>; // tag -> doc paths
}

export interface GraphBuildOptions {
  dir: string;
  includePatterns?: string[]; // glob patterns, default: ["**/*.it"]
  excludePatterns?: string[]; // glob patterns
  calculateSimilarity?: boolean; // use content similarity
  similarityThreshold?: number; // 0-1, default: 0.3
}

/**
 * Extract references from a document
 * Looks for:
 * - ref: blocks (explicit cross-document refs)
 * - link: blocks with relative .it paths
 * - wiki-style [[Doc Name]] links in content
 */
function extractRefs(
  document: IntentDocument,
  currentPath: string,
  allPaths: string[]
): string[] {
  const refs: string[] = [];
  const baseDir = path.dirname(currentPath);

  const processBlock = (block: IntentBlock) => {
    // Explicit ref: blocks
    if (block.type === "ref" && block.properties?.to) {
      const refPath = String(block.properties.to);
      // Resolve relative to current file
      const resolved = path.resolve(baseDir, refPath);
      if (allPaths.includes(resolved)) {
        refs.push(resolved);
      }
    }

    // link: blocks pointing to .it files
    if (block.type === "link" && block.properties?.to) {
      const linkPath = String(block.properties.to);
      if (linkPath.endsWith(".it")) {
        const resolved = path.resolve(baseDir, linkPath);
        if (allPaths.includes(resolved)) {
          refs.push(resolved);
        }
      }
    }

    // Wiki-style [[Doc Name]] references in content
    if (block.content) {
      const wikiRefs = block.content.match(/\[\[([^\]]+)\]\]/g);
      if (wikiRefs) {
        for (const wikiRef of wikiRefs) {
          const docName = wikiRef.slice(2, -2); // Remove [[ ]]
          // Try to find matching doc by title
          const normalizedName = docName.toLowerCase().replace(/\s+/g, "-");
          const match = allPaths.find((p) => {
            const fileName = path.basename(p, ".it").toLowerCase();
            return fileName === normalizedName || fileName.includes(normalizedName);
          });
          if (match) {
            refs.push(match);
          }
        }
      }
    }

    // Process children
    if (block.children) {
      block.children.forEach(processBlock);
    }
  };

  document.blocks.forEach(processBlock);
  return [...new Set(refs)]; // dedupe
}

/**
 * Extract tags from document content
 * Looks for #hashtag patterns
 */
function extractTags(document: IntentDocument): string[] {
  const tags = new Set<string>();

  const processBlock = (block: IntentBlock) => {
    const content = block.content || "";
    const foundTags = content.match(/#\w+/g);
    if (foundTags) {
      foundTags.forEach((tag) => tags.add(tag.slice(1))); // Remove #
    }

    if (block.children) {
      block.children.forEach(processBlock);
    }
  };

  document.blocks.forEach(processBlock);
  return [...tags];
}

/**
 * Calculate simple content similarity between two documents
 * Uses Jaccard similarity on words
 */
function calculateSimilarity(doc1: IntentDocument, doc2: IntentDocument): number {
  const getWords = (doc: IntentDocument) => {
    const words = new Set<string>();
    const processBlock = (block: IntentBlock) => {
      const content = (block.content || "").toLowerCase();
      content.split(/\W+/).forEach((w) => {
        if (w.length > 3) words.add(w);
      });
      if (block.children) block.children.forEach(processBlock);
    };
    doc.blocks.forEach(processBlock);
    return words;
  };

  const words1 = getWords(doc1);
  const words2 = getWords(doc2);

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Build knowledge graph from directory of .it files
 */
export function buildKnowledgeGraph(options: GraphBuildOptions): KnowledgeGraph {
  const { dir, calculateSimilarity: calcSim = false, similarityThreshold = 0.3 } = options;

  const graph: KnowledgeGraph = {
    nodes: new Map(),
    edges: [],
    clusters: new Map(),
  };

  // Find all .it files
  const itFiles = findItFiles(dir);

  if (itFiles.length === 0) {
    return graph;
  }

  // First pass: parse all documents and build nodes
  for (const filePath of itFiles) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const document = parseIntentText(content);

      const titleBlock = document.blocks.find((b) => b.type === "title");
      const summaryBlock = document.blocks.find((b) => b.type === "summary");

      const node: DocumentNode = {
        id: path.relative(dir, filePath),
        path: filePath,
        title: titleBlock?.content || path.basename(filePath, ".it"),
        summary: summaryBlock?.content,
        tags: extractTags(document),
        outgoingRefs: [], // will fill in second pass
        incomingRefs: [],
        blocks: document.blocks,
        metadata: document.metadata as DocumentNode["metadata"],
      };

      graph.nodes.set(filePath, node);

      // Build tag clusters
      for (const tag of node.tags) {
        if (!graph.clusters.has(tag)) {
          graph.clusters.set(tag, []);
        }
        graph.clusters.get(tag)!.push(filePath);
      }
    } catch (error) {
      // Skip malformed files
      console.warn(`Failed to parse ${filePath}: ${(error as Error).message}`);
    }
  }

  // Second pass: extract references
  const allPaths = [...graph.nodes.keys()];
  for (const [filePath, node] of graph.nodes) {
    const document = parseIntentText(fs.readFileSync(filePath, "utf-8"));
    const refs = extractRefs(document, filePath, allPaths);

    node.outgoingRefs = refs;

    // Update incoming refs on target nodes
    for (const ref of refs) {
      const targetNode = graph.nodes.get(ref);
      if (targetNode && !targetNode.incomingRefs.includes(filePath)) {
        targetNode.incomingRefs.push(filePath);
      }

      // Add edge
      graph.edges.push({
        from: filePath,
        to: ref,
        type: "ref",
        strength: 1.0,
      });
    }
  }

  // Third pass: calculate content similarity (optional)
  if (calcSim) {
    const nodes = [...graph.nodes.values()];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const doc1 = parseIntentText(fs.readFileSync(nodes[i].path, "utf-8"));
        const doc2 = parseIntentText(fs.readFileSync(nodes[j].path, "utf-8"));

        const similarity = calculateSimilarity(doc1, doc2);

        if (similarity >= similarityThreshold) {
          graph.edges.push({
            from: nodes[i].path,
            to: nodes[j].path,
            type: "similar",
            strength: similarity,
          });
        }
      }
    }
  }

  return graph;
}

/**
 * Find related documents for a given document
 */
export function findRelatedDocuments(
  graph: KnowledgeGraph,
  docPath: string,
  limit: number = 5
): Array<{ path: string; title: string; reason: string; strength: number }> {
  const node = graph.nodes.get(docPath);
  if (!node) return [];

  const related = new Map<
    string,
    { path: string; title: string; reasons: string[]; strength: number }
  >();

  // Direct references (outgoing)
  for (const ref of node.outgoingRefs) {
    const target = graph.nodes.get(ref);
    if (target) {
      related.set(ref, {
        path: ref,
        title: target.title,
        reasons: ["referenced by this doc"],
        strength: 1.0,
      });
    }
  }

  // Documents that reference this one (incoming)
  for (const ref of node.incomingRefs) {
    const source = graph.nodes.get(ref);
    if (source) {
      if (related.has(ref)) {
        related.get(ref)!.reasons.push("references this doc");
        related.get(ref)!.strength += 0.5;
      } else {
        related.set(ref, {
          path: ref,
          title: source.title,
          reasons: ["references this doc"],
          strength: 0.8,
        });
      }
    }
  }

  // Shared tags
  for (const tag of node.tags) {
    const taggedDocs = graph.clusters.get(tag) || [];
    for (const taggedPath of taggedDocs) {
      if (taggedPath === docPath) continue;

      const tagged = graph.nodes.get(taggedPath);
      if (!tagged) continue;

      if (related.has(taggedPath)) {
        related.get(taggedPath)!.reasons.push(`shared tag #${tag}`);
        related.get(taggedPath)!.strength += 0.3;
      } else {
        related.set(taggedPath, {
          path: taggedPath,
          title: tagged.title,
          reasons: [`shared tag #${tag}`],
          strength: 0.5,
        });
      }
    }
  }

  // Similarity edges
  for (const edge of graph.edges) {
    if (edge.type === "similar" && (edge.from === docPath || edge.to === docPath)) {
      const otherPath = edge.from === docPath ? edge.to : edge.from;
      const other = graph.nodes.get(otherPath);
      if (other) {
        if (related.has(otherPath)) {
          related.get(otherPath)!.reasons.push("similar content");
          related.get(otherPath)!.strength += edge.strength;
        } else {
          related.set(otherPath, {
            path: otherPath,
            title: other.title,
            reasons: ["similar content"],
            strength: edge.strength,
          });
        }
      }
    }
  }

  // Sort by strength and convert to result format
  return [...related.values()]
    .sort((a, b) => b.strength - a.strength)
    .slice(0, limit)
    .map((r) => ({
      path: r.path,
      title: r.title,
      reason: r.reasons.join(", "),
      strength: r.strength,
    }));
}

/**
 * Generate "Related Documents" block for a document
 */
export function generateRelatedDocsBlock(
  graph: KnowledgeGraph,
  docPath: string,
  title: string = "Related Documents"
): IntentBlock {
  const related = findRelatedDocuments(graph, docPath, 5);

  if (related.length === 0) {
    return {
      id: `related-${Date.now()}`,
      type: "note" as BlockType,
      content: "No related documents found.",
    };
  }

  const children: IntentBlock[] = related.map((doc, index) => ({
    id: `related-${Date.now()}-${index}`,
    type: "ref" as BlockType,
    content: doc.title,
    properties: {
      to: doc.path,
      reason: doc.reason,
    },
  }));

  return {
    id: `related-${Date.now()}`,
    type: "section" as BlockType,
    content: title,
    children,
  };
}

/**
 * Find path between two documents
 */
export function findPath(
  graph: KnowledgeGraph,
  from: string,
  to: string,
  maxDepth: number = 5
): string[] | null {
  if (!graph.nodes.has(from) || !graph.nodes.has(to)) {
    return null;
  }

  const visited = new Set<string>();
  const queue: Array<{ path: string[]; depth: number }> = [{ path: [from], depth: 0 }];

  while (queue.length > 0) {
    const { path: currentPath, depth } = queue.shift()!;
    const current = currentPath[currentPath.length - 1];

    if (current === to) {
      return currentPath;
    }

    if (depth >= maxDepth) {
      continue;
    }

    visited.add(current);

    // Get neighbors from edges
    const neighbors = graph.edges
      .filter((e) => e.from === current && !visited.has(e.to))
      .map((e) => e.to);

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push({
          path: [...currentPath, neighbor],
          depth: depth + 1,
        });
      }
    }
  }

  return null;
}

/**
 * Visualize graph as Mermaid diagram
 */
export function visualizeGraph(graph: KnowledgeGraph): string {
  const lines = ["graph TD;"];

  // Add nodes
  for (const [path, node] of graph.nodes) {
    const id = path.replace(/[^a-zA-Z0-9]/g, "_");
    lines.push(`  ${id}["${node.title}"];`);
  }

  // Add edges
  for (const edge of graph.edges) {
    if (edge.type === "ref") {
      const fromId = edge.from.replace(/[^a-zA-Z0-9]/g, "_");
      const toId = edge.to.replace(/[^a-zA-Z0-9]/g, "_");
      lines.push(`  ${fromId} --> ${toId};`);
    }
  }

  return lines.join("\n");
}

// Helper to find .it files
function findItFiles(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      files.push(...findItFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".it")) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * CLI-friendly graph summary
 */
export function formatGraphSummary(graph: KnowledgeGraph): string {
  const lines: string[] = [];

  lines.push(`📊 Knowledge Graph Summary`);
  lines.push(`   Documents: ${graph.nodes.size}`);
  lines.push(`   References: ${graph.edges.filter((e) => e.type === "ref").length}`);
  lines.push(`   Similarities: ${graph.edges.filter((e) => e.type === "similar").length}`);
  lines.push(`   Tags: ${graph.clusters.size}`);
  lines.push("");

  if (graph.clusters.size > 0) {
    lines.push("🏷️  Tag Clusters:");
    for (const [tag, docs] of [...graph.clusters.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 10)) {
      lines.push(`   #${tag}: ${docs.length} documents`);
    }
  }

  // Find most connected documents
  const connected = [...graph.nodes.values()]
    .map((n) => ({
      title: n.title,
      connections: n.outgoingRefs.length + n.incomingRefs.length,
    }))
    .sort((a, b) => b.connections - a.connections)
    .slice(0, 5);

  if (connected.length > 0) {
    lines.push("");
    lines.push("🔗 Most Connected:");
    for (const doc of connected) {
      lines.push(`   ${doc.title} (${doc.connections} connections)`);
    }
  }

  return lines.join("\n");
}
