/**
 * SemanticRetrieval - Semantic memory retrieval service
 *
 * Replaces keyword matching with embedding-based similarity scoring.
 * Uses weighted multi-factor scoring (50% semantic + 30% decay + 20% importance)
 * and retrieves memories in structured buckets (identity + topic-relevant + recent).
 *
 * Requirements implemented:
 * - SEM-01: Multi-factor scoring combining semantic similarity, decay, and importance
 * - SEM-02: Weighted scoring with 50/30/20 weights
 * - SEM-03: Identity memories always surfaced regardless of topic
 * - SEM-04: Structured retrieval buckets (identity, topic-relevant, recent)
 * - SEM-05: Retrieval speed <50ms for typical memory counts
 */

import type { Memory } from '../../types/memory';
import type { ScoredMemory, RetrievalConfig, RetrievalResult } from '../../types/retrieval';
import type { EmbeddingVector } from '../../types/embedding';
import { RETRIEVAL_WEIGHTS, DEFAULT_RETRIEVAL_CONFIG } from '../../constants/retrieval';
import { EmbeddingService } from '../embedding/EmbeddingService';
import { getEmbedding } from '../embedding/EmbeddingStorage';
import { cosineSimilarityNormalized } from '../embedding/CosineSimilarity';
import { calculateDecay, calculateKeywordMatch } from './MemoryDecay';

/**
 * Score a memory against a query embedding using multi-factor weighted scoring.
 *
 * Scoring formula (SEM-02):
 * finalScore = (semantic * 0.5) + (decay * 0.3) + (importance * 0.2)
 *
 * @param memory - Memory to score
 * @param queryEmbedding - Pre-computed embedding of the query
 * @param now - Current timestamp (defaults to Date.now())
 * @returns ScoredMemory object, or null if memory has no embedding
 */
export function scoreMemory(
  memory: Memory,
  queryEmbedding: EmbeddingVector,
  now: number = Date.now()
): ScoredMemory | null {
  // Get memory's embedding - skip gracefully if not available
  const memoryEmbedding = getEmbedding(memory.id);
  if (!memoryEmbedding) {
    return null;
  }

  // Calculate individual scores
  const semanticScore = cosineSimilarityNormalized(queryEmbedding, memoryEmbedding);
  const decayScore = calculateDecay(memory, now);
  const importanceScore = (memory.importance ?? 7) / 10; // Normalize 1-10 to 0-1

  // Weighted combination (SEM-02)
  const finalScore =
    RETRIEVAL_WEIGHTS.semantic * semanticScore +
    RETRIEVAL_WEIGHTS.decay * decayScore +
    RETRIEVAL_WEIGHTS.importance * importanceScore;

  return {
    memory,
    semanticScore,
    decayScore,
    importanceScore,
    finalScore,
  };
}

/**
 * Check if a memory represents core identity information.
 *
 * Identity memories are always included in retrieval regardless of
 * semantic similarity to the query (SEM-03).
 *
 * Identity indicators:
 * - Type 'person' (user's relationships)
 * - Type 'fact' with identity content patterns
 *
 * @param memory - Memory to check
 * @returns True if this is an identity memory
 */
export function isIdentityMemory(memory: Memory): boolean {
  // All 'person' type memories are identity
  if (memory.type === 'person') {
    return true;
  }

  // Check 'fact' type for identity patterns
  if (memory.type === 'fact') {
    const content = memory.content.toLowerCase();
    // Identity patterns: name, occupation, location, identity statements
    return (
      content.includes('name is') ||
      content.includes('works as') ||
      content.includes('job is') ||
      content.includes('lives in') ||
      content.includes('is a ') // Identity statement like "User is a teacher"
    );
  }

  return false;
}

/**
 * Fallback retrieval using keyword matching when EmbeddingService is unavailable.
 *
 * Uses calculateKeywordMatch() from MemoryDecay for scoring.
 * This ensures the app continues to work before embedding model is downloaded.
 *
 * @param query - User query text
 * @param memories - All available memories
 * @param count - Maximum number of memories to return
 * @returns Top N memories by keyword match score
 */
