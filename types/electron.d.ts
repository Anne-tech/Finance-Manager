export interface SaveFileResult {
  canceled: boolean;
  filePath?: string;
}

export interface ElectronAPI {
  saveFile(opts: {
    defaultPath: string;
    filters?: { name: string; extensions: string[] }[];
    content: string;
    encoding: 'utf-8' | 'base64';
  }): Promise<SaveFileResult>;
  printToPDF(opts: { html: string; defaultPath: string }): Promise<SaveFileResult>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
