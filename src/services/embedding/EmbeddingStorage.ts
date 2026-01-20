import { storage } from '../../storage/storage';
import type { EmbeddingVector } from '../../types/embedding';

/**
 * Key prefix for embedding storage in MMKV.
 * Format: 'emb:{memoryId}'
 */
const EMBEDDING_PREFIX = 'emb:';

/**
 * Store an embedding vector in MMKV using efficient binary storage.
 *
 * Converts the number[] to Float32Array and stores as ArrayBuffer.
 * 256 floats * 4 bytes = 1024 bytes per embedding.
 *
 * @param memoryId - The ID of the memory this embedding belongs to
 * @param embedding - The 256-dimensional embedding vector
 */
export function storeEmbedding(memoryId: string, embedding: EmbeddingVector): void {
  const key = `${EMBEDDING_PREFIX}${memoryId}`;

  // Convert number[] to Float32Array for binary storage
  const float32 = new Float32Array(embedding);

  // Create Uint8Array view of the same ArrayBuffer for MMKV
  const uint8 = new Uint8Array(float32.buffer);

  // Store as ArrayBuffer
  storage.set(key, uint8.buffer);

  if (__DEV__) {
    console.log(`[EmbeddingStorage] Stored embedding for ${memoryId} (${uint8.byteLength} bytes)`);
  }
}

/**
 * Retrieve an embedding vector from MMKV.
 *
 * @param memoryId - The ID of the memory to retrieve embedding for
 * @returns The embedding vector, or null if not found or corrupted
 */
export function getEmbedding(memoryId: string): EmbeddingVector | null {
  const key = `${EMBEDDING_PREFIX}${memoryId}`;

  try {
    const buffer = storage.getBuffer(key);

    if (!buffer) {
      return null;
    }

    // Convert ArrayBuffer back to Float32Array, then to number[]
    const float32 = new Float32Array(buffer);
    return Array.from(float32);
  } catch (error) {
    if (__DEV__) {
      console.error(`[EmbeddingStorage] Failed to retrieve embedding for ${memoryId}:`, error);
    }
    return null;
  }
}

/**
 * Check if an embedding exists for a given memory ID.
 *
 * @param memoryId - The ID of the memory to check
 * @returns True if embedding exists
 */
export function hasEmbedding(memoryId: string): boolean {
  const key = `${EMBEDDING_PREFIX}${memoryId}`;
  return storage.contains(key);
}

/**
 * Delete an embedding from storage.
 *
 * @param memoryId - The ID of the memory whose embedding to delete
 */
export function deleteEmbedding(memoryId: string): void {
  const key = `${EMBEDDING_PREFIX}${memoryId}`;
  storage.remove(key);

  if (__DEV__) {
    console.log(`[EmbeddingStorage] Deleted embedding for ${memoryId}`);
  }
}

/**
 * Get all memory IDs that have stored embeddings.
 *
 * Useful for migration progress tracking and debugging.
 *
 * @returns Array of memory IDs with embeddings
 */
export function getAllEmbeddingKeys(): string[] {
  const allKeys = storage.getAllKeys();
  const embeddingKeys: string[] = [];

  for (const key of allKeys) {
    if (key.startsWith(EMBEDDING_PREFIX)) {
      // Strip prefix to get memory ID
      embeddingKeys.push(key.slice(EMBEDDING_PREFIX.length));
    }
  }

  return embeddingKeys;
}
