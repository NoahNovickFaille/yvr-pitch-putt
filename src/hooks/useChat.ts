import { useCallback, useEffect, useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useConversationStore } from '../stores/conversationStore';
import { ChatService } from '../services/llm/ChatService';
import { CrisisResult } from '../services/safety/CrisisDetector';
import { ChatMessage } from '../types/chat';

interface UseChatResult {
  messages: ChatMessage[];
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
    switchConversation,
  } = useChatStore();

  const {
    activeConversationId,
    createConversation,
    updateConversationMetadata,
  } = useConversationStore();

  const [crisisModalVisible, setCrisisModalVisible] = useState(false);
  const [pendingCrisisMessage, setPendingCrisisMessage] = useState<string | null>(null);

  // Sync chatStore with active conversation from conversationStore
  useEffect(() => {
    switchConversation(activeConversationId);
  }, [activeConversationId, switchConversation]);

  const handleCrisis = useCallback((result: CrisisResult) => {
    console.log('[useChat] Crisis detected:', result);
    setCrisisModalVisible(true);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isGenerating) return;

      // Create a new conversation if none exists
      let conversationId = activeConversationId;
      const isFirstMessage = messages.length === 0;

      if (!conversationId) {
        // Generate title and preview from first message with actual content
        const title = content.length > 50
          ? content.substring(0, 47).trim() + '...'
          : content.trim();
        const preview = content.length > 100
          ? content.substring(0, 97).trim() + '...'
          : content.trim();
        conversationId = createConversation(title, preview);
      } else if (isFirstMessage) {
        // Update title and preview for existing empty conversation
        const title = content.length > 50
          ? content.substring(0, 47).trim() + '...'
          : content.trim();
        const preview = content.length > 100
          ? content.substring(0, 97).trim() + '...'
          : content.trim();
        updateConversationMetadata(conversationId, { title, preview, lastMessageAt: Date.now() });
      } else {
        // Update existing conversation with latest message timestamp
        updateConversationMetadata(conversationId, { lastMessageAt: Date.now() });
      }

      // Store the message in case of crisis (to send after acknowledgment)
      setPendingCrisisMessage(content);

      // Start generation UI state and add user message immediately
      startGeneration();
      addUserMessage(content);

      const result = await ChatService.sendMessage(content, {
        conversationHistory: messages,
        onToken: appendToken,
        onComplete: (fullText) => {
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
      activeConversationId,
      addUserMessage,
      startGeneration,
      appendToken,
      completeGeneration,
      handleCrisis,
      createConversation,
      updateConversationMetadata,
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
