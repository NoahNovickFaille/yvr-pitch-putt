import { LLMService } from './LLMService';
import { detectCrisis, CrisisResult } from '../safety/CrisisDetector';
import { SYSTEM_PROMPT, STOP_WORDS } from './systemPrompt';
import { ChatMessage } from '../../types/chat';

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

    // Step 3: Build message array with system prompt
    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...conversationHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
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

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...conversationHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
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
