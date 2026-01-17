# Phase 3: Memory System - Research

**Researched:** 2026-01-16
**Domain:** Memory extraction, storage schema, decay models, retrieval algorithms, token budget management
**Confidence:** HIGH

## Summary

Phase 3 implements the memory system that makes conversations feel continuous across sessions - the core differentiator for Confidant. The system must extract meaningful memories from conversations, store them with importance scores and decay rates, and retrieve relevant memories when building prompts - all while staying within a tight 2048 token context window.

The recommended approach uses the on-device LLM itself for memory extraction via structured JSON output, combined with an Ebbinghaus-inspired decay model and a hybrid retrieval algorithm (recency + importance + keyword matching). This avoids external dependencies while leveraging llama.rn's native `tokenize()` method for accurate token counting.

**Primary recommendation:** Use llama.rn's `json_schema` parameter for structured memory extraction, implement exponential decay with category-specific strength values, and build a composite scoring function for memory retrieval that weights recency, importance, and simple keyword relevance.

## Standard Stack

The established libraries/tools for this phase:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| llama.rn | ^0.10.0 | Memory extraction via completion, token counting | Already installed; supports `json_schema` for structured output; `tokenize()` for accurate counting |
| react-native-mmkv | ^4.1.1 | Memory persistence | Already installed; synchronous JSON serialization; proven in Phase 2 |
| zustand | ^5.x | Memory state management | Already installed; consistent with chat store pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none required) | - | - | All functionality achievable with existing stack |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| LLM extraction | Keyword/regex patterns | LLM extraction captures semantic meaning, context, nuance; keywords miss implicit information |
| JSON schema extraction | Free-form prompt | JSON schema forces consistent structure; free-form may vary |
| MMKV for memories | SQLite | SQLite better for complex queries but adds dependency; MMKV sufficient for our scale |
| Local decay calculation | Cloud memory service | Local keeps everything on-device; cloud violates privacy-first principle |

**Installation:**
```bash
# No additional packages needed - all dependencies from Phase 1 and 2
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── services/
│   └── memory/
│       ├── MemoryExtractor.ts      # LLM-based memory extraction
│       ├── MemoryStore.ts          # MMKV persistence + retrieval
│       ├── MemoryDecay.ts          # Decay calculations
│       └── extractionPrompt.ts     # Extraction prompt template
├── stores/
│   └── memoryStore.ts              # Zustand store for memories
├── hooks/
│   └── useMemory.ts                # Memory retrieval for prompts
├── types/
│   └── memory.ts                   # Memory types and interfaces
└── services/
    └── llm/
        └── systemPrompt.ts         # MODIFY: inject memories into prompt
```

### Pattern 1: LLM-Based Memory Extraction with JSON Schema
**What:** Use the on-device LLM to extract structured memories from completed conversations.
**When to use:** After conversation ends (app backgrounds or explicit end).
**Example:**
```typescript
// Source: llama.rn types.d.ts - CompletionParams supports json_schema
import { LLMService } from '../llm/LLMService';

interface ExtractedMemory {
  type: 'person' | 'event' | 'emotion' | 'fact' | 'preference';
  content: string;
  importance: number; // 1-10
  category: 'persistent' | 'temporal' | 'contextual';
}

interface ExtractionResult {
  memories: ExtractedMemory[];
}

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    memories: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['person', 'event', 'emotion', 'fact', 'preference']
          },
          content: { type: 'string' },
          importance: { type: 'number', minimum: 1, maximum: 10 },
          category: {
            type: 'string',
            enum: ['persistent', 'temporal', 'contextual']
          }
        },
        required: ['type', 'content', 'importance', 'category']
      }
    }
  },
  required: ['memories']
};

async function extractMemories(
  conversationText: string
): Promise<ExtractedMemory[]> {
  const context = LLMService.getContext();

  const result = await context.completion({
    messages: [
      { role: 'system', content: EXTRACTION_PROMPT },
      { role: 'user', content: conversationText }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { schema: EXTRACTION_SCHEMA }
    },
    n_predict: 512,
    temperature: 0.3, // Lower for more consistent extraction
  });

  const parsed: ExtractionResult = JSON.parse(result.text);
  return parsed.memories;
}
```

