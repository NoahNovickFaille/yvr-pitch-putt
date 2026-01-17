import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Mic, Send, Square } from 'lucide-react-native';
import { useSpeech } from '../../hooks/useSpeech';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isGenerating?: boolean;
}

export function ChatInput({ onSend, disabled, isGenerating }: ChatInputProps) {
  const [text, setText] = useState('');
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.micButton, isListening && styles.micButtonActive]}
          onPress={handleMicPress}
          disabled={disabled || isGenerating}
        >
          {isListening ? (
            <Square size={20} color="#FFFFFF" fill="#FFFFFF" />
          ) : (
            <Mic size={20} color={disabled ? '#C7C7CC' : '#007AFF'} />
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={displayText}
          onChangeText={setText}
          placeholder={isListening ? 'Listening...' : 'Message'}
          placeholderTextColor="#8E8E93"
          multiline
          maxLength={2000}
          editable={!disabled && !isGenerating && !isListening}
        />

        <TouchableOpacity
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <Send size={20} color={canSend ? '#FFFFFF' : '#C7C7CC'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonActive: {
    backgroundColor: '#FF3B30',
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 18,
    fontSize: 16,
    color: '#000000',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E5EA',
  },
});
