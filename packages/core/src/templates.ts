import { IntentBlock, IntentDocument, BlockType } from "./types";
import { parseIntentText } from "./parser";
import * as fs from "fs";
import * as path from "path";

export interface Template {
  name: string;
  description?: string;
  params: string[];
  blocks: IntentBlock[];
}

export interface TemplateRegistry {
  [name: string]: Template;
}

/**
 * Extract templates from a document
 * Templates are defined with template: name | params: param1, param2
 * followed by blocks until end:
 */
export function extractTemplates(document: IntentDocument): {
  templates: TemplateRegistry;
  document: IntentDocument;
} {
  const templates: TemplateRegistry = {};
  const nonTemplateBlocks: IntentBlock[] = [];

  let i = 0;
  while (i < document.blocks.length) {
    const block = document.blocks[i];

    if (block.type === "template") {
      // Parse template definition
      const templateName = block.content.trim();
      const params = block.properties?.params
        ? String(block.properties.params)
            .split(",")
            .map((p) => p.trim())
        : [];

      // Collect template body blocks until we hit end:
      const bodyBlocks: IntentBlock[] = [];
      i++;
      while (i < document.blocks.length) {
        const bodyBlock = document.blocks[i];
        if (bodyBlock.type === "end") {
          i++;
          break;
        }
        bodyBlocks.push(bodyBlock);
        i++;
      }

      templates[templateName] = {
        name: templateName,
        description: block.properties?.description
          ? String(block.properties.description)
          : undefined,
        params,
        blocks: bodyBlocks,
      };
    } else {
      nonTemplateBlocks.push(block);
      i++;
    }
  }

  return {
    templates,
    document: {
      ...document,
      blocks: nonTemplateBlocks,
    },
  };
}

/**
 * Substitute variables in content and properties
 * Variables: {{paramName}} or {{{paramName}}} (unescaped)
 */
function substituteVars(
  text: string,
  vars: Record<string, string>
): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    // Replace {{{key}}} with unescaped value
    result = result.replace(new RegExp(`\\{\\{\\{${key}\\}\\}\\}`, "g"), value);
    // Replace {{key}} with escaped value (for now, same as unescaped)
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

function substituteBlockVars(
  block: IntentBlock,
  vars: Record<string, string>
): IntentBlock {
  const newBlock: IntentBlock = {
    ...block,
    content: substituteVars(block.content, vars),
  };

  if (block.properties) {
    newBlock.properties = {};
    for (const [key, val] of Object.entries(block.properties)) {
      newBlock.properties[key] = substituteVars(String(val), vars);
    }
  }

  if (block.children) {
    newBlock.children = block.children.map((child) =>
      substituteBlockVars(child, vars)
    );
  }

  return newBlock;
}

/**
 * Expand template usages in a document
 * Template usage: use: templateName | param1: value1 | param2: value2
 */
export function expandTemplates(
  document: IntentDocument,
  templates: TemplateRegistry
): IntentDocument {
  const expandedBlocks: IntentBlock[] = [];

  for (const block of document.blocks) {
    if (block.type === "use" || block.type === "template-use") {
      const templateName = block.content.trim();
      const template = templates[templateName];

      if (!template) {
        // Keep as unknown block if template not found
        expandedBlocks.push({
          ...block,
          type: "body-text" as BlockType,
          content: `Template not found: ${templateName}`,
        });
        continue;
      }

      // Build var map from block properties (excluding reserved keys)
      const vars: Record<string, string> = {};
      for (const [key, val] of Object.entries(block.properties || {})) {
        if (key !== "template" && key !== "use") {
          vars[key] = String(val);
        }
      }

      // Fill in default values for missing params
      for (const param of template.params) {
        if (!(param in vars)) {
          vars[param] = "";
        }
      }

      // Expand template blocks with substitutions
      for (const templateBlock of template.blocks) {
        expandedBlocks.push(substituteBlockVars(templateBlock, vars));
      }
    } else if (block.children) {
      // Recursively expand in children
      expandedBlocks.push({
        ...block,
        children: expandTemplates(
          { blocks: block.children },
          templates
        ).blocks,
      });
    } else {
      expandedBlocks.push(block);
    }
  }

  return {
    ...document,
    blocks: expandedBlocks,
  };
}

/**
 * Include another .it file
 * Syntax: include: ./path/to/file.it
 */
export function processIncludes(
  document: IntentDocument,
  basePath: string,
  visitedPaths: Set<string> = new Set()
): IntentDocument {
  const expandedBlocks: IntentBlock[] = [];

  for (const block of document.blocks) {
    if (block.type === "include") {
      const includePath = block.content.trim();
      const fullPath = path.resolve(basePath, includePath);

      // Prevent circular includes
      if (visitedPaths.has(fullPath)) {
        expandedBlocks.push({
          id: block.id,
          type: "note" as BlockType,
          content: `Circular include detected: ${includePath}`,
        });
        continue;
      }

      if (!fs.existsSync(fullPath)) {
        expandedBlocks.push({
          id: block.id,
          type: "note" as BlockType,
          content: `Include file not found: ${includePath}`,
        });
        continue;
      }

      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        const includedDoc = parseIntentText(content);

        // Recursively process includes in the included file
        const processedDoc = processIncludes(
          includedDoc,
          path.dirname(fullPath),
          new Set([...visitedPaths, fullPath])
        );

        expandedBlocks.push(...processedDoc.blocks);
      } catch (error) {
        expandedBlocks.push({
          id: block.id,
          type: "note" as BlockType,
          content: `Error including ${includePath}: ${(error as Error).message}`,
        });
      }
    } else if (block.children) {
      expandedBlocks.push({
        ...block,
        children: processIncludes(
          { blocks: block.children },
          basePath,
          visitedPaths
        ).blocks,
      });
    } else {
      expandedBlocks.push(block);
    }
  }

  return {
    ...document,
    blocks: expandedBlocks,
  };
}

/**
 * Full template and include processing pipeline
 */
export function processDocument(
  document: IntentDocument,
  basePath: string = ".",
  externalTemplates?: TemplateRegistry
): IntentDocument {
  // Step 1: Extract templates from document
  const { templates: docTemplates, document: docWithoutTemplates } =
    extractTemplates(document);

  // Merge with external templates
  const allTemplates = { ...externalTemplates, ...docTemplates };

  // Step 2: Process includes
  const withIncludes = processIncludes(docWithoutTemplates, basePath);

  // Step 3: Expand templates
  const withTemplates = expandTemplates(withIncludes, allTemplates);

  return withTemplates;
}

/**
 * Load templates from a template library file
 */
export function loadTemplateLibrary(filePath: string): TemplateRegistry {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const doc = parseIntentText(content);
  const { templates } = extractTemplates(doc);
  return templates;
}
