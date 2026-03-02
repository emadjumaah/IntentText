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

// Apply inline AST nodes to produce safe HTML.
// Falls back to escaping plain content when no inline nodes are present.
function applyInlineFormatting(
  content: string,
  inline?: InlineNode[],
  originalContent?: string,
): string {
  if (inline && inline.length > 0) {
    return inline
      .map((node) => {
        switch (node.type) {
          case "text":
            return escapeHtml(node.value);
          case "bold":
            return `<strong>${escapeHtml(node.value)}</strong>`;
          case "italic":
            return `<em>${escapeHtml(node.value)}</em>`;
          case "strike":
            return `<del>${escapeHtml(node.value)}</del>`;
          case "code":
            return `<code>${escapeHtml(node.value)}</code>`;
          case "link":
            return `<a href="${escapeHtml(sanitizeUrl(node.href))}" class="intent-inline-link">${escapeHtml(node.value)}</a>`;
          default:
            return escapeHtml((node as { value: string }).value);
        }
      })
      .join("");
  }

  return escapeHtml(originalContent || content);
}

// Helper function to render a single block
function renderBlock(block: IntentBlock): string {
  const content = applyInlineFormatting(
    block.content,
    block.inline,
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

    case "info":
      return `<div class="intent-callout intent-info"><span class="intent-callout-label">Note</span><div class="intent-callout-content">${content}</div></div>`;

    case "warning":
      return `<div class="intent-callout intent-warning"><span class="intent-callout-label">Caution</span><div class="intent-callout-content">${content}</div></div>`;

    case "tip":
      return `<div class="intent-callout intent-tip"><span class="intent-callout-label">Tip</span><div class="intent-callout-content">${content}</div></div>`;

    case "success":
      return `<div class="intent-callout intent-success"><span class="intent-callout-label">Done</span><div class="intent-callout-content">${content}</div></div>`;

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

    case "ask":
      return `<div class="intent-ask"><span class="intent-ask-label">Query</span><div class="intent-ask-content">${content}</div></div>`;

    case "quote": {
      const attribution = props.by
        ? `<cite class="intent-quote-cite">— ${escapeHtml(String(props.by))}</cite>`
        : "";
      return `<blockquote class="intent-quote"><p>${content}</p>${attribution}</blockquote>`;
    }

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

    case "list-item": {
      const listItemProps = block.properties || {};
      const listItemMeta = [
        listItemProps.owner &&
          `<span class="intent-task-owner">${escapeHtml(String(listItemProps.owner))}</span>`,
        listItemProps.due &&
          `<span class="intent-task-due">${escapeHtml(String(listItemProps.due))}</span>`,
      ]
        .filter(Boolean)
        .join(" ");
      return `<li class="intent-list-item">${content}${listItemMeta ? ` <span class="intent-task-meta">${listItemMeta}</span>` : ""}</li>`;
    }

    case "step-item":
      return `<li class="intent-step-item">${content}</li>`;

    default:
      return `<div class="intent-unknown">
        <small class="intent-unknown-type">[${block.type}]</small> ${content}
      </div>`;
  }
}

// Render a list of blocks, properly grouping consecutive list/step items
// and recursing into section/sub/sub2 children.
function renderBlocks(blocks: IntentBlock[]): string {
  let html = "";
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];

    // Collect consecutive list-item blocks into a single <ul>
    if (block.type === "list-item") {
      html += '<ul class="intent-list">';
      while (i < blocks.length && blocks[i].type === "list-item") {
        html += renderBlock(blocks[i]);
        i++;
      }
      html += "</ul>";
      continue;
    }

    // Collect consecutive step-item blocks into a single <ol>
    if (block.type === "step-item") {
      html += '<ol class="intent-list">';
      while (i < blocks.length && blocks[i].type === "step-item") {
        html += renderBlock(blocks[i]);
        i++;
      }
      html += "</ol>";
      continue;
    }

    // Render the block itself
    html += renderBlock(block);

    // Recurse into children only for structural containers.
    // list-item children hold the original embedded keyword block (content
    // already copied to the list-item), so we do NOT recurse into those.
    if (
      (block.type === "section" ||
        block.type === "sub") &&
      block.children &&
      block.children.length > 0
    ) {
      html += renderBlocks(block.children);
    }

    i++;
  }

  return html;
}

