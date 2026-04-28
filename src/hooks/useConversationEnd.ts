import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { MemoryOrchestrator } from '../services/memory/MemoryOrchestrator';
import { useConversationStore } from '../stores/conversationStore';

/**
 * Hook for detecting conversation end and triggering memory extraction
 *
 * Behavior:
 * - Listens to AppState changes
 * - When app goes from active → background/inactive:
 *   * Marks conversation as ended (updates metadata)
 *   * Triggers memory extraction (non-blocking)
 * - Does NOT block app lifecycle (fire-and-forget)
 *
 * Usage:
 * Call this hook in ChatScreen or root App component to ensure
 * it's always active during conversation.
 *
 * @example
 * function ChatScreen() {
 *   useConversationEnd();
 *   // ... rest of component
 * }
 */
export function useConversationEnd(): void {
  const appState = useRef(AppState.currentState);
  const { activeConversationId, getConversation, saveConversation } = useConversationStore();

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        // Detect app going to background
        if (
          appState.current === 'active' &&
          nextAppState.match(/inactive|background/)
        ) {
          console.log('[useConversationEnd] App backgrounding, triggering extraction');

          // Mark conversation ended (updates conversation.endedAt)
          if (activeConversationId) {
            const conversation = getConversation(activeConversationId);
            if (conversation && !conversation.endedAt) {
              const updatedConversation = {
                ...conversation,
                endedAt: Date.now(),
              };
              saveConversation(updatedConversation);
            }
          }

          // Trigger extraction (non-blocking, fire-and-forget)
          MemoryOrchestrator.extractAndStore().catch((err) => {
            console.error('[useConversationEnd] Extraction error:', err);
          });
        }

        appState.current = nextAppState;
      }
    );

    return () => {
      subscription.remove();
    };
  }, [activeConversationId, getConversation, saveConversation]);
}
