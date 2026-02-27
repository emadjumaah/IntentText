import { IntentBlock, IntentDocument } from "./types";

// Helper function to convert original formatted text to HTML
function convertFormattedTextToHTML(text: string): string {
  let result = text;

  // Convert *text* to <strong>text</strong>
  result = result.replace(/\*([^*]+)\*/g, "<strong>$1</strong>");

  // Convert _text_ to <em>text</em>
  result = result.replace(/_([^_]+)_/g, "<em>$1</em>");

  // Convert ~text~ to <del>text</del>
  result = result.replace(/~([^~]+)~/g, "<del>$1</del>");

  // Convert `text` to <code>text</code>
  result = result.replace(/`([^`]+)`/g, "<code>$1</code>");

  return result;
}

// Helper function to apply inline formatting
function applyInlineFormatting(
  content: string,
  marks?: Array<{ type: string; start: number; end: number }>,
  originalContent?: string,
): string {
  if (!marks || marks.length === 0) return content;

  // If we have original content with formatting, convert it to HTML
  if (originalContent) {
    return convertFormattedTextToHTML(originalContent);
  }

  // Fallback: apply simple formatting to cleaned content
  let result = content;

  if (marks.some((m) => m.type === "bold")) {
    result = `<strong>${result}</strong>`;
  }
  if (marks.some((m) => m.type === "italic")) {
    result = `<em>${result}</em>`;
  }
  if (marks.some((m) => m.type === "strike")) {
    result = `<del>${result}</del>`;
  }
  if (marks.some((m) => m.type === "code")) {
    result = `<code>${result}</code>`;
  }

  return result;
}

// Helper function to render a single block
function renderBlock(block: IntentBlock): string {
  const content = applyInlineFormatting(
    block.content,
    block.marks,
    block.originalContent,
  );
  const props = block.properties || {};

  switch (block.type) {
    case "title":
      return `<h1 class="intent-title" style="text-align: center; font-weight: bold;">${content}</h1>`;

    case "summary":
      return `<div class="intent-summary" style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 1rem; margin: 1rem 0; border-radius: 0.25rem;">${content}</div>`;

    case "section":
      return `<h2 class="intent-section" style="border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; margin-top: 2rem;">${content}</h2>`;

    case "sub":
      return `<h3 class="intent-sub" style="margin-top: 1.5rem; color: #374151;">${content}</h3>`;

    case "divider":
      const label = content
        ? `<span style="background: white; padding: 0 1rem; position: relative; top: -0.5rem;">${content}</span>`
        : "";
      return `<hr class="intent-divider" style="border: none; border-top: 1px solid #d1d5db; margin: 2rem 0; text-align: center;">${label}</hr>`;

    case "note":
    case "body-text":
      return `<p class="intent-note" style="margin: 0.5rem 0; line-height: 1.6;">${content}</p>`;

    case "task":
      return `<div class="intent-task" style="display: flex; align-items: center; padding: 0.5rem; margin: 0.25rem 0; background: #fef3c7; border-radius: 0.25rem;">
        <input type="checkbox" style="margin-right: 0.75rem;" />
        <span>${content}</span>
        ${props.owner ? `<small style="margin-left: auto; color: #6b7280;">👤 ${props.owner}</small>` : ""}
        ${props.due ? `<small style="margin-left: 0.5rem; color: #6b7280;">📅 ${props.due}</small>` : ""}
      </div>`;

    case "done":
      return `<div class="intent-task done" style="display: flex; align-items: center; padding: 0.5rem; margin: 0.25rem 0; background: #d1fae5; border-radius: 0.25rem;">
        <input type="checkbox" checked style="margin-right: 0.75rem;" />
        <span style="text-decoration: line-through;">${content}</span>
        ${props.time ? `<small style="margin-left: auto; color: #6b7280;">✅ ${props.time}</small>` : ""}
      </div>`;

    case "question":
      return `<div class="intent-question" style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 1rem; margin: 1rem 0; border-radius: 0.25rem;">
        <strong>❓ Question:</strong> ${content}
      </div>`;

    case "image":
      return `<div class="intent-image" style="margin: 1rem 0;">
        <img src="${props.at || content}" alt="${content}" style="max-width: 100%; height: auto; border-radius: 0.5rem;" />
        ${props.caption ? `<p style="text-align: center; color: #6b7280; font-size: 0.875rem; margin-top: 0.5rem;">${props.caption}</p>` : ""}
      </div>`;

    case "link":
      return `<div class="intent-link" style="margin: 0.5rem 0;">
        <a href="${props.to || content}" ${props.title ? `title="${props.title}"` : ""} style="color: #2563eb; text-decoration: underline;">${content}</a>
      </div>`;

    case "code":
      return `<div class="intent-code" style="margin: 1rem 0;">
        <pre style="background: #1f2937; color: #f9fafb; padding: 1rem; border-radius: 0.5rem; overflow-x: auto;"><code>${content}</code></pre>
      </div>`;

    case "headers":
      const headers = content
        .split("|")
        .map((h) => h.trim())
        .filter((h) => h);
      return `<div class="intent-headers" style="margin: 1rem 0;">
        <table style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr style="background: #f3f4f6;">
              ${headers.map((h) => `<th style="border: 1px solid #d1d5db; padding: 0.5rem; text-align: left; font-weight: 600;">${h}</th>`).join("")}
            </tr>
          </thead>
        </table>
      </div>`;

    case "row":
      const cells = content
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c);
      return `<tr class="intent-row">
        ${cells.map((c) => `<td style="border: 1px solid #d1d5db; padding: 0.5rem;">${c}</td>`).join("")}
      </tr>`;

    case "list-item":
      return `<li class="intent-list-item" style="margin: 0.25rem 0;">${content}</li>`;

    case "step-item":
      return `<li class="intent-step-item" style="margin: 0.25rem 0;">${content}</li>`;

    default:
      return `<div class="intent-unknown" style="padding: 0.5rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 0.25rem; margin: 0.5rem 0;">
        <small style="color: #dc2626;">[${block.type}]</small> ${content}
      </div>`;
  }
}

