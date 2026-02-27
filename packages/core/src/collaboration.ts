import { IntentBlock, IntentDocument, BlockType } from "./types";

export interface Mention {
  type: "user" | "group" | "ref";
  target: string; // username, group name, or doc reference
  blockId: string;
  blockType: string;
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  blockId: string; // which block this comment is attached to
  resolved?: boolean;
  thread?: Comment[]; // threaded replies
}

export interface ChangeRecord {
  id: string;
  timestamp: string;
  author: string;
  action: "create" | "update" | "delete";
  blockId: string;
  before?: IntentBlock;
  after?: IntentBlock;
}

export interface CollaborationData {
  mentions: Mention[];
  comments: Comment[];
  changes: ChangeRecord[];
  contributors: Set<string>;
}

export interface CollaborationOptions {
  trackChanges?: boolean;
  currentUser?: string;
  timestamp?: string;
}

/**
 * Extract @mentions from document content
 * Syntax: @username or @group-name or @[[Doc Name]]
 */
export function extractMentions(document: IntentDocument): Mention[] {
  const mentions: Mention[] = [];

  const processBlock = (block: IntentBlock) => {
    const content = block.content || "";

    // User mentions: @username
    const userMentions = content.match(/@(\w+)/g);
    if (userMentions) {
      for (const mention of userMentions) {
        mentions.push({
          type: "user",
          target: mention.slice(1), // Remove @
          blockId: block.id,
          blockType: block.type,
        });
      }
    }

    // Group mentions: @#group-name (optional syntax)
    const groupMentions = content.match(/@#([\w-]+)/g);
    if (groupMentions) {
      for (const mention of groupMentions) {
        mentions.push({
          type: "group",
          target: mention.slice(2), // Remove @#
          blockId: block.id,
          blockType: block.type,
        });
      }
    }

    // Document references in mentions: @[[Doc Name]]
    const docMentions = content.match(/@\[\[([^\]]+)\]\]/g);
    if (docMentions) {
      for (const mention of docMentions) {
        mentions.push({
          type: "ref",
          target: mention.slice(3, -2), // Remove @[[ ]]
          blockId: block.id,
          blockType: block.type,
        });
      }
    }

    // Process children
    if (block.children) {
      block.children.forEach(processBlock);
    }
  };

  document.blocks.forEach(processBlock);
  return mentions;
}

/**
 * Extract comment blocks from document
 * comment: This is a comment | author: John | on: block-id
 */
export function extractComments(document: IntentDocument): {
  document: IntentDocument;
  comments: Comment[];
} {
  const comments: Comment[] = [];
  const nonCommentBlocks: IntentBlock[] = [];

  const processBlock = (block: IntentBlock): IntentBlock | null => {
    if (block.type === "comment") {
      const comment: Comment = {
        id: block.id,
        author: block.properties?.author
          ? String(block.properties.author)
          : "anonymous",
        content: block.content,
        timestamp: block.properties?.timestamp
          ? String(block.properties.timestamp)
          : new Date().toISOString(),
        blockId: block.properties?.on
          ? String(block.properties.on)
          : block.id,
        resolved: block.properties?.resolved === "true",
      };

      // Check for thread replies
      if (block.children) {
        comment.thread = block.children
          .filter((c) => c.type === "comment-reply")
          .map((c) => ({
            id: c.id,
            author: c.properties?.author
              ? String(c.properties.author)
              : "anonymous",
            content: c.content,
            timestamp: c.properties?.timestamp
              ? String(c.properties.timestamp)
              : new Date().toISOString(),
            blockId: comment.blockId,
          }));
      }

      comments.push(comment);
      return null; // Don't include in output document
    }

    // Process children
    if (block.children) {
      const processedChildren = block.children
        .map(processBlock)
        .filter((b): b is IntentBlock => b !== null);
      return { ...block, children: processedChildren };
    }

    return block;
  };

  for (const block of document.blocks) {
    const processed = processBlock(block);
    if (processed) {
      nonCommentBlocks.push(processed);
    }
  }

  return {
    document: { ...document, blocks: nonCommentBlocks },
    comments,
  };
}

/**
 * Create change record for tracking modifications
 */
export function createChangeRecord(
  action: "create" | "update" | "delete",
  block: IntentBlock,
  options: CollaborationOptions,
  before?: IntentBlock
): ChangeRecord {
  return {
    id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: options.timestamp || new Date().toISOString(),
    author: options.currentUser || "unknown",
    action,
    blockId: block.id,
    before: action === "update" || action === "delete" ? before : undefined,
    after: action === "create" || action === "update" ? block : undefined,
  };
}

/**
 * Track changes between two document versions
 */
export function trackChanges(
  oldDoc: IntentDocument,
  newDoc: IntentDocument,
  options: CollaborationOptions
): ChangeRecord[] {
  const changes: ChangeRecord[] = [];

  // Build maps for easy lookup
  const oldBlocks = new Map<string, IntentBlock>();
  const newBlocks = new Map<string, IntentBlock>();

  const collectBlocks = (
    blocks: IntentBlock[],
    map: Map<string, IntentBlock>
  ) => {
    for (const block of blocks) {
      map.set(block.id, block);
      if (block.children) {
        collectBlocks(block.children, map);
      }
    }
  };

  collectBlocks(oldDoc.blocks, oldBlocks);
  collectBlocks(newDoc.blocks, newBlocks);

  // Find created blocks
  for (const [id, block] of newBlocks) {
    if (!oldBlocks.has(id)) {
      changes.push(createChangeRecord("create", block, options));
    }
  }

  // Find deleted blocks
  for (const [id, block] of oldBlocks) {
    if (!newBlocks.has(id)) {
      changes.push(createChangeRecord("delete", block, options));
    }
  }

  // Find updated blocks
  for (const [id, newBlock] of newBlocks) {
    const oldBlock = oldBlocks.get(id);
    if (oldBlock && JSON.stringify(oldBlock) !== JSON.stringify(newBlock)) {
      changes.push(createChangeRecord("update", newBlock, options, oldBlock));
    }
  }

  return changes;
}

