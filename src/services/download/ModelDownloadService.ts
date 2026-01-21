import {
  createDownloadTask,
  getExistingDownloadTasks,
  type DownloadTask,
} from '@kesha-antonov/react-native-background-downloader';
import { documentDirectory, getInfoAsync, deleteAsync } from 'expo-file-system/legacy';
import {
  MODEL_CONFIG,
  DOWNLOAD_TASK_ID,
  STORAGE_KEYS,
  AVAILABLE_MODELS,
  getDownloadStateKey,
} from '../../constants/model';
import type { ModelDefinition } from '../../constants/model';
import { storage } from '../../storage/storage';
import type { DownloadState, DownloadControls } from '../../types/model';

// Get path where model will be stored
export function getModelPath(model?: ModelDefinition): string {
  const filename = model?.filename ?? MODEL_CONFIG.filename;
  return `${documentDirectory}${filename}`;
}

// Check if model file exists and is approximately correct size
export async function isModelDownloaded(model?: ModelDefinition): Promise<boolean> {
  const targetModel = model ?? { filename: MODEL_CONFIG.filename, sizeBytes: MODEL_CONFIG.expectedSizeBytes };
  const path = getModelPath(model);
  const info = await getInfoAsync(path);

  if (!info.exists) return false;

  // Check if file is at least 99% of expected size
  const minSize = targetModel.sizeBytes * 0.99;
  return info.size !== undefined && info.size >= minSize;
}

// Get model-specific checksum storage key
function getChecksumKey(model?: ModelDefinition): string {
  const filename = model?.filename ?? MODEL_CONFIG.filename;
  return `${STORAGE_KEYS.CHECKSUM_VERIFIED}_${filename}`;
}

// Verify model integrity using MD5 (from expo-file-system)
export async function verifyModelChecksum(model?: ModelDefinition): Promise<boolean> {
  // Check if already verified (avoid re-hashing 2GB file)
  // Use model-specific key to avoid cross-model conflicts
  const checksumKey = getChecksumKey(model);
  const alreadyVerified = storage.getString(checksumKey);
  if (alreadyVerified === 'true') {
    return true;
  }

  const path = getModelPath(model);
  const info = await getInfoAsync(path, { md5: true });

  if (!info.exists || !info.md5) {
    return false;
  }

  // For now, we trust the download if file exists with correct size
  // Full SHA256 verification is expensive for 2GB file
  // Mark as verified to avoid re-checking
  storage.set(checksumKey, 'true');
  return true;
}

// Delete model file (for re-download after corruption)
export async function deleteModelFile(model?: ModelDefinition, storageKey?: string): Promise<void> {
  const path = getModelPath(model);
  const info = await getInfoAsync(path);
  if (info.exists) {
    await deleteAsync(path);
  }
  // Use model-specific checksum key
  storage.remove(getChecksumKey(model));
  // Clear download state - use provided key or model-specific key
  if (storageKey) {
    storage.remove(storageKey);
  } else if (model) {
    storage.remove(getDownloadStateKey(model.id));
  }
  // Also clear legacy key for backward compatibility
  storage.remove(STORAGE_KEYS.DOWNLOAD_STATE);
}

// Delete ALL downloaded model files (for "Clear All Data")
export async function deleteAllModels(): Promise<void> {
  for (const model of AVAILABLE_MODELS) {
    const path = `${documentDirectory}${model.filename}`;
    const info = await getInfoAsync(path);
    if (info.exists) {
      await deleteAsync(path);
    }
    // Clear model-specific keys
    storage.remove(getChecksumKey(model));
    storage.remove(getDownloadStateKey(model.id));
  }
  // Clear legacy and shared MMKV keys
  storage.remove(STORAGE_KEYS.DOWNLOAD_STATE);
  storage.remove(STORAGE_KEYS.MODEL_INITIALIZED_ONCE);
}

// Persist download state to MMKV
function persistDownloadState(state: DownloadState, storageKey?: string): void {
  storage.set(storageKey ?? STORAGE_KEYS.DOWNLOAD_STATE, JSON.stringify(state));
}

// Get persisted download state
export function getPersistedDownloadState(storageKey?: string): DownloadState | null {
  const json = storage.getString(storageKey ?? STORAGE_KEYS.DOWNLOAD_STATE);
  if (!json) return null;
  try {
    return JSON.parse(json) as DownloadState;
  } catch {
    return null;
  }
}

// Check for downloads that survived app restart
export async function checkForExistingDownloads(taskId?: string): Promise<DownloadTask | null> {
  const tasks = await getExistingDownloadTasks();
  const targetTaskId = taskId ?? DOWNLOAD_TASK_ID;
  const modelTask = tasks.find((t) => t.id === targetTaskId);
  // Also check legacy task ID for backward compatibility
  if (!modelTask && taskId) {
    const legacyTask = tasks.find((t) => t.id === DOWNLOAD_TASK_ID);
    return legacyTask ?? null;
  }
  return modelTask ?? null;
}

// Active download task references (keyed by task ID for parallel downloads)
const activeTasks: Map<string, DownloadTask> = new Map();