export function retrieveByKeywords(
  query: string,
  memories: Memory[],
  count: number
): Memory[] {
  // Score all memories by keyword overlap
  const scored = memories.map((memory) => ({
    memory,
    score: calculateKeywordMatch(memory.content, query),
  }));

  // Sort by score descending and return top N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map((s) => s.memory);
}

/**
 * Retrieve memories using structured semantic retrieval.
 *
 * Organizes retrieval into three buckets (SEM-04):
 * 1. Identity memories - always included (core user facts)
 * 2. Topic-relevant memories - semantically similar to query
 * 3. Recent memories - most recently accessed for context
 *
 * Falls back to keyword matching if EmbeddingService not ready (SEM-01).
 * Performance target: <50ms for typical memory counts (SEM-05).
 *
 * @param query - User message to find relevant memories for
 * @param allMemories - Complete memory collection to search
 * @param config - Retrieval configuration (defaults to DEFAULT_RETRIEVAL_CONFIG)
 * @returns Array of memories combining all three buckets
 */
export async function retrieveMemories(
  query: string,
  allMemories: Memory[],
  config: RetrievalConfig = DEFAULT_RETRIEVAL_CONFIG
): Promise<Memory[]> {
  const startTime = Date.now();

  // Handle empty memories array
  if (allMemories.length === 0) {
    if (__DEV__) {
      console.log('[SemanticRetrieval] No memories to retrieve');
    }
    return [];
  }

  // Graceful degradation: fall back to keywords if embedding service not ready
  if (!EmbeddingService.isReady()) {
    if (__DEV__) {
      console.log('[SemanticRetrieval] Falling back to keyword matching');
    }
    const totalCount = config.maxIdentity + config.maxTopicRelevant + config.maxRecent;
    const result = retrieveByKeywords(query, allMemories, totalCount);

    if (__DEV__) {
      const duration = Date.now() - startTime;
      console.log(
        `[SemanticRetrieval] Keyword fallback retrieved ${result.length} memories in ${duration}ms`
      );
    }

    return result;
  }

  const now = Date.now();

  // Generate query embedding ONCE (Pattern 4 from research)
  const queryEmbedding = await EmbeddingService.embed(query);

  // 1. Identity memories - always include (SEM-03)
  const identityMemories = allMemories
    .filter((m) => isIdentityMemory(m))
    .slice(0, config.maxIdentity);

  // Track what's already included
  const includedIds = new Set(identityMemories.map((m) => m.id));

  // 2. Score remaining memories semantically
  const remaining = allMemories.filter((m) => !includedIds.has(m.id));
  const scoredMemories: ScoredMemory[] = [];
  let memoriesWithEmbeddings = 0;
  let memoriesWithoutEmbeddings = 0;

  for (const memory of remaining) {
    const scored = scoreMemory(memory, queryEmbedding, now);
    if (scored) {
      memoriesWithEmbeddings++;
      // Only include if above semantic threshold
      if (scored.semanticScore >= config.semanticThreshold) {
        scoredMemories.push(scored);
      }
    } else {
      memoriesWithoutEmbeddings++;
    }
  }

  // Sort by final score and take top N for topic-relevant
  scoredMemories.sort((a, b) => b.finalScore - a.finalScore);
  const topicRelevant = scoredMemories
    .slice(0, config.maxTopicRelevant)
    .map((s) => s.memory);

  // Update included set
  topicRelevant.forEach((m) => includedIds.add(m.id));

  // 3. Recent memories - not already included, sorted by lastAccessed
  const recentMemories = allMemories
    .filter((m) => !includedIds.has(m.id))
    .sort((a, b) => b.lastAccessed - a.lastAccessed)
    .slice(0, config.maxRecent);

  // Combine all buckets
  const result = [...identityMemories, ...topicRelevant, ...recentMemories];

  // Performance logging
  if (__DEV__) {
    const duration = Date.now() - startTime;
    console.log(`[SemanticRetrieval] Retrieved in ${duration}ms`);
    console.log(`[SemanticRetrieval] Total memories: ${allMemories.length}`);
    console.log(`[SemanticRetrieval] With embeddings: ${memoriesWithEmbeddings}`);
    console.log(`[SemanticRetrieval] Without embeddings: ${memoriesWithoutEmbeddings}`);
    console.log(
      `[SemanticRetrieval] Identity: ${identityMemories.length}, Topic: ${topicRelevant.length}, Recent: ${recentMemories.length}`
    );

    // Performance warning (SEM-05)
    if (duration > 50) {
      console.warn(
        `[SemanticRetrieval] Performance warning: ${duration}ms exceeds 50ms target`
      );
    }
  }

  return result;
}

