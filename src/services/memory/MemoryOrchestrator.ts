import { extractMemories, formatConversationForExtraction } from './MemoryExtractor';
import { useMemoryStore } from '../../stores/memoryStore';
import { useChatStore } from '../../stores/chatStore';
import { useConversationStore } from '../../stores/conversationStore';
import { LLMService } from '../llm/LLMService';
import { ExtractionQueue } from './ExtractionQueue';
import { EmbeddingService } from '../embedding/EmbeddingService';
import { storeEmbedding, hasEmbedding } from '../embedding/EmbeddingStorage';
import { findDuplicate, mergeMemories } from '../embedding/Deduplicator';
import { inferTypeFromCategory } from '../../types/memory';
import { detectTemporalReferences } from '../followup/TemporalDetector';
import { FollowUpStore } from '../followup/FollowUpStore';

// Don't attempt direct extraction if user was active within this time
const ACTIVE_THRESHOLD_MS = 10000; // 10 seconds

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

  /**
   * Schedule a callback to run in the background.
   * Uses requestIdleCallback when available, falls back to setTimeout.
   */
  private scheduleBackground(callback: () => void): void {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => callback(), { timeout: 5000 });
    } else {
      setTimeout(callback, 0);
    }
  }

  /**
   * Generate embeddings for memories that don't have them.
   * Called in background after new memories are stored.
   */
  private async generateEmbeddingsForNewMemories(): Promise<void> {
    if (!EmbeddingService.isReady()) {
      console.log('[MemoryOrchestrator] Embedding service not ready, skipping embedding generation');
      return;
    }

    const memories = useMemoryStore.getState().memories;

    for (const memory of memories) {
      // Skip if already has embedding
      if (hasEmbedding(memory.id)) continue;

      try {
        const embedding = await EmbeddingService.embed(memory.content);
        storeEmbedding(memory.id, embedding);
        console.log('[MemoryOrchestrator] Generated embedding for', memory.id);
      } catch (error) {
        console.error('[MemoryOrchestrator] Failed to generate embedding:', error);
        // Continue with other memories
      }
    }
  }

  static getInstance(): MemoryOrchestratorImpl {
    if (!MemoryOrchestratorImpl.instance) {
      MemoryOrchestratorImpl.instance = new MemoryOrchestratorImpl();
    }
    return MemoryOrchestratorImpl.instance;
  }

  /**
   * Check if LLM is currently busy (generating a response)
   */
  private isLLMBusy(): boolean {
    const chatState = useChatStore.getState();
    return chatState.isGenerating;
  }

  /**
   * Check if user was recently active (sent a message recently)
   */
  private wasRecentlyActive(): boolean {
    const conversation = useChatStore.getState().getCurrentConversation();
    if (conversation?.lastMessageAt) {
      const timeSinceLastMessage = Date.now() - conversation.lastMessageAt;
      return timeSinceLastMessage < ACTIVE_THRESHOLD_MS;
    }
    return false;
  }

  /**
   * Extract memories from a conversation and store them
   *
   * Guards:
   * - Prevents concurrent extractions
   * - Enforces 1-minute cooldown
   * - Queues instead of extracting if LLM is busy or user recently active
   * - Initializes LLM if not ready (instead of failing silently)
   * - Requires at least 2 messages
   * - Queues for retry if LLM initialization fails
   *
   * @param conversationId - Optional conversation ID to extract from. If not provided, uses current active conversation.
   * @returns Promise that resolves when extraction completes (or is skipped/queued)
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

    // If LLM is busy or user was recently active, queue for later instead of trying now
    if (this.isLLMBusy() || this.wasRecentlyActive()) {
      console.log('[MemoryOrchestrator] LLM busy or user recently active, queuing for later');
      if (targetConversationId) {
        ExtractionQueue.add(targetConversationId, messages.length);
      }
      return;
    }

    // Check LLM availability and initialize if needed
    if (!LLMService.isReady()) {
      console.log('[MemoryOrchestrator] LLM not ready, queuing for later');
      // Queue for retry when LLM is ready
      if (targetConversationId) {
        ExtractionQueue.add(targetConversationId, messages.length);
      }
      return;
    }

    this.isExtracting = true;
    this.lastExtractionTime = now;

    try {
      console.log('[MemoryOrchestrator] Starting extraction from', messages.length, 'messages');

      // Run follow-up detection on raw user messages (decoupled from LLM extraction).
      // This uses the user's actual words, so temporal phrases like "tomorrow" or
      // "next week" are never lost to LLM paraphrasing.
      this.scheduleBackground(() => {
        try {
          const candidates = detectTemporalReferences(messages);
          if (candidates.length > 0) {
            FollowUpStore.add(candidates);
            console.log('[MemoryOrchestrator] Created', candidates.length, 'follow-up candidates');
          }
        } catch (error) {
          console.error('[MemoryOrchestrator] Follow-up detection failed:', error);
        }
      });

      // Format conversation and extract
      const conversationText = formatConversationForExtraction(messages);
      const extracted = await extractMemories(conversationText);

      // Process extracted memories with deduplication
      if (extracted.length > 0) {
        const memoriesToAdd: typeof extracted = [];
        const existingMemories = useMemoryStore.getState().memories;

        for (const mem of extracted) {
          // Check for duplicate
          const dupResult = await findDuplicate(mem.content, existingMemories);

          if (dupResult.isDuplicate && dupResult.existingMemory) {
            // Merge with existing memory
            console.log('[MemoryOrchestrator] Found duplicate, merging');
            // Infer type from category when not provided
            const memType = mem.type ?? inferTypeFromCategory(mem.category);
            const merged = mergeMemories(dupResult.existingMemory, memType, mem.content);
            useMemoryStore.getState().updateMemory(merged);
          } else {
            // New memory - will get embedding after storage
            memoriesToAdd.push(mem);
          }
        }

        // Add new memories
        if (memoriesToAdd.length > 0) {
          useMemoryStore.getState().addMemories(memoriesToAdd);
          console.log('[MemoryOrchestrator] Added', memoriesToAdd.length, 'new memories');

          // Queue embedding generation for new memories (background)
          this.scheduleBackground(async () => {
            await this.generateEmbeddingsForNewMemories();
          });
        }

        const merged = extracted.length - memoriesToAdd.length;
        if (merged > 0) {
          console.log('[MemoryOrchestrator] Merged', merged, 'duplicate memories');
        }
      } else {
        console.log('[MemoryOrchestrator] No memories extracted from conversation');
        // Queue for retry if no memories were extracted (might be a transient issue)
        if (targetConversationId) {
          ExtractionQueue.add(targetConversationId, messages.length);
        }
      }
    } catch (error) {
      // Check if this was a cancellation - queue for retry without logging as error
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('Cancelled by higher priority task')) {
        console.log('[MemoryOrchestrator] Extraction cancelled by chat, queuing for later');
        if (targetConversationId) {
          ExtractionQueue.add(targetConversationId, messages.length);
        }
      } else {
        console.error('[MemoryOrchestrator] Extraction failed:', error);
        // Queue for retry on error
        if (targetConversationId) {
          ExtractionQueue.add(targetConversationId, messages.length);
        }
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
