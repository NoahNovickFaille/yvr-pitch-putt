import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatHeader } from '../components/chat/ChatHeader';
import { MessageList } from '../components/chat/MessageList';
import { ChatInput } from '../components/chat/ChatInput';
import { CrisisModal } from '../components/modals/CrisisModal';
import { useChat } from '../hooks/useChat';
import { useMemoryExtraction } from '../hooks/useMemoryExtraction';
import { DarkColors } from '@/constants/darkTheme';

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
    sendMessage,
    continueAfterCrisis,
  } = useChat();

  // Memory extraction on conversation end and switch
  useMemoryExtraction();

  const handleDismissCrisis = () => {
    // When user dismisses after countdown, continue with the message
    continueAfterCrisis();
  };

  return (
    <View style={styles.container}>
      <ChatHeader />

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
        />

        <ChatInput
          onSend={sendMessage}
          disabled={false}
          isGenerating={isGenerating}
          bottomInset={insets.bottom}
          autoFocus={messages.length === 0}
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
});
