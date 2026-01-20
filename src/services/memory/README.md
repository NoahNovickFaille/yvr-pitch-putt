# Memory Service

The memory service provides persistent, context-aware memory that allows Cove to remember facts, emotions, and events from past conversations. It uses semantic retrieval with embedding-based similarity and an Ebbinghaus-inspired decay model.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    MemoryOrchestrator                       │
│  (Coordinates extraction timing and guards)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
           ┌─────────────┴─────────────┐
           │                           │
           ▼                           ▼
┌──────────────────────┐    ┌──────────────────────┐
│   MemoryExtractor    │    │   ExtractionQueue    │
│ (LLM-based parsing)  │    │ (Persistence + Retry)│
└──────────┬───────────┘    └──────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                     Deduplicator                             │
│  (Semantic duplicate detection using embeddings)             │
└──────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                      MemoryDecay                             │
│  (Relevance scoring with exponential decay + reinforcement)  │
└──────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                    MemoryStore (Zustand)                     │
│  (State management + MMKV persistence)                       │
└──────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                   SemanticRetrieval                          │
│  (3-bucket retrieval: identity + topic + recent)             │
└──────────────────────────────────────────────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `MemoryOrchestrator.ts` | Coordinates when extraction runs (guards, cooldowns) |
| `MemoryExtractor.ts` | Uses LLM to parse conversations into structured memories |
| `MemoryDecay.ts` | Calculates memory relevance using decay + reinforcement |
| `SemanticRetrieval.ts` | Semantic 3-bucket memory retrieval with weighted scoring |
| `ExtractionQueue.ts` | Persists failed extractions, retries on app restart |
| `extractionPrompt.ts` | LLM instructions and schema for extraction |

## Memory Categories

Memories are categorized into 6 semantic categories, which determine both importance and decay rate:

| Category | Description | Importance | Decay Half-Life |
|----------|-------------|------------|-----------------|
| `identity` | Core facts: name, age, job | 9 | 720h (30 days) |
| `relationship` | People: family, friends, pets | 8 | 336h (14 days) |
| `preference` | Likes/dislikes: hobbies, tastes | 7 | 168h (7 days) |
| `situation` | Current life context: work stress, moving | 6 | 72h (3 days) |
| `event` | Upcoming or recent: meetings, trips | 5 | 48h (2 days) |
| `emotion` | Transient feelings: anxious, happy | 4 | 24h (1 day) |

### Examples

```
"My name is Sarah"              → identity (720h decay)
"I have a sister named Emma"    → relationship (336h decay)
"I love hiking"                 → preference (168h decay)
"Work has been stressful"       → situation (72h decay)
"I have a meeting Friday"       → event (48h decay)
"I'm feeling anxious"           → emotion (24h decay)
```

## Memory Decay Model

Memories decay over time using an Ebbinghaus-inspired forgetting curve with category-specific half-lives.

### Decay Formula

```
decayFactor = e^(-t / τ)

where:
  t = time since last access (hours)
  τ = half-life for memory category (from CATEGORY_DECAY_RATES)
```

### Access Reinforcement

Memories that are accessed frequently decay more slowly:

```
boostedStrength = baseStrength × (1 + log₁₀(accessCount + 1))
```

This means:
- 1 access: ×1.30 strength
- 10 accesses: ×2.04 strength
- 100 accesses: ×3.00 strength

## Semantic Retrieval

Memory retrieval uses embedding-based semantic similarity with a 3-bucket architecture.

### 3-Bucket Architecture

| Bucket | Count | Selection Criteria |
|--------|-------|--------------------|
| Identity | 3 | Always included (identity + relationship categories) |
| Topic-relevant | 4 | Highest semantic similarity to query (≥0.4 threshold) |
| Recent | 2 | Most recently accessed (regardless of topic) |

