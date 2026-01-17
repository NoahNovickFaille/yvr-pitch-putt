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
import { ExtractionQueue } from '@/src/services/memory/ExtractionQueue';
import { LLMService } from '@/src/services/llm/LLMService';
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

    // Load extraction queue and process pending extractions once LLM is ready
    console.log('[RootLayout] Loading extraction queue');
    ExtractionQueue.loadFromStorage();

    // Process queue once LLM is ready
    // Retry every 5 seconds until LLM is ready (max 1 minute)
    const checkLLMAndProcessQueue = async () => {
      if (LLMService.isReady()) {
        console.log('[RootLayout] LLM ready, processing extraction queue');
        try {
          await ExtractionQueue.processQueue();
        } catch (error) {
          console.error('[RootLayout] Error processing extraction queue:', error);
        }
      }
    };

    const maxRetries = 12; // 12 retries * 5 seconds = 60 seconds
    let retryCount = 0;
    const interval = setInterval(() => {
      if (retryCount >= maxRetries) {
        console.log('[RootLayout] Max retries reached for extraction queue processing');
        clearInterval(interval);
        return;
      }
      checkLLMAndProcessQueue();
      retryCount++;
    }, 5000);

    // Also try immediately in case LLM is already ready
    checkLLMAndProcessQueue();

    return () => {
      clearInterval(interval);
    };
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
