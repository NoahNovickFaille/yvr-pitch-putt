import { Memory } from '../../types/memory';
import { CATEGORY_DECAY_RATES } from '../../constants/memory';

/**
 * @deprecated Use CATEGORY_DECAY_RATES from constants/memory.ts instead.
 * Kept for reference during migration.
 */
export const DECAY_STRENGTH_LEGACY: Record<string, number> = {
  persistent: 168,
  temporal: 24,
  contextual: 4,
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

  // Use new category-based decay rates
  const category = memory.category ?? 'identity'; // Default to identity for legacy
  const baseStrength = CATEGORY_DECAY_RATES[category] ?? CATEGORY_DECAY_RATES.identity;

  // Access count reinforcement: frequently accessed memories decay slower
  const accessCount = memory.accessCount ?? 0;
  const boostedStrength = baseStrength * (1 + Math.log10(accessCount + 1));

  // Exponential decay formula: e^(-t/τ)
  return Math.exp(-hoursSinceAccess / boostedStrength);
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
