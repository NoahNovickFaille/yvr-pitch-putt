import { useCallback, useEffect, useState, useRef } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useConversationStore } from '../stores/conversationStore';
import { ChatService } from '../services/llm/ChatService';
import { CrisisResult } from '../services/safety/CrisisDetector';
import { ChatMessage } from '../types/chat';
import { generateSmartTitle } from '../services/conversation/ConversationTitleGenerator';

interface UseChatResult {
  messages: ChatMessage[];
  isGenerating: boolean;
  partialResponse: string;
  crisisModalVisible: boolean;
  pendingCrisisMessage: string | null;
  sendError: string | null;
  sendMessage: (content: string) => Promise<void>;
  dismissCrisisModal: () => void;
  continueAfterCrisis: () => Promise<void>;
  clearSendError: () => void;
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
    getConversation,
  } = useConversationStore();

  const [crisisModalVisible, setCrisisModalVisible] = useState(false);
  const [pendingCrisisMessage, setPendingCrisisMessage] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const titleGenerationInProgress = useRef(false);

  const clearSendError = useCallback(() => {
    setSendError(null);
  }, []);

  // Sync chatStore with active conversation from conversationStore
  useEffect(() => {
    switchConversation(activeConversationId);
  }, [activeConversationId, switchConversation]);

  const handleCrisis = useCallback((result: CrisisResult) => {
    console.log('[useChat] Crisis detected:', result);
    setCrisisModalVisible(true);
  }, []);

  /**
   * Trigger smart title generation if conversation is eligible.
   * Requirements: 3+ user messages, 3+ assistant messages, not already LLM-generated.
   * Fire-and-forget - does not block chat flow.
   */
  const maybeGenerateSmartTitle = useCallback(
    (conversationId: string, currentMessages: ChatMessage[]) => {
      // Skip if already generating
      if (titleGenerationInProgress.current) return;

      // Check conversation eligibility
      const conversation = getConversation(conversationId);
      if (!conversation || conversation.titleGeneratedByLLM) {
        return;
      }

      // Count user and assistant messages
      const userMessages = currentMessages.filter(m => m.role === 'user').length;
      const assistantMessages = currentMessages.filter(m => m.role === 'assistant').length;

      // Need at least 3 exchanges (3 user + 3 assistant messages)
      if (userMessages < 3 || assistantMessages < 3) {
        return;
      }

      console.log('[useChat] Triggering smart title generation');
      titleGenerationInProgress.current = true;

      // Fire-and-forget - don't await
      generateSmartTitle(currentMessages)
        .then((title) => {
          if (title) {
            updateConversationMetadata(conversationId, {
              title,
              titleGeneratedByLLM: true,
            });
            console.log('[useChat] Smart title applied:', title);
          }
        })
        .catch((error) => {
          console.error('[useChat] Smart title generation failed:', error);
        })
        .finally(() => {
          titleGenerationInProgress.current = false;
        });
    },
    [getConversation, updateConversationMetadata]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isGenerating) return;

      // Clear any previous error when attempting new message
      setSendError(null);

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
        // Pass null to avoid adding empty assistant message
        completeGeneration(null);
        return;
      }

      if (!result.success && result.error) {
        console.error('[useChat] Send failed:', result.error);
        // Reset generating state and show error to user
        // Pass null to avoid adding empty assistant message
        completeGeneration(null);
        setPendingCrisisMessage(null);
        setSendError(result.error);
      } else if (result.success && conversationId) {
        // Try to generate smart title after successful response
        // Get the latest messages from storage (includes new user + assistant messages)
        const updatedConversation = getConversation(conversationId);
        if (updatedConversation) {
          maybeGenerateSmartTitle(conversationId, updatedConversation.messages);
        }
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
      getConversation,
      maybeGenerateSmartTitle,
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
      // Pass null to avoid adding empty assistant message
      completeGeneration(null);
      setSendError(result.error);
    } else if (result.success && activeConversationId) {
      // Try to generate smart title after successful response
      const updatedConversation = getConversation(activeConversationId);
      if (updatedConversation) {
        maybeGenerateSmartTitle(activeConversationId, updatedConversation.messages);
      }
    }
  }, [
    pendingCrisisMessage,
    messages,
    addUserMessage,
    startGeneration,
    appendToken,
    completeGeneration,
    activeConversationId,
    getConversation,
    maybeGenerateSmartTitle,
  ]);

  return {
    messages,
    isGenerating,
    partialResponse,
    crisisModalVisible,
    pendingCrisisMessage,
    sendError,
    sendMessage,
    dismissCrisisModal,
    continueAfterCrisis,
    clearSendError,
  };
}
