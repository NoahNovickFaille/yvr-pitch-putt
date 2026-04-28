import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChatMessage } from '../../types/chat';
import { DarkColors, DarkSpacing, DarkTypography } from '@/constants/darkTheme';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: DarkSpacing.lg,
    paddingVertical: DarkSpacing.sm,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: DarkSpacing.lg,
    paddingVertical: DarkSpacing.md,
    borderRadius: DarkSpacing.radiusLg,
  },
  userBubble: {
    backgroundColor: DarkColors.userMessage,
    borderBottomRightRadius: DarkSpacing.xs,
  },
  assistantBubble: {
    backgroundColor: DarkColors.assistantMessage,
    borderBottomLeftRadius: DarkSpacing.xs,
  },
  text: {
    fontSize: DarkTypography.body,
    lineHeight: 22,
  },
  userText: {
    color: DarkColors.userMessageText,
  },
  assistantText: {
    color: DarkColors.assistantMessageText,
  },
});
