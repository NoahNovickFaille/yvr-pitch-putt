import { LLMService } from './LLMService';
import { Memory } from '../../types/memory';
import { ChatMessage } from '../../types/chat';

/**
 * Token budget allocation for 4096 context window
 *
 * Total budget must stay under n_ctx (4096) to prevent truncation.
 * Llama 3.2 3B supports 128K context, but 4K balances memory usage and capacity.
 */
export const TOKEN_BUDGET = {
  total: 4096, // n_ctx from model config
  systemPrompt: 500, // Base personality prompt
  memories: 600, // 10-15 memories typically
  conversation: 2000, // Recent conversation turns (~20-30 messages)
  response: 900, // Max response tokens (n_predict)
  overhead: 96, // Formatting overhead buffer
} as const;

/**
 * Count tokens in text using actual tokenizer when available.
 * Falls back to rough estimate (4 chars per token) if model not loaded.
 */
export async function countTokens(text: string): Promise<number> {
  if (!LLMService.isReady()) {
    // Fallback: rough estimate (~4 chars per token)
    return Math.ceil(text.length / 4);
  }

  const context = LLMService.getContext();
  const result = await context.tokenize(text);
  return result.tokens.length;
}

/**
 * Build memory section within token budget.
 * Returns null if no memories or all memories exceed budget.
 *
 * Memories are added in order until budget exhausted.
 */
export async function buildMemorySectionWithinBudget(
  memories: Memory[],
  maxTokens: number
): Promise<string | null> {
  if (memories.length === 0) return null;

  let section = 'What you remember about this person:\n';
  let currentTokens = await countTokens(section);

  for (const memory of memories) {
    const line = `- ${memory.content}\n`;
    const lineTokens = await countTokens(line);

    if (currentTokens + lineTokens > maxTokens) break;

    section += line;
    currentTokens += lineTokens;
  }

  // If only header fits, return null (no actual memories)
  if (section === 'What you remember about this person:\n') {
    return null;
  }

  return section;
}

/**
 * Truncate conversation history to fit token budget.
 * Keeps most recent messages (processes newest to oldest).
 *
 * This ensures recent context is preserved over distant history.
 */
export async function truncateConversationHistory(
  messages: ChatMessage[],
  maxTokens: number
): Promise<ChatMessage[]> {
  const result: ChatMessage[] = [];
  let currentTokens = 0;

  // Process from newest to oldest (keep recent messages)
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const messageTokens = await countTokens(
      `${message.role}: ${message.content}`
    );

    if (currentTokens + messageTokens > maxTokens) break;

    result.unshift(message); // Add to front
    currentTokens += messageTokens;
  }

  return result;
}
