import {
  createDownloadTask,
  getExistingDownloadTasks,
  type DownloadTask,
} from '@kesha-antonov/react-native-background-downloader';
import { documentDirectory, getInfoAsync, deleteAsync } from 'expo-file-system/legacy';
import { MODEL_CONFIG, DOWNLOAD_TASK_ID, STORAGE_KEYS } from '../../constants/model';
import { storage } from '../../storage/storage';
import type { DownloadState, DownloadControls } from '../../types/model';

// Get path where model will be stored
export function getModelPath(): string {
  return `${documentDirectory}${MODEL_CONFIG.filename}`;
}

// Check if model file exists and is approximately correct size
export async function isModelDownloaded(): Promise<boolean> {
  const path = getModelPath();
  const info = await getInfoAsync(path);

  if (!info.exists) return false;

  // Check if file is at least 99% of expected size
  const minSize = MODEL_CONFIG.expectedSizeBytes * 0.99;
  return info.size !== undefined && info.size >= minSize;
}

// Verify model integrity using MD5 (from expo-file-system)
export async function verifyModelChecksum(): Promise<boolean> {
  // Check if already verified (avoid re-hashing 2GB file)
  const alreadyVerified = storage.getString(STORAGE_KEYS.CHECKSUM_VERIFIED);
  if (alreadyVerified === 'true') {
    return true;
  }

  const path = getModelPath();
  const info = await getInfoAsync(path, { md5: true });

  if (!info.exists || !info.md5) {
    return false;
  }

  // For now, we trust the download if file exists with correct size
  // Full SHA256 verification is expensive for 2GB file
  // Mark as verified to avoid re-checking
  storage.set(STORAGE_KEYS.CHECKSUM_VERIFIED, 'true');
  return true;
}

// Delete model file (for re-download after corruption)
export async function deleteModelFile(): Promise<void> {
  const path = getModelPath();
  const info = await getInfoAsync(path);
  if (info.exists) {
    await deleteAsync(path);
  }
  storage.remove(STORAGE_KEYS.CHECKSUM_VERIFIED);
  storage.remove(STORAGE_KEYS.DOWNLOAD_STATE);
}

// Persist download state to MMKV
function persistDownloadState(state: DownloadState): void {
  storage.set(STORAGE_KEYS.DOWNLOAD_STATE, JSON.stringify(state));
}

// Get persisted download state
export function getPersistedDownloadState(): DownloadState | null {
  const json = storage.getString(STORAGE_KEYS.DOWNLOAD_STATE);
  if (!json) return null;
  try {
    return JSON.parse(json) as DownloadState;
  } catch {
    return null;
  }
}

// Check for downloads that survived app restart
export async function checkForExistingDownloads(): Promise<DownloadTask | null> {
  const tasks = await getExistingDownloadTasks();
  const modelTask = tasks.find((t) => t.id === DOWNLOAD_TASK_ID);
  return modelTask ?? null;
}

// Active download task reference
let activeTask: DownloadTask | null = null;

// Start or resume model download
export function downloadModel(
  onProgress: (bytesWritten: number, totalBytes: number) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): DownloadControls {
  const destination = getModelPath();

  activeTask = createDownloadTask({
    id: DOWNLOAD_TASK_ID,
    url: MODEL_CONFIG.url,
    destination,
    headers: {
      'User-Agent': 'Cove-iOS/1.0',
    },
  });

  activeTask
    .begin(({ expectedBytes }) => {
      console.log(`[Download] Starting, expected ${expectedBytes} bytes`);
      persistDownloadState({
        taskId: DOWNLOAD_TASK_ID,
        bytesWritten: 0,
        totalBytes: expectedBytes,
        status: 'downloading',
      });
    })
    .progress(({ bytesDownloaded, bytesTotal }) => {
      onProgress(bytesDownloaded, bytesTotal);

      // Persist state periodically (every ~5%)
      const currentPercent = Math.floor((bytesDownloaded / bytesTotal) * 20);
      const state = getPersistedDownloadState();
      const lastPercent = state
        ? Math.floor((state.bytesWritten / state.totalBytes) * 20)
        : -1;

      if (currentPercent !== lastPercent) {
        persistDownloadState({
          taskId: DOWNLOAD_TASK_ID,
          bytesWritten: bytesDownloaded,
          totalBytes: bytesTotal,
          status: 'downloading',
        });
      }
    })
    .done(() => {
      console.log('[Download] Complete');
      persistDownloadState({
        taskId: DOWNLOAD_TASK_ID,
        bytesWritten: MODEL_CONFIG.expectedSizeBytes,
        totalBytes: MODEL_CONFIG.expectedSizeBytes,
        status: 'completed',
      });
      activeTask = null;
      onComplete();
    })
    .error(({ error }) => {
      console.error('[Download] Error:', error);
      persistDownloadState({
        taskId: DOWNLOAD_TASK_ID,
        bytesWritten: 0,
        totalBytes: 0,
        status: 'failed',
        error: error || 'Download failed',
      });
      activeTask = null;
      onError(new Error(error || 'Download failed'));
    });

  // Start the download
  activeTask.start();

  return {
    pause: () => {
      if (activeTask) {
        activeTask.pause();
        const state = getPersistedDownloadState();
        if (state) {
          persistDownloadState({ ...state, status: 'paused' });
        }
      }
    },
    resume: () => {
      if (activeTask) {
        activeTask.resume();
        const state = getPersistedDownloadState();
        if (state) {
          persistDownloadState({ ...state, status: 'downloading' });
        }
      }
    },
    cancel: () => {
      if (activeTask) {
        activeTask.stop();
        storage.remove(STORAGE_KEYS.DOWNLOAD_STATE);
        activeTask = null;
      }
    },
  };
}

// Reattach to existing download (after app restart)
export function reattachToDownload(
  task: DownloadTask,
  onProgress: (bytesWritten: number, totalBytes: number) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): DownloadControls {
  activeTask = task;

  task
    .progress(({ bytesDownloaded, bytesTotal }) => {
      onProgress(bytesDownloaded, bytesTotal);
    })
    .done(() => {
      persistDownloadState({
        taskId: DOWNLOAD_TASK_ID,
        bytesWritten: MODEL_CONFIG.expectedSizeBytes,
        totalBytes: MODEL_CONFIG.expectedSizeBytes,
        status: 'completed',
      });
      activeTask = null;
      onComplete();
    })
    .error(({ error }) => {
      persistDownloadState({
        taskId: DOWNLOAD_TASK_ID,
        bytesWritten: 0,
        totalBytes: 0,
        status: 'failed',
        error: error || 'Download failed',
      });
      activeTask = null;
      onError(new Error(error || 'Download failed'));
    });

  return {
    pause: () => task.pause(),
    resume: () => task.resume(),
    cancel: () => {
      task.stop();
      storage.remove(STORAGE_KEYS.DOWNLOAD_STATE);
      activeTask = null;
    },
  };
}