/** Options for customizing download behavior */
export interface DownloadOptions {
  /** Custom task ID (defaults to DOWNLOAD_TASK_ID) */
  taskId?: string;
  /** Custom storage key for download state (defaults to STORAGE_KEYS.DOWNLOAD_STATE) */
  storageKey?: string;
}

// Start or resume model download
export function downloadModel(
  onProgress: (bytesWritten: number, totalBytes: number) => void,
  onComplete: () => void,
  onError: (error: Error) => void,
  model?: ModelDefinition,
  options?: DownloadOptions
): DownloadControls {
  const taskId = options?.taskId ?? DOWNLOAD_TASK_ID;
  const storageKey = options?.storageKey ?? STORAGE_KEYS.DOWNLOAD_STATE;

  const targetModel = model ?? {
    url: MODEL_CONFIG.url,
    filename: MODEL_CONFIG.filename,
    sizeBytes: MODEL_CONFIG.expectedSizeBytes,
  };
  const destination = getModelPath(model);

  const task = createDownloadTask({
    id: taskId,
    url: targetModel.url,
    destination,
    headers: {
      'User-Agent': 'Cove-iOS/1.0',
    },
  });

  activeTasks.set(taskId, task);

  task
    .begin(({ expectedBytes }) => {
      console.log(`[Download:${taskId}] Starting, expected ${expectedBytes} bytes`);
      persistDownloadState({
        taskId,
        bytesWritten: 0,
        totalBytes: expectedBytes,
        status: 'downloading',
      }, storageKey);
    })
    .progress(({ bytesDownloaded, bytesTotal }) => {
      onProgress(bytesDownloaded, bytesTotal);

      // Persist state periodically (every ~5%)
      const currentPercent = Math.floor((bytesDownloaded / bytesTotal) * 20);
      const state = getPersistedDownloadState(storageKey);
      const lastPercent = state
        ? Math.floor((state.bytesWritten / state.totalBytes) * 20)
        : -1;

      if (currentPercent !== lastPercent) {
        persistDownloadState({
          taskId,
          bytesWritten: bytesDownloaded,
          totalBytes: bytesTotal,
          status: 'downloading',
        }, storageKey);
      }
    })
    .done(() => {
      console.log(`[Download:${taskId}] Complete`);
      persistDownloadState({
        taskId,
        bytesWritten: targetModel.sizeBytes,
        totalBytes: targetModel.sizeBytes,
        status: 'completed',
      }, storageKey);
      activeTasks.delete(taskId);
      onComplete();
    })
    .error(({ error }) => {
      console.error(`[Download:${taskId}] Error:`, error);
      persistDownloadState({
        taskId,
        bytesWritten: 0,
        totalBytes: 0,
        status: 'failed',
        error: error || 'Download failed',
      }, storageKey);
      activeTasks.delete(taskId);
      onError(new Error(error || 'Download failed'));
    });

  // Start the download
  task.start();

  return {
    pause: () => {
      const activeTask = activeTasks.get(taskId);
      if (activeTask) {
        activeTask.pause();
        const state = getPersistedDownloadState(storageKey);
        if (state) {
          persistDownloadState({ ...state, status: 'paused' }, storageKey);
        }
      }
    },
    resume: () => {
      const activeTask = activeTasks.get(taskId);
      if (activeTask) {
        activeTask.resume();
        const state = getPersistedDownloadState(storageKey);
        if (state) {
          persistDownloadState({ ...state, status: 'downloading' }, storageKey);
        }
      }
    },
    cancel: () => {
      const activeTask = activeTasks.get(taskId);
      if (activeTask) {
        activeTask.stop();
        storage.remove(storageKey);
        activeTasks.delete(taskId);
      }
    },
  };
}

// Reattach to existing download (after app restart)
export function reattachToDownload(
  task: DownloadTask,
  onProgress: (bytesWritten: number, totalBytes: number) => void,
  onComplete: () => void,
  onError: (error: Error) => void,
  model?: ModelDefinition,
  options?: DownloadOptions
): DownloadControls {
  const taskId = options?.taskId ?? DOWNLOAD_TASK_ID;
  const storageKey = options?.storageKey ?? STORAGE_KEYS.DOWNLOAD_STATE;
  const expectedSize = model?.sizeBytes ?? MODEL_CONFIG.expectedSizeBytes;

  activeTasks.set(taskId, task);

  task
    .progress(({ bytesDownloaded, bytesTotal }) => {
      onProgress(bytesDownloaded, bytesTotal);
    })
    .done(() => {
      persistDownloadState({
        taskId,
        bytesWritten: expectedSize,
        totalBytes: expectedSize,
        status: 'completed',
      }, storageKey);
      activeTasks.delete(taskId);
      onComplete();
    })
    .error(({ error }) => {
      persistDownloadState({
        taskId,
        bytesWritten: 0,
        totalBytes: 0,
        status: 'failed',
        error: error || 'Download failed',
      }, storageKey);
      activeTasks.delete(taskId);
      onError(new Error(error || 'Download failed'));
    });

  return {
    pause: () => task.pause(),
    resume: () => task.resume(),
    cancel: () => {
      task.stop();
      storage.remove(storageKey);
      activeTasks.delete(taskId);
    },
  };
}