/**
 * Get all collaborators from a document's change history
 */
export function getContributors(changes: ChangeRecord[]): Set<string> {
  const contributors = new Set<string>();
  for (const change of changes) {
    contributors.add(change.author);
  }
  return contributors;
}

/**
 * Generate mention notifications
 */
export function generateMentionNotifications(
  mentions: Mention[],
  currentUser: string
): Array<{ type: Mention["type"]; target: string; locations: string[] }> {
  const byTarget = new Map<string, { type: Mention["type"]; locations: Set<string> }>();

  for (const mention of mentions) {
    // Don't notify about self-mentions
    if (mention.target === currentUser) continue;

    if (!byTarget.has(mention.target)) {
      byTarget.set(mention.target, {
        type: mention.type,
        locations: new Set(),
      });
    }
    byTarget.get(mention.target)!.locations.add(`${mention.blockType}:${mention.blockId}`);
  }

  return [...byTarget.entries()].map(([target, data]) => ({
    type: data.type,
    target,
    locations: [...data.locations],
  }));
}

/**
 * Find blocks with unresolved comments
 */
export function findBlocksWithComments(
  document: IntentDocument,
  comments: Comment[]
): Array<{ block: IntentBlock; comments: Comment[] }> {
  const result: Array<{ block: IntentBlock; comments: Comment[] }> = [];

  const blockMap = new Map<string, IntentBlock>();
  const collectBlocks = (blocks: IntentBlock[]) => {
    for (const block of blocks) {
      blockMap.set(block.id, block);
      if (block.children) {
        collectBlocks(block.children);
      }
    }
  };
  collectBlocks(document.blocks);

  // Group comments by blockId
  const commentsByBlock = new Map<string, Comment[]>();
  for (const comment of comments) {
    if (!comment.resolved) {
      if (!commentsByBlock.has(comment.blockId)) {
        commentsByBlock.set(comment.blockId, []);
      }
      commentsByBlock.get(comment.blockId)!.push(comment);
    }
  }

  // Build result
  for (const [blockId, blockComments] of commentsByBlock) {
    const block = blockMap.get(blockId);
    if (block) {
      result.push({ block, comments: blockComments });
    }
  }

  return result;
}

/**
 * Render mentions as HTML links
 */
export function renderMentions(content: string): string {
  // User mentions: @username -> <a href="/user/username">@username</a>
  let result = content.replace(
    /@(\w+)/g,
    '<a href="/user/$1" class="mention user">@$1</a>'
  );

  // Group mentions: @#group-name
  result = result.replace(
    /@#([\w-]+)/g,
    '<a href="/group/$1" class="mention group">@#$1</a>'
  );

  // Document refs: @[[Doc Name]]
  result = result.replace(
    /@\[\[([^\]]+)\]\]/g,
    (match, docName) => {
      const slug = docName.toLowerCase().replace(/\s+/g, "-");
      return `<a href="/doc/${slug}" class="mention doc">@${docName}</a>`;
    }
  );

  return result;
}

/**
 * Full collaboration processing
 */
export function processCollaboration(
  document: IntentDocument,
  options: CollaborationOptions = {}
): {
  document: IntentDocument;
  data: CollaborationData;
} {
  // Extract mentions
  const mentions = extractMentions(document);

  // Extract comments (removes them from document)
  const { document: docWithoutComments, comments } = extractComments(document);

  // Contributors (would need historical data, for now just from mentions and comments)
  const contributors = new Set<string>();
  for (const mention of mentions) {
    if (mention.type === "user") {
      contributors.add(mention.target);
    }
  }
  for (const comment of comments) {
    contributors.add(comment.author);
  }

  return {
    document: docWithoutComments,
    data: {
      mentions,
      comments,
      changes: [], // Would be populated by trackChanges on save
      contributors,
    },
  };
}

/**
 * Format collaboration summary for CLI
 */
export function formatCollaborationSummary(data: CollaborationData): string {
  const lines: string[] = [];

  lines.push("👥 Collaboration Summary");
  lines.push(`   Contributors: ${data.contributors.size}`);
  lines.push(`   Active mentions: ${data.mentions.length}`);
  lines.push(`   Unresolved comments: ${data.comments.filter((c) => !c.resolved).length}`);
  lines.push(`   Total comments: ${data.comments.length}`);

  if (data.mentions.length > 0) {
    lines.push("");
    lines.push("📢 Mentions:");
    const byType = new Map<string, number>();
    for (const mention of data.mentions) {
      byType.set(mention.type, (byType.get(mention.type) || 0) + 1);
    }
    for (const [type, count] of byType) {
      lines.push(`   • ${type}: ${count}`);
    }
  }

  if (data.comments.length > 0) {
    lines.push("");
    lines.push("💬 Comments:");
    const recent = data.comments.slice(0, 5);
    for (const comment of recent) {
      const status = comment.resolved ? "✓" : "○";
      lines.push(
        `   ${status} ${comment.author}: ${comment.content.slice(0, 40)}${
          comment.content.length > 40 ? "..." : ""
        }`
      );
    }
  }

  return lines.join("\n");
}
