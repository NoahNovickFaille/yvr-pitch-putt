import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
    paddingHorizontal: 16,
    paddingVertical: 4,
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    backgroundColor: '#E9E9EB',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
    color: '#000000',
    flex: 1,
  },
  cursor: {
    width: 2,
    height: 16,
    backgroundColor: '#007AFF',
    marginLeft: 2,
    opacity: 0.7,
  },
});
