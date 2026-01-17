export type MemoryType = 'person' | 'event' | 'emotion' | 'fact' | 'preference';

export type MemoryCategory = 'persistent' | 'temporal' | 'contextual';

export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  importance: number; // 1-10 scale
  category: MemoryCategory;
  createdAt: number; // timestamp
  lastAccessed: number; // timestamp, for decay reinforcement
  accessCount: number; // retrieval count
  sourceConversationId?: string; // optional, for debugging
}

export interface ExtractionResult {
  memories: Array<{
    type: MemoryType;
    content: string;
    importance: number;
    category: MemoryCategory;
  }>;
}

// Helper for creating memory IDs
export function generateMemoryId(): string {
  return `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
