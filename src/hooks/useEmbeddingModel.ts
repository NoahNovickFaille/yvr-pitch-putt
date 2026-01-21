import { useState, useEffect, useCallback, useRef } from 'react';
import { getInfoAsync } from 'expo-file-system/legacy';
import {
  downloadModel,
  getPersistedDownloadState,
} from '../services/download/ModelDownloadService';
import {
  EMBEDDING_MODEL,
  getEmbeddingModelPath,
  EMBEDDING_STORAGE_KEYS,
} from '../constants/embedding';
import { storage } from '../storage/storage';
import { EmbeddingService } from '../services/embedding/EmbeddingService';
import type { EmbeddingServiceState } from '../types/embedding';
import type { DownloadControls } from '../types/model';
import type { ModelDefinition } from '../constants/model';

/**
 * State returned by useEmbeddingModel hook.
 */
export interface EmbeddingModelState {
  /** Whether the embedding model file is downloaded */
  isDownloaded: boolean;
  /** Whether a download is currently in progress */
  isDownloading: boolean;
  /** Download progress (0-100) */
  downloadProgress: number;
  /** Error message if download or init failed */
  error: string | null;
  /** Whether the EmbeddingService is initialized and ready */
  isReady: boolean;
  /** Current service status */
  status: EmbeddingServiceState['status'];
}

/**
 * Hook for managing embedding model download and initialization.
 *
 * This hook provides:
 * - Download state tracking for the embedding model
 * - Auto-initialization of EmbeddingService after download
 * - Service readiness state for UI feedback
 *
 * Usage:
 * ```tsx
 * const { isDownloaded, isReady, startDownload, downloadProgress } = useEmbeddingModel();
 *
 * if (!isDownloaded) {
 *   return <Button onPress={startDownload}>Download Embedding Model</Button>;
 * }
 *
 * if (!isReady) {
 *   return <Text>Initializing...</Text>;
 * }
 *
 * // Ready to use EmbeddingService.embed()
 * ```
 */
/**
 * Check if embedding model is marked as ready in storage.
 * This is a synchronous check for fast initial state.
 */
function isEmbeddingModelReady(): boolean {
  return storage.getString(EMBEDDING_STORAGE_KEYS.MODEL_READY) === 'true';
}