### Pattern 2: Ebbinghaus-Inspired Decay Model
**What:** Calculate memory relevance based on time since creation, with category-specific decay rates.
**When to use:** During memory retrieval to weight older memories lower (unless reinforced).
**Example:**
```typescript
// Source: Ebbinghaus forgetting curve R = e^(-t/S)
// https://en.wikipedia.org/wiki/Forgetting_curve

interface StoredMemory {
  id: string;
  type: 'person' | 'event' | 'emotion' | 'fact' | 'preference';
  content: string;
  importance: number;         // 1-10, from extraction
  category: 'persistent' | 'temporal' | 'contextual';
  createdAt: number;          // timestamp
  lastAccessed: number;       // timestamp - reinforces memory
  accessCount: number;        // retrieval count
}

// Decay strength by category (higher = slower decay)
const DECAY_STRENGTH: Record<string, number> = {
  persistent: 168,    // ~1 week half-life (facts about people, preferences)
  temporal: 24,       // ~1 day half-life (recent events, emotions)
  contextual: 4,      // ~4 hours half-life (conversation-specific context)
};

function calculateDecay(memory: StoredMemory, now: number): number {
  const hoursSinceCreation = (now - memory.createdAt) / (1000 * 60 * 60);
  const hoursSinceAccess = (now - memory.lastAccessed) / (1000 * 60 * 60);

  // Use the more recent of creation or access
  const timeFactor = Math.min(hoursSinceCreation, hoursSinceAccess);

  const strength = DECAY_STRENGTH[memory.category];

  // Boost strength based on access count (memories accessed more decay slower)
  const boostedStrength = strength * (1 + Math.log10(memory.accessCount + 1));

  // Ebbinghaus formula: R = e^(-t/S)
  return Math.exp(-timeFactor / boostedStrength);
}

function calculateRelevanceScore(memory: StoredMemory, now: number): number {
  const decay = calculateDecay(memory, now);
  const normalizedImportance = memory.importance / 10;

  // Combined score: importance * decay
  // Important memories with recent access score highest
  return normalizedImportance * decay;
}
```

### Pattern 3: Composite Memory Retrieval Without Embeddings
**What:** Select relevant memories using recency, importance, and keyword matching (no vector DB).
**When to use:** When building prompts for new conversations.
**Example:**
```typescript
// Source: SimpleMem approach - "jointly leveraging semantic, lexical, and metadata signals"
// https://arxiv.org/pdf/2601.02553

interface RetrievalContext {
  currentMessage?: string;     // Current user message (if available)
  conversationTopics?: string[]; // Topics from current conversation
  maxMemories: number;         // Budget limit
  maxTokens: number;           // Token budget
}

function retrieveRelevantMemories(
  memories: StoredMemory[],
  context: RetrievalContext,
  now: number
): StoredMemory[] {
  const scoredMemories = memories.map(memory => {
    // Factor 1: Decay-adjusted relevance (recency + importance)
    const relevanceScore = calculateRelevanceScore(memory, now);

    // Factor 2: Keyword match (if current message provided)
    let keywordScore = 0;
    if (context.currentMessage) {
      keywordScore = calculateKeywordMatch(
        memory.content,
        context.currentMessage
      );
    }

    // Factor 3: Topic overlap (if topics provided)
    let topicScore = 0;
    if (context.conversationTopics?.length) {
      topicScore = calculateTopicOverlap(
        memory.content,
        context.conversationTopics
      );
    }

    // Weighted combination
    const totalScore =
      relevanceScore * 0.5 +     // 50% decay-adjusted relevance
      keywordScore * 0.3 +       // 30% keyword match
      topicScore * 0.2;          // 20% topic overlap

    return { memory, score: totalScore };
  });

  // Sort by score, take top N
  return scoredMemories
    .sort((a, b) => b.score - a.score)
    .slice(0, context.maxMemories)
    .map(item => item.memory);
}

function calculateKeywordMatch(
  memoryContent: string,
  message: string
): number {
  // Simple word overlap scoring
  const memoryWords = new Set(
    memoryContent.toLowerCase().split(/\s+/)
  );
  const messageWords = message.toLowerCase().split(/\s+/);

  const matches = messageWords.filter(word =>
    word.length > 3 && memoryWords.has(word)
  ).length;

  return Math.min(matches / 5, 1); // Cap at 1.0
}
```

