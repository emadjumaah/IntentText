import * as vscode from "vscode";
import { parseIntentText, renderHTML } from "@intenttext/core";

export function activate(context: vscode.ExtensionContext) {
  console.log("IntentText extension activated");

  // Register commands
  const renderCommand = vscode.commands.registerCommand(
    "intenttext.renderHTML",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const content = editor.document.getText();
        const parsed = parseIntentText(content);
        const html = renderHTML(parsed);

        // Show HTML in new tab
        const htmlDoc = vscode.workspace.openTextDocument({
          content: html,
          language: "html",
        });
        htmlDoc.then((doc: vscode.TextDocument) =>
          vscode.window.showTextDocument(doc),
        );
      }
    },
  );

  const queryCommand = vscode.commands.registerCommand(
    "intenttext.query",
    async () => {
      const query = await vscode.window.showInputBox({
        prompt: "Enter IntentText query",
        placeHolder: "task priority:high",
      });

      if (query) {
        vscode.window.showInformationMessage(`Query: ${query}`);
      }
    },
  );

  context.subscriptions.push(renderCommand, queryCommand);
}

export function deactivate() {}
