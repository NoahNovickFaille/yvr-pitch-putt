/**
 * Embedding service module exports.
 *
 * Provides semantic similarity capabilities for memory deduplication and retrieval.
 * Uses all-MiniLM-L6-v2 via llama.rn with a separate context from chat LLM.
 */

// Core services
export { EmbeddingService } from './EmbeddingService';
export { EmbeddingMigration } from './EmbeddingMigration';

// Storage utilities
export {
  storeEmbedding,
  getEmbedding,
  hasEmbedding,
  deleteEmbedding,
  getAllEmbeddingKeys,
} from './EmbeddingStorage';

// Similarity functions
export { cosineSimilarity, cosineSimilarityNormalized } from './CosineSimilarity';

// Deduplication
export { findDuplicate, mergeMemories } from './Deduplicator';

/**
 * Initialize the embedding system after the chat model is ready.
 *
 * Call this from app initialization after the chat model loads.
 * This function is safe to call at any time - it handles all guards:
 * - If model not downloaded, logs and returns
 * - If service already initialized, returns immediately
 * - If migration needed, starts it in background
 *
 * Flow:
 * 1. Check if embedding model is downloaded
 * 2. If yes, initialize EmbeddingService
 * 3. If service ready and migration needed, start migration (no await)
 *
 * @example
 * ```typescript
 * // In app initialization after chat LLM is ready
 * import { initializeEmbeddingSystem } from '../services/embedding';
 *
 * useEffect(() => {
 *   if (chatLLMReady) {
 *     initializeEmbeddingSystem();
 *   }
 * }, [chatLLMReady]);
 * ```
 */
export async function initializeEmbeddingSystem(): Promise<void> {
  // Import inside function to avoid circular dependencies
  const { EmbeddingService } = await import('./EmbeddingService');
  const { EmbeddingMigration } = await import('./EmbeddingMigration');

  try {
    // Check if embedding model exists
    const isDownloaded = await EmbeddingService.isModelDownloaded();
    if (!isDownloaded) {
      console.log('[Embedding] Model not downloaded, skipping initialization');
      return;
    }

    // Initialize service
    await EmbeddingService.initialize();
    console.log('[Embedding] Service initialized');

    // Check and start migration if needed
    if (EmbeddingMigration.isMigrationNeeded()) {
      console.log('[Embedding] Starting migration for existing memories');
      // Don't await - run in background
      EmbeddingMigration.startMigration().catch((error) => {
        console.error('[Embedding] Migration failed:', error);
      });
    }
  } catch (error) {
    console.error('[Embedding] Initialization failed:', error);
    // Non-fatal - app works without embeddings
  }
}
