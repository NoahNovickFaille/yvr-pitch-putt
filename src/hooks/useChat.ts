import { useCallback, useEffect, useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import { ChatService } from '../services/llm/ChatService';
import { CrisisResult } from '../services/safety/CrisisDetector';
import { useConversationEnd } from './useConversationEnd';

interface UseChatResult {
  messages: ReturnType<typeof useChatStore>['messages'];
  isGenerating: boolean;
  partialResponse: string;
  crisisModalVisible: boolean;
  pendingCrisisMessage: string | null;
  sendMessage: (content: string) => Promise<void>;
  dismissCrisisModal: () => void;
  continueAfterCrisis: () => Promise<void>;
}

export function useChat(): UseChatResult {
  const {
    messages,
    isGenerating,
    partialResponse,
    addUserMessage,
    startGeneration,
    appendToken,
    completeGeneration,
    loadFromStorage,
    markConversationEnded,
  } = useChatStore();

  const [crisisModalVisible, setCrisisModalVisible] = useState(false);
  const [pendingCrisisMessage, setPendingCrisisMessage] = useState<string | null>(null);

  // Load messages from storage on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Mark conversation ended when app backgrounds
  useConversationEnd(markConversationEnded);

  const handleCrisis = useCallback((result: CrisisResult) => {
    console.log('[useChat] Crisis detected:', result);
    setCrisisModalVisible(true);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isGenerating) return;

      // Store the message in case of crisis (to send after acknowledgment)
      setPendingCrisisMessage(content);

      // Start generation UI state
      startGeneration();

      const result = await ChatService.sendMessage(content, {
        conversationHistory: messages,
        onToken: appendToken,
        onComplete: (fullText) => {
          // Add user message first, then complete with AI response
          addUserMessage(content);
          completeGeneration(fullText);
          setPendingCrisisMessage(null);
        },
        onCrisis: handleCrisis,
      });

      // If crisis was detected, generation was stopped
      if (result.crisis) {
        // Reset generating state since we didn't actually generate
        completeGeneration('');
        return;
      }

      if (!result.success && result.error) {
        console.error('[useChat] Send failed:', result.error);
        // Reset state on error
        completeGeneration('');
        setPendingCrisisMessage(null);
      }
    },
    [
      messages,
      isGenerating,
      addUserMessage,
      startGeneration,
      appendToken,
      completeGeneration,
      handleCrisis,
    ]
  );

  const dismissCrisisModal = useCallback(() => {
    setCrisisModalVisible(false);
  }, []);

  const continueAfterCrisis = useCallback(async () => {
    setCrisisModalVisible(false);

    if (!pendingCrisisMessage) return;

    const message = pendingCrisisMessage;
    setPendingCrisisMessage(null);

    // Send the message, skipping crisis detection this time
    startGeneration();
    addUserMessage(message);

    const result = await ChatService.continueAfterCrisis(message, {
      conversationHistory: messages,
      onToken: appendToken,
      onComplete: completeGeneration,
    });

    if (!result.success && result.error) {
      console.error('[useChat] Continue after crisis failed:', result.error);
      completeGeneration('');
    }
  }, [
    pendingCrisisMessage,
    messages,
    addUserMessage,
    startGeneration,
    appendToken,
    completeGeneration,
  ]);

  return {
    messages,
    isGenerating,
    partialResponse,
    crisisModalVisible,
    pendingCrisisMessage,
    sendMessage,
    dismissCrisisModal,
    continueAfterCrisis,
  };
}
