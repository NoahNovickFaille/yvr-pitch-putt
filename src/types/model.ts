// Download state for persistence
export interface DownloadState {
  taskId: string;
  bytesWritten: number;
  totalBytes: number;
  status: 'idle' | 'downloading' | 'paused' | 'verifying' | 'completed' | 'failed';
  error?: string;
}

// Model initialization state
export type ModelState =
  | { status: 'not_downloaded' }
  | { status: 'downloading'; progress: number }
  | { status: 'download_paused'; progress: number }
  | { status: 'verifying' }
  | { status: 'ready_to_initialize' }
  | { status: 'initializing' }
  | { status: 'ready' }
  | { status: 'error'; error: string }
  | { status: 'unloaded' }; // After memory warning

// Download controls returned by download function
export interface DownloadControls {
  pause: () => void;
  resume: () => void;
  cancel: () => void;
}