Total: ~9 memories per retrieval (vs old system's 6).

### Weighted Scoring

For topic-relevant retrieval, memories are scored using multi-factor weighted scoring:

```
finalScore = (semantic × 0.5) + (decay × 0.3) + (importance × 0.2)
```

Where:
- **semantic** (50%): Cosine similarity between query embedding and memory embedding
- **decay** (30%): Recency factor from decay calculation
- **importance** (20%): Normalized 1-10 importance score

### Graceful Degradation

If EmbeddingService is not ready (model not downloaded), retrieval falls back to keyword matching using the legacy algorithm.

### Usage

```typescript
import { useMemoryStore } from '@/src/stores/memoryStore';

// Semantic retrieval (recommended)
const memories = await useMemoryStore.getState().retrieveMemoriesSemantic(userMessage);

// Mark as accessed (reinforces importance)
useMemoryStore.getState().markAccessed(memories.map(m => m.id));
```

## Deduplication

Before adding new memories, they are checked for semantic duplicates using embeddings.

### How It Works

1. Generate embedding for new memory content
2. Compare against all existing memory embeddings
3. If similarity ≥ 0.85 threshold, it's a duplicate
4. Duplicate → merge (boost importance, refresh access time)
5. Not duplicate → add as new memory

### Merge Behavior

When a duplicate is detected:
- Importance boosted by +1 (capped at 10)
- `lastAccessed` refreshed to now
- `accessCount` incremented
- Content preserved from existing memory

### Note on Thresholds

- **Deduplication threshold (0.85)**: High - finds near-identical content
- **Retrieval threshold (0.4)**: Low - finds semantically related content

These differ because deduplication needs precision while retrieval needs recall.

## Structured Memory Injection

Memories are injected into the system prompt in three organized sections to mitigate the "Lost in the Middle" effect.

### Section Structure

```
### About them
- [identity memories]
- [relationship memories]

### Current situation
- [situation memories]
- [emotion memories]

### Relevant context
- [preference memories]
- [event memories]
```

### Token Budget

| Component | Tokens |
|-----------|--------|
| Section headers (~3) | 45 |
| Content budget | 605 |
| **Total** | **650** |

The structured format with section headers acts as attention anchors, helping the LLM weight identity information appropriately.

## Memory Orchestrator

Coordinates the timing and conditions for memory extraction.

### Extraction Guards

Extraction only runs when ALL conditions are met:

1. **LLM Ready**: Model is initialized and not busy with chat
2. **Cooldown Passed**: At least 1 minute since last extraction
3. **User Idle**: No user activity in the last 10 seconds
4. **Minimum Messages**: Conversation has at least 2 messages
5. **Not Already Running**: No concurrent extraction in progress

### When Extraction Triggers

```
User leaves conversation (navigates away)
              │
              ▼
      ┌───────────────┐
      │ Check Guards  │
      └───────┬───────┘
              │
   ┌──────────┴──────────┐
   │                     │
   ▼                     ▼
Guards Pass          Guards Fail
   │                     │
   ▼                     ▼
Run Extraction      Queue for Later
   │                (ExtractionQueue)
   ▼
Deduplicate & Store
```

### Usage

```typescript
import { MemoryOrchestrator } from './MemoryOrchestrator';

const orchestrator = MemoryOrchestrator.getInstance();

// Called when user leaves conversation
await orchestrator.extractAndStore(conversationId, messages);

// Process any queued extractions (called on app startup)
await orchestrator.processQueuedExtractions();
```

## Memory Extractor

Uses the LLM to parse conversations into structured memories with semantic categories.

### Extraction Process

1. **Format Conversation**: Last 20 messages converted to text
2. **Build Prompt**: Combines extraction instructions + conversation
3. **Call LLM**: Uses LOW priority (yields to chat)
4. **Parse Response**: Extracts JSON from markdown wrapper
5. **Validate Schema**: Ensures correct structure with category field
6. **Deduplicate**: Check against existing memories via EmbeddingService
7. **Generate Embeddings**: Create embedding for each new memory
8. **Return Memories**: Array of extracted memory objects

### LLM Prompt Strategy

The extraction prompt uses few-shot examples with semantic categories:

```
You are a memory extraction assistant. Extract key facts, emotions,
and events from conversations. Categorize each memory:

CATEGORIES:
- identity: Core facts (name, age, job)
- relationship: People (family, friends, pets)
- preference: Likes/dislikes
- situation: Current life context
- event: Upcoming/recent happenings
- emotion: Transient feelings

EXAMPLES:
User: "I just got promoted to senior engineer!"
→ [{"category": "event", "content": "User got promoted to senior engineer"}]

User: "My dog Max is my best friend"
→ [{"category": "relationship", "content": "User has a dog named Max"}]

Now extract from this conversation:
[conversation text]
```

### JSON Schema

```json
{
  "memories": [
    {
      "category": "identity" | "relationship" | "preference" | "situation" | "event" | "emotion",
      "content": "string describing the memory"
    }
  ]
}
```

### Error Handling

| Error | Response |
|-------|----------|
| Invalid JSON | Retry with explicit "output valid JSON" instruction |
| Cancelled by chat | Re-queue in ExtractionQueue (not counted as retry) |
| LLM not ready | Queue for later via ExtractionQueue |
| Max retries (3) | Remove from queue, log failure |

## Extraction Queue

Persists failed extractions to MMKV and retries on app restart.

### Queue Item Structure

```typescript
interface QueuedExtraction {
  conversationId: string;
  messageCount: number;
  timestamp: number;
  retryCount: number;
}
```

### Processing Logic

```
App Startup
    │
    ▼
Load Queue from MMKV
    │
    ▼
For each queued item:
    │
    ├── Retry count < 3?
    │       │
    │       ├── Yes → Attempt extraction
    │       │           │
    │       │           ├── Success → Deduplicate → Store → Remove from queue
    │       │           └── Failure → Increment retry, persist
    │       │
    │       └── No → Remove from queue (give up)
    │
    └── Wait for LLM ready + user idle
```

### Cancellation Handling

When extraction is cancelled because user started chatting:
- Error is `"Cancelled by higher priority task"`
- Does NOT count as a retry
- Item remains in queue for next opportunity

### Usage

```typescript
import { ExtractionQueue } from './ExtractionQueue';

const queue = ExtractionQueue.getInstance();

// Load persisted queue on startup
queue.loadFromStorage();

// Add failed extraction
queue.add(conversationId, messageCount);

// Process when conditions are right
await queue.processQueue();
```

## Memory Store

Zustand store with MMKV persistence for memory state.

### State

```typescript
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
```

### Critical Pattern: Persist Before State

```typescript
// CORRECT: Persist BEFORE updating state
persistMemories(updatedMemories);
set({ memories: updatedMemories });

// WRONG: State could update but persistence fail
set({ memories: updatedMemories });
persistMemories(updatedMemories); // If this fails, data is lost on restart
```

### Getting Relevant Memories

```typescript
import { useMemoryStore } from '@/src/stores/memoryStore';

// Semantic retrieval (recommended for chat)
const memories = await useMemoryStore.getState().retrieveMemoriesSemantic(userMessage);

// Keyword-based (legacy, still available)
const memories = useMemoryStore.getState().getTopMemories(6, userMessage);

// Mark them as accessed (reinforces importance)
useMemoryStore.getState().markAccessed(memories.map(m => m.id));
```

### Memory Pruning

Remove memories below relevance threshold:

```typescript
// Remove memories with relevance < 0.1
useMemoryStore.getState().pruneDecayed(0.1);
```

## Data Flow: Complete Memory Lifecycle

```
1. User has conversation
   │
   ▼
2. User navigates away
   │
   ▼
3. MemoryOrchestrator.extractAndStore()
   ├── Check guards (LLM ready, cooldown, user idle)
   ├── If guards fail → ExtractionQueue.add()
   │
   ▼
4. MemoryExtractor.extractMemories()
   ├── Format conversation (last 20 messages)
   ├── Call LLM with LOW priority
   ├── Parse JSON response with semantic categories
   │
   ▼
5. Deduplicator.findDuplicate()
   ├── For each extracted memory:
   │   ├── Generate embedding
   │   ├── Compare against existing memories
   │   ├── If duplicate → merge (boost importance)
   │   └── If new → continue to storage
   │
   ▼
6. EmbeddingStorage.storeEmbedding()
   ├── Store embedding vector for new memory
   │
   ▼
7. MemoryStore.addMemories()
   ├── Infer importance from category
   ├── Persist to MMKV
   ├── Update Zustand state
   │
   ▼
8. Next conversation starts
   │
   ▼
9. SemanticRetrieval.retrieveMemories()
   ├── Get identity memories (always included)
   ├── Score remaining by semantic similarity
   ├── Add topic-relevant (top 4 above threshold)
   ├── Add recent (last 2 accessed)
   │
   ▼
10. TokenBudget.buildStructuredMemorySection()
    ├── Organize into About/Situation/Context sections
    ├── Fit within 650 token budget
    │
    ▼
11. Memories injected into system prompt
    │
    ▼
12. LLM responds with context awareness
```

## Memory Object Structure

```typescript
interface Memory {
  id: string;                    // Unique identifier
  type: MemoryType;              // 'fact' | 'emotion' | 'event' (legacy compatibility)
  content: string;               // The actual memory text
  importance: number;            // 1-10, affects retrieval weight
  category: MemoryCategory;      // 'identity' | 'relationship' | 'preference' | 'situation' | 'event' | 'emotion'
  createdAt: number;             // Timestamp of creation
  lastAccessed: number;          // Timestamp of last retrieval
  accessCount: number;           // Times retrieved (for reinforcement)
  sourceConversationId?: string; // Optional: conversation this was extracted from
}
```

## Integration with Embedding Service

The memory system integrates with `../embedding/` for semantic operations:

- **EmbeddingService**: Generates 256-dim vectors for memory content
- **EmbeddingStorage**: Stores vectors in MMKV with binary encoding
- **CosineSimilarity**: Fast similarity calculation for retrieval
- **Deduplicator**: Semantic duplicate detection before storage

See `../embedding/CLAUDE.md` for embedding service documentation.

## Integration with Chat

The chat flow queries memories before each response:

```typescript
// In ChatService.sendMessage()

// 1. Get relevant memories (semantic retrieval)
const memories = await useMemoryStore.getState().retrieveMemoriesSemantic(userMessage);

// 2. Mark as accessed (reinforces them)
if (memories.length > 0) {
  useMemoryStore.getState().markAccessed(memories.map(m => m.id));
}

// 3. Build structured system prompt with memories
const systemPrompt = buildSystemPromptWithStructuredMemories(memories);

// 4. Include in LLM call
const messages = [
  { role: 'system', content: systemPrompt },
  ...conversationHistory,
  { role: 'user', content: userMessage }
];
```

## Performance Considerations

1. **Token Budget**: Memory section limited to 650 tokens (605 content + 45 headers)
2. **Retrieval Target**: <50ms for typical memory counts
3. **3-Bucket Retrieval**: ~9 memories (3 identity + 4 topic + 2 recent)
4. **LOW Priority**: Extraction never blocks chat
5. **Lazy Processing**: Extraction runs when user is idle
6. **Persistent Queue**: Failed extractions survive app restart
7. **Deduplication**: Prevents memory bloat from repeated mentions

## Debugging

Enable debug logging by checking for `__DEV__`:

```typescript
if (__DEV__) {
  console.log('[MemoryStore] Adding memories:', newMemories.length);
  newMemories.forEach((m) => {
    console.log(`  - [${m.category}] "${m.content}" (importance: ${m.importance})`);
  });
}
```

Key log prefixes:
- `[MemoryStore]` - State operations
- `[MemoryExtractor]` - LLM extraction
- `[MemoryOrchestrator]` - Coordination/guards
- `[ExtractionQueue]` - Queue operations
- `[SemanticRetrieval]` - Retrieval operations
- `[Deduplicator]` - Duplicate detection
