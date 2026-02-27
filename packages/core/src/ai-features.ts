import { IntentBlock, IntentDocument, BlockType } from "./types";

export interface AIBlock extends IntentBlock {
  type: "ai";
  instruction: string;
  target?: string; // block ID or range this AI instruction applies to
  model?: string; // optional model preference: gpt-4, claude, etc.
  temperature?: number;
  maxTokens?: number;
}

export interface UncertainBlock extends IntentBlock {
  type: BlockType;
  confidence: number; // 0-1, how certain the information is
  needsVerification: boolean;
}

export interface SynthesizeBlock extends IntentBlock {
  type: "synthesize";
  scope: "section" | "document" | "custom";
  customRange?: string; // block IDs if scope=custom
  outputType: "summary" | "qa" | "key-points" | "action-items" | "custom";
  customPrompt?: string; // if outputType=custom
}

export interface AIProcessingResult {
  document: IntentDocument;
  instructions: AIBlock[];
  synthesisTasks: SynthesizeBlock[];
  uncertainBlocks: UncertainBlock[];
  metadata: {
    aiBlockCount: number;
    uncertainCount: number;
    synthesisCount: number;
  };
}

/**
 * Extract AI instructions from document
 * ai: blocks contain instructions for LLMs and don't render in output
 */
export function extractAIInstructions(document: IntentDocument): {
  document: IntentDocument;
  instructions: AIBlock[];
} {
  const instructions: AIBlock[] = [];
  const nonAIBlocks: IntentBlock[] = [];

  const processBlock = (block: IntentBlock): IntentBlock | null => {
    if (block.type === "ai") {
      instructions.push({
        ...block,
        type: "ai",
        instruction: block.content,
        target: block.properties?.target ? String(block.properties.target) : undefined,
        model: block.properties?.model ? String(block.properties.model) : undefined,
        temperature: block.properties?.temperature
          ? parseFloat(String(block.properties.temperature))
          : undefined,
        maxTokens: block.properties?.maxTokens
          ? parseInt(String(block.properties.maxTokens), 10)
          : undefined,
      } as AIBlock);
      return null; // Don't include in output document
    }

    // Process children recursively
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
      nonAIBlocks.push(processed);
    }
  }

  return {
    document: { ...document, blocks: nonAIBlocks },
    instructions,
  };
}

/**
 * Process uncertain markers (? prefix)
 * Content starting with ? is flagged as needing verification
 */
export function processUncertainty(document: IntentDocument): {
  document: IntentDocument;
  uncertainBlocks: UncertainBlock[];
} {
  const uncertainBlocks: UncertainBlock[] = [];

  const processBlock = (block: IntentBlock): IntentBlock => {
    let newBlock = { ...block };

    // Check for ? prefix in content
    if (block.content.startsWith("?")) {
      const confidence = block.properties?.confidence
        ? parseFloat(String(block.properties.confidence))
        : 0.5;

      uncertainBlocks.push({
        ...block,
        type: block.type,
        confidence,
        needsVerification: true,
      } as UncertainBlock);

      // Remove ? prefix for rendered output but keep flag
      newBlock = {
        ...newBlock,
        content: block.content.slice(1).trim(),
        properties: {
          ...block.properties,
          _uncertain: "true",
          _confidence: String(confidence),
        },
      };
    }

    // Process children
    if (newBlock.children) {
      newBlock.children = newBlock.children.map(processBlock);
    }

    return newBlock;
  };

  const processedBlocks = document.blocks.map(processBlock);

  return {
    document: { ...document, blocks: processedBlocks },
    uncertainBlocks,
  };
}

/**
 * Extract synthesis tasks from document
 * synthesize: blocks trigger AI processing of preceding content
 */
export function extractSynthesisTasks(document: IntentDocument): {
  document: IntentDocument;
  tasks: SynthesizeBlock[];
} {
  const tasks: SynthesizeBlock[] = [];
  const nonSynthBlocks: IntentBlock[] = [];

  const processBlock = (block: IntentBlock, context: { preceding: IntentBlock[] }): IntentBlock | null => {
    if (block.type === "synthesize") {
      const scope = (block.properties?.scope as "section" | "document" | "custom") || "section";
      const outputType = (block.properties?.output as "summary" | "qa" | "key-points" | "action-items" | "custom") || "summary";

      tasks.push({
        ...block,
        type: "synthesize",
        scope,
        customRange: block.properties?.range ? String(block.properties.range) : undefined,
        outputType,
        customPrompt: block.properties?.prompt ? String(block.properties.prompt) : undefined,
      } as SynthesizeBlock);

      // Synthesis blocks can optionally render as placeholders
      if (block.properties?.render === "false") {
        return null;
      }

      // Render as a placeholder that will be replaced by AI output
      return {
        ...block,
        type: "note" as BlockType,
        content: `[AI will generate ${outputType} here]`,
        properties: {
          ...block.properties,
          _synthesis: "pending",
          _synthesisId: block.id,
        },
      };
    }

    // Track preceding blocks for context
    context.preceding.push(block);

    // Process children
    if (block.children) {
      const processedChildren: IntentBlock[] = [];
      const childContext = { preceding: [] as IntentBlock[] };
      for (const child of block.children) {
        const processed = processBlock(child, childContext);
        if (processed) processedChildren.push(processed);
      }
      return { ...block, children: processedChildren };
    }

    return block;
  };

  const context = { preceding: [] as IntentBlock[] };
  for (const block of document.blocks) {
    const processed = processBlock(block, context);
    if (processed) {
      nonSynthBlocks.push(processed);
    }
  }

  return {
    document: { ...document, blocks: nonSynthBlocks },
    tasks,
  };
}

