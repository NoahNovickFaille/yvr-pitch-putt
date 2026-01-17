import { Memory, MemoryCategory } from '../../types/memory';

/**
 * Half-life decay strength by memory category (in hours)
 * Based on Ebbinghaus forgetting curve principles
 */
export const DECAY_STRENGTH: Record<MemoryCategory, number> = {
  persistent: 168, // ~1 week - facts, relationships, preferences
  temporal: 24, // ~1 day - recent events, current emotions
  contextual: 4, // ~4 hours - conversation-specific context
};

/**
 * Calculate decay factor using Ebbinghaus-inspired formula
 * Handles legacy memories that may not have category field
 * @param memory - Memory to calculate decay for
 * @param now - Current timestamp (defaults to Date.now())
 * @returns Decay factor between 0 (fully decayed) and 1 (no decay)
 */
export function calculateDecay(memory: Memory, now: number = Date.now()): number {
  const hoursSinceAccess = (now - memory.lastAccessed) / (1000 * 60 * 60);

  // Fallback to 'persistent' for legacy memories without category
  const category = memory.category ?? 'persistent';
  const baseStrength = DECAY_STRENGTH[category];

  // Access count reinforcement: frequently accessed memories decay slower
  // Logarithmic boost to prevent unlimited strengthening
  const accessCount = memory.accessCount ?? 0;
  const boostedStrength = baseStrength * (1 + Math.log10(accessCount + 1));

  // Exponential decay formula: e^(-t/τ) where τ is the decay constant
  const decayFactor = Math.exp(-hoursSinceAccess / boostedStrength);

  return decayFactor;
}

/**
 * Calculate relevance score combining importance and decay
 * Handles legacy memories that may not have importance field
 * @param memory - Memory to score
 * @param now - Current timestamp (defaults to Date.now())
 * @returns Relevance score between 0 and 1
 */
export function calculateRelevanceScore(
  memory: Memory,
  now: number = Date.now()
): number {
  const decayFactor = calculateDecay(memory, now);

  // Fallback to 7 for legacy memories without importance
  const importance = memory.importance ?? 7;
  const normalizedImportance = importance / 10; // 1-10 scale -> 0-1

  return normalizedImportance * decayFactor;
}

/**
 * Calculate keyword match score for context-aware retrieval
 * @param memoryContent - Memory content text
 * @param contextText - Context to match against
 * @returns Match score between 0 and 1 (capped)
 */
export function calculateKeywordMatch(
  memoryContent: string,
  contextText: string
): number {
  // Extract meaningful words (>3 characters)
  const extractWords = (text: string): Set<string> => {
    return new Set(
      text
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 3)
    );
  };

  const memoryWords = extractWords(memoryContent);
  const contextWords = extractWords(contextText);

  // Count matching words
  let matches = 0;
  memoryWords.forEach((word) => {
    if (contextWords.has(word)) {
      matches++;
    }
  });

  // Cap at 1.0, normalize by dividing by 5 (5+ matches = perfect match)
  return Math.min(matches / 5, 1);
}