// Main HTML renderer function
export function renderHTML(document: IntentDocument): string {
  const blocks = document.blocks;
  let html = "";

  // Track if we're inside a table
  let inTable = false;
  let tableContent = "";

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    // Handle table rows
    if (block.type === "headers") {
      if (inTable) {
        html += tableContent + "</tbody></table>";
        inTable = false;
        tableContent = "";
      }
      html += renderBlock(block);
    } else if (block.type === "row") {
      if (!inTable) {
        // Look backwards for the last headers block
        let headersFound = false;
        for (let j = i - 1; j >= 0; j--) {
          if (blocks[j].type === "headers") {
            headersFound = true;
            break;
          }
          if (blocks[j].type !== "row") break;
        }

        if (headersFound) {
          inTable = true;
          tableContent =
            '<table style="border-collapse: collapse; width: 100%; margin: 1rem 0;"><tbody>';
        }
      }

      if (inTable) {
        tableContent += renderBlock(block);
      } else {
        html += renderBlock(block);
      }
    } else {
      // Close table if we're done with rows
      if (inTable) {
        html += tableContent + "</tbody></table>";
        inTable = false;
        tableContent = "";
      }

      // Handle sections with children
      if (block.children && block.children.length > 0) {
        html += renderBlock(block);

        // Render children
        if (block.type === "section" || block.type === "sub") {
          // Check if children are list items
          const hasListItems = block.children.some(
            (child) => child.type === "list-item" || child.type === "step-item",
          );

          if (hasListItems) {
            const isOrdered = block.children.some(
              (child) => child.type === "step-item",
            );
            html += isOrdered
              ? '<ol style="margin: 0.5rem 0; padding-left: 1.5rem;">'
              : '<ul style="margin: 0.5rem 0; padding-left: 1.5rem;">';

            for (const child of block.children) {
              html += renderBlock(child);
            }

            html += isOrdered ? "</ol>" : "</ul>";
          } else {
            // Render as regular blocks
            for (const child of block.children) {
              html += renderBlock(child);
            }
          }
        }
      } else {
        html += renderBlock(block);
      }
    }
  }

  // Close any remaining table
  if (inTable) {
    html += tableContent + "</tbody></table>";
  }

  // Wrap in a container
  const direction =
    document.metadata?.language === "rtl" ? 'dir="rtl"' : 'dir="ltr"';

  return `<div class="intent-document" ${direction} style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 0 auto; padding: 2rem;">
${html}
</div>`;
}
