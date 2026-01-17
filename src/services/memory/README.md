# Memory Service

The memory service provides persistent, context-aware memory that allows Confidant to remember facts, emotions, and events from past conversations. It uses an Ebbinghaus-inspired decay model to prioritize recent and frequently-accessed memories.

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
│                      MemoryDecay                             │
│  (Relevance scoring with exponential decay + reinforcement)  │
└──────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                    MemoryStore (Zustand)                     │
│  (State management + MMKV persistence)                       │
└──────────────────────────────────────────────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `MemoryOrchestrator.ts` | Coordinates when extraction runs (guards, cooldowns) |
| `MemoryExtractor.ts` | Uses LLM to parse conversations into structured memories |
| `MemoryDecay.ts` | Calculates memory relevance using decay + reinforcement |
| `ExtractionQueue.ts` | Persists failed extractions, retries on app restart |
| `extractionPrompt.ts` | LLM instructions and schema for extraction |

## Memory Types

Memories are categorized by type, which affects their importance and decay rate:

| Type | Description | Base Importance | Decay Category |
|------|-------------|-----------------|----------------|
| `fact` | Personal facts: name, job, relationships | 0.9 | `persistent` |
| `emotion` | Emotional states and feelings | 0.6 | `temporal` |
| `event` | Life events, activities, experiences | 0.7 | `temporal` |

## Memory Decay Model

Memories decay over time using an Ebbinghaus-inspired forgetting curve.

### Decay Categories

| Category | Half-Life | Use Case |
|----------|-----------|----------|
| `persistent` | 168 hours (1 week) | Facts, relationships, long-term context |
| `temporal` | 24 hours (1 day) | Recent events, current emotions |
| `contextual` | 4 hours | Conversation-specific context |

### Decay Formula

```
decayFactor = e^(-t / τ)

where:
  t = time since last access (hours)
  τ = half-life for memory category
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

### Final Relevance Score

```
relevanceScore = importance × decayFactor × accessBoost
```

### Keyword Matching

When retrieving memories for context, keyword matching adds a bonus:

```
finalScore = (relevanceScore × 0.7) + (keywordMatch × 0.3)
```

Keywords are extracted from both the memory content and user's current message (words > 3 characters).

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
Store Memories
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

Uses the LLM to parse conversations into structured memories.

### Extraction Process

1. **Format Conversation**: Last 20 messages converted to text
2. **Build Prompt**: Combines extraction instructions + conversation
3. **Call LLM**: Uses LOW priority (yields to chat)
4. **Parse Response**: Extracts JSON from markdown wrapper
5. **Validate Schema**: Ensures correct structure
6. **Return Memories**: Array of extracted memory objects

### LLM Prompt Strategy

The extraction prompt uses few-shot examples to guide the model:

```
You are a memory extraction assistant. Extract key facts, emotions,
and events from conversations.

EXAMPLES:
User: "I just got promoted to senior engineer!"
→ [{"type": "event", "content": "User got promoted to senior engineer"}]

User: "My dog Max is my best friend"
→ [{"type": "fact", "content": "User has a dog named Max"}]

Now extract from this conversation:
[conversation text]
```

### JSON Schema

```json
{
  "memories": [
    {
      "type": "fact" | "emotion" | "event",
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
    │       │           ├── Success → Remove from queue
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
  markAccessed: (memoryIds: string[]) => void;
  pruneDecayed: (threshold: number) => void;
  getTopMemories: (count: number, context?: string) => Memory[];
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

// Get top 6 memories relevant to user's message
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
   ├── Parse JSON response
   │
   ▼
5. MemoryStore.addMemories()
   ├── Infer importance/category from type
   ├── Persist to MMKV
   ├── Update Zustand state
   │
   ▼
6. Next conversation starts
   │
   ▼
7. ChatService retrieves memories
   ├── getTopMemories(6, userMessage)
   ├── Calculates relevance (decay + keywords)
   ├── Returns sorted by relevance
   │
   ▼
8. Memories injected into system prompt
   │
   ▼
9. LLM responds with context awareness
```

## Memory Object Structure

```typescript
interface Memory {
  id: string;           // Unique identifier
  type: MemoryType;     // 'fact' | 'emotion' | 'event'
  content: string;      // The actual memory text
  importance: number;   // 0-1, affects base relevance
  category: MemoryCategory; // 'persistent' | 'temporal' | 'contextual'
  createdAt: number;    // Timestamp of creation
  lastAccessed: number; // Timestamp of last retrieval
  accessCount: number;  // Times retrieved (for reinforcement)
}
```

## Integration with Chat

The chat flow queries memories before each response:

```typescript
// In ChatService.sendMessage()

// 1. Get relevant memories
const memories = useMemoryStore.getState().getTopMemories(6, userMessage);

// 2. Mark as accessed (reinforces them)
if (memories.length > 0) {
  useMemoryStore.getState().markAccessed(memories.map(m => m.id));
}

// 3. Build system prompt with memories
const systemPrompt = buildSystemPromptWithMemories(memories);

// 4. Include in LLM call
const messages = [
  { role: 'system', content: systemPrompt },
  ...conversationHistory,
  { role: 'user', content: userMessage }
];
```

## Performance Considerations

1. **Token Budget**: Memory section limited to 300 tokens
2. **Top N Retrieval**: Only top 6 memories used per response
3. **LOW Priority**: Extraction never blocks chat
4. **Lazy Processing**: Extraction runs when user is idle
5. **Persistent Queue**: Failed extractions survive app restart

## Debugging

Enable debug logging by checking for `__DEV__`:

```typescript
if (__DEV__) {
  console.log('[MemoryStore] Adding memories:', newMemories.length);
  newMemories.forEach((m) => {
    console.log(`  - [${m.type}] "${m.content}"`);
  });
}
```

Key log prefixes:
- `[MemoryStore]` - State operations
- `[MemoryExtractor]` - LLM extraction
- `[MemoryOrchestrator]` - Coordination/guards
- `[ExtractionQueue]` - Queue operations
