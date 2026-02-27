import { app, BrowserWindow, ipcMain, dialog } from "electron";
import * as path from "path";
import { readFileSync, writeFileSync } from "fs";
import { parseIntentText, renderHTML } from "@intenttext/core";

let mainWindow: BrowserWindow | null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    titleBarStyle: "hiddenInset",
    show: false,
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "renderer/index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// File operations
ipcMain.handle("open-file", async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ["openFile"],
    filters: [
      { name: "IntentText Files", extensions: ["it"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const content = readFileSync(filePath, "utf-8");
  return { filePath, content };
});

ipcMain.handle("save-file", async (_, { filePath, content }) => {
  if (!filePath) {
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: "document.it",
      filters: [
        { name: "IntentText Files", extensions: ["it"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (result.canceled) {
      return null;
    }
    filePath = result.filePath;
  }

  writeFileSync(filePath, content, "utf-8");
  return filePath;
});

ipcMain.handle("parse-document", (_, content) => {
  try {
    const parsed = parseIntentText(content);
    const html = renderHTML(parsed);
    return { success: true, parsed, html };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
});

ipcMain.handle("export-html", async (_, html) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: "document.html",
    filters: [
      { name: "HTML Files", extensions: ["html"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (result.canceled) {
    return null;
  }

  writeFileSync(result.filePath, html, "utf-8");
  return result.filePath;
});
