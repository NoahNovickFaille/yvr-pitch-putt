import { extractMemories, formatConversationForExtraction } from './MemoryExtractor';
import { useMemoryStore } from '../../stores/memoryStore';
import { useChatStore } from '../../stores/chatStore';
import { useConversationStore } from '../../stores/conversationStore';
import { LLMService } from '../llm/LLMService';
import { ExtractionQueue } from './ExtractionQueue';

/**
 * Memory orchestrator singleton
 *
 * Coordinates memory extraction and storage:
 * - Guards against concurrent/frequent extractions
 * - Checks LLM availability and conversation length
 * - Calls extractor and stores results
 * - Provides optional pruning interface
 */
class MemoryOrchestratorImpl {
  private static instance: MemoryOrchestratorImpl | null = null;
  private isExtracting: boolean = false;
  private lastExtractionTime: number = 0;
  private readonly EXTRACTION_COOLDOWN = 60000; // 1 minute between extractions

  private constructor() {
    // Singleton - private constructor
  }

  static getInstance(): MemoryOrchestratorImpl {
    if (!MemoryOrchestratorImpl.instance) {
      MemoryOrchestratorImpl.instance = new MemoryOrchestratorImpl();
    }
    return MemoryOrchestratorImpl.instance;
  }

  /**
   * Extract memories from a conversation and store them
   *
   * Guards:
   * - Prevents concurrent extractions
   * - Enforces 1-minute cooldown
   * - Initializes LLM if not ready (instead of failing silently)
   * - Requires at least 2 messages
   * - Queues for retry if LLM initialization fails
   *
   * @param conversationId - Optional conversation ID to extract from. If not provided, uses current active conversation.
   * @returns Promise that resolves when extraction completes (or is skipped)
   */
  async extractAndStore(conversationId?: string): Promise<void> {
    // Guard against concurrent extractions
    if (this.isExtracting) {
      console.log('[MemoryOrchestrator] Extraction already in progress, skipping');
      return;
    }

    // Cooldown check - prevent excessive extraction
    const now = Date.now();
    if (now - this.lastExtractionTime < this.EXTRACTION_COOLDOWN) {
      console.log('[MemoryOrchestrator] Cooldown active, skipping extraction');
      return;
    }

    // Get messages from the specified conversation or current conversation
    let messages;
    let targetConversationId = conversationId;

    if (conversationId) {
      // Extract from specific conversation
      const conversation = useConversationStore.getState().getConversation(conversationId);
      if (!conversation) {
        console.log('[MemoryOrchestrator] Conversation', conversationId, 'not found');
        return;
      }
      messages = conversation.messages;
    } else {
      // Extract from current active conversation (backward compatibility)
      const currentId = useConversationStore.getState().activeConversationId;
      if (!currentId) {
        console.log('[MemoryOrchestrator] No active conversation');
        return;
      }
      targetConversationId = currentId;
      messages = useChatStore.getState().messages;
    }

    if (messages.length < 2) {
      console.log('[MemoryOrchestrator] Too few messages (need at least 2), skipping extraction');
      return;
    }

    // Check LLM availability and initialize if needed
    if (!LLMService.isReady()) {
      console.log('[MemoryOrchestrator] LLM not ready, attempting to initialize...');
      try {
        await LLMService.initialize();
        console.log('[MemoryOrchestrator] LLM initialized successfully');
      } catch (error) {
        console.error('[MemoryOrchestrator] Failed to initialize LLM for extraction:', error);
        // Queue for retry on next app launch
        if (targetConversationId) {
          ExtractionQueue.add(targetConversationId, messages.length);
          console.log('[MemoryOrchestrator] Queued extraction for retry');
        }
        return;
      }
    }

    this.isExtracting = true;
    this.lastExtractionTime = now;

    try {
      console.log('[MemoryOrchestrator] Starting extraction from', messages.length, 'messages');

      // Format conversation and extract
      const conversationText = formatConversationForExtraction(messages);
      const extracted = await extractMemories(conversationText);

      // Store extracted memories
      if (extracted.length > 0) {
        useMemoryStore.getState().addMemories(extracted);
        console.log('[MemoryOrchestrator] Successfully stored', extracted.length, 'memories');
      } else {
        console.log('[MemoryOrchestrator] No memories extracted from conversation');
        // Queue for retry if no memories were extracted (might be a transient issue)
        if (targetConversationId) {
          ExtractionQueue.add(targetConversationId, messages.length);
        }
      }
    } catch (error) {
      console.error('[MemoryOrchestrator] Extraction failed:', error);
      // Queue for retry on error
      if (targetConversationId) {
        ExtractionQueue.add(targetConversationId, messages.length);
      }
    } finally {
      this.isExtracting = false;
    }
  }

  /**
   * Prune decayed memories below relevance threshold
   *
   * @param threshold - Minimum relevance score to keep (default: 0.1 = 10%)
   */
  prune(threshold: number = 0.1): void {
    console.log('[MemoryOrchestrator] Pruning memories below threshold:', threshold);
    useMemoryStore.getState().pruneDecayed(threshold);
  }
}

export const MemoryOrchestrator = MemoryOrchestratorImpl.getInstance();
