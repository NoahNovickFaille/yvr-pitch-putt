import React from 'react';
import { ModelSetupScreen } from '@/src/screens/ModelSetupScreen';
import { ChatScreen } from '@/src/screens/ChatScreen';
import { useDownloadStore } from '@/src/services/download/downloadStore';

/**
 * Chat route that handles model download and chat display.
 *
 * Logic:
 * - If model download is NOT complete → show ModelSetupScreen (handles download UI)
 * - If model download IS complete → show ChatScreen (handles LLM init states)
 *
 * ChatScreen manages its own loading states (initializing, error, etc.)
 * so users can see their conversation history while LLM warms up.
 */
export default function ChatRoute() {
  const { modelState } = useDownloadStore();

  // States that indicate download is not yet complete
  const downloadInProgress =
    modelState.status === 'not_downloaded' ||
    modelState.status === 'downloading' ||
    modelState.status === 'download_paused' ||
    modelState.status === 'verifying' ||
    modelState.status === 'error';

  // Show download/setup screen if model isn't ready
  if (downloadInProgress) {
    return (
      <ModelSetupScreen
        onReady={() => {
          // ModelSetupScreen will call onReady when LLM is initialized
          // Since we're now using download state, this is a no-op
          // ChatScreen handles the LLM initialization flow
        }}
      />
    );
  }

  // Model is downloaded - ChatScreen handles LLM init and chat
  return <ChatScreen />;
}
