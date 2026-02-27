export interface ElectronAPI {
  openFile: () => Promise<{ filePath: string; content: string } | null>;
  saveFile: (data: { filePath: string | null; content: string }) => Promise<string | null>;
  parseDocument: (content: string) => Promise<{
    success: boolean;
    parsed?: any;
    html?: string;
    error?: string;
  }>;
  exportHTML: (html: string) => Promise<string | null>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
