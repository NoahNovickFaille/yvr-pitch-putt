# Memory System Audit - Cove App

## Executive Summary

The current memory system has solid foundations but is rudimentary in its approach to creating a "confidant that really knows you." The architecture is over-engineered in some areas (complex orchestration, queues, guards) while being simplistic in the most critical areas (semantic understanding, retrieval quality, memory organization).

---

## Model Context

**Critical constraint**: Cove runs on-device with small models:

| Model | Parameters | Size | Context |
|-------|-----------|------|---------|
| **Llama 3.2 3B** (default) | 3B | ~2GB | 4096 tokens |
| **LFM 2.5 1.2B** | 1.2B | ~731MB | 4096 tokens |

**Implications for memory system**:
- Complex JSON extraction is unreliable - keep schemas simple
- "Lost in the Middle" phenomenon is pronounced - keep memory sections lean (≤650 tokens)
- Few-shot prompting is essential - 4-5 examples minimum
- The 1.2B model will struggle with entity extraction - may need graceful fallback

---

## Current Architecture Overview

### Data Flow
```
Conversation ends → Extract memories via LLM → Store in MMKV
                                                    ↓
New message arrives → Score all memories → Inject top 6 into prompt
```

### Key Files
| File | Purpose |
|------|---------|
| `src/stores/memoryStore.ts` | Zustand store, all memories in single array |
| `src/services/memory/MemoryExtractor.ts` | LLM-based extraction with JSON schema |
| `src/services/memory/MemoryDecay.ts` | Scoring: importance × decay + keyword match |
| `src/services/memory/MemoryOrchestrator.ts` | Guards, cooldowns, extraction scheduling |
| `src/services/memory/ExtractionQueue.ts` | Persistent retry queue |
| `src/services/llm/TokenBudget.ts` | 600-token budget for memories |

---

## Strengths

### 1. Solid Technical Foundation
- **MMKV persistence**: Synchronous, fast, reliable storage
- **Critical persist-before-state pattern**: Prevents data loss
- **Non-blocking extraction**: Low-priority queue allows chat to preempt

### 2. Access Reinforcement
```typescript
boostedStrength = baseStrength * (1 + Math.log10(accessCount + 1))
```
- Frequently-accessed memories decay slower
- Creates natural "important memory" formation through usage

### 3. Graceful Degradation
- Extraction retries (3 attempts) with persistent queue
- Cooldowns and guards prevent resource exhaustion
- Falls back gracefully when LLM busy

### 4. Category-Based Decay
- Facts (persistent): 1-week half-life
- Emotions (temporal): 1-day half-life
- Events (temporal): 1-day half-life

---

## Critical Weaknesses

### 1. No Semantic Understanding - Just Keyword Matching

**Current approach** (`MemoryDecay.ts:55-75`):
```typescript
// Extracts exact word matches only
const memoryWords = extractWords(memoryContent);
const contextWords = extractWords(contextText);
// Count exact overlaps
```

**Problem**: If user says "I'm worried about my presentation" and memory is "User is anxious about work meetings", there's **0% match** despite semantic similarity.

**Impact**: Relevant memories don't surface. User feels the app "doesn't remember" things it actually knows.

### 2. Only 6 Memories Per Conversation

**Current**: Fixed at 6 memories, 600 tokens (`TokenBudget.ts`)

**Problem**: After months of use, users will have hundreds of memories. Only showing 6 means:
- Core identity facts may not surface
- Context-relevant details lost
- No sense of "deep knowing"

### 3. No Deduplication or Contradiction Handling

**Problem**: Same fact extracted multiple times:
- "User's name is Sarah"
- "The user is called Sarah"
- "User mentioned their name is Sarah"

No mechanism to:
- Detect semantic duplicates
- Resolve contradictions ("User likes coffee" vs "User prefers tea")
- Update existing memories with new information

### 4. Flat Memory Structure - No Organization

**Current**: All memories in single flat array with basic types (fact, emotion, event)

**Missing**:
- Entity relationships (Sarah → sister → Emma → visits next week)
- Topic clustering (work stress, family, hobbies)
- Temporal organization (recent vs. established facts)
- Hierarchical importance (core identity vs. passing mentions)

### 5. Extraction Quality Issues

**Current prompt** is few-shot only, extracting simple tuples:
```json
{"content": "User's name is Sarah", "type": "fact"}
```

**Missing**:
- Confidence levels
- Source attribution
- Temporal context ("as of last week")
- Relationship extraction
- Preference gradients (loves/likes/neutral/dislikes/hates)

