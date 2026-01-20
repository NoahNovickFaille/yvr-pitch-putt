import { create } from 'zustand';
import { storage } from '../storage/storage';
import {
  Memory,
  MemoryCategory,
  MemoryType,
  generateMemoryId,
  inferImportance,
  inferTypeFromCategory,
} from '../types/memory';
import {
  calculateRelevanceScore,
  calculateKeywordMatch,
} from '../services/memory/MemoryDecay';
import { retrieveMemories } from '../services/memory/SemanticRetrieval';

const MEMORIES_KEY = 'stored_memories';

/**
 * Input type for addMemories - accepts category-based extraction results
 * Category is the primary field from new extraction format
 * Type is optional and will be inferred from category if not provided
 */
interface ExtractedMemory {
  content: string;
  category: MemoryCategory;    // Primary field from new extraction
  type?: MemoryType;           // Optional - will be inferred from category
  importance?: number;
}

interface MemoryState {
  memories: Memory[];

  // Actions
  addMemories: (extracted: ExtractedMemory[]) => void;
  updateMemory: (updatedMemory: Memory) => void;
  markAccessed: (memoryIds: string[]) => void;
  pruneDecayed: (threshold: number) => void;
  getTopMemories: (count: number, context?: string) => Memory[];
  retrieveMemoriesSemantic: (query: string) => Promise<Memory[]>;
  loadFromStorage: () => void;
  clearAll: () => void;
}

function persistMemories(memories: Memory[]): void {
  if (__DEV__) {
    console.log('[MemoryStore] Persisting memories:', memories.length);
  }
  storage.set(MEMORIES_KEY, JSON.stringify(memories));
}

function loadMemories(): Memory[] {
  const json = storage.getString(MEMORIES_KEY);
  const memories = json ? JSON.parse(json) : [];
  if (__DEV__) {
    console.log('[MemoryStore] Loaded memories:', memories.length);
  }
  return memories;
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  memories: [],

  addMemories: (extracted: ExtractedMemory[]) => {
    const now = Date.now();

    // Create full Memory objects with inferred values for missing fields
    const newMemories: Memory[] = extracted.map((mem) => {
      // Infer type from category if not provided
      const type = mem.type ?? inferTypeFromCategory(mem.category);
      return {
        id: generateMemoryId(),
        content: mem.content,
        type,
        // Use provided importance or infer from type
        importance: mem.importance ?? inferImportance(type),
        // Category is now primary field
        category: mem.category,
        createdAt: now,
        lastAccessed: now,
        accessCount: 0,
      };
    });

    if (__DEV__) {
      console.log('[MemoryStore] Adding memories:', newMemories.length);
      newMemories.forEach((m) => {
        console.log(`  - [${m.type}] "${m.content}" (importance: ${m.importance}, category: ${m.category})`);
      });
    }

    const state = get();
    const updatedMemories = [...state.memories, ...newMemories];

    // CRITICAL: Persist BEFORE state update
    persistMemories(updatedMemories);
    set({ memories: updatedMemories });
  },

  updateMemory: (updatedMemory: Memory) => {
    const state = get();
    const updatedMemories = state.memories.map((mem) =>
      mem.id === updatedMemory.id ? updatedMemory : mem
    );

    if (__DEV__) {
      console.log('[MemoryStore] Updated memory:', updatedMemory.id);
    }

    // CRITICAL: Persist BEFORE state update
    persistMemories(updatedMemories);
    set({ memories: updatedMemories });
  },

  markAccessed: (memoryIds: string[]) => {
    const now = Date.now();
    const state = get();

    const updatedMemories = state.memories.map((mem) => {
      if (memoryIds.includes(mem.id)) {
        return {
          ...mem,
          lastAccessed: now,
          accessCount: mem.accessCount + 1,
        };
      }
      return mem;
    });

    // CRITICAL: Persist BEFORE state update
    persistMemories(updatedMemories);
    set({ memories: updatedMemories });
  },

  pruneDecayed: (threshold: number) => {
    const now = Date.now();
    const state = get();

    const filteredMemories = state.memories.filter((mem) => {
      const relevance = calculateRelevanceScore(mem, now);
      return relevance >= threshold;
    });

    if (__DEV__) {
      console.log(
        '[MemoryStore] Pruned memories:',
        state.memories.length - filteredMemories.length,
        'removed'
      );
    }

    // CRITICAL: Persist BEFORE state update
    persistMemories(filteredMemories);
    set({ memories: filteredMemories });
  },

  getTopMemories: (count: number, context?: string) => {
    if (__DEV__) {
      console.log('[MemoryStore] getTopMemories (keyword-based):', count);
    }

    const now = Date.now();
    const state = get();

    // Calculate scores for each memory
    const scored = state.memories.map((mem) => {
      let score = calculateRelevanceScore(mem, now);

      // Add context-based keyword match bonus (30% weight)
      if (context) {
        const keywordBonus = calculateKeywordMatch(mem.content, context);
        score = score * 0.7 + keywordBonus * 0.3;
      }

      return { memory: mem, score };
    });

    // Sort by score descending and return top N
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, count).map((item) => item.memory);
  },

  retrieveMemoriesSemantic: async (query: string) => {
    const state = get();
    return retrieveMemories(query, state.memories);
  },

  loadFromStorage: () => {
    const memories = loadMemories();
    set({ memories });
  },

  clearAll: () => {
    if (__DEV__) {
      console.log('[MemoryStore] Clearing all memories');
    }
    storage.remove(MEMORIES_KEY);
    set({ memories: [] });
  },
}));