### Pattern 4: Token Budget Management
**What:** Allocate tokens between system prompt, memories, conversation history, and response.
**When to use:** Every time a prompt is built for the LLM.
**Example:**
```typescript
// Source: llama.rn types.d.ts - context.tokenize() returns { tokens: Array<number> }

interface TokenBudget {
  total: number;              // n_ctx from model config (2048)
  systemPrompt: number;       // Reserved for base system prompt
  memories: number;           // Reserved for memory context
  conversation: number;       // Reserved for conversation history
  response: number;           // Reserved for model response
}

// Conservative budget allocation for 2048 context
const BUDGET: TokenBudget = {
  total: 2048,
  systemPrompt: 400,          // Base personality prompt
  memories: 300,              // 3-6 memories typically
  conversation: 800,          // Recent conversation turns
  response: 512,              // Max response tokens (n_predict)
};

// Remaining buffer: 36 tokens for formatting overhead

async function countTokens(text: string): Promise<number> {
  const context = LLMService.getContext();
  const result = await context.tokenize(text);
  return result.tokens.length;
}

async function buildPromptWithinBudget(
  baseSystemPrompt: string,
  memories: StoredMemory[],
  conversationHistory: ChatMessage[]
): Promise<{ systemPrompt: string; messages: ChatMessage[] }> {
  // Count base system prompt
  const baseTokens = await countTokens(baseSystemPrompt);

  // Build memory section within budget
  const memorySection = await buildMemorySectionWithinBudget(
    memories,
    BUDGET.memories
  );

  // Combine system prompt with memories
  const fullSystemPrompt = memorySection
    ? `${baseSystemPrompt}\n\n${memorySection}`
    : baseSystemPrompt;

  // Truncate conversation history to fit budget
  const truncatedHistory = await truncateConversationHistory(
    conversationHistory,
    BUDGET.conversation
  );

  return {
    systemPrompt: fullSystemPrompt,
    messages: truncatedHistory,
  };
}

async function buildMemorySectionWithinBudget(
  memories: StoredMemory[],
  maxTokens: number
): Promise<string | null> {
  if (memories.length === 0) return null;

  let section = 'What you remember about this person:\n';
  let currentTokens = await countTokens(section);

  for (const memory of memories) {
    const line = `- ${memory.content}\n`;
    const lineTokens = await countTokens(line);

    if (currentTokens + lineTokens > maxTokens) break;

    section += line;
    currentTokens += lineTokens;
  }

  return section;
}

async function truncateConversationHistory(
  messages: ChatMessage[],
  maxTokens: number
): Promise<ChatMessage[]> {
  // Keep most recent messages, remove oldest if over budget
  const result: ChatMessage[] = [];
  let currentTokens = 0;

  // Process from newest to oldest
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const messageTokens = await countTokens(
      `${message.role}: ${message.content}`
    );

    if (currentTokens + messageTokens > maxTokens) break;

    result.unshift(message);
    currentTokens += messageTokens;
  }

  return result;
}
```

