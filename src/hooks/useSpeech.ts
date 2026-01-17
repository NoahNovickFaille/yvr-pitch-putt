import { useState, useCallback } from 'react';
import { useSpeechRecognitionEvent } from '@jamsch/expo-speech-recognition';
import { SpeechService } from '../services/speech/SpeechService';

export interface UseSpeechResult {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  clear: () => void;
}

export function useSpeech(): UseSpeechResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    setError(null);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
    setInterimTranscript('');
  });

  useSpeechRecognitionEvent('result', (event) => {
    // Get the first (most confident) result
    const result = event.results[0];
    if (result) {
      if (event.isFinal) {
        setTranscript(result.transcript);
        setInterimTranscript('');
      } else {
        setInterimTranscript(result.transcript);
      }
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.error('[useSpeech] Error:', event.message);
    setError(event.message);
    setIsListening(false);
  });

  const start = useCallback(async () => {
    const hasPermission = await SpeechService.requestPermission();
    if (!hasPermission) {
      setError('Microphone permission denied');
      return;
    }
    setTranscript('');
    setInterimTranscript('');
    SpeechService.start();
  }, []);

  const stop = useCallback(() => {
    SpeechService.stop();
  }, []);

  const clear = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    clear,
  };
}
