import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Mic, Send, Square } from 'lucide-react-native';
import { useSpeech } from '../../hooks/useSpeech';
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
  const { isListening, transcript, interimTranscript, start, stop } = useSpeech();

  // Update text from speech transcript
  useEffect(() => {
    if (transcript) {
      setText(transcript);
    }
  }, [transcript]);

  // Show interim results while speaking
  const displayText = isListening && interimTranscript ? interimTranscript : text;

  const handleSend = useCallback(() => {
    const message = text.trim();
    if (message && !disabled && !isGenerating) {
      onSend(message);
      setText('');
      inputRef.current?.clear();
    }
  }, [text, onSend, disabled, isGenerating]);

  const handleMicPress = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  const canSend = text.trim().length > 0 && !disabled && !isGenerating;

  // Calculate bottom padding - minimum of 8, or safe area inset
  const bottomPadding = Math.max(8, bottomInset);

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      <View style={styles.inputRow}>
        <TouchableOpacity
          style={[styles.micButton, isListening && styles.micButtonActive]}
          onPress={handleMicPress}
          disabled={disabled || isGenerating}
        >
          {isListening ? (
            <Square size={18} color="#FFFFFF" fill="#FFFFFF" />
          ) : (
            <Mic size={18} color={disabled ? DarkColors.textTertiary : DarkColors.accent} />
          )}
        </TouchableOpacity>

        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            defaultValue=""
            value={displayText}
            onChangeText={setText}
            placeholder={isListening ? 'Listening...' : 'Message'}
            placeholderTextColor={DarkColors.textTertiary}
            multiline
            maxLength={2000}
            editable={!disabled && !isGenerating && !isListening}
          />
        </View>

        <TouchableOpacity
          style={[styles.sendButton, canSend && styles.sendButtonActive]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <Send size={18} color={canSend ? DarkColors.textOnAccent : DarkColors.textTertiary} />
        </TouchableOpacity>
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
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DarkColors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonActive: {
    backgroundColor: DarkColors.danger,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: DarkColors.surfaceElevated,
    borderRadius: DarkSpacing.radiusLg,
    minHeight: 40,
    maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    paddingHorizontal: DarkSpacing.lg,
    paddingVertical: DarkSpacing.sm,
    fontSize: 16,
    color: DarkColors.text,
    maxHeight: 120,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DarkColors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: DarkColors.accent,
  },
});
