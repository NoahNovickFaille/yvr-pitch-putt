import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatHeader } from '../components/chat/ChatHeader';
import { MessageList } from '../components/chat/MessageList';
import { ChatInput } from '../components/chat/ChatInput';
import { CrisisModal } from '../components/modals/CrisisModal';
import { useChat } from '../hooks/useChat';
import { useLLM } from '../hooks/useLLM';
import { useMemoryExtraction } from '../hooks/useMemoryExtraction';
import { useFollowUp } from '../hooks/useFollowUp';
import { DarkColors, DarkSpacing } from '@/constants/darkTheme';

export function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [inputHeight, setInputHeight] = useState(0);

  const handleInputHeightChange = useCallback((height: number) => {
    setInputHeight(height);
  }, []);

  const {
    messages,
    isGenerating,
    partialResponse,
    crisisModalVisible,
    sendError,
    sendMessage,
    continueAfterCrisis,
    clearSendError,
  } = useChat();

  const {
    isReady: llmIsReady,
    isInitializing: llmIsInitializing,
    hasError: llmHasError,
    errorMessage: llmErrorMessage,
    initialize: llmInitialize,
    retry: llmRetry,
  } = useLLM();

  // Auto-initialize LLM if not ready
  // This handles both first init (after download) and re-init (after memory unload)
  useEffect(() => {
    if (!llmIsReady && !llmIsInitializing && !llmHasError) {
      llmInitialize();
    }
  }, [llmIsReady, llmIsInitializing, llmHasError, llmInitialize]);

  // Clear send error after a delay
  useEffect(() => {
    if (sendError) {
      const timer = setTimeout(clearSendError, 5000);
      return () => clearTimeout(timer);
    }
  }, [sendError, clearSendError]);

  // Memory extraction on conversation end and switch
  useMemoryExtraction();

  // Follow-up check on app foreground (generates opening message if due)
  useFollowUp();

  const handleDismissCrisis = () => {
    // When user dismisses after countdown, continue with the message
    continueAfterCrisis();
  };

  // Determine if input should be disabled
  const inputDisabled = !llmIsReady || llmHasError;

  // Render status banner based on LLM state
  const renderStatusBanner = () => {
    // LLM is initializing/loading
    if (llmIsInitializing) {
      return (
        <View style={styles.statusBanner}>
          <ActivityIndicator size="small" color={DarkColors.accent} />
          <Text style={styles.statusText}>AI is warming up...</Text>
        </View>
      );
    }

    // LLM has error
    if (llmHasError) {
      return (
        <View style={[styles.statusBanner, styles.statusBannerError]}>
          <Text style={styles.statusTextError}>
            {llmErrorMessage || 'Failed to load AI model'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={llmRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Send error (LLM was not ready when user tried to send)
    if (sendError) {
      return (
        <View style={[styles.statusBanner, styles.statusBannerWarning]}>
          <Text style={styles.statusTextWarning}>{sendError}</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <ChatHeader />

      {renderStatusBanner()}

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <MessageList
          messages={messages}
          isGenerating={isGenerating}
          partialResponse={partialResponse}
          bottomPadding={inputHeight}
          onSelectPrompt={sendMessage}
        />

        <ChatInput
          onSend={sendMessage}
          disabled={inputDisabled}
          isGenerating={isGenerating}
          bottomInset={insets.bottom}
          onHeightChange={handleInputHeightChange}
        />
      </KeyboardAvoidingView>

      <CrisisModal
        visible={crisisModalVisible}
        onDismiss={handleDismissCrisis}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DarkColors.background,
  },
  keyboardView: {
    flex: 1,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: DarkSpacing.sm,
    paddingHorizontal: DarkSpacing.md,
    backgroundColor: DarkColors.surface,
    gap: DarkSpacing.sm,
  },
  statusBannerError: {
    backgroundColor: DarkColors.dangerMuted,
  },
  statusBannerWarning: {
    backgroundColor: DarkColors.accentMuted,
  },
  statusText: {
    color: DarkColors.textSecondary,
    fontSize: 14,
  },
  statusTextError: {
    color: DarkColors.danger,
    fontSize: 14,
    flex: 1,
  },
  statusTextWarning: {
    color: DarkColors.accent,
    fontSize: 14,
  },
  retryButton: {
    paddingVertical: DarkSpacing.xs,
    paddingHorizontal: DarkSpacing.md,
    backgroundColor: DarkColors.danger,
    borderRadius: DarkSpacing.radiusSm,
  },
  retryButtonText: {
    color: DarkColors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
