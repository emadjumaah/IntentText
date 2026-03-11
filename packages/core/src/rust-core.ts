import type { IntentDocument, ParseOptions } from "./types";
import type { SafeParseOptions, SafeParseResult } from "./parser";
import type { RenderOptions } from "./renderer";
import type { SemanticIssue, SemanticValidationResult } from "./validate";
import type { IntentTheme } from "./theme";

import { documentToSource as documentToSourceTs } from "./source";
import { parseHistorySection } from "./history";
import { findHistoryBoundaryInSource } from "./trust";
import { getBuiltinTheme, generateThemeCSS } from "./theme";
type RustWasmModule = {
  parse_wasm: (source: string) => unknown;
  render_wasm: (doc: unknown) => string;
  to_source_wasm: (doc: unknown) => string;
  validate_wasm: (doc: unknown) => unknown;
};

export type RustCoreFallbackTelemetry = {
  parser_option_fallback_to_ts: number;
  renderer_option_fallback_to_ts: number;
  renderer_theme_fallback_to_ts: number;
  wasm_load_failure_fallback_to_ts: number;
  wasm_call_failure_fallback_to_ts: number;
};

const fallbackTelemetry: RustCoreFallbackTelemetry = {
  parser_option_fallback_to_ts: 0,
  renderer_option_fallback_to_ts: 0,
  renderer_theme_fallback_to_ts: 0,
  wasm_load_failure_fallback_to_ts: 0,
  wasm_call_failure_fallback_to_ts: 0,
};

function bumpFallbackCounter(key: keyof RustCoreFallbackTelemetry): void {
  fallbackTelemetry[key] += 1;
}

export function getRustCoreFallbackTelemetry(): RustCoreFallbackTelemetry {
  return { ...fallbackTelemetry };
}

export function resetRustCoreFallbackTelemetry(): void {
  for (const key of Object.keys(fallbackTelemetry) as Array<
    keyof RustCoreFallbackTelemetry
  >) {
    fallbackTelemetry[key] = 0;
  }
}

function loadRustWasm(): RustWasmModule | null {
  try {
    const req: NodeRequire =
      typeof require === "function"
        ? require
        : ((0, eval)("require") as NodeRequire);
    return req("./rust-wasm/intenttext.js") as RustWasmModule;
  } catch {
    return null;
  }
}

function applyParseOptions(
  source: string,
  doc: IntentDocument,
  options?: ParseOptions,
): IntentDocument {
  if (!options) return doc;

  if (!options.includeHistorySection) return doc;

  const boundary = findHistoryBoundaryInSource(source);
  if (boundary === -1) return doc;

  const raw = source.slice(boundary);
  const parsed = parseHistorySection(raw);
  return {
    ...doc,
    history: {
      registry: parsed.registry,
      revisions: parsed.revisions,
      raw,
    },
  };
}

function requireRustWasm(): RustWasmModule {
  const wasm = loadRustWasm();
  if (!wasm) {
    bumpFallbackCounter("wasm_load_failure_fallback_to_ts");
    throw new Error("Rust/WASM core unavailable: failed to load wasm module.");
  }
  return wasm;
}

function resolveThemeForRustRender(
  doc: IntentDocument,
  options?: RenderOptions,
): IntentTheme {
  const themeRef = options?.theme ?? doc?.metadata?.meta?.theme;
  if (themeRef && typeof themeRef === "object") {
    return themeRef as IntentTheme;
  }
  if (typeof themeRef === "string") {
    const byName = getBuiltinTheme(themeRef);
    if (byName) return byName;
  }
  return getBuiltinTheme("corporate") as IntentTheme;
}

function injectThemeCssIntoHtml(html: string, css: string): string {
  if (!css) return html;
  const styleTag = `\n<style>\n${css}\n</style>\n`;
  const firstTagEnd = html.indexOf(">") + 1;
  if (firstTagEnd <= 0) return styleTag + html;
  return html.slice(0, firstTagEnd) + styleTag + html.slice(firstTagEnd);
}

function normalizeRecordValues(
  value: unknown,
): Record<string, string> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === undefined || v === null) continue;
    out[k] = typeof v === "string" ? v : String(v);
  }
  return out;
}

function normalizeBlockForRustWasm(block: unknown): unknown {
  if (!block || typeof block !== "object") return block;
  const b = block as Record<string, unknown>;
  const normalized: Record<string, unknown> = {
    ...b,
    properties: normalizeRecordValues(b.properties),
  };
  if (Array.isArray(b.children)) {
    normalized.children = b.children.map((c) => normalizeBlockForRustWasm(c));
  }
  return normalized;
}

