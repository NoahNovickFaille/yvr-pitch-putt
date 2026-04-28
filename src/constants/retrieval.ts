/**
 * Retrieval weights for multi-factor memory scoring.
 *
 * These weights determine how semantic similarity, decay, and importance
 * are combined into a final relevance score for memory retrieval.
 *
 * Reference: SEM-02 requirement specifies weighted scoring with these factors.
 *
 * The weights sum to 1.0 for normalized scoring:
 * - semantic (0.5): Prioritizes topic relevance to current query
 * - decay (0.3): Favors recently accessed memories
 * - importance (0.2): Boosts high-importance memories
 */
export const RETRIEVAL_WEIGHTS = {
  /** Weight for semantic similarity score (cosine similarity with query) */
  semantic: 0.5,
  /** Weight for decay score (recency/freshness of memory) */
  decay: 0.3,
  /** Weight for importance score (normalized from 1-10 scale) */
  importance: 0.2,
} as const;

/**
 * Type for the retrieval weights configuration.
 * Useful for functions that accept custom weights.
 */
export type RetrievalWeights = typeof RETRIEVAL_WEIGHTS;

/**
 * Default configuration for structured memory retrieval.
 *
 * Retrieval is organized into three buckets:
 * - Identity: Core facts about the user (always included)
 * - Topic-relevant: Semantically similar to current query
 * - Recent: Recently accessed memories for conversational context
 *
 * The semanticThreshold (0.4) is intentionally LOWER than the
 * deduplication threshold (0.85) because:
 * - Retrieval finds semantically RELATED content (broader match)
 * - Deduplication finds semantically IDENTICAL content (exact match)
 *
 * Using 0.85 for retrieval would filter out valid semantic relationships
 * (e.g., "worried about presentation" should retrieve "anxious about work").
 */
export const DEFAULT_RETRIEVAL_CONFIG = {
  /** Maximum identity memories to include (always retrieved) */
  maxIdentity: 3,
  /** Maximum topic-relevant memories (filtered by semantic similarity) */
  maxTopicRelevant: 4,
  /** Maximum recent memories (regardless of topic relevance) */
  maxRecent: 2,
  /**
   * Minimum cosine similarity for topic relevance inclusion.
   * Set to 0.4 (NOT 0.85 which is for deduplication).
   * Lower values increase recall, higher values increase precision.
   */
  semanticThreshold: 0.4,
} as const;

/**
 * Type for the default retrieval configuration.
 * Useful for functions that accept custom configuration.
 */
export type DefaultRetrievalConfig = typeof DEFAULT_RETRIEVAL_CONFIG;
