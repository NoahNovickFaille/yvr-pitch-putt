import { MemoryCategory } from '../types/memory';

/**
 * Decay half-life in hours by memory category.
 * Longer half-life = slower decay = persists longer.
 *
 * Based on Ebbinghaus forgetting curve research:
 * - Identity facts rarely change, persist longest
 * - Emotions are transient, decay fastest
 *
 * Reference: HIE-05 requirement
 */
export const CATEGORY_DECAY_RATES: Record<MemoryCategory, number> = {
  identity: 720,     // 30 days - "My name is Sarah"
  relationship: 336, // 14 days - "I have a sister named Emma"
  preference: 168,   // 7 days - "I love hiking"
  situation: 72,     // 3 days - "Work has been stressful"
  event: 48,         // 2 days - "I have a meeting Friday"
  emotion: 24,       // 1 day - "I'm feeling anxious"
};

/**
 * Infer importance from memory category.
 * Higher importance = more likely to surface in retrieval.
 *
 * Returns value on 1-10 scale matching Memory.importance field.
 */
export function inferImportanceFromCategory(category: MemoryCategory): number {
  switch (category) {
    case 'identity':
      return 9;      // Core facts always important
    case 'relationship':
      return 8;      // People matter
    case 'preference':
      return 7;      // Preferences are stable
    case 'situation':
      return 6;      // Context-dependent
    case 'event':
      return 5;      // Time-bound, less permanent
    case 'emotion':
      return 4;      // Transient by nature
    default:
      return 5;
  }
}

/**
 * Token budget for memory sections in system prompt.
 * Conservative to mitigate "Lost in the Middle" effect.
 *
 * Reference: HIE-04 requirement
 */
export const MEMORY_SECTION_BUDGET = {
  /** Maximum tokens for entire memory section */
  maxTokens: 650,
  /** Reserved tokens for section headers (~15 tokens each x 3 sections) */
  headerOverhead: 45,
  /** Actual content budget after headers */
  contentBudget: 605,
} as const;

// ──────────────────────────────────────────────
// Follow-up detection constants
// ──────────────────────────────────────────────

/** How long a follow-up candidate stays valid before expiring (ms) */
export const FOLLOW_UP_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Maximum number of pending follow-ups stored at once */
export const FOLLOW_UP_MAX_PENDING = 10;

/** Minimum hours from now for a follow-up to be considered (avoids "today" duplicates) */
export const FOLLOW_UP_MIN_HOURS_AHEAD = 4;

/** Token budget for follow-up context in system prompt */
export const FOLLOW_UP_PROMPT_BUDGET = 80; // ~80 tokens for follow-up section
