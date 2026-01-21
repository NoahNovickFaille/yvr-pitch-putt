import { create } from 'zustand';
import { storage } from '../storage/storage';
import { DEFAULT_MODEL_ID } from '../constants/model';

const STORAGE_KEYS = {
  SELECTED_MODEL_ID: 'selected_model_id',
  DOWNLOADED_MODEL_IDS: 'downloaded_model_ids',
} as const;

interface ModelState {
  // State
  selectedModelId: string;
  downloadedModelIds: string[];

  // Actions
  selectModel: (modelId: string) => void;
  markModelDownloaded: (modelId: string) => void;
  removeModelFromDownloaded: (modelId: string) => void;
  isModelDownloaded: (modelId: string) => boolean;
  loadFromStorage: () => void;
  clearAllModelData: () => void;
}

export const useModelStore = create<ModelState>((set, get) => ({
  selectedModelId: DEFAULT_MODEL_ID,
  downloadedModelIds: [], // Start empty - actual downloaded models are verified against disk

  selectModel: (modelId: string) => {
    if (__DEV__) {
      console.log('[ModelStore] Selecting model:', modelId);
    }

    // Persist to MMKV first
    storage.set(STORAGE_KEYS.SELECTED_MODEL_ID, modelId);

    // Then update state
    set({ selectedModelId: modelId });
  },

  markModelDownloaded: (modelId: string) => {
    const state = get();
    if (state.downloadedModelIds.includes(modelId)) {
      return; // Already marked as downloaded
    }

    if (__DEV__) {
      console.log('[ModelStore] Marking model as downloaded:', modelId);
    }

    const newDownloadedIds = [...state.downloadedModelIds, modelId];

    // Persist to MMKV first
    storage.set(STORAGE_KEYS.DOWNLOADED_MODEL_IDS, JSON.stringify(newDownloadedIds));

    // Then update state
    set({ downloadedModelIds: newDownloadedIds });
  },

  removeModelFromDownloaded: (modelId: string) => {
    const state = get();
    if (!state.downloadedModelIds.includes(modelId)) {
      return; // Not in the list
    }

    if (__DEV__) {
      console.log('[ModelStore] Removing model from downloaded:', modelId);
    }

    const newDownloadedIds = state.downloadedModelIds.filter((id) => id !== modelId);

    // Persist to MMKV first
    storage.set(STORAGE_KEYS.DOWNLOADED_MODEL_IDS, JSON.stringify(newDownloadedIds));

    // Then update state
    set({ downloadedModelIds: newDownloadedIds });
  },

  isModelDownloaded: (modelId: string) => {
    return get().downloadedModelIds.includes(modelId);
  },

  loadFromStorage: () => {
    if (__DEV__) {
      console.log('[ModelStore] Loading from storage');
    }

    // Load selected model ID
    const storedModelId = storage.getString(STORAGE_KEYS.SELECTED_MODEL_ID);
    const selectedModelId = storedModelId || DEFAULT_MODEL_ID;

    // Load downloaded model IDs (actual verification against disk happens in ModelSelector)
    const storedDownloadedIds = storage.getString(STORAGE_KEYS.DOWNLOADED_MODEL_IDS);
    let downloadedModelIds: string[] = [];

    if (storedDownloadedIds) {
      try {
        const parsed = JSON.parse(storedDownloadedIds);
        if (Array.isArray(parsed)) {
          downloadedModelIds = parsed;
        }
      } catch {
        if (__DEV__) {
          console.warn('[ModelStore] Failed to parse downloaded model IDs');
        }
      }
    }

    if (__DEV__) {
      console.log('[ModelStore] Loaded state:', { selectedModelId, downloadedModelIds });
    }

    set({ selectedModelId, downloadedModelIds });
  },

  clearAllModelData: () => {
    if (__DEV__) {
      console.log('[ModelStore] Clearing all model data');
    }

    // Remove from storage first
    storage.remove(STORAGE_KEYS.SELECTED_MODEL_ID);
    storage.remove(STORAGE_KEYS.DOWNLOADED_MODEL_IDS);

    // Reset state to defaults
    set({ selectedModelId: DEFAULT_MODEL_ID, downloadedModelIds: [] });
  },
}));
