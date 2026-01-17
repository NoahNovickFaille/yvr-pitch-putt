/**
 * Conversation Title Generator
 *
 * Generates titles and previews for conversations based on messages.
 *
 * Current approach: Use first user message (truncated)
 * Future enhancement: Use LLM to generate smarter titles after 3-5 messages
 */

import { ChatMessage } from '@/src/types/chat';

/**
 * Generate a conversation title from the first user message
 */
export function generateTitleFromMessage(message: string): string {
  const trimmed = message.trim();

  if (trimmed.length === 0) {
    return 'New Conversation';
  }

  const title = trimmed.substring(0, 50);
  return title + (trimmed.length > 50 ? '...' : '');
}

/**
 * Generate a conversation preview from the first user message
 */
export function generatePreviewFromMessage(message: string): string {
  const trimmed = message.trim();

  if (trimmed.length === 0) {
    return 'Start a conversation...';
  }

  const preview = trimmed.substring(0, 100);
  return preview + (trimmed.length > 100 ? '...' : '');
}

/**
 * Generate title and preview from a list of messages
 */
export function generateTitleAndPreview(messages: ChatMessage[]): {
  title: string;
  preview: string;
} {
  const firstUserMessage = messages.find((msg) => msg.role === 'user');

  if (!firstUserMessage) {
    return {
      title: 'New Conversation',
      preview: 'Start a conversation...',
    };
  }

  return {
    title: generateTitleFromMessage(firstUserMessage.content),
    preview: generatePreviewFromMessage(firstUserMessage.content),
  };
}

/**
 * FUTURE: Generate a smarter title using LLM based on conversation history
 *
 * This would be called as a background task after 3-5 messages to generate
 * a more contextual title than just the first message.
 *
 * Example implementation:
 * ```typescript
 * export async function generateSmartTitle(
 *   messages: ChatMessage[]
 * ): Promise<string> {
 *   // Use LLM to analyze conversation and generate a concise title
 *   // Prompt: "Summarize this conversation in 3-5 words: {messages}"
 *   // Return generated title
 * }
 * ```
 */
