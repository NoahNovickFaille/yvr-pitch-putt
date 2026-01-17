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

    // Process queue once LLM is ready and user is idle
    // We delay 10 seconds after LLM is ready to avoid conflicts with active chat
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let hasStartedProcessing = false;

    const checkLLMAndProcessQueue = async () => {
      // Skip if already processing
      if (ExtractionQueue.isCurrentlyProcessing()) {
        return;
      }

      if (LLMService.isReady()) {
        console.log('[RootLayout] LLM ready, attempting extraction queue processing');
        try {
          // processQueue() will internally check if user is active
          // If deferred, it returns immediately and we can try again later
          await ExtractionQueue.processQueue();

          // Only mark as done if queue is now empty (all items processed)
          if (ExtractionQueue.getQueueLength() === 0) {
            hasStartedProcessing = true;
            // Clear interval - we're done
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
          }
        } catch (error) {
          console.error('[RootLayout] Error processing extraction queue:', error);
        }
      }
    };

    // Wait 10 seconds before first attempt to give chat time to finish
    // This avoids cancelling extraction immediately when user resumes chatting
    const initialDelay = setTimeout(() => {
      checkLLMAndProcessQueue();

      // If LLM wasn't ready, retry every 10 seconds (up to 1 minute total)
      if (!hasStartedProcessing) {
        let retryCount = 0;
        const maxRetries = 6; // 6 retries * 10 seconds = 60 seconds additional

        intervalId = setInterval(() => {
          if (retryCount >= maxRetries || hasStartedProcessing) {
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
            if (retryCount >= maxRetries) {
              console.log('[RootLayout] Max retries reached for extraction queue processing');
            }
            return;
          }
          checkLLMAndProcessQueue();
          retryCount++;
        }, 10000);
      }
    }, 10000); // 10 second initial delay

    return () => {
      clearTimeout(initialDelay);
      if (intervalId) {
        clearInterval(intervalId);
      }
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
