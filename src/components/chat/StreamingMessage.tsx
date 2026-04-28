import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DarkColors, DarkSpacing, DarkTypography } from '@/constants/darkTheme';

interface StreamingMessageProps {
  partialText: string;
}

export function StreamingMessage({ partialText }: StreamingMessageProps) {
  if (!partialText) return null;

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Text style={styles.text}>{partialText}</Text>
        <View style={styles.cursor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: DarkSpacing.lg,
    paddingVertical: DarkSpacing.xs,
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: DarkSpacing.lg,
    paddingVertical: DarkSpacing.md,
    borderRadius: DarkSpacing.radiusLg,
    borderBottomLeftRadius: DarkSpacing.xs,
    backgroundColor: DarkColors.assistantMessage,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  text: {
    fontSize: DarkTypography.body,
    lineHeight: 22,
    color: DarkColors.assistantMessageText,
    flex: 1,
  },
  cursor: {
    width: 2,
    height: 16,
    backgroundColor: DarkColors.accent,
    marginLeft: 2,
    opacity: 0.8,
  },
});
