/**
 * Extraction Queue
 *
 * Manages pending memory extractions that failed due to:
 * - LLM not ready
 * - App terminated before completion
 * - Other errors
 *
 * Persists queue to MMKV and retries on next app launch.
 */

import { storage } from '../../storage/storage';
import { useConversationStore } from '../../stores/conversationStore';
import { useMemoryStore } from '../../stores/memoryStore';
import { extractMemories, formatConversationForExtraction } from './MemoryExtractor';

interface PendingExtraction {
  conversationId: string;
  messageCount: number;
  timestamp: number;
  retryCount: number;
}

const QUEUE_KEY = 'memory_extraction_queue';
const MAX_RETRIES = 3;

class ExtractionQueueImpl {
  private queue: PendingExtraction[] = [];

  /**
   * Load queue from MMKV storage
   * Call this on app startup
   */
  loadFromStorage(): void {
    const json = storage.getString(QUEUE_KEY);
    this.queue = json ? JSON.parse(json) : [];
    if (__DEV__ && this.queue.length > 0) {
      console.log('[ExtractionQueue] Loaded', this.queue.length, 'pending extractions from storage');
    }
  }

  /**
   * Add a conversation to the retry queue
   * Only adds if not already present
   */
  add(conversationId: string, messageCount: number): void {
    // Only queue if not already present
    if (this.queue.find(p => p.conversationId === conversationId)) {
      if (__DEV__) {
        console.log('[ExtractionQueue] Conversation', conversationId, 'already in queue');
      }
      return;
    }

    this.queue.push({
      conversationId,
      messageCount,
      timestamp: Date.now(),
      retryCount: 0,
    });

    if (__DEV__) {
      console.log('[ExtractionQueue] Added pending extraction for conversation', conversationId);
    }

    this.persist();
  }

  /**
   * Process all pending extractions in the queue
   * Should be called after LLM is ready on app startup
   */
  async processQueue(): Promise<void> {
    if (this.queue.length === 0) return;

    console.log('[ExtractionQueue] Processing', this.queue.length, 'pending extractions');

    // Process each pending extraction
    for (const pending of [...this.queue]) {
      try {
        // Load conversation from storage
        const conversation = useConversationStore.getState().getConversation(pending.conversationId);

        if (!conversation || conversation.messages.length < 2) {
          console.log('[ExtractionQueue] Conversation', pending.conversationId, 'no longer exists or too few messages - removing from queue');
          this.remove(pending.conversationId);
          continue;
        }

        // Attempt extraction
        console.log('[ExtractionQueue] Attempting extraction for conversation', pending.conversationId);
        const conversationText = formatConversationForExtraction(conversation.messages);
        const memories = await extractMemories(conversationText);

        if (memories.length > 0) {
          useMemoryStore.getState().addMemories(memories);
          console.log('[ExtractionQueue] Successfully extracted', memories.length, 'memories from queued conversation');
          this.remove(pending.conversationId);
        } else {
          console.log('[ExtractionQueue] No memories extracted - incrementing retry count');
          this.incrementRetry(pending.conversationId);
        }
      } catch (error) {
        console.error('[ExtractionQueue] Extraction failed for', pending.conversationId, error);
        this.incrementRetry(pending.conversationId);
      }
    }

    console.log('[ExtractionQueue] Queue processing complete. Remaining items:', this.queue.length);
  }

  /**
   * Increment retry count for a pending extraction
   * Removes from queue if max retries reached
   */
  private incrementRetry(conversationId: string): void {
    const pending = this.queue.find(p => p.conversationId === conversationId);
    if (!pending) return;

    pending.retryCount++;

    if (pending.retryCount >= MAX_RETRIES) {
      console.warn('[ExtractionQueue] Max retries reached for', conversationId, '- removing from queue');
      this.remove(conversationId);
    } else {
      if (__DEV__) {
        console.log('[ExtractionQueue] Retry count for', conversationId, 'now', pending.retryCount, '/', MAX_RETRIES);
      }
      this.persist();
    }
  }

  /**
   * Remove a conversation from the queue
   */
  private remove(conversationId: string): void {
    const beforeLength = this.queue.length;
    this.queue = this.queue.filter(p => p.conversationId !== conversationId);

    if (beforeLength !== this.queue.length) {
      if (__DEV__) {
        console.log('[ExtractionQueue] Removed', conversationId, 'from queue');
      }
      this.persist();
    }
  }

  /**
   * Persist queue to MMKV storage
   */
  private persist(): void {
    storage.set(QUEUE_KEY, JSON.stringify(this.queue));
  }

  /**
   * Get current queue length (for debugging/monitoring)
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Clear the entire queue (for testing/debugging)
   */
  clearQueue(): void {
    this.queue = [];
    storage.remove(QUEUE_KEY);
    if (__DEV__) {
      console.log('[ExtractionQueue] Queue cleared');
    }
  }
}

export const ExtractionQueue = new ExtractionQueueImpl();
