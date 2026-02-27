import { IntentBlock, IntentDocument, InlineNode } from "./types";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed === "") return "";

  // Allow safe common schemes + relative URLs + fragment links.
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("./") ||
    trimmed.startsWith("../") ||
    trimmed.startsWith("#")
  ) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();
  // Allow bare relative paths like "logo.png" or "assets/banner.png".
  // Block any value that looks like it declares a scheme (e.g. "javascript:").
  if (!lower.includes(":") && !lower.startsWith("//")) {
    return trimmed;
  }

  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:")
  ) {
    return trimmed;
  }

  return "#";
}

// Helper function to convert original formatted text to HTML
function convertFormattedTextToHTML(text: string): string {
  let result = escapeHtml(text);

  // Convert *text* to <strong>text</strong>
  result = result.replace(/\*([^*]+)\*/g, "<strong>$1</strong>");

  // Convert _text_ to <em>text</em>
  result = result.replace(/_([^_]+)_/g, "<em>$1</em>");

  // Convert ~text~ to <del>text</del>
  result = result.replace(/~([^~]+)~/g, "<del>$1</del>");

  // Convert ```text``` to <code>text</code>
  result = result.replace(/```([\s\S]+?)```/g, "<code>$1</code>");

  return result;
}

// Helper function to apply inline formatting
function applyInlineFormatting(
  content: string,
  inline?: InlineNode[],
  marks?: Array<{ type: string; start: number; end: number }>,
  originalContent?: string,
): string {
  if (inline && inline.length > 0) {
    return inline
      .map((n) => {
        const v = escapeHtml(n.value);
        switch (n.type) {
          case "text":
            return v;
          case "bold":
            return `<strong>${v}</strong>`;
          case "italic":
            return `<em>${v}</em>`;
          case "strike":
            return `<del>${v}</del>`;
          case "code":
            return `<code>${v}</code>`;
          default:
            return v;
        }
      })
      .join("");
  }

  // Legacy fallback: if original content with delimiters is available,
  // prefer it over marks offsets.
  if (originalContent) {
    return convertFormattedTextToHTML(originalContent);
  }

  if (!marks || marks.length === 0) return escapeHtml(content);

  // Fallback: apply simple formatting to cleaned content
  let result = escapeHtml(content);

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
    block.inline,
    block.marks,
    block.originalContent,
  );
  const props = block.properties || {};

  switch (block.type) {
    case "title":
      return `<h1 class="intent-title">${content}</h1>`;

    case "summary":
      return `<div class="intent-summary">${content}</div>`;

    case "section":
      return `<h2 class="intent-section">${content}</h2>`;

    case "sub":
      return `<h3 class="intent-sub">${content}</h3>`;

    case "sub2":
      return `<h4 class="intent-sub2">${content}</h4>`;

    case "divider":
      const label = content
        ? `<span class="intent-divider-label">${content}</span>`
        : "";
      return `<div class="intent-divider">
        <hr class="intent-divider-line" />
        ${label}
      </div>`;

    case "note":
    case "body-text":
      return `<p class="intent-note">${content}</p>`;

    case "task":
      return `<div class="intent-task">
        <input class="intent-task-checkbox" type="checkbox" />
        <span class="intent-task-text">${content}</span>
        <span class="intent-task-meta">
          ${props.owner ? `<span class="intent-task-owner">${escapeHtml(String(props.owner))}</span>` : ""}
          ${props.due ? `<span class="intent-task-due">${escapeHtml(String(props.due))}</span>` : ""}
        </span>
      </div>`;

    case "done":
      return `<div class="intent-task intent-task-done">
        <input class="intent-task-checkbox" type="checkbox" checked />
        <span class="intent-task-text intent-task-text-done">${content}</span>
        <span class="intent-task-meta">
          ${props.time ? `<span class="intent-task-time">${escapeHtml(String(props.time))}</span>` : ""}
        </span>
      </div>`;

    case "question":
      return `<div class="intent-question">
        <strong>Question:</strong> ${content}
      </div>`;

    case "image":
      const imgSrc = escapeHtml(
        sanitizeUrl(String(props.at || "")) || String(props.at || content),
      );
      const imgAlt = content;
      return `<figure class="intent-image">
        <img class="intent-image-img" src="${imgSrc}" alt="${imgAlt}" />
        ${props.caption ? `<figcaption class="intent-image-caption">${escapeHtml(String(props.caption))}</figcaption>` : ""}
      </figure>`;

    case "link":
      const href = escapeHtml(sanitizeUrl(String(props.to || content)));
      const titleAttr = props.title
        ? `title="${escapeHtml(String(props.title))}"`
        : "";
      return `<p class="intent-link"><a href="${href}" ${titleAttr}>${content}</a></p>`;

    case "ref":
      const refTo = escapeHtml(String(props.to || content));
      const refText = content || refTo;
      return `<p class="intent-ref"><a href="${refTo}">${refText}</a></p>`;

    case "embed": {
      const embedType = props.type || "iframe";
      const src = String(props.src || "");
      const embedContent = String(props.content || "");

      switch (embedType) {
        case "iframe":
          return `<div class="intent-embed"><iframe src="${escapeHtml(sanitizeUrl(src))}" frameborder="0" loading="lazy" style="width:100%;min-height:400px;border-radius:8px;"></iframe></div>`;
        case "mermaid":
          return `<div class="intent-embed mermaid">${embedContent}</div>`;
        case "svg":
          return `<div class="intent-embed svg">${embedContent}</div>`;
        case "video":
          return `<div class="intent-embed video"><video src="${escapeHtml(sanitizeUrl(src))}" controls style="max-width:100%;border-radius:8px;"></video></div>`;
        case "audio":
          return `<div class="intent-embed audio"><audio src="${escapeHtml(sanitizeUrl(src))}" controls style="width:100%;"></audio></div>`;
        default:
          return `<div class="intent-embed unknown">${escapeHtml(embedContent || src)}</div>`;
      }
    }

    case "code":
      return `<pre class="intent-code"><code>${escapeHtml(block.content)}</code></pre>`;

    case "table": {
      const headers = block.table?.headers;
      const rows = block.table?.rows || [];

      const thead = headers
        ? `<thead><tr>${headers
            .map((h) => `<th class="intent-table-th">${escapeHtml(h)}</th>`)
            .join("")}</tr></thead>`
        : "";

      const tbody = `<tbody>${rows
        .map(
          (row) =>
            `<tr class="intent-row">${row
              .map((c) => `<td class="intent-table-td">${escapeHtml(c)}</td>`)
              .join("")}</tr>`,
        )
        .join("")}</tbody>`;

      return `<table class="intent-table">${thead}${tbody}</table>`;
    }

    case "list-item":
      return `<li class="intent-list-item">${content}</li>`;

    case "step-item":
      return `<li class="intent-step-item">${content}</li>`;

    default:
      return `<div class="intent-unknown">
        <small class="intent-unknown-type">[${block.type}]</small> ${content}
      </div>`;
  }
}

