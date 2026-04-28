/**
 * Memory types - simplified for 3B model extraction
 * Original types: person, event, emotion, fact, preference
 * Simplified to: fact, emotion, event (3B model handles these reliably)
 */
export type MemoryType = 'person' | 'event' | 'emotion' | 'fact' | 'preference';

/**
 * Memory categories - semantic grouping for hierarchical organization
 * Replaces basic 'persistent' | 'temporal' | 'contextual' with semantic categories
 */
export type MemoryCategory =
  | 'identity'      // Core identity: name, age, occupation, traits
  | 'relationship'  // People: family, friends, partners, pets
  | 'situation'     // Ongoing circumstances: challenges, life changes
  | 'preference'    // Likes/dislikes: activities, foods, habits
  | 'event'         // Time-bound: appointments, milestones, incidents
  | 'emotion';      // Current state: feelings, moods

export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  importance: number; // 1-10 scale, defaults to 7 if not provided
  category: MemoryCategory; // defaults to 'persistent' if not provided
  createdAt: number; // timestamp
  lastAccessed: number; // timestamp, for decay reinforcement
  accessCount: number; // retrieval count
  sourceConversationId?: string; // optional, for debugging
}

/**
 * Extraction result from 3B model with category-based classification
 * Category is the primary field (output by extraction prompt)
 * Type is optional for backward compatibility - will be inferred from category
 */
export interface ExtractionResult {
  memories: {
    content: string;
    category: MemoryCategory;  // Primary field from new extraction
    type?: MemoryType;         // Optional for backward compatibility
    importance?: number;       // Optional - will be inferred from type
  }[];
}

/**
 * Infer importance from memory type
 * Facts get higher importance, emotions/events get medium
 */
export function inferImportance(type: MemoryType): number {
  switch (type) {
    case 'fact':
    case 'person':
    case 'preference':
      return 8; // Core identity information
    case 'emotion':
      return 5; // Current state, less permanent
    case 'event':
      return 6; // Significant but time-bound
    default:
      return 7;
  }
}

/**
 * Infer category from memory type for legacy compatibility
 * New extraction will provide category directly
 */
export function inferCategory(type: MemoryType): MemoryCategory {
  switch (type) {
    case 'person':
      return 'relationship';
    case 'fact':
      return 'identity';     // Most facts are identity-related
    case 'preference':
      return 'preference';
    case 'event':
      return 'event';
    case 'emotion':
      return 'emotion';
    default:
      return 'identity';
  }
}

/**
 * Infer type from memory category for new extraction format
 * Inverse of inferCategory - maps semantic categories to memory types
 */
export function inferTypeFromCategory(category: MemoryCategory): MemoryType {
  switch (category) {
    case 'identity':
      return 'fact';
    case 'relationship':
      return 'person';
    case 'situation':
      return 'fact';         // Situations are fact-like
    case 'preference':
      return 'preference';
    case 'event':
      return 'event';
    case 'emotion':
      return 'emotion';
    default:
      return 'fact';
  }
}

/**
 * Follow-up candidate — created when a user message contains a temporal reference
 * (e.g., "I have a job interview tomorrow").
 * Stored in MMKV and surfaced as a conversation starter when the target date arrives.
 *
 * Detection runs on raw user messages (not LLM-extracted summaries) to ensure
 * temporal phrases are never lost to paraphrasing.
 */
export type FollowUpStatus = 'pending' | 'delivered' | 'expired';

export interface FollowUpCandidate {
  id: string;
  sourceMessageId: string;    // user message that triggered detection
  sourceContent: string;      // raw user message text
  topic: string;              // "job interview" (extracted noun phrase)
  followUpAt: number;         // target timestamp (when to follow up)
  createdAt: number;
  status: FollowUpStatus;
  deliveredAt?: number;
  conversationId?: string;    // conversation it was delivered in
}

// Helper for creating memory IDs
export function generateMemoryId(): string {
  return `mem-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// Helper for creating follow-up IDs
export function generateFollowUpId(): string {
  return `fup-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