### 6. Naive Importance Scoring

**Current**: Static importance assigned at creation based on type:
- Facts: 8/10
- Emotions: 5/10
- Events: 6/10

**Problem**: "User mentioned they have a pet fish" (fact: 8/10) ranks higher than "User is going through a divorce" (event: 6/10).

### 7. Memory Section is Unstructured

**Current injection**:
```
What you remember about this person:
- User's name is Sarah
- User started a new job recently
- User is feeling stressed about work
```

No organization, no context, no guidance on what's most relevant to current conversation.

---

## Recommendations for State-of-the-Art Memory

### Tier 1: High Impact, Practical for On-Device

#### A. Implement Simple Embedding-Based Retrieval

**Why**: Semantic similarity is the single biggest improvement possible.

**Approach** (phone-feasible):
- Use a small embedding model (e.g., all-MiniLM-L6-v2, ~23MB)
- Generate embeddings at extraction time (offline, background)
- Store embeddings in MMKV alongside memories
- Cosine similarity for retrieval instead of keyword matching

**New scoring formula**:
```
score = (0.5 × semantic_similarity) + (0.3 × decay_score) + (0.2 × importance)
```

#### B. Memory Deduplication & Consolidation

**On extraction**:
1. Compare new memory embedding against existing memories
2. If similarity > 0.85: merge/update existing instead of creating new
3. Track "first learned" and "last confirmed" timestamps

**Periodic consolidation** (weekly, background):
- Group related memories
- Generate summary memories ("User frequently discusses work stress")
- Archive granular memories that fed into summaries

#### C. Hierarchical Memory Structure

Replace flat array with structured model:

```typescript
interface MemoryStore {
  // Core identity (always included)
  identity: {
    name: string | null;
    relationships: Map<string, PersonEntity>;
    coreValues: string[];
    personality: string[];
  };

  // Topic clusters (retrieved by relevance)
  topics: Map<TopicId, TopicCluster>;

  // Recent context (high retrieval priority)
  recentContext: Memory[];

  // Long-term facts (retrieved by similarity)
  longTermMemories: Memory[];
}
```

#### D. Smarter Retrieval Strategy

Instead of "top 6 by score", use structured retrieval:

1. **Always include**: Name, active relationships, current emotional state
2. **Topic-relevant**: 3-4 memories from topics matching current message
3. **Recent context**: Last 2-3 important facts from recent conversations
4. **Semantic matches**: Top 2-3 by embedding similarity

Total: ~10-12 memories, more contextually relevant.

### Tier 2: Medium Complexity, High Value

#### E. Entity & Relationship Extraction

Extract structured entities, not just facts:

```typescript
interface PersonEntity {
  name: string;
  relationship: string;  // "sister", "boss", "friend"
  facts: string[];
  lastMentioned: number;
  sentiment: 'positive' | 'neutral' | 'negative' | 'complex';
}
```

Benefits:
- "How is Emma?" → Instantly retrieve all Emma-related memories
- Track relationship dynamics over time
- Enable proactive questions ("How did the visit with Emma go?")

#### F. Dynamic Importance Scoring

Update importance based on:
- **Mention frequency**: Topics discussed often are more important
- **Emotional weight**: Memories associated with strong emotions
- **Recency of relevance**: Recently-retrieved memories boost
- **User corrections**: If user corrects a memory, related memories downgrade

```typescript
updateImportance(memory: Memory, signals: ImportanceSignals): number {
  let importance = memory.importance;
  importance += signals.mentionedAgain ? 0.5 : 0;
  importance += signals.emotionalContext ? 1.0 : 0;
  importance -= signals.timeSinceRelevant > 30_DAYS ? 0.5 : 0;
  return clamp(importance, 1, 10);
}
```

#### G. Structured Memory Injection

Instead of bullet list, provide organized context:

```
About [User Name]:
- Core: [2-3 identity facts]
- Current situation: [active emotional state, recent events]
- Relevant to this conversation: [topic-matched memories]
- People mentioned: [relevant relationship summaries]
```

### Tier 3: Advanced (Future Consideration)

#### H. Memory Chains & Narratives

Track how memories connect:
- "Started new job" → "Stressed about job" → "Manager is difficult" → "Considering quitting"

Enables:
- Understanding user's journey
- Contextual follow-ups
- Recognizing patterns

#### I. Proactive Memory Surfacing

