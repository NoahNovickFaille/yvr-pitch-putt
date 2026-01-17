import { useCallback, useEffect, useState, useRef } from 'react';
import { Alert } from 'react-native';
import { LLMService, LLMState } from '../services/llm/LLMService';
import { setupMemoryMonitor } from '../services/llm/memoryMonitor';
import { useDownloadStore } from '../services/download/downloadStore';

export function useLLM() {
  const [llmState, setLLMState] = useState<LLMState>(LLMService.getState());
  const { modelState } = useDownloadStore();
  const memoryWarningShown = useRef(false);

  // Subscribe to LLM state changes
  useEffect(() => {
    const unsubscribe = LLMService.subscribe(setLLMState);
    return unsubscribe;
  }, []);

  // Set up memory monitor
  useEffect(() => {
    const cleanup = setupMemoryMonitor(() => {
      // Show alert only once per session
      if (!memoryWarningShown.current) {
        memoryWarningShown.current = true;
        Alert.alert(
          'Memory Low',
          'The AI model was unloaded to free memory. It will reload when you start chatting again.',
          [{ text: 'OK' }]
        );
      }
    });

    return cleanup;
  }, []);

  // Initialize model
  const initialize = useCallback(async () => {
    // Can only initialize if download is complete
    if (
      modelState.status !== 'ready_to_initialize' &&
      modelState.status !== 'ready' &&
      llmState.status !== 'unloaded'
    ) {
      console.warn('[useLLM] Cannot initialize - model not downloaded');
      return;
    }

    try {
      await LLMService.initialize();
    } catch (error) {
      // Error is already captured in LLMService state
      console.error('[useLLM] Initialization failed:', error);
    }
  }, [modelState.status, llmState.status]);

  // Retry initialization after error
  const retry = useCallback(() => {
    LLMService.resetError();
    initialize();
  }, [initialize]);

  // Re-initialize after memory warning unloaded the model
  const reinitialize = useCallback(() => {
    if (llmState.status === 'unloaded') {
      memoryWarningShown.current = false; // Allow showing warning again
      initialize();
    }
  }, [llmState.status, initialize]);

  // Computed states for UI
  const canInitialize =
    (modelState.status === 'ready_to_initialize' ||
      modelState.status === 'ready' ||
      llmState.status === 'unloaded') &&
    llmState.status !== 'initializing';

  const isReady = llmState.status === 'ready';
  const isInitializing = llmState.status === 'initializing';
  const hasError = llmState.status === 'error';
  const wasUnloaded = llmState.status === 'unloaded';

  return {
    llmState,
    initialize,
    retry,
    reinitialize,
    canInitialize,
    isReady,
    isInitializing,
    hasError,
    wasUnloaded,
    errorMessage: llmState.error,
  };
}