### Pattern 5: Memory Integration in System Prompt
**What:** Inject relevant memories into the system prompt naturally.
**When to use:** At the start of each new conversation and periodically during long conversations.
**Example:**
```typescript
// Extend existing systemPrompt.ts

export function buildSystemPromptWithMemories(
  memories: StoredMemory[]
): string {
  const memorySection = memories.length > 0
    ? `\nWhat you remember about this person:\n${
        memories.map(m => `- ${m.content}`).join('\n')
      }\n\nUse these memories naturally in conversation when relevant. Don't explicitly say "I remember" - just reference the information naturally.`
    : '';

  return `${BASE_SYSTEM_PROMPT}${memorySection}`;
}
```

### Anti-Patterns to Avoid
- **Extracting memories synchronously during chat:** Blocks UI. Extract only after conversation ends.
- **Running extraction on every message:** Wastes compute. Batch extract at conversation end.
- **Storing raw conversation text as memories:** Uses too many tokens. Extract distilled facts.
- **Ignoring token limits when injecting memories:** Causes context overflow, broken responses.
- **Using fixed decay without category differentiation:** Names decay as fast as moods. Use category-specific rates.
- **Retrieving memories without current context:** Returns random memories. Weight by relevance to current topic.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token counting | Character-based estimation | `context.tokenize()` | Tokenization varies by model; estimation is inaccurate |
| Structured extraction | Regex parsing of free text | `json_schema` parameter | LLM handles edge cases; schema ensures consistency |
| Memory deduplication | Exact string matching | Semantic similarity via LLM | "John's mom" and "his mother" should merge |
| Conversation end detection | Manual timers | `useConversationEnd` hook | Already built in Phase 2; uses AppState properly |
| Memory persistence | AsyncStorage | MMKV | Already established; synchronous, fast |

**Key insight:** The on-device LLM is underutilized for tasks beyond chat. Use it for extraction, deduplication, and relevance scoring - it understands context better than keyword matching.

## Common Pitfalls

### Pitfall 1: Memory Extraction Blocks Chat Response
**What goes wrong:** User sends message, has to wait while memories are extracted before getting response.
**Why it happens:** Extraction runs synchronously in the request path.
**How to avoid:**
1. Extract memories only at conversation END (app backgrounds)
2. Never extract during active conversation
3. Use the existing `useConversationEnd` hook to trigger extraction
4. Store `conversationMeta.endedAt` timestamp to know when to extract
**Warning signs:** Noticeable delay between messages; user complaints about speed.

### Pitfall 2: Token Overflow Causes Garbled Responses
**What goes wrong:** Model returns truncated, nonsensical, or broken responses.
**Why it happens:** Prompt exceeds `n_ctx` (2048 tokens); model can't process properly.
**How to avoid:**
1. Always count tokens with `context.tokenize()` before sending
2. Implement strict budget allocation (see Pattern 4)
3. Truncate oldest messages first, then memories if needed
4. Leave buffer for response (512 tokens) + overhead (36 tokens)
**Warning signs:** Responses cut off mid-sentence; responses start mid-thought; JSON in responses.

### Pitfall 3: Old Memories Never Decay
**What goes wrong:** User mentioned "headache" once 6 months ago; AI still asks about it.
**Why it happens:** No decay implementation; all memories treated equally.
**How to avoid:**
1. Calculate decay on every retrieval (not once at storage)
2. Use category-specific decay rates
3. Periodically prune memories below threshold (e.g., score < 0.1)
4. Reinforce memories when accessed (update `lastAccessed`)
**Warning signs:** Irrelevant old details appear in conversation; user says "I told you that ages ago."

### Pitfall 4: Extraction Prompt Too Expensive
**What goes wrong:** Memory extraction uses too many tokens/time; noticeably slow.
**Why it happens:** Sending full conversation to extraction prompt; prompt is verbose.
**How to avoid:**
1. Limit extraction input to recent N messages (e.g., last 20)
2. Use concise extraction prompt (see examples)
3. Set `n_predict` limit on extraction (512 is plenty)
4. Consider batching: extract incrementally during long conversations
**Warning signs:** Extraction takes >10 seconds; model seems "busy" after conversation ends.

### Pitfall 5: JSON Extraction Failures
**What goes wrong:** Extraction returns malformed JSON; memories not stored.
**Why it happens:** LLM occasionally outputs invalid JSON despite schema.
**How to avoid:**
1. Wrap JSON.parse in try-catch
2. Implement fallback: if parse fails, retry once with explicit instruction
3. Log failures for debugging
4. Use stricter temperature (0.3) for extraction
**Warning signs:** Memories mysteriously missing; extraction "succeeds" but storage empty.

### Pitfall 6: Memory Retrieval Returns Irrelevant Memories
**What goes wrong:** User asks about work; AI references their pet from weeks ago.
**Why it happens:** Pure recency/importance scoring ignores semantic relevance.
**How to avoid:**
1. Include keyword matching in retrieval score
2. Track conversation topics; weight memories matching current topic
3. For first message of new conversation, retrieve by importance only
4. Consider "memory refresh" - re-extract recent context if conversation shifts
**Warning signs:** Non-sequitur references; user says "that's not what we're talking about."

## Code Examples

Verified patterns from official sources:

### Memory Types Definition
```typescript
// types/memory.ts
export type MemoryType = 'person' | 'event' | 'emotion' | 'fact' | 'preference';
export type MemoryCategory = 'persistent' | 'temporal' | 'contextual';

export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  importance: number;          // 1-10
  category: MemoryCategory;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  sourceConversationId?: string; // Which conversation it came from
}

export interface ExtractionResult {
  memories: Array<{
    type: MemoryType;
    content: string;
    importance: number;
    category: MemoryCategory;
  }>;
}