Based on temporal patterns:
- "Last time we talked about Emma visiting, that was supposed to be this week. How did it go?"
- "You mentioned a presentation coming up. How did it go?"

#### J. Memory Confidence & Source Tracking

```typescript
interface Memory {
  content: string;
  confidence: number;        // 0-1, decays if not reconfirmed
  sources: ConversationRef[];  // Which conversations mentioned this
  contradictions: Memory[];    // Conflicting information
}
```

---

## Implementation Priority

### Phase 1: Foundation Fixes (Immediate)
1. **Deduplication** on extraction (compare against existing)
2. **Structured retrieval** (always include identity + topic-relevant + recent)
3. **Better memory formatting** in prompt (organized sections)

### Phase 2: Semantic Understanding
4. **Embedding model** integration (small model, background processing)
5. **Similarity-based retrieval** replacing keyword matching
6. **Entity extraction** for people and relationships

### Phase 3: Intelligence Layer
7. **Memory consolidation** (periodic summarization)
8. **Dynamic importance** scoring
9. **Topic clustering** and organization

### Phase 4: Advanced Features
10. **Memory chains** and narrative tracking
11. **Proactive surfacing** based on temporal context
12. **Confidence tracking** and contradiction resolution

---

## Verification Approach

After implementing improvements:

1. **Qualitative testing**:
   - Have multi-session conversations referencing past topics
   - Verify relevant memories surface without exact keyword matches
   - Check that core identity always appears

2. **Metrics to track**:
   - Memory retrieval relevance (manual rating)
   - Duplicate memory rate
   - Memory coverage (% of conversation topics captured)

3. **User perception**:
   - "Does the app feel like it knows you?"
   - "Are responses contextually appropriate?"
   - "Does it remember important things?"

---

## Detailed Implementation Plan

### Phase 1: Embedding Infrastructure & Deduplication

**Goal**: Enable semantic understanding and eliminate duplicate memories

#### 1.1 Add Embedding Model

**Files to create/modify**:
- `src/services/embedding/EmbeddingService.ts` (new)
- `src/services/embedding/modelConfig.ts` (new)
- `src/types/memory.ts` (add embedding field)

**Approach**:
```typescript
// EmbeddingService.ts
class EmbeddingService {
  private model: any;  // ONNX runtime or transformers.js

  async initialize(): Promise<void>;
  async embed(text: string): Promise<Float32Array>;
  async embedBatch(texts: string[]): Promise<Float32Array[]>;
  cosineSimilarity(a: Float32Array, b: Float32Array): number;
}
```

**Model options** (research needed):
- `all-MiniLM-L6-v2` via ONNX (~23MB) - proven quality
- `gte-small` (~67MB) - better quality
- Custom distilled model - best size/quality tradeoff

**Storage**: Embeddings stored as base64 in MMKV alongside memory content

#### 1.2 Deduplication on Extraction

**Files to modify**:
- `src/stores/memoryStore.ts` - add deduplication logic
- `src/services/memory/MemoryExtractor.ts` - generate embeddings

**Logic**:
```typescript
async addMemories(extracted: ExtractedMemory[]): Promise<void> {
  const existingMemories = get().memories;

  for (const newMem of extracted) {
    const embedding = await EmbeddingService.embed(newMem.content);

    // Find similar existing memory
    const similar = existingMemories.find(existing =>
      cosineSimilarity(embedding, existing.embedding) > 0.85
    );

    if (similar) {
      // Update existing instead of creating new
      this.updateMemory(similar.id, {
        lastConfirmed: Date.now(),
        accessCount: similar.accessCount + 1
      });
    } else {
      // Create new memory with embedding
      this.createMemory({ ...newMem, embedding });
    }
  }
}
```

#### 1.3 Embedding Latency Considerations

**Critical**: Embedding generation (~50-100ms per text) must not block the UI thread.

**Implementation requirements**:
- Run embedding inference on a background thread (native module with `dispatch_async` on iOS)
- Do NOT rely on JavaScript async/await alone - it still blocks the JS thread
- Consider ONNX Runtime with CoreML backend for iOS GPU acceleration
- Pre-compute user message embedding while LLM is generating response (hide latency)

**Benchmark targets**:
- Single embedding: <100ms
- Batch of 10: <500ms
- Must not cause visible UI stutter

#### 1.4 Migrate Existing Memories

**One-time migration**: Background task to compute embeddings for existing memories

---

### Phase 2: Semantic Retrieval

**Goal**: Replace keyword matching with embedding similarity

