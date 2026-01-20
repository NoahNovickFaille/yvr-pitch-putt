import type { LlamaContext } from 'llama.rn';
import type { Memory } from './memory';

/**
 * A 256-dimensional embedding vector from all-MiniLM-L6-v2.
 * Output from EmbeddingService.embed() for semantic similarity operations.
 * The model produces normalized unit vectors suitable for cosine similarity.
 */
export type EmbeddingVector = number[];

/**
 * Status of the embedding service lifecycle.
 * Mirrors LLMStatus pattern for consistency.
 */
export type EmbeddingServiceStatus =
  | 'idle' // Not initialized, model may not be downloaded
  | 'initializing' // Loading model into memory
  | 'ready' // Context loaded, can generate embeddings
  | 'error' // Initialization failed
  | 'unloaded'; // Context released (memory pressure)

/**
 * Current state of the EmbeddingService.
 * Used for UI state management and error handling.
 */
export interface EmbeddingServiceState {
  /** Current lifecycle status */
  status: EmbeddingServiceStatus;
  /** Error message if status is 'error' */
  error?: string;
  /** Reference to active llama.rn context (internal use) */
  context?: LlamaContext;
}

/**
 * Result of a similarity comparison between embeddings.
 * Used for finding similar memories during deduplication.
 */
export interface SimilarityResult {
  /** Cosine similarity score (0-1, higher = more similar) */
  similarity: number;
  /** ID of the compared memory */
  memoryId: string;
  /** Memory content (for debugging and logging) */
  content: string;
}

/**
 * Result of checking if a new memory is a duplicate of existing ones.
 * Returned by Deduplicator.checkDuplicate().
 */
export interface DuplicateCheckResult {
  /** True if similarity exceeds DEDUPLICATION_THRESHOLD */
  isDuplicate: boolean;
  /** The existing memory that matches (if isDuplicate is true) */
  existingMemory?: Memory;
  /** Similarity score with the matching memory */
  similarity?: number;
}

/**
 * Progress tracking for embedding migration.
 * Used when generating embeddings for existing memories on upgrade.
 */
export interface MigrationProgress {
  /** Total memories to migrate */
  total: number;
  /** Number of memories processed */
  completed: number;
  /** Current migration status */
  status: 'idle' | 'running' | 'complete' | 'error';
  /** Error message if status is 'error' */
  error?: string;
}
