import { LLMService } from './LLMService';
import { detectCrisis, CrisisResult } from '../safety/CrisisDetector';
import { SYSTEM_PROMPT, STOP_WORDS, buildSystemPromptWithMemories } from './systemPrompt';
import { ChatMessage } from '../../types/chat';
import { useMemoryStore } from '../../stores/memoryStore';
import {
  TOKEN_BUDGET,
  truncateConversationHistory,
  buildMemorySectionWithinBudget,
  countTokens,
} from './TokenBudget';

export interface SendMessageOptions {
  conversationHistory: ChatMessage[];
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onCrisis: (result: CrisisResult) => void;
}

export interface SendMessageResult {
  crisis: CrisisResult | null;
  success: boolean;
  error?: string;
}

class ChatServiceImpl {
  /**
   * Build prompt with memories and conversation history within token budget.
   * Returns system prompt and truncated message history.
   */
  private async buildPromptWithMemories(
    userMessage: string,
    conversationHistory: ChatMessage[]
  ): Promise<{
    systemPrompt: string;
    messages: { role: 'user' | 'assistant'; content: string }[];
  }> {
    // Step 1: Get relevant memories
    const memories = useMemoryStore.getState().getTopMemories(6, userMessage);

    // Step 2: Mark memories as accessed (reinforces them)
    if (memories.length > 0) {
      useMemoryStore.getState().markAccessed(memories.map((m) => m.id));
    }

    // Step 3: Build memory section within budget
    const memorySection = await buildMemorySectionWithinBudget(
      memories,
      TOKEN_BUDGET.memories
    );

    // Step 4: Build system prompt with memories
    const systemPrompt = buildSystemPromptWithMemories(memorySection);

    // Step 5: Truncate conversation history to fit budget
    const truncatedHistory = await truncateConversationHistory(
      conversationHistory,
      TOKEN_BUDGET.conversation
    );

    // Log budget usage in dev
    if (__DEV__) {
      const systemTokens = await countTokens(systemPrompt);
      console.log('[ChatService] Token budget:', {
        system: systemTokens,
        memories: memories.length,
        history: truncatedHistory.length,
      });
    }

    return {
      systemPrompt,
      messages: truncatedHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    };
  }

  /**
   * Send a user message and get streaming AI response.
   *
   * CRITICAL: Crisis detection runs BEFORE sending to model.
   * If crisis detected, onCrisis is called and function returns immediately.
   * Caller decides whether to proceed after crisis acknowledgment.
   */
  async sendMessage(
    userMessage: string,
    options: SendMessageOptions
  ): Promise<SendMessageResult> {
    const { conversationHistory, onToken, onComplete, onCrisis } = options;

    // Step 1: Crisis detection BEFORE sending to model
    const crisisResult = detectCrisis(userMessage);
    if (crisisResult.detected) {
      console.log('[ChatService] Crisis detected:', crisisResult);
      onCrisis(crisisResult);
      return { crisis: crisisResult, success: false };
    }

    // Step 2: Verify LLM is ready
    if (!LLMService.isReady()) {
      const error = 'AI model not ready. Please wait for initialization.';
      console.error('[ChatService]', error);
      return { crisis: null, success: false, error };
    }

    // Step 3: Build message array with system prompt and memories
    const { systemPrompt, messages: historyMessages } =
      await this.buildPromptWithMemories(userMessage, conversationHistory);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...historyMessages,
      { role: 'user' as const, content: userMessage },
    ];

    // Step 4: Get context and generate response with streaming
    try {
      const context = LLMService.getContext();

      console.log('[ChatService] Starting completion with', messages.length, 'messages');

      const result = await context.completion(
        {
          messages,
          n_predict: 512,        // Max tokens to generate
          stop: STOP_WORDS,      // Clean endings
          temperature: 0.7,      // Slightly creative for empathy
          top_p: 0.9,
          top_k: 40,
        },
        (data) => {
          // Partial completion callback - fires for each token
          onToken(data.token);
        }
      );

      console.log('[ChatService] Completion finished:', result.text.length, 'chars');
      onComplete(result.text);

      return { crisis: null, success: true };
    } catch (error) {
      console.error('[ChatService] Completion error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during AI response';
      return { crisis: null, success: false, error: errorMessage };
    }
  }

  /**
   * Continue conversation after crisis acknowledgment.
   * Same as sendMessage but skips crisis detection (user already acknowledged).
   */
  async continueAfterCrisis(
    userMessage: string,
    options: Omit<SendMessageOptions, 'onCrisis'>
  ): Promise<Omit<SendMessageResult, 'crisis'>> {
    const { conversationHistory, onToken, onComplete } = options;

    if (!LLMService.isReady()) {
      return { success: false, error: 'AI model not ready.' };
    }

    // Build message array with system prompt and memories
    const { systemPrompt, messages: historyMessages } =
      await this.buildPromptWithMemories(userMessage, conversationHistory);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...historyMessages,
      { role: 'user' as const, content: userMessage },
    ];

    try {
      const context = LLMService.getContext();

      const result = await context.completion(
        {
          messages,
          n_predict: 512,
          stop: STOP_WORDS,
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40,
        },
        (data) => {
          onToken(data.token);
        }
      );

      onComplete(result.text);
      return { success: true };
    } catch (error) {
      console.error('[ChatService] Completion error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }
}

export const ChatService = new ChatServiceImpl();
