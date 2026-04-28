import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { MemoryOrchestrator } from '../services/memory/MemoryOrchestrator';
import { useConversationStore } from '../stores/conversationStore';
import { ExtractionQueue } from '../services/memory/ExtractionQueue';

/**
 * Hook for triggering memory extraction
 *
 * Triggers extraction when:
 * 1. App goes to background (existing behavior)
 * 2. User switches to a different conversation (new)
 *
 * Usage:
 * Call this hook in ChatScreen to ensure memory extraction happens
 * at appropriate times.
 *
 * @example
 * function ChatScreen() {
 *   useMemoryExtraction();
 *   // ... rest of component
 * }
 */
export function useMemoryExtraction(): void {
  const appState = useRef(AppState.currentState);
  const { activeConversationId, getConversation, saveConversation } = useConversationStore();
  const previousConversationId = useRef<string | null>(activeConversationId);

  /**
   * Trigger extraction for a specific conversation
   * Marks conversation as ended and initiates memory extraction
   *
   * @param conversationId - The conversation ID to extract memories from
   */
  const triggerExtractionForConversation = useCallback((conversationId: string): void => {
    const conversation = getConversation(conversationId);

    // Mark conversation as ended if not already
    if (conversation && !conversation.endedAt) {
      const updatedConversation = {
        ...conversation,
        endedAt: Date.now(),
      };
      saveConversation(updatedConversation);
    }

    // Trigger extraction (non-blocking, fire-and-forget with error handling)
    MemoryOrchestrator.extractAndStore(conversationId).catch((err) => {
      console.error('[useMemoryExtraction] Extraction error:', err);

      // Add to retry queue on error
      if (conversation && conversation.messages.length >= 2) {
        ExtractionQueue.add(conversationId, conversation.messages.length);
        console.log('[useMemoryExtraction] Added to retry queue due to error');
      }
    });
  }, [getConversation, saveConversation]);

  /**
   * Trigger extraction for the currently active conversation
   */
  const triggerExtractionForActiveConversation = useCallback((): void => {
    if (!activeConversationId) return;
    triggerExtractionForConversation(activeConversationId);
  }, [activeConversationId, triggerExtractionForConversation]);

  // Trigger 1: App backgrounding
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        // Detect app going to background
        if (
          appState.current === 'active' &&
          nextAppState.match(/inactive|background/)
        ) {
          console.log('[useMemoryExtraction] App backgrounding, triggering extraction');
          triggerExtractionForActiveConversation();
        }

        appState.current = nextAppState;
      }
    );

    return () => {
      subscription.remove();
    };
  }, [triggerExtractionForActiveConversation]);

  // Trigger 2: Conversation switching
  useEffect(() => {
    // Only trigger if we're switching AWAY from a previous conversation
    if (previousConversationId.current && previousConversationId.current !== activeConversationId) {
      console.log('[useMemoryExtraction] Conversation switched, extracting from', previousConversationId.current);
      triggerExtractionForConversation(previousConversationId.current);
    }

    // Update the ref for next comparison
    previousConversationId.current = activeConversationId;
  }, [activeConversationId, triggerExtractionForConversation]);
}
