import { extractMemories, formatConversationForExtraction } from './MemoryExtractor';
import { useMemoryStore } from '../../stores/memoryStore';
import { useChatStore } from '../../stores/chatStore';
import { LLMService } from '../llm/LLMService';

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
   * Extract memories from current conversation and store them
   *
   * Guards:
   * - Prevents concurrent extractions
   * - Enforces 1-minute cooldown
   * - Requires LLM to be ready
   * - Requires at least 2 messages
   *
   * @returns Promise that resolves when extraction completes (or is skipped)
   */
  async extractAndStore(): Promise<void> {
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

    // Check LLM availability
    if (!LLMService.isReady()) {
      console.log('[MemoryOrchestrator] LLM not ready, skipping extraction');
      return;
    }

    // Get conversation from chat store
    const { messages } = useChatStore.getState();
    if (messages.length < 2) {
      console.log('[MemoryOrchestrator] Too few messages (need at least 2), skipping extraction');
      return;
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
      }
    } catch (error) {
      console.error('[MemoryOrchestrator] Extraction failed:', error);
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