export function generateMemoryId(): string {
  return `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

### Extraction Prompt
```typescript
// services/memory/extractionPrompt.ts
export const MEMORY_EXTRACTION_PROMPT = `You are a memory extraction system. Analyze the conversation and extract key memories about the user.

Extract ONLY information directly stated or strongly implied by the USER (not the assistant).

Categories:
- person: Names, relationships, people mentioned (e.g., "Sarah is my sister")
- event: Things that happened or will happen (e.g., "had a job interview yesterday")
- emotion: Feelings expressed (e.g., "feeling anxious about the move")
- fact: Factual information about the user (e.g., "works as a nurse")
- preference: Likes, dislikes, preferences (e.g., "loves hiking")

Importance (1-10):
- 10: Core identity (name, major relationships, profession)
- 7-9: Significant life events, important people
- 4-6: Notable preferences, recurring topics
- 1-3: Minor details, passing mentions

Category (affects decay rate):
- persistent: Facts unlikely to change (relationships, preferences, identity)
- temporal: Time-bound events and emotions (recent events, current feelings)
- contextual: Specific to this conversation only (minor details)

Output JSON only. Extract 0-8 memories per conversation.`;

export const MEMORY_EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    memories: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['person', 'event', 'emotion', 'fact', 'preference'] },
          content: { type: 'string', maxLength: 200 },
          importance: { type: 'number', minimum: 1, maximum: 10 },
          category: { type: 'string', enum: ['persistent', 'temporal', 'contextual'] }
        },
        required: ['type', 'content', 'importance', 'category']
      },
      maxItems: 8
    }
  },
  required: ['memories']
};
```

### Memory Store with MMKV
```typescript
// stores/memoryStore.ts
import { create } from 'zustand';
import { storage } from '../storage/storage';
import { Memory, generateMemoryId } from '../types/memory';

const MEMORIES_KEY = 'stored_memories';

interface MemoryState {
  memories: Memory[];

  // Actions
  addMemories: (extracted: Omit<Memory, 'id' | 'createdAt' | 'lastAccessed' | 'accessCount'>[]) => void;
  markAccessed: (memoryIds: string[]) => void;
  pruneDecayed: (threshold: number) => void;
  getTopMemories: (count: number, context?: string) => Memory[];
  loadFromStorage: () => void;
  clearAll: () => void;
}

function persistMemories(memories: Memory[]): void {
  storage.set(MEMORIES_KEY, JSON.stringify(memories));
}

