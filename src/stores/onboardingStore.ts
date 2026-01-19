import { create } from 'zustand';
import { storage } from '../storage/storage';

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';
const USER_NAME_KEY = 'user_name';
const USER_BIO_KEY = 'user_bio';

interface OnboardingState {
  completed: boolean;
  userName: string | null;
  userBio: string | null;
  completeOnboarding: (name: string, bio?: string) => void;
  updateProfile: (name: string, bio: string) => void;
  checkOnboardingStatus: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  completed: false,
  userName: null,
  userBio: null,

  completeOnboarding: (name: string, bio?: string) => {
    // CRITICAL: Persist to MMKV BEFORE updating state
    storage.set(ONBOARDING_COMPLETED_KEY, true);
    storage.set(USER_NAME_KEY, name);
    if (bio) {
      storage.set(USER_BIO_KEY, bio);
    }

    if (__DEV__) {
      console.log('[OnboardingStore] Onboarding completed for:', name, 'bio:', bio || '(none)');
    }

    set({ completed: true, userName: name, userBio: bio || null });
  },

  updateProfile: (name: string, bio: string) => {
    // CRITICAL: Persist to MMKV BEFORE updating state
    storage.set(USER_NAME_KEY, name);
    storage.set(USER_BIO_KEY, bio);

    if (__DEV__) {
      console.log('[OnboardingStore] Profile updated - name:', name, 'bio:', bio);
    }

    set({ userName: name, userBio: bio });
  },

  checkOnboardingStatus: () => {
    // Synchronous read from MMKV
    const completed = storage.getBoolean(ONBOARDING_COMPLETED_KEY) ?? false;
    const userName = storage.getString(USER_NAME_KEY) ?? null;
    const userBio = storage.getString(USER_BIO_KEY) ?? null;

    if (__DEV__) {
      console.log('[OnboardingStore] Status check - completed:', completed, 'userName:', userName, 'userBio:', userBio);
    }

    set({ completed, userName, userBio });
  },
}));
