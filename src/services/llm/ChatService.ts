import { LLMService } from './LLMService';
import { detectCrisis, CrisisResult } from '../safety/CrisisDetector';
import { STOP_WORDS, buildSystemPromptWithMemories } from './systemPrompt';
import { ChatMessage } from '../../types/chat';
import { useMemoryStore } from '../../stores/memoryStore';
import { useOnboardingStore } from '../../stores/onboardingStore';
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
    // Step 1: Get user profile from onboarding store
    const { userName, userBio } = useOnboardingStore.getState();

    // Step 2: Get relevant memories
    const memories = useMemoryStore.getState().getTopMemories(6, userMessage);

    // Step 3: Mark memories as accessed (reinforces them)
    if (memories.length > 0) {
      useMemoryStore.getState().markAccessed(memories.map((m) => m.id));
      if (__DEV__) {
        console.log('[ChatService] Retrieved memories:', memories.map(m => m.content));
      }
    } else {
      if (__DEV__) {
        const totalMemories = useMemoryStore.getState().memories.length;
        console.log('[ChatService] No memories retrieved. Total stored:', totalMemories);
      }
    }

    // Step 4: Build memory section within budget
    const memorySection = await buildMemorySectionWithinBudget(
      memories,
      TOKEN_BUDGET.memories
    );

    // Step 5: Build system prompt with user context and memories
    const systemPrompt = buildSystemPromptWithMemories(memorySection, userName, userBio);

    // Step 6: Truncate conversation history to fit budget
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
        userName,
        userBio: userBio ? `${userBio.length} chars` : null,
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

    // Step 4: Generate response with streaming (via queue for concurrency safety)
    try {
      console.log('[ChatService] Starting completion with', messages.length, 'messages');

      const result = await LLMService.queuedCompletion(
        messages,
        {
          n_predict: 512,        // Max tokens to generate
          stop: STOP_WORDS,      // Clean endings
          temperature: 0.7,      // Slightly creative for empathy
          top_p: 0.9,
          top_k: 40,
        },
        (data) => {
          // Partial completion callback - fires for each token
          onToken(data.token);
        },
        'high' // Chat messages have HIGH priority
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
      const result = await LLMService.queuedCompletion(
        messages,
        {
          n_predict: 512,
          stop: STOP_WORDS,
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40,
        },
        (data) => {
          onToken(data.token);
        },
        'high' // Chat messages have HIGH priority
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
