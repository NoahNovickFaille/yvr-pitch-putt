import { create } from 'zustand';
import { storage } from '../storage/storage';

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';
const USER_NAME_KEY = 'user_name';

interface OnboardingState {
  completed: boolean;
  userName: string | null;
  completeOnboarding: (name: string) => void;
  checkOnboardingStatus: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  completed: false,
  userName: null,

  completeOnboarding: (name: string) => {
    // CRITICAL: Persist to MMKV BEFORE updating state
    storage.set(ONBOARDING_COMPLETED_KEY, true);
    storage.set(USER_NAME_KEY, name);

    if (__DEV__) {
      console.log('[OnboardingStore] Onboarding completed for:', name);
    }

    set({ completed: true, userName: name });
  },

  checkOnboardingStatus: () => {
    // Synchronous read from MMKV
    const completed = storage.getBoolean(ONBOARDING_COMPLETED_KEY) ?? false;
    const userName = storage.getString(USER_NAME_KEY) ?? null;

    if (__DEV__) {
      console.log('[OnboardingStore] Status check - completed:', completed, 'userName:', userName);
    }

    set({ completed, userName });
  },
}));