export function useEmbeddingModel() {
  // Use persisted state for initial value to avoid race conditions
  const [isDownloaded, setIsDownloaded] = useState(() => isEmbeddingModelReady());
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [serviceState, setServiceState] = useState<EmbeddingServiceState>(
    EmbeddingService.getState()
  );

  const controlsRef = useRef<DownloadControls | null>(null);
  const initAttemptedRef = useRef(false);
  const fileCheckCompleteRef = useRef(false);

  // Subscribe to EmbeddingService state changes
  useEffect(() => {
    const unsubscribe = EmbeddingService.subscribe((state) => {
      setServiceState(state);
    });
    return unsubscribe;
  }, []);

  // Verify file actually exists (async check to confirm persisted state)
  useEffect(() => {
    async function verifyFileExists() {
      // Only run once
      if (fileCheckCompleteRef.current) return;
      fileCheckCompleteRef.current = true;

      const modelPath = getEmbeddingModelPath();
      const info = await getInfoAsync(modelPath);

      const fileExists = info.exists && info.size && info.size >= EMBEDDING_MODEL.sizeBytes * 0.9;

      if (fileExists) {
        // File exists - mark as downloaded
        setIsDownloaded(true);
        storage.set(EMBEDDING_STORAGE_KEYS.MODEL_READY, 'true');

        // Auto-initialize if model is downloaded and service is idle
        if (!initAttemptedRef.current && serviceState.status === 'idle') {
          initAttemptedRef.current = true;
          try {
            await EmbeddingService.initialize();
          } catch (e) {
            // Error state will be set via subscription
            console.error('[useEmbeddingModel] Init failed:', e);
          }
        }
      } else {
        // File doesn't exist - clear persisted state and mark as not downloaded
        setIsDownloaded(false);
        storage.delete(EMBEDDING_STORAGE_KEYS.MODEL_READY);

        // Check for persisted download state
        const persistedState = getPersistedDownloadState();
        if (persistedState && persistedState.status === 'downloading') {
          // There was an interrupted download - don't auto-resume, let user decide
          setDownloadProgress(
            Math.round((persistedState.bytesWritten / persistedState.totalBytes) * 100)
          );
        }
      }
    }

    verifyFileExists();
  }, [serviceState.status]);

  // Auto-initialize when download completes
  useEffect(() => {
    async function autoInit() {
      if (isDownloaded && !initAttemptedRef.current && serviceState.status === 'idle') {
        initAttemptedRef.current = true;
        try {
          await EmbeddingService.initialize();
        } catch (e) {
          // Error state will be set via subscription
          console.error('[useEmbeddingModel] Auto-init failed:', e);
        }
      }
    }

    autoInit();
  }, [isDownloaded, serviceState.status]);

  /**
   * Start downloading the embedding model.
   */
  const startDownload = useCallback(() => {
    if (isDownloading) return;

    setIsDownloading(true);
    setDownloadProgress(0);
    setError(null);

    // Create model definition compatible with downloadModel
    // Cast to ModelDefinition - downloadModel only uses url, filename, sizeBytes internally
    const embeddingModelDef: ModelDefinition = {
      id: EMBEDDING_MODEL.id,
      name: EMBEDDING_MODEL.name,
      description: EMBEDDING_MODEL.description,
      quantization: 'Q4_K_M',
      parameterCount: '22M',
      sizeBytes: EMBEDDING_MODEL.sizeBytes,
      url: EMBEDDING_MODEL.url,
      filename: EMBEDDING_MODEL.filename,
      llm: {
        n_ctx: EMBEDDING_MODEL.llm.n_ctx,
        n_gpu_layers: EMBEDDING_MODEL.llm.n_gpu_layers,
        use_mlock: EMBEDDING_MODEL.llm.use_mlock,
      },
    };

    controlsRef.current = downloadModel(
      // onProgress
      (bytesWritten, totalBytes) => {
        const progress = Math.round((bytesWritten / totalBytes) * 100);
        setDownloadProgress(progress);
      },
      // onComplete
      async () => {
        setIsDownloading(false);
        setDownloadProgress(100);
        setIsDownloaded(true);

        // Mark as ready in storage
        storage.set(EMBEDDING_STORAGE_KEYS.MODEL_READY, 'true');

        // Auto-initialize after download
        initAttemptedRef.current = true;
        try {
          await EmbeddingService.initialize();
        } catch (e) {
          // Error will be reflected in serviceState
          console.error('[useEmbeddingModel] Init after download failed:', e);
        }
      },
      // onError
      (err) => {
        setIsDownloading(false);
        setError(err.message);
      },
      embeddingModelDef
    );
  }, [isDownloading]);

  /**
   * Pause the current download.
   */
  const pauseDownload = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.pause();
      setIsDownloading(false);
    }
  }, []);

  /**
   * Resume a paused download.
   */
  const resumeDownload = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.resume();
      setIsDownloading(true);
    }
  }, []);

  /**
   * Cancel the current download.
   */
  const cancelDownload = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.cancel();
      controlsRef.current = null;
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  }, []);

  /**
   * Retry initialization if it failed.
   */
  const retryInit = useCallback(async () => {
    if (isDownloaded) {
      EmbeddingService.resetError();
      initAttemptedRef.current = true;
      try {
        await EmbeddingService.initialize();
      } catch (e) {
        console.error('[useEmbeddingModel] Retry init failed:', e);
      }
    }
  }, [isDownloaded]);

  const state: EmbeddingModelState = {
    isDownloaded,
    isDownloading,
    downloadProgress,
    error: error || serviceState.error || null,
    isReady: serviceState.status === 'ready',
    status: serviceState.status,
  };

  return {
    ...state,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    retryInit,
  };
}