/**
 * Get detailed retrieval debug information including all scored memories.
 *
 * Returns the full RetrievalResult structure with scoredMemories array,
 * useful for debugging which memories scored what and parameter tuning.
 *
 * @param query - User message to find relevant memories for
 * @param allMemories - Complete memory collection to search
 * @param config - Retrieval configuration (defaults to DEFAULT_RETRIEVAL_CONFIG)
 * @returns Full RetrievalResult with all scoring details
 */
export async function getRetrievalDebugInfo(
  query: string,
  allMemories: Memory[],
  config: RetrievalConfig = DEFAULT_RETRIEVAL_CONFIG
): Promise<RetrievalResult> {
  const startTime = Date.now();

  // Handle empty memories array
  if (allMemories.length === 0) {
    return {
      identity: [],
      topicRelevant: [],
      recent: [],
      scoredMemories: [],
    };
  }

  // If embedding service not ready, return degraded result
  if (!EmbeddingService.isReady()) {
    const totalCount = config.maxIdentity + config.maxTopicRelevant + config.maxRecent;
    const keywords = retrieveByKeywords(query, allMemories, totalCount);
    return {
      identity: [],
      topicRelevant: keywords,
      recent: [],
      scoredMemories: [],
    };
  }

  const now = Date.now();

  // Generate query embedding ONCE
  const queryEmbedding = await EmbeddingService.embed(query);

  // 1. Identity memories
  const identity = allMemories
    .filter((m) => isIdentityMemory(m))
    .slice(0, config.maxIdentity);

  const includedIds = new Set(identity.map((m) => m.id));

  // 2. Score ALL remaining memories (for debug info)
  const remaining = allMemories.filter((m) => !includedIds.has(m.id));
  const allScoredMemories: ScoredMemory[] = [];

  for (const memory of remaining) {
    const scored = scoreMemory(memory, queryEmbedding, now);
    if (scored) {
      allScoredMemories.push(scored);
    }
  }

  // Sort all scored memories
  allScoredMemories.sort((a, b) => b.finalScore - a.finalScore);

  // Filter for topic-relevant (above threshold)
  const topicRelevant = allScoredMemories
    .filter((s) => s.semanticScore >= config.semanticThreshold)
    .slice(0, config.maxTopicRelevant)
    .map((s) => s.memory);

  topicRelevant.forEach((m) => includedIds.add(m.id));

  // 3. Recent memories
  const recent = allMemories
    .filter((m) => !includedIds.has(m.id))
    .sort((a, b) => b.lastAccessed - a.lastAccessed)
    .slice(0, config.maxRecent);

  if (__DEV__) {
    const duration = Date.now() - startTime;
    console.log(`[SemanticRetrieval] Debug info retrieved in ${duration}ms`);
    console.log(`[SemanticRetrieval] Total scored: ${allScoredMemories.length}`);
    console.log(
      `[SemanticRetrieval] Above threshold: ${allScoredMemories.filter((s) => s.semanticScore >= config.semanticThreshold).length}`
    );

    if (duration > 50) {
      console.warn(
        `[SemanticRetrieval] Performance warning: ${duration}ms exceeds 50ms target`
      );
    }
  }

  return {
    identity,
    topicRelevant,
    recent,
    scoredMemories: allScoredMemories,
  };
}
