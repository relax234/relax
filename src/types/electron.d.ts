export interface DesktopUpdateEvent {
  state:
    | 'checking'
    | 'available'
    | 'not-available'
    | 'downloading'
    | 'downloaded'
    | 'error';
  version?: string;
  progressPercent?: number;
  releaseNotes?: string;
  message?: string;
}

export interface DesktopAppInfo {
  isElectron: boolean;
  version: string;
  platform: string;
}

export interface OptiCoreDesktopBridge {
  getAppInfo: () => Promise<DesktopAppInfo>;
  checkForUpdates: () => Promise<{ ok: boolean; error?: string }>;
  downloadUpdate: () => Promise<{ ok: boolean; error?: string }>;
  installUpdate: () => Promise<void>;
  onUpdateStatus: (callback: (event: DesktopUpdateEvent) => void) => () => void;
}

declare global {
  interface Window {
    opticoreDesktop?: OptiCoreDesktopBridge;
  }
}

export {};
