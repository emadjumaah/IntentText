import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  openFile: () => ipcRenderer.invoke("open-file"),
  saveFile: (data: { filePath: string | null; content: string }) => 
    ipcRenderer.invoke("save-file", data),
  parseDocument: (content: string) => ipcRenderer.invoke("parse-document", content),
  exportHTML: (html: string) => ipcRenderer.invoke("export-html", html),
});
