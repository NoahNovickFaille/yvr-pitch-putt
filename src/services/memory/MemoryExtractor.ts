import { ChatMessage } from '../../types/chat';
import { ExtractionResult, } from '../../types/memory';
import { parseJsonWithUnwrap } from '../llm/JsonUtils';
import { LLMService } from '../llm/LLMService';
import { MEMORY_EXTRACTION_PROMPT, MEMORY_EXTRACTION_SCHEMA } from './extractionPrompt';

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
 * @returns Array of extracted memories or empty array on failure
 */
async function retryExtraction(
  conversationText: string
): Promise<ExtractionResult['memories']> {
  console.log('[MemoryExtractor] Retrying extraction with explicit JSON instruction');

  try {
    const result = await LLMService.queuedCompletion(
      [
        { role: 'system', content: MEMORY_EXTRACTION_PROMPT },
        {
          role: 'user',
          content: `${conversationText}\n\nOutput valid JSON only. Your previous response was not valid JSON.`
        }
      ],
      {
        response_format: {
          type: 'json_schema',
          json_schema: { schema: MEMORY_EXTRACTION_SCHEMA }
        },
        n_predict: 256, // Reduced for simpler schema
        temperature: 0.5, // Slightly higher to avoid constraint gridlock
        top_p: 0.9,
      },
      undefined, // No streaming for extraction
      'low' // Memory extraction has LOW priority
    );

    console.log('[MemoryExtractor] Retry raw LLM output:', result.text);

    const parsed: ExtractionResult = parseJsonWithUnwrap<ExtractionResult>(result.text);
    const memories = parsed.memories || [];
    console.log('[MemoryExtractor] Retry extraction complete - memories:', memories.length);
    return memories;
  } catch (error) {
    // Re-throw cancellation errors so ExtractionQueue can handle them properly
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('Cancelled by higher priority task')) {
      console.log('[MemoryExtractor] Retry cancelled by higher priority task');
      throw error;
    }

    console.error('[MemoryExtractor] Retry failed - returning empty array:', error);
    return [];
  }
}

/**
 * Extract memories from conversation using LLM with JSON schema
 * Optimized for small (3B) models with simplified prompt and schema
 * @param conversationText - Formatted conversation text (use formatConversationForExtraction)
 * @returns Promise resolving to array of extracted memories
 */
export async function extractMemories(
  conversationText: string
): Promise<ExtractionResult['memories']> {
  console.log('[MemoryExtractor] Starting extraction, text length:', conversationText.length);
  console.log('[MemoryExtractor] Conversation text:', conversationText.substring(0, 500) + (conversationText.length > 500 ? '...' : ''));

  // Check if LLM is ready
  if (!LLMService.isReady()) {
    console.warn('[MemoryExtractor] LLM not ready - returning empty array');
    return [];
  }

  try {
    // Call completion with json_schema via queue for concurrency safety
    const result = await LLMService.queuedCompletion(
      [
        { role: 'system', content: MEMORY_EXTRACTION_PROMPT },
        { role: 'user', content: conversationText }
      ],
      {
        response_format: {
          type: 'json_schema',
          json_schema: { schema: MEMORY_EXTRACTION_SCHEMA }
        },
        n_predict: 256, // Reduced for simpler output
        temperature: 0.5, // Slightly higher to avoid constraint gridlock
        top_p: 0.9,
      },
      undefined, // No streaming for extraction
      'low' // Memory extraction has LOW priority (can be preempted by chat)
    );

    // Log raw output for debugging
    console.log('[MemoryExtractor] Raw LLM output:', result.text);

    // Parse result with try-catch and markdown unwrapping
    try {
      const parsed: ExtractionResult = parseJsonWithUnwrap<ExtractionResult>(result.text);
      const memories = parsed.memories || [];
      console.log('[MemoryExtractor] Extraction complete - memories:', memories.length);

      // Log extracted memories for debugging
      if (memories.length > 0) {
        console.log('[MemoryExtractor] Extracted memories:', JSON.stringify(memories, null, 2));
      } else {
        console.log('[MemoryExtractor] No memories extracted from conversation');
      }

      return memories;
    } catch (parseError) {
      console.error('[MemoryExtractor] JSON parse failed:', parseError);
      console.error('[MemoryExtractor] Raw output was:', result.text);

      // Retry once with explicit JSON instruction
      return await retryExtraction(conversationText);
    }
  } catch (error) {
    // Re-throw cancellation errors so ExtractionQueue can handle them properly
    // (cancellations shouldn't count as retries)
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('Cancelled by higher priority task')) {
      console.log('[MemoryExtractor] Extraction cancelled by higher priority task');
      throw error;
    }

    console.error('[MemoryExtractor] Extraction error:', error);
    return [];
  }
}
