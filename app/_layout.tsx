import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { useConversationStore } from '@/src/stores/conversationStore';
import { useMemoryStore } from '@/src/stores/memoryStore';
import { useChatStore } from '@/src/stores/chatStore';
import { migrateToMultiConversation } from '@/src/services/migration/conversationMigration';
import { DarkColors } from '@/constants/darkTheme';

export const unstable_settings = {
  anchor: '(drawer)',
};

// Custom dark theme for navigation
const AppDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: DarkColors.background,
    card: DarkColors.surface,
    text: DarkColors.text,
    border: DarkColors.border,
    primary: DarkColors.accent,
  },
};

export default function RootLayout() {
  // Load persisted data on app startup
  useEffect(() => {
    console.log('[RootLayout] Running migration if needed');
    // CRITICAL: Run migration BEFORE loading stores
    migrateToMultiConversation();

    console.log('[RootLayout] Initializing stores from storage');
    useConversationStore.getState().loadConversations();
    useMemoryStore.getState().loadFromStorage();

    // Load active conversation into chatStore
    const activeId = useConversationStore.getState().activeConversationId;
    if (activeId) {
      console.log('[RootLayout] Loading active conversation:', activeId);
      useChatStore.getState().switchConversation(activeId);
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: DarkColors.background }}>
      <KeyboardProvider>
        <ThemeProvider value={AppDarkTheme}>
          <Slot />
          <StatusBar style="light" />
        </ThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
