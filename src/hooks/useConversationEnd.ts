import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { MemoryOrchestrator } from '../services/memory/MemoryOrchestrator';
import { useChatStore } from '../stores/chatStore';

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
  const { markConversationEnded } = useChatStore();

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

          // Mark conversation ended (updates conversationMeta.endedAt)
          markConversationEnded();

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
  }, [markConversationEnded]);
}
