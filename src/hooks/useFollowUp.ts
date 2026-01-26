import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useChatStore } from '../stores/chatStore';
import { useConversationStore } from '../stores/conversationStore';
import { useMemoryStore } from '../stores/memoryStore';
import { useOnboardingStore } from '../stores/onboardingStore';
import { LLMService } from '../services/llm/LLMService';
import { getBestDueFollowUp, markFollowUpDelivered } from '../services/followup/FollowUpRetrieval';
import {
  STOP_WORDS,
  buildSystemPromptWithStructuredMemories,
  buildFollowUpSection,
} from '../services/llm/systemPrompt';
import { retrieveMemories } from '../services/memory/SemanticRetrieval';

/** Cooldown between follow-up checks to avoid rapid re-checks on background/foreground cycles. */
const CHECK_COOLDOWN_MS = 30_000; // 30 seconds

/** Maximum time to wait for LLM readiness before giving up. */
const LLM_READY_TIMEOUT_MS = 5_000;

/** Polling interval when waiting for LLM readiness. */
const LLM_POLL_INTERVAL_MS = 500;

/** If the active conversation was created within this window, skip follow-up (user wants a blank slate). */
const NEW_CONVERSATION_THRESHOLD_MS = 2_000;

/**
 * Hook that checks for due follow-ups when the app becomes active.
 * If a follow-up is due and the conversation is empty, it triggers
 * the LLM to generate a natural opening message.
 *
 * Usage: Call in ChatScreen alongside useChat.
 */
export function useFollowUp(): void {
  const isGeneratingFollowUp = useRef(false);
  const hasCheckedThisSession = useRef(false);
  const lastCheckTime = useRef(0);
  const appState = useRef(AppState.currentState);

  const triggerFollowUp = async () => {
    // Guard: only one follow-up at a time
    if (isGeneratingFollowUp.current) return;

    // Guard: conversation must be empty (no messages yet)
    const messages = useChatStore.getState().messages;
    if (messages.length > 0) return;

    // Guard: must not already be generating
    if (useChatStore.getState().isGenerating) return;

    // Guard: skip if the active conversation was just created by the user (blank-slate intent)
    const activeConvId = useConversationStore.getState().activeConversationId;
    if (activeConvId) {
      const conversation = useConversationStore.getState().getConversation(activeConvId);
      if (conversation && (Date.now() - conversation.startedAt) < NEW_CONVERSATION_THRESHOLD_MS) {
        console.log('[useFollowUp] Conversation just created, skipping follow-up');
        return;
      }
    }

    // Check for due follow-up BEFORE starting generation (avoid UI flash on no follow-up)
    const followUp = getBestDueFollowUp();
    if (!followUp) return;

    isGeneratingFollowUp.current = true;

    try {
      console.log('[useFollowUp] Generating follow-up for:', followUp.topic);

      // Build system prompt with memories and follow-up section
      const { userName, userBio } = useOnboardingStore.getState();
      const allMemories = useMemoryStore.getState().memories;
      const memories = await retrieveMemories(followUp.topic, allMemories);

      let systemPrompt = await buildSystemPromptWithStructuredMemories(memories, userName, userBio);
      systemPrompt += buildFollowUpSection(followUp);

      // Start streaming UI right before the LLM call (Fix 10: no flash on earlier failures)
      const chatStore = useChatStore.getState();
      chatStore.startGeneration();

      // Race condition guard (Fix 3): re-check that no user messages appeared
      // between our earlier check and startGeneration()
      if (useChatStore.getState().messages.length > 0) {
        console.log('[useFollowUp] User sent a message during setup, aborting');
        useChatStore.getState().completeGeneration(null);
        return;
      }

      const llmMessages = [
        { role: 'system' as const, content: systemPrompt },
        // Synthetic trigger as a system instruction — reads naturally if echoed (Fix 8)
        { role: 'system' as const, content: '(The user just opened the app. Greet them with your follow-up check-in.)' },
      ];

      const result = await LLMService.queuedCompletion(
        llmMessages,
        {
          n_predict: 128,       // Short opening — 1-2 sentences
          stop: STOP_WORDS,
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40,
        },
        (data) => {
          useChatStore.getState().appendToken(data.token);
        },
        'low' // Lower priority than user-initiated chat
      );

      // Complete generation and add as assistant message
      useChatStore.getState().completeGeneration(result.text);

      // Mark follow-up as delivered
      const conversationId = useConversationStore.getState().activeConversationId;
      markFollowUpDelivered(followUp.id, conversationId ?? undefined);

      console.log('[useFollowUp] Follow-up delivered:', followUp.topic);
    } catch (error) {
      console.error('[useFollowUp] Failed to generate follow-up:', error);
      // Reset generation state on failure (only if we started it)
      useChatStore.getState().completeGeneration(null);
    } finally {
      isGeneratingFollowUp.current = false;
    }
  };

  /**
   * Wait for LLM readiness by polling, then trigger follow-up.
   * Replaces the fixed 3s delay with responsive polling (Fix 6).
   */
  const waitForLLMAndTrigger = () => {
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += LLM_POLL_INTERVAL_MS;

      if (LLMService.isReady()) {
        clearInterval(interval);
        triggerFollowUp();
        return;
      }

      if (elapsed >= LLM_READY_TIMEOUT_MS) {
        clearInterval(interval);
        console.log('[useFollowUp] LLM not ready after timeout, skipping follow-up');
      }
    }, LLM_POLL_INTERVAL_MS);

    return interval;
  };

  // Check on mount (once LLM is ready)
  useEffect(() => {
    if (hasCheckedThisSession.current) return;

    hasCheckedThisSession.current = true;
    lastCheckTime.current = Date.now();

    // If LLM is already ready, trigger immediately; otherwise poll
    if (LLMService.isReady()) {
      triggerFollowUp();
      return;
    }

    const interval = waitForLLMAndTrigger();
    return () => clearInterval(interval);
  }, []);

  // Check when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          // Cooldown guard (Fix 9): skip if checked recently
          const now = Date.now();
          if (now - lastCheckTime.current < CHECK_COOLDOWN_MS) {
            console.log('[useFollowUp] Cooldown active, skipping foreground check');
            appState.current = nextAppState;
            return;
          }

          lastCheckTime.current = now;
          hasCheckedThisSession.current = true;

          // If LLM is ready, trigger immediately; otherwise poll
          if (LLMService.isReady()) {
            triggerFollowUp();
          } else {
            waitForLLMAndTrigger();
          }
        }

        appState.current = nextAppState;
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);
}
