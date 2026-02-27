import React, { useState, useEffect } from "react";
import { FileText, Save, Download, Eye, Settings } from "lucide-react";
import { create } from "zustand";
// import { parseIntentText, renderHTML } from "@intenttext/core";
import "./types.d.ts";
import "./styles.css";

// Simple mock parser for now
function parseIntentText(content: string) {
  const lines = content.split("\n");
  const blocks: any[] = [];

  for (const line of lines) {
    if (line.trim() === "") continue;

    if (line.startsWith("title:")) {
      blocks.push({
        type: "title",
        content: line.replace("title:", "").trim(),
      });
    } else if (line.startsWith("section:")) {
      blocks.push({
        type: "section",
        content: line.replace("section:", "").trim(),
      });
    } else if (line.startsWith("info:")) {
      blocks.push({
        type: "info",
        content: line.replace("info:", "").trim(),
      });
    } else {
      blocks.push({
        type: "text",
        content: line,
      });
    }
  }

  return { blocks };
}

function renderHTML(doc: any) {
  return doc.blocks
    .map((block: any) => {
      switch (block.type) {
        case "title":
          return `<h1 style="font-size: 2rem; font-weight: bold; margin: 1rem 0;">${block.content}</h1>`;
        case "section":
          return `<h2 style="font-size: 1.5rem; font-weight: bold; margin: 0.75rem 0;">${block.content}</h2>`;
        case "info":
          return `<div style="background: #e0f2fe; padding: 1rem; margin: 0.5rem 0; border-left: 4px solid #0ea5e9;">${block.content}</div>`;
        default:
          return `<p style="margin: 0.5rem 0;">${block.content}</p>`;
      }
    })
    .join("");
}

interface Document {
  content: string;
  filePath: string | null;
  parsed: any;
  html: string;
  error: string | null;
}

interface Store {
  document: Document;
  setDocument: (doc: Partial<Document>) => void;
  setContent: (content: string) => void;
}

const useStore = create<Store>((set) => ({
  document: {
    content: "",
    filePath: null,
    parsed: null,
    html: "",
    error: null,
  },
  setDocument: (doc) =>
    set((state) => ({
      document: { ...state.document, ...doc },
    })),
  setContent: (content) =>
    set((state) => ({
      document: { ...state.document, content },
    })),
}));

export default function App() {
  const { document, setDocument, setContent } = useStore();
  const [showPreview, setShowPreview] = useState(true);

  // Parse document when content changes
  useEffect(() => {
    // Always update preview, even for empty content
    try {
      const parsed = parseIntentText(document.content);
      const html = renderHTML(parsed);
      setDocument({
        parsed,
        html,
        error: null,
      });
    } catch (error) {
      setDocument({
        error: error instanceof Error ? error.message : "Parse error occurred",
      });
    }
  }, [document.content]);

  const handleOpen = async () => {
    // Mock file open for browser development
    const input = window.document.createElement("input");
    input.type = "file";
    input.accept = ".it,.txt";
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setDocument({
            content,
            filePath: file.name,
            parsed: null,
            html: "",
            error: null,
          });
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleSave = async () => {
    // Mock file save for browser development
    const blob = new Blob([document.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = document.filePath || "document.it";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (document.html) {
      // Mock HTML export for browser development
      const blob = new Blob([document.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = "document.html";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 space-y-4">
        <button
          onClick={handleOpen}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Open File"
        >
          <FileText size={20} />
        </button>

        <button
          onClick={handleSave}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Save File"
        >
          <Save size={20} />
        </button>

        <button
          onClick={handleExport}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Export HTML"
        >
          <Download size={20} />
        </button>

        <button
          onClick={() => setShowPreview(!showPreview)}
          className={`p-2 rounded-lg transition-colors ${
            showPreview ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"
          }`}
          title="Toggle Preview"
        >
          <Eye size={20} />
        </button>

        <button
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Settings"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Editor */}
        <div
          className={`${showPreview ? "w-1/2" : "w-full"} border-r border-gray-200`}
        >
          <div className="h-full flex flex-col">
            <div className="px-4 py-2 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">
                  {document.filePath || "Untitled.it"}
                </h2>
                {document.error && (
                  <span className="text-red-500 text-sm">Parse Error</span>
                )}
              </div>
            </div>

            <textarea
              value={document.content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 p-4 font-mono text-sm resize-none focus:outline-none"
              placeholder="Enter IntentText content...

Example:
title: My Project

section: Tasks
[ ] Review documentation @sarah !high
[x] Initial setup completed

info: ℹ️ Use [markdown links](https://example.com) for references"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="w-1/2 bg-white">
            <div className="h-full flex flex-col">
              <div className="px-4 py-2 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">Preview</h3>
              </div>

              <div className="flex-1 overflow-auto p-4">
                {document.error ? (
                  <div className="text-red-500 p-4 border border-red-200 rounded-lg">
                    <strong>Parse Error:</strong>
                    <pre className="mt-2 text-sm">{document.error}</pre>
                  </div>
                ) : document.html ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: document.html }}
                    className="prose max-w-none"
                  />
                ) : (
                  <div className="text-gray-400 text-center mt-8">
                    Start typing to see preview...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