#### 2.1 New Scoring Function

**Files to modify**:
- `src/services/memory/MemoryDecay.ts` - new scoring algorithm

**New formula**:
```typescript
export function calculateRelevanceScore(
  memory: Memory,
  contextEmbedding: Float32Array,
  now: number
): number {
  // Semantic similarity (50% weight)
  const similarity = cosineSimilarity(memory.embedding, contextEmbedding);

  // Decay factor (30% weight)
  const decay = calculateDecay(memory, now);

  // Importance (20% weight)
  const importance = memory.importance / 10;

  return (0.5 * similarity) + (0.3 * decay) + (0.2 * importance);
}
```

#### 2.2 Structured Retrieval Strategy

**Files to modify**:
- `src/stores/memoryStore.ts` - new `getMemoriesForContext` method
- `src/services/llm/ChatService.ts` - use structured retrieval

**New retrieval**:
```typescript
getMemoriesForContext(userMessage: string): StructuredMemories {
  const contextEmbed = await EmbeddingService.embed(userMessage);

  return {
    // Always include (2-3 memories)
    identity: this.getIdentityMemories(),

    // Semantic matches (4-5 memories)
    relevant: this.getBySemanticSimilarity(contextEmbed, 5),

    // Recent context (2-3 memories)
    recent: this.getRecentMemories(3),
  };
}
```

#### 2.3 Scale Considerations

**Current approach (brute-force cosine similarity) is fine for expected scale**:

| Memory Count | Search Time | Verdict |
|--------------|-------------|---------|
| 100 | <1ms | Fine |
| 1,000 | ~5ms | Fine |
| 10,000 | ~50ms | Borderline |
| 50,000+ | >200ms | Need ANN index |

**Recommendation**: Stick with brute-force until users report lag. A personal companion app is unlikely to accumulate >5,000 memories. If needed later, consider approximate nearest neighbor (ANN) libraries, but this adds significant complexity (index maintenance, rebuild on updates).

**Don't over-engineer**: ObjectBox and SQLite vector extensions add dependencies without benefit at this scale.

---

### Phase 3: Hierarchical Memory Structure

**Goal**: Organize memories for better retrieval and context

#### 3.1 New Memory Types & Schema

**Files to modify**:
- `src/types/memory.ts` - expanded schema

```typescript
// Memory categories
type MemoryCategory =
  | 'identity'     // Name, core traits, values
  | 'relationship' // People in user's life
  | 'situation'    // Ongoing life circumstances
  | 'preference'   // Likes, dislikes, habits
  | 'event'        // Time-bound occurrences
  | 'emotion';     // Emotional states

interface Memory {
  id: string;
  content: string;
  category: MemoryCategory;
  embedding: string;  // base64 Float32Array
  importance: number;

  // Temporal tracking
  createdAt: number;
  lastAccessed: number;
  lastConfirmed: number;  // NEW: when fact was reconfirmed
  accessCount: number;

  // Relationships
  relatedEntities?: string[];  // People/places mentioned
  relatedMemories?: string[];  // Linked memory IDs
}
```

#### 3.2 Entity Extraction (Simplified for 3B Models)

**Reality check**: Complex nested JSON extraction is unreliable with 3B models. Keep the schema flat.

**Files to modify**:
- `src/services/memory/extractionPrompt.ts` - enhanced prompt
- `src/services/memory/MemoryExtractor.ts` - entity parsing

**Simplified extraction prompt** (4-5 few-shot examples required):
```
Extract facts about the user. Keep each fact simple and self-contained.

Categories: identity, relationship, situation, preference, event, emotion

For people, include the relationship in the content itself.

Examples:
Input: "My sister Emma is visiting next week. I'm nervous because we had a fight last month."
Output: {"memories":[
  {"content":"User has a sister named Emma","type":"relationship"},
  {"content":"Emma is visiting next week","type":"event"},
  {"content":"User had a fight with Emma last month","type":"event"},
  {"content":"User is nervous about Emma's visit","type":"emotion"}
]}

[3-4 more examples...]
```

**Key simplifications**:
- No nested "entities" object - flat memory array only
- Relationship info baked into content string
- One fact per memory (no multi-part facts)
- 3B models handle this reliably; complex schemas fail ~30% of the time

**Fallback for 1.2B model**: If using LFM 1.2B, skip categorization entirely - just extract raw facts and infer category post-hoc based on keywords.

---

### Phase 4: Intelligent Context Building

**Goal**: Format memories optimally for LLM context