// Main HTML renderer function
export function renderHTML(document: IntentDocument): string {
  const html = renderBlocks(document.blocks);

  // Wrap in a container
  const direction =
    document.metadata?.language === "rtl" ? 'dir="rtl"' : 'dir="ltr"';

  return `<div class="intent-document" ${direction}>
<style>
.intent-document{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.65;color:#1e293b;max-width:760px;margin:0 auto;padding:32px 24px;}
.intent-title{font-size:1.9rem;line-height:1.2;margin:0 0 14px;letter-spacing:-0.02em;font-weight:700;}
.intent-summary{margin:12px 0 24px;padding:10px 0 10px 14px;border-left:3px solid #e2e8f0;color:#475569;font-style:italic;}
.intent-section{margin:28px 0 8px;font-size:1.15rem;line-height:1.3;font-weight:600;padding-bottom:5px;border-bottom:1px solid #e2e8f0;}
.intent-sub{margin:18px 0 6px;font-size:1rem;line-height:1.3;color:#374151;font-weight:600;}
.intent-note{margin:8px 0;color:#374151;}
.intent-divider{margin:22px 0;text-align:center;}
.intent-divider-line{border:none;border-top:1px solid #e2e8f0;margin:0;}
.intent-divider-label{display:inline-block;padding:0 12px;background:white;color:#94a3b8;font-size:0.8rem;position:relative;top:-10px;}
.intent-task{display:flex;align-items:flex-start;gap:10px;padding:9px 12px;border:1px solid #e2e8f0;border-radius:6px;margin:6px 0;}
.intent-task-checkbox{margin-top:3px;flex-shrink:0;}
.intent-task-text{flex:1;}
.intent-task-meta{display:flex;gap:8px;color:#94a3b8;font-size:0.8rem;white-space:nowrap;}
.intent-task-owner::before{content:'@ ';opacity:0.6;}
.intent-task-due::before{content:'due ';}
.intent-task-time::before{content:'at ';}
.intent-task-text-done{text-decoration:line-through;color:#94a3b8;}
.intent-ask{display:flex;gap:12px;margin:12px 0;padding:8px 0 8px 14px;border-left:2px solid #94a3b8;align-items:baseline;}
.intent-ask-label{font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;flex-shrink:0;line-height:1.65;}
.intent-ask-content{flex:1;color:#374151;font-style:italic;}
.intent-quote{margin:16px 0;padding:2px 0 2px 18px;border-left:3px solid #cbd5e1;font-style:italic;color:#475569;}
.intent-quote p{margin:0;line-height:1.7;}
.intent-quote-cite{display:block;margin-top:6px;font-style:normal;color:#94a3b8;font-size:0.82rem;}
.intent-code{margin:12px 0;padding:12px 14px;border-radius:6px;background:#0d1117;color:#e2e8f0;overflow-x:auto;}
.intent-code code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono',monospace;font-size:0.875rem;}
.intent-table{width:100%;border-collapse:collapse;margin:14px 0;font-size:0.9em;}
.intent-table th,.intent-table-th{padding:7px 12px;text-align:left;font-weight:600;color:#475569;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e2e8f0;}
.intent-table td,.intent-table-td{padding:8px 12px;text-align:left;border-bottom:1px solid #f1f5f9;color:#374151;vertical-align:top;}
.intent-row:last-child .intent-table-td,.intent-row:last-child td{border-bottom:none;}
.intent-image{margin:14px 0;}
.intent-image-img{max-width:100%;height:auto;border-radius:6px;border:1px solid #e2e8f0;}
.intent-image-caption{margin-top:6px;color:#64748b;font-size:0.82rem;text-align:center;}
.intent-link{margin:6px 0;}
.intent-link a{color:#2563eb;text-decoration:none;}
.intent-link a:hover{text-decoration:underline;}
.intent-ref{margin:6px 0;}
.intent-ref a{color:#2563eb;text-decoration:none;font-style:italic;}
.intent-ref a:hover{text-decoration:underline;}
.intent-unknown{margin:8px 0;padding:8px 12px;border:1px dashed #e2e8f0;border-radius:6px;color:#94a3b8;}
.intent-embed{margin:16px 0;}
.intent-embed iframe,.intent-embed video,.intent-embed audio{display:block;width:100%;border-radius:6px;border:1px solid #e2e8f0;}
.intent-callout{display:flex;gap:12px;margin:12px 0;padding:8px 0 8px 14px;border-left:2px solid;align-items:baseline;}
.intent-callout-label{font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;flex-shrink:0;white-space:nowrap;line-height:1.65;}
.intent-callout-content{flex:1;color:#374151;}
.intent-info{border-color:#93c5fd;}
.intent-info .intent-callout-label{color:#2563eb;}
.intent-warning{border-color:#fcd34d;}
.intent-warning .intent-callout-label{color:#b45309;}
.intent-tip{border-color:#6ee7b7;}
.intent-tip .intent-callout-label{color:#047857;}
.intent-success{border-color:#6ee7b7;}
.intent-success .intent-callout-label{color:#047857;}
.intent-inline-link{color:#2563eb;text-decoration:none;}
.intent-inline-link:hover{text-decoration:underline;}
ul,ol{margin:8px 0 8px 20px;padding:0;}
li{margin:4px 0;color:#374151;}
</style>
${html}
</div>`;
}
