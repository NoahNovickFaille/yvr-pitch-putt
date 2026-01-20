import React, { useRef, useEffect } from 'react';
import { FlatList, StyleSheet, Keyboard } from 'react-native';
import { ChatMessage } from '../../types/chat';
import { MessageBubble } from './MessageBubble';
import { StreamingMessage } from './StreamingMessage';
import { TypingIndicator } from './TypingIndicator';
import { WelcomeMessage } from './WelcomeMessage';
import { DarkColors, DarkSpacing } from '@/constants/darkTheme';

interface MessageListProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  partialResponse: string;
  bottomPadding?: number;
}

export function MessageList({ messages, isGenerating, partialResponse, bottomPadding = 0 }: MessageListProps) {
  const listRef = useRef<FlatList>(null);
  const prevBottomPadding = useRef(bottomPadding);

  // Scroll to bottom when new messages arrive or during streaming
  useEffect(() => {
    if (messages.length > 0 || partialResponse) {
      // Small delay to ensure layout is complete
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, partialResponse]);

  // Scroll to bottom when keyboard opens to keep messages visible
  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => {
      showSubscription.remove();
    };
  }, []);

  // Scroll to bottom when input height increases (user typing more text)
  useEffect(() => {
    if (bottomPadding > prevBottomPadding.current && messages.length > 0) {
      // Small delay to ensure layout is complete after input resize
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
    prevBottomPadding.current = bottomPadding;
  }, [bottomPadding, messages.length]);

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

  const isEmpty = messages.length === 0 && !isGenerating && !partialResponse;

  return (
    <FlatList
      ref={listRef}
      style={styles.list}
      contentContainerStyle={[styles.content, isEmpty && styles.contentEmpty]}
      data={messages}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListFooterComponent={ListFooter}
      ListEmptyComponent={!isGenerating && !partialResponse ? WelcomeMessage : null}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: DarkColors.background,
  },
  content: {
    paddingVertical: DarkSpacing.lg,
  },
  contentEmpty: {
    flexGrow: 1,
  },
});