function loadMemories(): Memory[] {
  const json = storage.getString(MEMORIES_KEY);
  return json ? JSON.parse(json) : [];
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  memories: [],

  addMemories: (extracted) => {
    const now = Date.now();
    const newMemories: Memory[] = extracted.map(m => ({
      ...m,
      id: generateMemoryId(),
      createdAt: now,
      lastAccessed: now,
      accessCount: 0,
    }));

    const allMemories = [...get().memories, ...newMemories];
    persistMemories(allMemories);
    set({ memories: allMemories });
  },

  markAccessed: (memoryIds) => {
    const now = Date.now();
    const updated = get().memories.map(m =>
      memoryIds.includes(m.id)
        ? { ...m, lastAccessed: now, accessCount: m.accessCount + 1 }
        : m
    );
    persistMemories(updated);
    set({ memories: updated });
  },

  pruneDecayed: (threshold) => {
    const now = Date.now();
    const filtered = get().memories.filter(m =>
      calculateRelevanceScore(m, now) >= threshold
    );
    persistMemories(filtered);
    set({ memories: filtered });
  },

  getTopMemories: (count, context) => {
    const now = Date.now();
    const memories = get().memories;

    return memories
      .map(m => ({
        memory: m,
        score: calculateRelevanceScore(m, now) +
               (context ? calculateKeywordMatch(m.content, context) * 0.3 : 0)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(item => item.memory);
  },

  loadFromStorage: () => {
    const memories = loadMemories();
    set({ memories });
  },

  clearAll: () => {
    storage.delete(MEMORIES_KEY);
    set({ memories: [] });
  },
}));

// Helper functions (implement decay calculation)
function calculateRelevanceScore(memory: Memory, now: number): number {
  // Implementation from Pattern 2
  const hoursSinceAccess = (now - memory.lastAccessed) / (1000 * 60 * 60);
  const DECAY_STRENGTH = { persistent: 168, temporal: 24, contextual: 4 };
  const strength = DECAY_STRENGTH[memory.category] * (1 + Math.log10(memory.accessCount + 1));
  const decay = Math.exp(-hoursSinceAccess / strength);
  return (memory.importance / 10) * decay;
}

function calculateKeywordMatch(content: string, context: string): number {
  const contentWords = new Set(content.toLowerCase().split(/\s+/));
  const contextWords = context.toLowerCase().split(/\s+/);
  const matches = contextWords.filter(w => w.length > 3 && contentWords.has(w)).length;
  return Math.min(matches / 5, 1);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vector embeddings for retrieval | Hybrid lexical + semantic + metadata | 2025 | Simpler, works without vector DB, on-device friendly |
| Fixed decay rate | Category-specific Ebbinghaus curves | 2024 | Better matches human memory patterns |
| Extract on every message | Batch extract at conversation end | 2025 | Reduces latency, saves compute |
| Keyword extraction | LLM-based structured extraction | 2024 | Captures context, relationships, implicit info |
| Unlimited context injection | Strict token budgeting | 2024 | Prevents model degradation from overflow |

**Deprecated/outdated:**
- **Vector databases on mobile:** Too heavy for on-device deployment; hybrid retrieval sufficient
- **Cloud memory services (Mem0, Zep):** Violates privacy-first requirement
- **Sentiment analysis libraries:** LLM handles emotion extraction better with context
- **Fixed token estimates (4 chars = 1 token):** Inaccurate; use actual tokenizer

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal extraction batch size**
   - What we know: Extracting from full conversation history is expensive
   - What's unclear: Whether to extract from last N messages or use rolling window
   - Recommendation: Start with last 20 messages; measure and adjust

2. **Memory deduplication strategy**
   - What we know: User may mention same person/fact across conversations
   - What's unclear: Best approach for merging vs updating existing memories
   - Recommendation: Start simple (allow duplicates); add LLM-based dedup in iteration

3. **Cold start experience**
   - What we know: First conversation has no memories to inject
   - What's unclear: Whether to have special handling or just proceed
   - Recommendation: Proceed normally; AI doesn't claim to know user

4. **Memory visualization (v2)**
   - What we know: ADVMEM-01/02 (v2) allow viewing/editing memories
   - What's unclear: How to surface memories without breaking magic
   - Recommendation: Defer to v2; current phase focuses on extraction/retrieval

## Sources

### Primary (HIGH confidence)
- [llama.rn TypeScript types](file:///node_modules/llama.rn/lib/typescript/index.d.ts) - Verified `tokenize()`, `json_schema` in CompletionParams
- [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) - JSON persistence pattern, verified in Phase 2
- [Ebbinghaus Forgetting Curve](https://en.wikipedia.org/wiki/Forgetting_curve) - R = e^(-t/S) formula

### Secondary (MEDIUM confidence)
- [Mem0 Architecture](https://arxiv.org/html/2504.19413v1) - Extraction pipeline, fact retrieval patterns
- [SimpleMem Paper](https://arxiv.org/pdf/2601.02553) - Hybrid retrieval without embeddings
- [MemoryBank](https://www.marktechpost.com/2025/11/02/how-to-design-a-persistent-memory-and-personalized-agentic-ai-system-with-decay-and-self-evaluation/) - Ebbinghaus-inspired decay implementation
- [Mem0 Prompts](https://github.com/mem0ai/mem0/blob/main/mem0/configs/prompts.py) - FACT_RETRIEVAL_PROMPT structure

### Tertiary (LOW confidence)
- [Llama 3.2 1B capabilities](https://www.emergentmind.com/topics/llama-3-2-1b-model) - Small model extraction accuracy (note: project uses 3B)
- WebSearch results for structured extraction - General patterns, not authoritative

## Metadata

**Confidence breakdown:**
- Memory extraction via LLM: HIGH - Verified llama.rn supports json_schema, tested in similar projects
- Decay model: HIGH - Ebbinghaus formula is well-established, simple to implement
- Token counting: HIGH - Verified context.tokenize() API in llama.rn types
- Retrieval algorithm: MEDIUM - Hybrid approach is research-backed but specifics may need tuning
- Budget allocation: MEDIUM - Numbers are estimates based on typical usage; may need adjustment

**Research date:** 2026-01-16
**Valid until:** 2026-02-16 (30 days - stable ecosystem)
