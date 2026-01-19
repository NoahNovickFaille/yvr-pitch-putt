import { useCallback, useEffect, useRef } from 'react';
import { useDownloadStore } from '../services/download/downloadStore';
import { useModelStore } from '../stores/modelStore';
import { getModelById } from '../constants/model';
import type { ModelDefinition } from '../constants/model';
import {
  downloadModel,
  reattachToDownload,
  isModelDownloaded,
  verifyModelChecksum,
  checkForExistingDownloads,
  getPersistedDownloadState,
  deleteModelFile,
} from '../services/download/ModelDownloadService';
import type { DownloadControls } from '../types/model';

export function useModelDownload() {
  const { modelState, setModelState } = useDownloadStore();
  const selectedModelId = useModelStore((s) => s.selectedModelId);
  const model = getModelById(selectedModelId);
  const controlsRef = useRef<DownloadControls | null>(null);
  const modelRef = useRef<ModelDefinition | undefined>(model);

  // Keep model ref in sync
  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  // Check initial state on mount
  useEffect(() => {
    async function checkInitialState() {
      const currentModel = modelRef.current;

      // Check if model already downloaded
      const downloaded = await isModelDownloaded(currentModel);
      if (downloaded) {
        const verified = await verifyModelChecksum(currentModel);
        if (verified) {
          setModelState({ status: 'ready_to_initialize' });
          return;
        } else {
          // Corrupted file, delete and re-download
          await deleteModelFile(currentModel);
        }
      }

      // Check for existing download task (survived app restart)
      const existingTask = await checkForExistingDownloads();
      if (existingTask) {
        const persistedState = getPersistedDownloadState();
        const progress = persistedState
          ? persistedState.bytesWritten / persistedState.totalBytes
          : 0;

        setModelState({ status: 'downloading', progress });

        controlsRef.current = reattachToDownload(
          existingTask,
          (bytesWritten, totalBytes) => {
            setModelState({
              status: 'downloading',
              progress: bytesWritten / totalBytes,
            });
          },
          async () => {
            setModelState({ status: 'verifying' });
            const verified = await verifyModelChecksum(currentModel);
            if (verified) {
              setModelState({ status: 'ready_to_initialize' });
            } else {
              await deleteModelFile(currentModel);
              setModelState({
                status: 'error',
                error: 'Download verification failed. Please try again.',
              });
            }
          },
          (error) => {
            setModelState({ status: 'error', error: error.message });
          },
          currentModel
        );
        return;
      }

      // Check for persisted paused state
      const persistedState = getPersistedDownloadState();
      if (persistedState && persistedState.status === 'paused') {
        setModelState({
          status: 'download_paused',
          progress: persistedState.bytesWritten / persistedState.totalBytes,
        });
        return;
      }

      // No download in progress, model not downloaded
      setModelState({ status: 'not_downloaded' });
    }

    checkInitialState();
  }, [setModelState]);

  // Start download
  const startDownload = useCallback(() => {
    const currentModel = modelRef.current;
    setModelState({ status: 'downloading', progress: 0 });

    controlsRef.current = downloadModel(
      (bytesWritten, totalBytes) => {
        setModelState({
          status: 'downloading',
          progress: bytesWritten / totalBytes,
        });
      },
      async () => {
        setModelState({ status: 'verifying' });
        const verified = await verifyModelChecksum(currentModel);
        if (verified) {
          setModelState({ status: 'ready_to_initialize' });
        } else {
          await deleteModelFile(currentModel);
          setModelState({
            status: 'error',
            error: 'Download verification failed. Please try again.',
          });
        }
      },
      (error) => {
        setModelState({ status: 'error', error: error.message });
      },
      currentModel
    );
  }, [setModelState]);

  // Pause download
  const pauseDownload = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.pause();
      const currentState = modelState;
      if (currentState.status === 'downloading') {
        setModelState({
          status: 'download_paused',
          progress: currentState.progress,
        });
      }
    }
  }, [modelState, setModelState]);

  // Resume download
  const resumeDownload = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.resume();
      const currentState = modelState;
      if (currentState.status === 'download_paused') {
        setModelState({
          status: 'downloading',
          progress: currentState.progress,
        });
      }
    }
  }, [modelState, setModelState]);

  // Cancel download
  const cancelDownload = useCallback(async () => {
    if (controlsRef.current) {
      controlsRef.current.cancel();
      controlsRef.current = null;
    }
    await deleteModelFile(modelRef.current);
    setModelState({ status: 'not_downloaded' });
  }, [setModelState]);

  // Retry after error
  const retryDownload = useCallback(async () => {
    await deleteModelFile(modelRef.current);
    startDownload();
  }, [startDownload]);

  return {
    modelState,
    model,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    retryDownload,
  };
}
