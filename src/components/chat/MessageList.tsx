import React, { useRef, useEffect } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ChatMessage } from '../../types/chat';
import { MessageBubble } from './MessageBubble';
import { StreamingMessage } from './StreamingMessage';
import { TypingIndicator } from './TypingIndicator';

interface MessageListProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  partialResponse: string;
}

export function MessageList({ messages, isGenerating, partialResponse }: MessageListProps) {
  const listRef = useRef<FlatList>(null);

  // Scroll to bottom when new messages arrive or during streaming
  useEffect(() => {
    if (messages.length > 0 || partialResponse) {
      // Small delay to ensure layout is complete
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, partialResponse]);

  const renderItem = ({ item }: { item: ChatMessage }) => (
    <MessageBubble message={item} />
  );

  const keyExtractor = (item: ChatMessage) => item.id;

  const ListFooter = () => {
    if (isGenerating && !partialResponse) {
      // Show typing indicator before first token
      return <TypingIndicator />;
    }
    if (partialResponse) {
      // Show streaming message once tokens arrive
      return <StreamingMessage partialText={partialResponse} />;
    }
    return null;
  };

  return (
    <FlatList
      ref={listRef}
      style={styles.list}
      contentContainerStyle={styles.content}
      data={messages}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListFooterComponent={ListFooter}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    paddingVertical: 16,
  },
});
