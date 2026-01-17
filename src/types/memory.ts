/**
 * Memory types - simplified for 3B model extraction
 * Original types: person, event, emotion, fact, preference
 * Simplified to: fact, emotion, event (3B model handles these reliably)
 */
export type MemoryType = 'person' | 'event' | 'emotion' | 'fact' | 'preference';

/**
 * Memory category - determines decay rate
 * Made optional since simplified extraction doesn't produce this
 */
export type MemoryCategory = 'persistent' | 'temporal' | 'contextual';

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
 * Simplified extraction result from 3B model
 * Only requires content and type - importance/category inferred from type
 */
export interface ExtractionResult {
  memories: {
    type: MemoryType;
    content: string;
    importance?: number; // Optional - will be inferred from type
    category?: MemoryCategory; // Optional - will be inferred from type
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
 * Infer decay category from memory type
 * Facts are persistent, emotions/events are temporal
 */
export function inferCategory(type: MemoryType): MemoryCategory {
  switch (type) {
    case 'fact':
    case 'person':
    case 'preference':
      return 'persistent'; // Long-lasting memories
    case 'emotion':
      return 'temporal'; // Current emotional state changes
    case 'event':
      return 'temporal'; // Events are time-bound
    default:
      return 'persistent';
  }
}

// Helper for creating memory IDs
export function generateMemoryId(): string {
  return `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
