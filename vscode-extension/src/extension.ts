import * as vscode from "vscode";
import { parseIntentText, renderHTML } from "@intenttext/core";

let previewPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  // Update preview when the active editor changes to a .it file
  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      if (editor?.document.languageId === "intenttext" && previewPanel) {
        updatePreview(editor.document.getText());
      }
    },
    null,
    context.subscriptions,
  );

  // Update preview live as the user types
  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (
        event.document.languageId === "intenttext" &&
        previewPanel
      ) {
        updatePreview(event.document.getText());
      }
    },
    null,
    context.subscriptions,
  );

  // Command: open live preview panel beside the editor
  const previewCommand = vscode.commands.registerCommand(
    "intenttext.preview",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage(
          "Open an IntentText (.it) file first.",
        );
        return;
      }

      if (previewPanel) {
        previewPanel.reveal(vscode.ViewColumn.Two);
      } else {
        previewPanel = vscode.window.createWebviewPanel(
          "intenttextPreview",
          "IntentText Preview",
          vscode.ViewColumn.Two,
          { enableScripts: false },
        );
        previewPanel.onDidDispose(() => {
          previewPanel = undefined;
        });
      }

      updatePreview(editor.document.getText());
    },
  );

  // Command: render current document to HTML in a new tab
  const renderCommand = vscode.commands.registerCommand(
    "intenttext.renderHTML",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const content = editor.document.getText();
      const parsed = parseIntentText(content);
      const html = renderHTML(parsed);
      vscode.workspace
        .openTextDocument({ content: html, language: "html" })
        .then((doc) => vscode.window.showTextDocument(doc));
    },
  );

  // Command: query blocks (placeholder — shows result count in notification)
  const queryCommand = vscode.commands.registerCommand(
    "intenttext.query",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const query = await vscode.window.showInputBox({
        prompt: "Enter IntentText query",
        placeHolder: "type=task owner=Ahmed | type=note",
      });

      if (!query) return;

      const parsed = parseIntentText(editor.document.getText());
      const [filterPart] = query.split("|");
      const [key, value] = filterPart.trim().split("=");

      const matches = parsed.blocks.filter((b) => {
        if (key === "type") return b.type === value;
        if (key in (b.properties ?? {})) return b.properties?.[key] === value;
        return false;
      });

      vscode.window.showInformationMessage(
        `Found ${matches.length} block(s) matching "${query}"`,
      );
    },
  );

  context.subscriptions.push(previewCommand, renderCommand, queryCommand);
}

function updatePreview(content: string) {
  if (!previewPanel) return;
  try {
    const parsed = parseIntentText(content);
    const body = renderHTML(parsed);
    previewPanel.webview.html = wrapHtml(body);
  } catch (e) {
    previewPanel.webview.html = `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:1rem;color:#c0392b;">
      <strong>Parse error:</strong><pre>${e}</pre>
    </body></html>`;
  }
}

function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<style>
  body { margin: 0; padding: 1.5rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
</style>
</head>
<body>${body}</body>
</html>`;
}

export function deactivate() {}
