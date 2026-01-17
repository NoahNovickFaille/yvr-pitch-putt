import { createMMKV, type MMKV } from 'react-native-mmkv';

// Single MMKV instance for the app
export const storage: MMKV = createMMKV({
  id: 'cove-storage',
});

// Type-safe storage helpers
export const storageHelpers = {
  getString: (key: string): string | undefined => storage.getString(key),
  setString: (key: string, value: string): void => storage.set(key, value),
  getBoolean: (key: string): boolean => storage.getBoolean(key) ?? false,
  setBoolean: (key: string, value: boolean): void => storage.set(key, value),
  delete: (key: string): void => {
    storage.remove(key);
  },
};