function normalizeDocumentForRustWasm(doc: IntentDocument): unknown {
  const d = doc as unknown as Record<string, unknown>;
  const metadata =
    d.metadata && typeof d.metadata === "object"
      ? ({ ...(d.metadata as Record<string, unknown>) } as Record<
          string,
          unknown
        >)
      : undefined;

  if (metadata) {
    metadata.context = normalizeRecordValues(metadata.context);
    metadata.meta = normalizeRecordValues(metadata.meta);
  }

  return {
    ...d,
    metadata,
    // History payload shape may include JS-side partials/undefined fields that do not
    // deserialize cleanly into Rust structs; wasm paths don't require incoming history.
    history: undefined,
    // Rust wasm renderer/source/validate do not require incoming parser diagnostics.
    // Omitting them avoids enum-shape mismatches from TS diagnostic code strings.
    diagnostics: undefined,
    blocks: Array.isArray(d.blocks)
      ? d.blocks.map((b) => normalizeBlockForRustWasm(b))
      : [],
  };
}

// Rust-backed parser for v3.
export function parseIntentText(
  source: string,
  options?: ParseOptions,
): IntentDocument {
  if (options?.extensions && options.extensions.length > 0) {
    throw new Error(
      "Parse extensions are not supported in Rust-only core runtime.",
    );
  }

  let parsed: IntentDocument;
  try {
    const wasm = requireRustWasm();
    parsed = wasm.parse_wasm(source) as IntentDocument;
  } catch {
    bumpFallbackCounter("wasm_call_failure_fallback_to_ts");
    throw new Error("Rust/WASM parser execution failed.");
  }

  return applyParseOptions(source, parsed, options);
}

export function _resetIdCounter(): void {
  // Rust core parser does not expose mutable ID counter state.
}

export function parseIntentTextSafe(
  source: string,
  options?: SafeParseOptions,
): SafeParseResult {
  try {
    const document = parseIntentText(
      source,
      options as ParseOptions | undefined,
    );
    return { document, warnings: [], errors: [] };
  } catch (error) {
    return {
      document: { version: "1.4", blocks: [], metadata: {}, diagnostics: [] },
      warnings: [],
      errors: [
        {
          line: 1,
          message:
            error instanceof Error ? error.message : "Rust/WASM parse failed",
          code: "RUST_PARSE_FAILURE",
          original: typeof source === "string" ? source.slice(0, 200) : "",
        },
      ],
    };
  }
}

// Rust-backed renderer.
export function renderHTML(
  doc: IntentDocument,
  options?: RenderOptions,
): string {
  try {
    const wasm = requireRustWasm();
    const raw = wasm.render_wasm(normalizeDocumentForRustWasm(doc));
    const theme = resolveThemeForRustRender(doc, options);
    const themeCss = generateThemeCSS(theme, "web");
    return injectThemeCssIntoHtml(raw, themeCss);
  } catch {
    bumpFallbackCounter("wasm_call_failure_fallback_to_ts");
    throw new Error("Rust/WASM renderer execution failed.");
  }
}

export function documentToSource(doc: IntentDocument): string {
  try {
    const wasm = requireRustWasm();
    return wasm.to_source_wasm(normalizeDocumentForRustWasm(doc));
  } catch {
    bumpFallbackCounter("wasm_call_failure_fallback_to_ts");
    return documentToSourceTs(doc);
  }
}

export function validateDocumentSemantic(
  doc: IntentDocument,
): SemanticValidationResult {
  try {
    const wasm = requireRustWasm();

    const diagnostics = wasm.validate_wasm(
      normalizeDocumentForRustWasm(doc),
    ) as Array<{
      severity: "Error" | "Warning" | "Info" | "error" | "warning" | "info";
      code: string;
      message: string;
      line: number;
      column: number;
    }>;

    const issues: SemanticIssue[] = diagnostics.map((d) => {
      const s = String(d.severity).toLowerCase();
      const type: "error" | "warning" | "info" =
        s === "error" ? "error" : s === "warning" ? "warning" : "info";
      return {
        blockId: "",
        blockType: "document",
        type,
        code: String(d.code),
        message: String(d.message),
      };
    });

    // Parity guard: TS validator emits HISTORY_WITHOUT_FREEZE whenever a parsed
    // history section exists without any freeze block in the document.
    const hasHistory = Boolean(doc?.history);
    const hasFreeze = (() => {
      const stack = [...(doc?.blocks || [])];
      while (stack.length > 0) {
        const b = stack.pop();
        if (!b) continue;
        if (b.type === "freeze") return true;
        if (Array.isArray(b.children)) {
          for (const c of b.children) stack.push(c);
        }
      }
      return false;
    })();

    if (hasHistory && !hasFreeze) {
      issues.push({
        blockId: "",
        blockType: "history",
        type: "warning",
        code: "HISTORY_WITHOUT_FREEZE",
        message:
          "Document has a history section but no freeze: block — this may indicate manual editing or a broken seal.",
      });
    }

    return {
      valid: !issues.some((i) => i.type === "error"),
      issues,
    };
  } catch {
    bumpFallbackCounter("wasm_call_failure_fallback_to_ts");
    throw new Error("Rust/WASM semantic validation execution failed.");
  }
}
