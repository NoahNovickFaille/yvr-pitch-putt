import React, { useState, useEffect } from 'react';
import { ModelSetupScreen } from '../../src/screens/ModelSetupScreen';
import { ChatScreen } from '../../src/screens/ChatScreen';
import { useDownloadStore } from '../../src/services/download/downloadStore';
import { useLLM } from '../../src/hooks/useLLM';

export default function HomeScreen() {
  const [setupComplete, setSetupComplete] = useState(false);
  const { modelState } = useDownloadStore();
  const { isReady, wasUnloaded, reinitialize } = useLLM();

  // Check if we need to show setup on mount
  useEffect(() => {
    // If model is already ready, skip setup
    if (isReady) {
      setSetupComplete(true);
    }
  }, [isReady]);

  // Handle model unloaded due to memory pressure
  useEffect(() => {
    if (wasUnloaded && setupComplete) {
      // Could auto-reinitialize, or prompt user
      // For now, auto-reinitialize
      reinitialize();
    }
  }, [wasUnloaded, setupComplete, reinitialize]);

  // Show setup screen if model not ready
  if (!setupComplete && !isReady) {
    return (
      <ModelSetupScreen
        onReady={() => setSetupComplete(true)}
      />
    );
  }

  // Show chat screen when model is ready
  return <ChatScreen />;
}
