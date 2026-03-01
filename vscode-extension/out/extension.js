"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const core_1 = require("@intenttext/core");
let previewPanel;
function activate(context) {
    // Update preview when the active editor changes to a .it file
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor?.document.languageId === "intenttext" && previewPanel) {
            updatePreview(editor.document.getText());
        }
    }, null, context.subscriptions);
    // Update preview live as the user types
    vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.languageId === "intenttext" &&
            previewPanel) {
            updatePreview(event.document.getText());
        }
    }, null, context.subscriptions);
    // Command: open live preview panel beside the editor
    const previewCommand = vscode.commands.registerCommand("intenttext.preview", () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage("Open an IntentText (.it) file first.");
            return;
        }
        if (previewPanel) {
            previewPanel.reveal(vscode.ViewColumn.Two);
        }
        else {
            previewPanel = vscode.window.createWebviewPanel("intenttextPreview", "IntentText Preview", vscode.ViewColumn.Two, { enableScripts: false });
            previewPanel.onDidDispose(() => {
                previewPanel = undefined;
            });
        }
        updatePreview(editor.document.getText());
    });
    // Command: render current document to HTML in a new tab
    const renderCommand = vscode.commands.registerCommand("intenttext.renderHTML", () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const content = editor.document.getText();
        const parsed = (0, core_1.parseIntentText)(content);
        const html = (0, core_1.renderHTML)(parsed);
        vscode.workspace
            .openTextDocument({ content: html, language: "html" })
            .then((doc) => vscode.window.showTextDocument(doc));
    });
    // Command: query blocks (placeholder — shows result count in notification)
    const queryCommand = vscode.commands.registerCommand("intenttext.query", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const query = await vscode.window.showInputBox({
            prompt: "Enter IntentText query",
            placeHolder: "type=task owner=Ahmed | type=note",
        });
        if (!query)
            return;
        const parsed = (0, core_1.parseIntentText)(editor.document.getText());
        const [filterPart] = query.split("|");
        const [key, value] = filterPart.trim().split("=");
        const matches = parsed.blocks.filter((b) => {
            if (key === "type")
                return b.type === value;
            if (key in (b.properties ?? {}))
                return b.properties?.[key] === value;
            return false;
        });
        vscode.window.showInformationMessage(`Found ${matches.length} block(s) matching "${query}"`);
    });
    context.subscriptions.push(previewCommand, renderCommand, queryCommand);
}
function updatePreview(content) {
    if (!previewPanel)
        return;
    try {
        const parsed = (0, core_1.parseIntentText)(content);
        const body = (0, core_1.renderHTML)(parsed);
        previewPanel.webview.html = wrapHtml(body);
    }
    catch (e) {
        previewPanel.webview.html = `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:1rem;color:#c0392b;">
      <strong>Parse error:</strong><pre>${e}</pre>
    </body></html>`;
    }
}
function wrapHtml(body) {
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
function deactivate() { }
//# sourceMappingURL=extension.js.map