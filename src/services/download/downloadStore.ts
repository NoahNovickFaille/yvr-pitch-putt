import { create } from 'zustand';
import type { ModelState } from '../../types/model';

interface DownloadStore {
  modelState: ModelState;
  setModelState: (state: ModelState) => void;

  // Computed helpers
  isDownloading: () => boolean;
  canInitialize: () => boolean;
}

export const useDownloadStore = create<DownloadStore>((set, get) => ({
  modelState: { status: 'not_downloaded' },

  setModelState: (state) => set({ modelState: state }),

  isDownloading: () => {
    const { modelState } = get();
    return modelState.status === 'downloading' || modelState.status === 'verifying';
  },

  canInitialize: () => {
    const { modelState } = get();
    return modelState.status === 'ready_to_initialize' || modelState.status === 'ready';
  },
}));