/**
 * Full AI processing pipeline
 */
export function processAIDocument(document: IntentDocument): AIProcessingResult {
  // Step 1: Extract AI instructions (they don't render)
  const { document: docWithoutAI, instructions } = extractAIInstructions(document);

  // Step 2: Process uncertainty markers
  const { document: docWithUncertainty, uncertainBlocks } = processUncertainty(docWithoutAI);

  // Step 3: Extract synthesis tasks
  const { document: finalDoc, tasks: synthesisTasks } = extractSynthesisTasks(docWithUncertainty);

  return {
    document: finalDoc,
    instructions,
    synthesisTasks,
    uncertainBlocks,
    metadata: {
      aiBlockCount: instructions.length,
      uncertainCount: uncertainBlocks.length,
      synthesisCount: synthesisTasks.length,
    },
  };
}

/**
 * Format AI processing summary for CLI
 */
export function formatAIResult(result: AIProcessingResult): string {
  const lines: string[] = [];

  lines.push("🤖 AI Processing Summary");
  lines.push(`   Instructions: ${result.metadata.aiBlockCount}`);
  lines.push(`   Uncertain blocks: ${result.metadata.uncertainCount}`);
  lines.push(`   Synthesis tasks: ${result.metadata.synthesisCount}`);

  if (result.instructions.length > 0) {
    lines.push("");
    lines.push("📋 AI Instructions:");
    for (const inst of result.instructions) {
      lines.push(`   • ${inst.instruction.slice(0, 60)}${inst.instruction.length > 60 ? "..." : ""}`);
      if (inst.model) lines.push(`     Model: ${inst.model}`);
      if (inst.target) lines.push(`     Target: ${inst.target}`);
    }
  }

  if (result.uncertainBlocks.length > 0) {
    lines.push("");
    lines.push("❓ Uncertain Information:");
    for (const block of result.uncertainBlocks) {
      const confidence = Math.round(block.confidence * 100);
      lines.push(`   • [${confidence}%] ${block.content.slice(0, 50)}${block.content.length > 50 ? "..." : ""}`);
    }
  }

  if (result.synthesisTasks.length > 0) {
    lines.push("");
    lines.push("🔄 Synthesis Tasks:");
    for (const task of result.synthesisTasks) {
      lines.push(`   • ${task.outputType} (${task.scope} scope)`);
      if (task.customPrompt) {
        lines.push(`     Custom: ${task.customPrompt.slice(0, 40)}${task.customPrompt.length > 40 ? "..." : ""}`);
      }
    }
  }

  return lines.join("\n");
}

/**
 * Generate AI completion for a synthesis task
 * This is a placeholder - in production, this would call an LLM API
 */
export async function generateSynthesis(
  document: IntentDocument,
  task: SynthesizeBlock,
  apiKey?: string
): Promise<string> {
  // Collect content to synthesize based on scope
  let contentToProcess: IntentBlock[] = [];

  switch (task.scope) {
    case "document":
      contentToProcess = document.blocks;
      break;
    case "section":
      // Find preceding section
      const sectionIndex = document.blocks.findIndex((b) => b.id === task.id);
      if (sectionIndex > 0) {
        const section = document.blocks[sectionIndex - 1];
        contentToProcess = section.children || [section];
      }
      break;
    case "custom":
      // Parse custom range (comma-separated block IDs)
      if (task.customRange) {
        const ids = task.customRange.split(",").map((id) => id.trim());
        contentToProcess = document.blocks.filter((b) => ids.includes(b.id));
      }
      break;
  }

  // Build prompt based on output type
  const prompts: Record<string, string> = {
    summary: "Summarize the following content concisely:",
    qa: "Generate Q&A pairs from the following content:",
    "key-points": "Extract the key points from the following content:",
    "action-items": "Extract action items from the following content:",
  };

  const prompt = task.customPrompt || prompts[task.outputType] || prompts.summary;

  // Extract text content
  const content = contentToProcess.map((b) => b.content).join("\n\n");

  // In production, this would call OpenAI/Anthropic/etc
  // For now, return a placeholder
  if (!apiKey) {
    return `[AI synthesis placeholder for: ${task.outputType}]\n\n${content.slice(0, 200)}...`;
  }

  // Example API call (commented out - requires actual API integration)
  /*
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content },
      ],
      temperature: 0.7,
    }),
  });
  const data = await response.json();
  return data.choices[0].message.content;
  */

  return `[AI synthesis: ${task.outputType}]\n\n${content.slice(0, 300)}`;
}

/**
 * Render uncertain block with visual indicator
 */
export function renderUncertainBlock(block: IntentBlock): string {
  if (block.properties?._uncertain === "true") {
    const confidence = block.properties._confidence || "0.5";
    const confidencePercent = Math.round(parseFloat(String(confidence)) * 100);

    return `<div class="intent-uncertain" title="Confidence: ${confidencePercent}%">
      <span class="uncertain-marker">❓</span>
      ${block.content}
    </div>`;
  }
  return "";
}
