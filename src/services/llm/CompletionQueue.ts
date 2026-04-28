import { LlamaContext } from 'llama.rn';

export type Priority = 'high' | 'low';

export interface CompletionQueueItem {
  messages: any[];
  options: any;
  onToken?: (data: any) => void;
  priority: Priority;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  cancelled: boolean;
}

/**
 * Manages a priority queue for LLM completion requests to prevent
 * "Context is busy" errors from concurrent access.
 *
 * HIGH priority tasks (chat messages) preempt LOW priority tasks (memory extraction).
 * All completion calls are serialized through this queue.
 */
export class CompletionQueueManager {
  private queue: CompletionQueueItem[] = [];
  private isProcessing = false;
  private currentItem: CompletionQueueItem | null = null;

  /**
   * Enqueue a completion request with priority handling
   */
  async enqueue(
    context: LlamaContext,
    messages: any[],
    options: any,
    onToken: ((data: any) => void) | undefined,
    priority: Priority
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const item: CompletionQueueItem = {
        messages,
        options,
        onToken,
        priority,
        resolve,
        reject,
        cancelled: false,
      };

      // If HIGH priority arrives while LOW priority is processing, cancel LOW
      if (
        priority === 'high' &&
        this.currentItem &&
        this.currentItem.priority === 'low'
      ) {
        if (__DEV__) {
          console.log('[CompletionQueue] HIGH priority task cancelling current LOW priority task');
        }
        this.currentItem.cancelled = true;
        this.currentItem.reject(new Error('Cancelled by higher priority task'));
        this.currentItem = null;
      }

      // Insert by priority (HIGH before LOW)
      const insertIndex = this.queue.findIndex((item) => item.priority === 'low');
      if (insertIndex === -1) {
        // No LOW priority items, append to end
        this.queue.push(item);
      } else if (priority === 'high') {
        // Insert HIGH before first LOW
        this.queue.splice(insertIndex, 0, item);
      } else {
        // LOW priority, append to end
        this.queue.push(item);
      }

      if (__DEV__) {
        console.log(
          `[CompletionQueue] Enqueued ${priority} priority task. Queue length: ${this.queue.length}`
        );
      }

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue(context);
      }
    });
  }

  /**
   * Process queue items sequentially
   */
  private async processQueue(context: LlamaContext): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      this.currentItem = item;

      if (item.cancelled) {
        if (__DEV__) {
          console.log('[CompletionQueue] Skipping cancelled item');
        }
        continue;
      }

      if (__DEV__) {
        console.log(
          `[CompletionQueue] Processing ${item.priority} priority task. Remaining: ${this.queue.length}`
        );
      }

      try {
        // Execute completion with exclusive access
        const result = await context.completion(
          {
            messages: item.messages,
            ...item.options,
          },
          item.onToken
        );

        if (!item.cancelled) {
          item.resolve(result);
        }
      } catch (error) {
        if (!item.cancelled) {
          if (__DEV__) {
            console.error('[CompletionQueue] Completion error:', error);
          }
          item.reject(error as Error);
        }
      }

      this.currentItem = null;
    }

    this.isProcessing = false;

    if (__DEV__) {
      console.log('[CompletionQueue] Queue processing complete');
    }
  }

  /**
   * Clear all pending items and cancel current processing
   */
  clear(): void {
    if (__DEV__) {
      console.log(`[CompletionQueue] Clearing queue with ${this.queue.length} pending items`);
    }

    // Cancel current item
    if (this.currentItem) {
      this.currentItem.cancelled = true;
      this.currentItem.reject(new Error('Queue cleared'));
      this.currentItem = null;
    }

    // Cancel all pending items
    for (const item of this.queue) {
      item.cancelled = true;
      item.reject(new Error('Queue cleared'));
    }

    this.queue = [];
    this.isProcessing = false;
  }

  /**
   * Get current queue status for debugging
   */
  getStatus(): { queueLength: number; isProcessing: boolean; currentPriority: Priority | null } {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      currentPriority: this.currentItem?.priority ?? null,
    };
  }
}
