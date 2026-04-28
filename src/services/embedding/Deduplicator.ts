import type { Memory, MemoryType } from '../../types/memory';
import type { DuplicateCheckResult } from '../../types/embedding';
import { EmbeddingService } from './EmbeddingService';
import { getEmbedding } from './EmbeddingStorage';
import { cosineSimilarityNormalized } from './CosineSimilarity';
import { DEDUPLICATION_THRESHOLD } from '../../constants/embedding';

/**
 * Check if a new memory content is a duplicate of existing memories.
 *
 * Uses semantic similarity via embeddings to detect duplicates.
 * Returns the most similar existing memory if similarity exceeds threshold.
 *
 * Graceful degradation: If EmbeddingService is not ready, returns { isDuplicate: false }
 * so memory extraction continues without deduplication.
 *
 * @param newContent - The content of the new memory to check
 * @param existingMemories - Array of existing memories to compare against
 * @returns DuplicateCheckResult with isDuplicate flag and optional existing memory
 */
export async function findDuplicate(
  newContent: string,
  existingMemories: Memory[]
): Promise<DuplicateCheckResult> {
  // Graceful degradation: If embedding service not ready, skip deduplication
  if (!EmbeddingService.isReady()) {
    if (__DEV__) {
      console.log('[Deduplicator] EmbeddingService not ready, skipping deduplication');
    }
    return { isDuplicate: false };
  }

  // No memories to compare against
  if (existingMemories.length === 0) {
    return { isDuplicate: false };
  }

  try {
    // Generate embedding for new content
    const newEmbedding = await EmbeddingService.embed(newContent);

    let bestMatch: Memory | null = null;
    let bestSimilarity = 0;

    // Compare against all existing memories
    for (const memory of existingMemories) {
      const existingEmbedding = getEmbedding(memory.id);

      // Skip memories without embeddings (old memories pre-embedding)
      if (!existingEmbedding) {
        continue;
      }

      // Calculate similarity using optimized function for normalized vectors
      const similarity = cosineSimilarityNormalized(newEmbedding, existingEmbedding);

      // Track best match
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = memory;
      }
    }

    // Check if best match exceeds threshold
    if (bestSimilarity >= DEDUPLICATION_THRESHOLD && bestMatch) {
      if (__DEV__) {
        console.log(
          `[Deduplicator] Found duplicate: "${newContent.substring(0, 50)}..." ` +
            `matches "${bestMatch.content.substring(0, 50)}..." ` +
            `(similarity: ${bestSimilarity.toFixed(3)})`
        );
      }
      return {
        isDuplicate: true,
        existingMemory: bestMatch,
        similarity: bestSimilarity,
      };
    }

    if (__DEV__ && bestMatch) {
      console.log(
        `[Deduplicator] No duplicate found. Best match: "${bestMatch.content.substring(0, 30)}..." ` +
          `(similarity: ${bestSimilarity.toFixed(3)}, threshold: ${DEDUPLICATION_THRESHOLD})`
      );
    }

    return { isDuplicate: false };
  } catch (error) {
    if (__DEV__) {
      console.error('[Deduplicator] Error during duplicate check:', error);
    }
    // On error, allow memory to be added (no deduplication)
    return { isDuplicate: false };
  }
}

/**
 * Merge a new memory into an existing memory.
 *
 * When a duplicate is detected, this function creates an updated version
 * of the existing memory with:
 * - Boosted importance (capped at 10) - repetition signals significance
 * - Refreshed lastAccessed time - keeps memory relevant
 * - Incremented accessCount
 *
 * Note: Currently keeps existing content. Future enhancement could merge
 * content if newContent is longer/more detailed.
 *
 * @param existing - The existing memory to update
 * @param _newType - The type of the new memory (unused, kept for future)
 * @param _newContent - The content of the new memory (unused, kept for future)
 * @returns Updated Memory object with boosted importance and refreshed access
 */
export function mergeMemories(
  existing: Memory,
  _newType: MemoryType,
  _newContent: string
): Memory {
  const boostedImportance = Math.min(10, existing.importance + 1);

  if (__DEV__) {
    console.log(
      `[Deduplicator] Merging memory ${existing.id}: ` +
        `importance ${existing.importance} -> ${boostedImportance}, ` +
        `accessCount ${existing.accessCount} -> ${existing.accessCount + 1}`
    );
  }

  return {
    ...existing,
    importance: boostedImportance,
    lastAccessed: Date.now(),
    accessCount: existing.accessCount + 1,
    // Keep existing: id, type, content, category, createdAt, sourceConversationId
  };
}
