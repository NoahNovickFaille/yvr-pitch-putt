import { LLMService } from '../llm/LLMService';
import { ChatMessage } from '../../types/chat';
import { ExtractionResult, MemoryType, MemoryCategory } from '../../types/memory';
import { MEMORY_EXTRACTION_PROMPT, MEMORY_EXTRACTION_SCHEMA } from './extractionPrompt';
import { LlamaContext } from 'llama.rn';

/**
 * Format conversation messages for memory extraction
 * @param messages - Array of chat messages
 * @param maxMessages - Maximum number of messages to include (default: 20)
 * @returns Formatted conversation text
 */
export function formatConversationForExtraction(
  messages: ChatMessage[],
  maxMessages: number = 20
): string {
  // Slice to last N messages to limit token usage
  const recentMessages = messages.slice(-maxMessages);

  // Format as "User: {content}\nAssistant: {content}\n..."
  return recentMessages
    .map((msg) => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      return `${role}: ${msg.content}`;
    })
    .join('\n\n');
}

/**
 * Retry extraction with explicit JSON instruction
 * @param conversationText - Formatted conversation text
 * @param context - LlamaContext for completion
 * @returns Array of extracted memories or empty array on failure
 */
async function retryExtraction(
  conversationText: string,
  context: LlamaContext
): Promise<ExtractionResult['memories']> {
  console.log('[MemoryExtractor] Retrying extraction with explicit JSON instruction');

  try {
    const result = await context.completion({
      messages: [
        { role: 'system', content: MEMORY_EXTRACTION_PROMPT },
        {
          role: 'user',
          content: `${conversationText}\n\nOutput valid JSON only. Your previous response was not valid JSON.`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { schema: MEMORY_EXTRACTION_SCHEMA }
      },
      n_predict: 512,
      temperature: 0.3,
      top_p: 0.9,
    });

    const parsed: ExtractionResult = JSON.parse(result.text);
    return parsed.memories || [];
  } catch (error) {
    console.error('[MemoryExtractor] Retry failed - returning empty array:', error);
    console.error('[MemoryExtractor] Raw retry output:', error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

/**
 * Extract memories from conversation using LLM with JSON schema
 * @param conversationText - Formatted conversation text (use formatConversationForExtraction)
 * @returns Promise resolving to array of extracted memories
 */
export async function extractMemories(
  conversationText: string
): Promise<ExtractionResult['memories']> {
  console.log('[MemoryExtractor] Starting extraction, text length:', conversationText.length);

  // Check if LLM is ready
  if (!LLMService.isReady()) {
    console.warn('[MemoryExtractor] LLM not ready - returning empty array');
    return [];
  }

  try {
    // Get context
    const context = LLMService.getContext();

    // Call completion with json_schema
    const result = await context.completion({
      messages: [
        { role: 'system', content: MEMORY_EXTRACTION_PROMPT },
        { role: 'user', content: conversationText }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { schema: MEMORY_EXTRACTION_SCHEMA }
      },
      n_predict: 512,        // Enough for ~8 memories
      temperature: 0.3,      // Lower for consistent extraction
      top_p: 0.9,
    });

    // Parse result with try-catch
    try {
      const parsed: ExtractionResult = JSON.parse(result.text);
      const memories = parsed.memories || [];
      console.log('[MemoryExtractor] Extraction complete - memories:', memories.length);
      return memories;
    } catch (parseError) {
      console.error('[MemoryExtractor] JSON parse failed:', parseError);
      console.error('[MemoryExtractor] Raw output:', result.text);

      // Retry once with explicit JSON instruction
      return await retryExtraction(conversationText, context);
    }
  } catch (error) {
    console.error('[MemoryExtractor] Extraction error:', error);
    return [];
  }
}
