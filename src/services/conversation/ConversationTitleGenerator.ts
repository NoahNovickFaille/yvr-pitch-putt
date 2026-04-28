/**
 * Conversation Title Generator
 *
 * Generates titles and previews for conversations based on messages.
 * Supports both simple (first message) and LLM-based smart title generation.
 */

import { ChatMessage } from '@/src/types/chat';
import { LLMService } from '../llm/LLMService';
import { parseJsonWithUnwrap } from '../llm/JsonUtils';

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
 * Title generation prompt with examples for 3B model.
 */
const TITLE_GENERATION_PROMPT = `Generate a short title (2-5 words) that captures the main topic of this conversation.

Rules:
- Be specific to the actual topic, not generic
- Use 2-5 words only
- Capitalize first letter of each word

Examples:
"I've been stressed about my job interview" → Job Interview Anxiety
"My partner and I keep arguing" → Relationship Arguments
"I lost my dog and I'm still sad" → Grieving Lost Pet
"Work has been overwhelming lately" → Work Stress Overwhelm
"I can't stop thinking about my ex" → Processing Breakup Feelings

Conversation:
`;

/**
 * JSON schema for title generation output.
 */
const TITLE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' }
  },
  required: ['title']
};

/**
 * Format messages for the title generation prompt.
 * Only includes first 6 exchanges to keep context manageable.
 */
function formatMessagesForTitlePrompt(messages: ChatMessage[]): string {
  const maxMessages = 12; // 6 exchanges (user + assistant)
  const truncated = messages.slice(0, maxMessages);

  return truncated
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');
}

/**
 * Validate generated title meets requirements.
 */
function isValidTitle(title: string): boolean {
  if (!title || typeof title !== 'string') return false;

  const trimmed = title.trim();
  const wordCount = trimmed.split(/\s+/).length;

  // Must be 2-5 words and not too long
  return wordCount >= 2 && wordCount <= 5 && trimmed.length <= 50;
}

/**
 * Generate a smarter title using LLM based on conversation history.
 * Uses low priority to avoid blocking chat messages.
 *
 * @param messages - Conversation messages to analyze
 * @returns Generated title or null on failure
 */
export async function generateSmartTitle(
  messages: ChatMessage[]
): Promise<string | null> {
  // Verify LLM is ready
  if (!LLMService.isReady()) {
    console.log('[TitleGenerator] LLM not ready, skipping title generation');
    return null;
  }

  try {
    // Build the prompt with conversation context
    const conversationText = formatMessagesForTitlePrompt(messages);
    const fullPrompt = `${TITLE_GENERATION_PROMPT}${conversationText}

Output JSON: {"title": "Your Title Here"}`;

    console.log('[TitleGenerator] Generating smart title...');

    const result = await LLMService.queuedCompletion(
      [
        { role: 'system', content: 'You are a helpful assistant that generates concise conversation titles.' },
        { role: 'user', content: fullPrompt }
      ],
      {
        response_format: {
          type: 'json_schema',
          json_schema: { schema: TITLE_SCHEMA }
        },
        n_predict: 50, // Short output for title
        temperature: 0.3, // Low temperature for consistency
        top_p: 0.9,
      },
      undefined, // No streaming needed
      'low' // Low priority - can be preempted by chat
    );

    // Parse the JSON response using shared utility
    console.log('[TitleGenerator] Raw response:', result.text);

    const parsed = parseJsonWithUnwrap<{ title: string }>(result.text);
    const title = parsed.title?.trim();

    // Validate the title
    if (!isValidTitle(title)) {
      console.log('[TitleGenerator] Invalid title generated:', title);
      return null;
    }

    console.log('[TitleGenerator] Generated title:', title);
    return title;
  } catch (error) {
    // Handle cancellation gracefully (preempted by high-priority chat)
    if (error instanceof Error && error.message.includes('cancelled')) {
      console.log('[TitleGenerator] Title generation cancelled (preempted by chat)');
      return null;
    }

    console.error('[TitleGenerator] Error generating title:', error);
    return null;
  }
}
