import React from 'react';
import { ConversationStarters } from './ConversationStarters';

interface WelcomeMessageProps {
  onSelectPrompt?: (message: string) => void;
}

export function WelcomeMessage({ onSelectPrompt }: WelcomeMessageProps) {
  const handleSelectPrompt = (message: string) => {
    if (onSelectPrompt) {
      onSelectPrompt(message);
    }
  };

  return <ConversationStarters onSelectPrompt={handleSelectPrompt} />;
}