#### 4.1 Structured Memory Injection

**Files to modify**:
- `src/services/llm/systemPrompt.ts` - new formatting
- `src/services/llm/TokenBudget.ts` - increase to 800 tokens

**New format**:
```typescript
function buildMemorySection(memories: StructuredMemories): string {
  let section = '';

  // Identity (always first)
  if (memories.identity.length) {
    section += `About them:\n`;
    section += memories.identity.map(m => `- ${m.content}`).join('\n');
    section += '\n\n';
  }

  // Current situation
  const situations = memories.relevant.filter(m => m.category === 'situation');
  if (situations.length) {
    section += `Current situation:\n`;
    section += situations.map(m => `- ${m.content}`).join('\n');
    section += '\n\n';
  }

  // Relevant to this conversation
  const topical = memories.relevant.filter(m => m.category !== 'situation');
  if (topical.length) {
    section += `Relevant context:\n`;
    section += topical.map(m => `- ${m.content}`).join('\n');
  }

  return section;
}
```

#### 4.2 Conservative Token Budget

**Important**: With 3B/1.2B models, more context often hurts. These models suffer from "Lost in the Middle" - they focus on the beginning and end of prompts, losing middle content.

Keep memory budget conservative:
- **Maximum**: 650 tokens (hard cap)
- **Typical**: 400-500 tokens
- Focus on **relevance over quantity** - 6-8 highly relevant memories beats 12 loosely related ones

---

### Phase 5: Negation & Contradiction Handling

**Gap identified**: Users will say things like "Actually, Emma and I aren't speaking anymore" or "I quit that job." The current plan lacks explicit handling for memory invalidation.

#### 5.1 Contradiction Detection (requires embeddings from Phase 1)

When adding new memories, check for conflicts:

```typescript
async function detectContradiction(newMemory: Memory, existing: Memory[]): Promise<Memory | null> {
  const newEmbed = await EmbeddingService.embed(newMemory.content);

  for (const mem of existing) {
    const similarity = cosineSimilarity(newEmbed, mem.embedding);

    // High similarity but opposite sentiment = contradiction
    if (similarity > 0.75) {
      const isContradiction = await detectSentimentFlip(newMemory.content, mem.content);
      if (isContradiction) return mem;
    }
  }
  return null;
}
```

**On contradiction**: Archive old memory (don't delete - keep history), mark new memory with `supersedes: oldMemoryId`.

#### 5.2 Memory Consolidation (Future)
- Weekly background task
- Group related memories
- Generate summary memories
- Archive granular details

#### 5.3 Proactive Memory Surfacing (Future)
- Track temporal events ("presentation next week")
- Surface follow-up questions naturally
- "How did X go?" triggers

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `src/services/embedding/EmbeddingService.ts` | Embedding model wrapper |
| `src/services/embedding/modelConfig.ts` | Model configuration |

### Modified Files
| File | Changes |
|------|---------|
| `src/types/memory.ts` | Expanded schema, new categories |
| `src/stores/memoryStore.ts` | Deduplication, structured retrieval |
| `src/services/memory/MemoryDecay.ts` | Semantic scoring |
| `src/services/memory/MemoryExtractor.ts` | Entity extraction, embeddings |
| `src/services/memory/extractionPrompt.ts` | Enhanced extraction prompt |
| `src/services/llm/systemPrompt.ts` | Structured memory formatting |
| `src/services/llm/TokenBudget.ts` | Increased memory budget |
| `src/services/llm/ChatService.ts` | Use structured retrieval |

---

## Verification Plan

### Per-Phase Testing

**Phase 1 (Embeddings)**:
- Verify embedding model loads on device
- Test deduplication: extract same fact twice, confirm single memory
- Benchmark embedding speed (should be <100ms per memory)

**Phase 2 (Semantic Retrieval)**:
- Test: "worried about presentation" retrieves "anxious about work"
- Compare old vs new retrieval relevance (manual rating)
- Verify no regression in retrieval speed

**Phase 3 (Hierarchical)**:
- Confirm entity extraction works
- Test relationship memories surface when person mentioned
- Verify category distribution makes sense

**Phase 4 (Context Building)**:
- Read formatted prompts, verify organization
- Test LLM responses feel more contextually aware
- Verify token budget respected

### End-to-End Verification
1. Have 5+ conversations across multiple sessions
2. Reference past topics with different wording
3. Verify app demonstrates "knowing" the user
4. Check memory count stays reasonable (deduplication working)
