import React from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { MessageList } from '../components/chat/MessageList';
import { ChatInput } from '../components/chat/ChatInput';
import { CrisisModal } from '../components/modals/CrisisModal';
import { useChat } from '../hooks/useChat';
import { useConversationEnd } from '../hooks/useConversationEnd';

export function ChatScreen() {
  const {
    messages,
    isGenerating,
    partialResponse,
    crisisModalVisible,
    sendMessage,
    dismissCrisisModal,
    continueAfterCrisis,
  } = useChat();

  // Memory extraction on conversation end
  useConversationEnd();

  const handleDismissCrisis = () => {
    // When user dismisses after countdown, continue with the message
    continueAfterCrisis();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <MessageList
        messages={messages}
        isGenerating={isGenerating}
        partialResponse={partialResponse}
      />

      <ChatInput
        onSend={sendMessage}
        disabled={false}
        isGenerating={isGenerating}
      />

      <CrisisModal
        visible={crisisModalVisible}
        onDismiss={handleDismissCrisis}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
