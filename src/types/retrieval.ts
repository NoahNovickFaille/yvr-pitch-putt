import type { Memory } from './memory';

/**
 * A memory with computed relevance scores.
 *
 * Used during semantic retrieval to rank memories by relevance
 * to the current query. The finalScore is a weighted combination
 * of semantic similarity, decay, and importance.
 *
 * Scoring formula:
 * finalScore = (semantic * 0.5) + (decay * 0.3) + (importance * 0.2)
 */
export interface ScoredMemory {
  /** The memory being scored */
  memory: Memory;
  /**
   * Semantic similarity to query (0-1).
   * Computed via cosine similarity between query and memory embeddings.
   */
  semanticScore: number;
  /**
   * Decay score (0-1).
   * Higher values indicate recently accessed or persistent memories.
   * Computed via calculateDecay() from MemoryDecay service.
   */
  decayScore: number;
  /**
   * Normalized importance (0-1).
   * Computed from memory.importance (1-10) divided by 10.
   */
  importanceScore: number;
  /**
   * Final weighted score (0-1).
   * Weighted combination of semantic, decay, and importance scores.
   * Used for ranking memories by overall relevance.
   */
  finalScore: number;
}

/**
 * Configuration for semantic memory retrieval.
 *
 * Controls how many memories are retrieved per bucket
 * and the similarity threshold for topic relevance.
 */
export interface RetrievalConfig {
  /**
   * Maximum identity memories to retrieve.
   * Identity memories are always included regardless of query relevance.
   * Typically contains user's name, core traits, preferences.
   */
  maxIdentity: number;
  /**
   * Maximum topic-relevant memories to retrieve.
   * These are semantically similar to the current query,
   * filtered by semanticThreshold and ranked by finalScore.
   */
  maxTopicRelevant: number;
  /**
   * Maximum recent memories to retrieve.
   * These are the most recently accessed memories,
   * providing conversational context regardless of topic.
   */
  maxRecent: number;
  /**
   * Minimum cosine similarity for topic relevance.
   * Memories below this threshold are excluded from topic-relevant bucket.
   * Typical values: 0.3-0.5 (NOT 0.85 which is for deduplication).
   */
  semanticThreshold: number;
}

/**
 * Result of structured memory retrieval.
 *
 * Organizes retrieved memories into three distinct buckets:
 * - identity: Core user facts, always included
 * - topicRelevant: Semantically similar to current query
 * - recent: Recently accessed for conversational context
 *
 * The total memories returned is typically:
 * maxIdentity + maxTopicRelevant + maxRecent (default: 3 + 4 + 2 = 9)
 */
export interface RetrievalResult {
  /**
   * Identity memories - always included.
   * Contains core user facts (name, relationships, persistent traits).
   * Ensures consistent identity across all conversations.
   */
  identity: Memory[];
  /**
   * Topic-relevant memories.
   * Semantically similar to the current query, ranked by finalScore.
   * Provides contextual knowledge related to what user is discussing.
   */
  topicRelevant: Memory[];
  /**
   * Recent memories - regardless of topic.
   * Most recently accessed memories not in other buckets.
   * Provides conversational continuity and recency awareness.
   */
  recent: Memory[];
  /**
   * Full scoring details for all evaluated memories.
   * Useful for debugging, logging, and tuning retrieval parameters.
   * Includes memories that may not appear in the retrieval buckets.
   */
  scoredMemories: ScoredMemory[];
}
