import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars are missing. Auth flows will run in local fallback mode.');
}

export const authRedirectUrl = Linking.createURL('/auth');

const memoryAuthStore = new Map<string, string>();

const inMemorySupabaseStorage = {
  getItem: async (key: string): Promise<string | null> => memoryAuthStore.get(key) ?? null,
  setItem: async (key: string, value: string): Promise<void> => {
    memoryAuthStore.set(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    memoryAuthStore.delete(key);
  },
};

const canUseAsyncStorage = (() => {
  try {
    return (
      typeof AsyncStorage?.getItem === 'function' &&
      typeof AsyncStorage?.setItem === 'function' &&
      typeof AsyncStorage?.removeItem === 'function'
    );
  } catch {
    return false;
  }
})();

const supabaseStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (!canUseAsyncStorage) return inMemorySupabaseStorage.getItem(key);
    try {
      const fromDisk = await AsyncStorage.getItem(key);
      // If disk is temporarily unavailable but we've seen a value in-memory this run,
      // use that cached value to avoid accidental auth drops.
      return fromDisk ?? (await inMemorySupabaseStorage.getItem(key));
    } catch {
      return inMemorySupabaseStorage.getItem(key);
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    // Keep an in-memory mirror so transient storage failures don't lose auth state.
    await inMemorySupabaseStorage.setItem(key, value);
    if (!canUseAsyncStorage) {
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Intentionally keep the in-memory value set above.
    }
  },
  removeItem: async (key: string): Promise<void> => {
    await inMemorySupabaseStorage.removeItem(key);
    if (!canUseAsyncStorage) {
      return;
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Intentionally keep the in-memory removal above.
    }
  },
};

if (!canUseAsyncStorage) {
  console.warn('[Supabase] AsyncStorage unavailable, using in-memory auth storage fallback.');
}

export const supabase = createClient(supabaseUrl ?? 'https://placeholder.supabase.co', supabaseAnonKey ?? 'placeholder', {
  auth: {
    storage: supabaseStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
