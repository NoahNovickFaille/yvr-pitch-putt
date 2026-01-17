import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Send } from 'lucide-react-native';
import { IconButton } from '@/src/components/ui';
import { DarkColors, DarkSpacing } from '@/constants/darkTheme';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isGenerating?: boolean;
  bottomInset?: number;
}

export function ChatInput({ onSend, disabled, isGenerating, bottomInset = 0 }: ChatInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleSend = useCallback(() => {
    const message = text.trim();
    if (message && !disabled && !isGenerating) {
      onSend(message);
      setText('');
      inputRef.current?.clear();
    }
  }, [text, onSend, disabled, isGenerating]);

  const canSend = text.trim().length > 0 && !disabled && !isGenerating;

  // Calculate bottom padding - minimum of 8, or safe area inset
  const bottomPadding = Math.max(8, bottomInset);

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      <View style={styles.inputRow}>
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            defaultValue=""
            value={text}
            onChangeText={setText}
            placeholder="Message"
            placeholderTextColor={DarkColors.textTertiary}
            multiline
            maxLength={2000}
            editable={!disabled && !isGenerating}
          />
        </View>

        <IconButton
          style={[styles.sendButton, canSend && styles.sendButtonActive]}
          onPress={handleSend}
          disabled={!canSend}
          accessibilityLabel="Send message"
        >
          <Send size={20} color={canSend ? DarkColors.textOnAccent : DarkColors.textTertiary} />
        </IconButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: DarkSpacing.md,
    paddingTop: DarkSpacing.sm,
    backgroundColor: DarkColors.background,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: DarkSpacing.sm,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: DarkColors.surfaceElevated,
    borderRadius: DarkSpacing.radiusLg,
    minHeight: 48,
    maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    paddingHorizontal: DarkSpacing.lg,
    paddingVertical: DarkSpacing.md,
    fontSize: 16,
    color: DarkColors.text,
    maxHeight: 120,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: DarkColors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: DarkColors.accent,
  },
});