// Main HTML renderer function
export function renderHTML(document: IntentDocument): string {
  const blocks = document.blocks;
  let html = "";

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    // Handle sections with children
    if (block.children && block.children.length > 0) {
      html += renderBlock(block);

      // Render children
      if (
        block.type === "section" ||
        block.type === "sub" ||
        block.type === "sub2"
      ) {
        // Check if children are list items
        const hasListItems = block.children.some(
          (child) => child.type === "list-item" || child.type === "step-item",
        );

        if (hasListItems) {
          const isOrdered = block.children.some(
            (child) => child.type === "step-item",
          );
          html += isOrdered ? "<ol>" : "<ul>";

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

  // Wrap in a container
  const direction =
    document.metadata?.language === "rtl" ? 'dir="rtl"' : 'dir="ltr"';

  return `<div class="intent-document" ${direction}>
<style>
.intent-document{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.65;color:#111827;max-width:760px;margin:0 auto;padding:40px 24px;}
.intent-title{font-size:2rem;line-height:1.2;margin:0 0 16px;text-align:center;letter-spacing:-0.01em;}
.intent-summary{margin:16px 0 24px;padding:12px 14px;border:1px solid #e5e7eb;border-radius:10px;background:#fafafa;color:#374151;}
.intent-section{margin:28px 0 10px;font-size:1.25rem;line-height:1.3;}
.intent-sub{margin:20px 0 8px;font-size:1.05rem;line-height:1.3;color:#374151;}
.intent-note{margin:8px 0;}
.intent-divider{margin:24px 0;position:relative;text-align:center;}
.intent-divider-line{border:none;border-top:1px solid #e5e7eb;margin:0;}
.intent-divider-label{display:inline-block;margin-top:-10px;padding:0 10px;background:white;color:#6b7280;font-size:0.875rem;position:relative;top:-10px;}
.intent-task{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;margin:8px 0;}
.intent-task-checkbox{margin-top:3px;}
.intent-task-text{flex:1;}
.intent-task-meta{display:flex;gap:10px;color:#6b7280;font-size:0.85rem;white-space:nowrap;}
.intent-task-text-done{text-decoration:line-through;color:#6b7280;}
.intent-question{margin:12px 0;padding:12px 14px;border-left:3px solid #e5e7eb;background:#fafafa;border-radius:10px;}
.intent-code{margin:12px 0;padding:12px 14px;border:1px solid #e5e7eb;border-radius:10px;background:#0b1020;color:#e5e7eb;overflow-x:auto;}
.intent-code code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono',monospace;font-size:0.9rem;}
.intent-table{width:100%;border-collapse:collapse;margin:14px 0;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;}
.intent-table th,.intent-table td{padding:10px 12px;border-top:1px solid #e5e7eb;text-align:left;vertical-align:top;}
.intent-table thead th{background:#fafafa;border-top:none;font-weight:600;color:#374151;}
.intent-image{margin:14px 0;}
.intent-image-img{max-width:100%;height:auto;border-radius:12px;border:1px solid #e5e7eb;}
.intent-image-caption{margin-top:8px;color:#6b7280;font-size:0.875rem;text-align:center;}
.intent-link{margin:8px 0;}
.intent-link a{color:#2563eb;text-decoration:none;}
.intent-link a:hover{text-decoration:underline;}
.intent-ref{margin:8px 0;}
.intent-ref a{color:#2563eb;text-decoration:none;font-style:italic;}
.intent-ref a:hover{text-decoration:underline;}
.intent-unknown{margin:10px 0;padding:10px 12px;border:1px dashed #e5e7eb;border-radius:10px;color:#6b7280;}
.intent-sub2{margin:16px 0 6px;font-size:1rem;line-height:1.3;color:#4b5563;}
.intent-embed{margin:16px 0;}
.intent-embed iframe,.intent-embed video,.intent-embed audio{display:block;width:100%;border-radius:8px;border:1px solid #e5e7eb;}
ul,ol{margin:10px 0 10px 22px;padding:0;}
li{margin:6px 0;}
</style>
${html}
</div>`;
}
