import { EmbeddingService } from './EmbeddingService';
import { storeEmbedding, hasEmbedding } from './EmbeddingStorage';
import { useMemoryStore } from '../../stores/memoryStore';
import { storage } from '../../storage/storage';
import type { MigrationProgress } from '../../types/embedding';

/**
 * Storage key for tracking migration completion.
 * Once set, migration won't run again.
 */
const MIGRATION_KEY = 'embedding_migration_complete';

/**
 * Number of memories to process before yielding to UI.
 * Keeps the interface responsive during migration.
 */
const BATCH_SIZE = 5;

type ProgressListener = (progress: MigrationProgress) => void;

/**
 * Migration service for generating embeddings for existing memories.
 *
 * Users upgrading from v1.0 have memories without embeddings. This service
 * runs in background on first launch after upgrade, embedding all existing
 * memories to enable semantic deduplication.
 *
 * Key behaviors:
 * - Idempotent: Skips memories that already have embeddings
 * - Resilient: Continues on individual failures
 * - Non-blocking: Yields to UI between batches
 * - Persistent: Marks complete in MMKV
 */
class EmbeddingMigrationImpl {
  private static instance: EmbeddingMigrationImpl | null = null;

  private progress: MigrationProgress = {
    total: 0,
    completed: 0,
    status: 'idle',
  };
  private listeners: Set<ProgressListener> = new Set();

  static getInstance(): EmbeddingMigrationImpl {
    if (!EmbeddingMigrationImpl.instance) {
      EmbeddingMigrationImpl.instance = new EmbeddingMigrationImpl();
    }
    return EmbeddingMigrationImpl.instance;
  }

  /**
   * Subscribe to migration progress updates.
   * @param listener Callback invoked on progress change
   * @returns Unsubscribe function
   */
  subscribe(listener: ProgressListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current progress
    listener(this.progress);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.progress));
  }

  /**
   * Get current migration progress.
   */
  getProgress(): MigrationProgress {
    return this.progress;
  }

  /**
   * Check if migration has been completed (stored in MMKV).
   */
  isComplete(): boolean {
    return storage.getString(MIGRATION_KEY) === 'true';
  }

  /**
   * Check if migration is needed.
   * Returns true if there are memories without embeddings AND migration not marked complete.
   */
  isMigrationNeeded(): boolean {
    // Already marked complete
    if (this.isComplete()) {
      return false;
    }

    // Check if any memories exist without embeddings
    const memories = useMemoryStore.getState().memories;
    return memories.some((memory) => !hasEmbedding(memory.id));
  }

  /**
   * Start the migration process.
   * Generates embeddings for all memories that don't have them.
   *
   * Safe to call multiple times - returns immediately if already running or complete.
   */
  async startMigration(): Promise<void> {
    // Guard: Migration not needed
    if (!this.isMigrationNeeded()) {
      if (__DEV__) {
        console.log('[Migration] Not needed - skipping');
      }
      return;
    }

    // Guard: Already running
    if (this.progress.status === 'running') {
      if (__DEV__) {
        console.log('[Migration] Already running - skipping');
      }
      return;
    }

    // Guard: EmbeddingService not ready
    if (!EmbeddingService.isReady()) {
      this.progress = {
        total: 0,
        completed: 0,
        status: 'error',
        error: 'EmbeddingService not initialized',
      };
      this.notifyListeners();
      if (__DEV__) {
        console.log('[Migration] EmbeddingService not ready - cannot migrate');
      }
      return;
    }

    // Get all memories and filter to those without embeddings
    const allMemories = useMemoryStore.getState().memories;
    const memoriesToMigrate = allMemories.filter(
      (memory) => !hasEmbedding(memory.id)
    );

    if (memoriesToMigrate.length === 0) {
      // No memories to migrate - mark complete
      storage.set(MIGRATION_KEY, 'true');
      this.progress = { total: 0, completed: 0, status: 'complete' };
      this.notifyListeners();
      if (__DEV__) {
        console.log('[Migration] No memories to migrate - marking complete');
      }
      return;
    }

    // Initialize progress
    this.progress = {
      total: memoriesToMigrate.length,
      completed: 0,
      status: 'running',
    };
    this.notifyListeners();

    if (__DEV__) {
      console.log(`[Migration] Starting migration of ${memoriesToMigrate.length} memories`);
    }

    try {
      // Process memories in batches
      for (let i = 0; i < memoriesToMigrate.length; i++) {
        const memory = memoriesToMigrate[i];

        try {
          const embedding = await EmbeddingService.embed(memory.content);
          storeEmbedding(memory.id, embedding);

          if (__DEV__) {
            console.log(`[Migration] Embedded memory ${i + 1}/${memoriesToMigrate.length}: ${memory.id}`);
          }
        } catch (error) {
          // Log error but continue with other memories
          console.error('[Migration] Failed to embed memory:', memory.id, error);
        }

        // Update progress
        this.progress = { ...this.progress, completed: i + 1 };
        this.notifyListeners();

        // Yield to UI every BATCH_SIZE memories
        if ((i + 1) % BATCH_SIZE === 0) {
          await this.yieldToUI();
        }
      }

      // Mark migration complete
      storage.set(MIGRATION_KEY, 'true');
      this.progress = { ...this.progress, status: 'complete' };
      this.notifyListeners();

      if (__DEV__) {
        console.log('[Migration] Complete');
      }
    } catch (error) {
      // Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.progress = { ...this.progress, status: 'error', error: errorMessage };
      this.notifyListeners();
      console.error('[Migration] Migration failed:', error);
    }
  }

  /**
   * Yield to UI thread to maintain responsiveness.
   * Uses requestIdleCallback when available, falls back to setTimeout.
   */
  private yieldToUI(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => resolve(), { timeout: 1000 });
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  /**
   * Reset migration state.
   * Clears the completion marker, allowing migration to run again.
   * Primarily for testing and re-migration scenarios.
   */
  reset(): void {
    storage.remove(MIGRATION_KEY);
    this.progress = { total: 0, completed: 0, status: 'idle' };
    this.notifyListeners();

    if (__DEV__) {
      console.log('[Migration] Reset - migration will run again on next check');
    }
  }
}

// Export singleton instance
export const EmbeddingMigration = EmbeddingMigrationImpl.getInstance();
