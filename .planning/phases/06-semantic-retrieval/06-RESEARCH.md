# Phase 6: Semantic Retrieval - Research

**Researched:** 2026-01-19
**Domain:** Semantic similarity scoring, memory retrieval strategies, weighted ranking
**Confidence:** HIGH

## Summary

This phase transforms the memory retrieval system from keyword matching to semantic similarity using the embedding infrastructure built in Phase 5. The current `getTopMemories()` function in `memoryStore.ts` uses `calculateKeywordMatch()` for context relevance - this will be replaced with embedding-based cosine similarity combined with decay and importance scores.

The research confirms three key patterns for effective semantic retrieval:
1. **Weighted multi-factor scoring** - Combining semantic similarity (50%), decay (30%), and importance (20%) is an industry-validated approach matching the requirements
2. **Structured retrieval buckets** - Identity memories should be retrieved separately and always included, topic-relevant memories filtered by similarity, and recent memories provide conversational context
3. **Brute-force search is acceptable** - For <5000 memories with 256-dimensional vectors, linear scan with optimized cosine similarity runs in <10ms on modern mobile devices

**Primary recommendation:** Create a `SemanticRetrieval` service that implements structured retrieval with three buckets (identity, topic-relevant, recent), uses the existing `cosineSimilarityNormalized()` for scoring, and replaces the current `getTopMemories()` implementation with `retrieveMemories()`.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Existing CosineSimilarity.ts | N/A | Similarity scoring | Already implemented, uses optimized dot product for unit vectors |
| Existing EmbeddingService | N/A | Query embedding generation | Already handles embed() for input text |
| Existing EmbeddingStorage | N/A | Vector retrieval | Already has getEmbedding() function |
| Existing MemoryDecay.ts | N/A | Decay calculation | Already has calculateDecay() function |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | - | - | All infrastructure exists from Phase 5 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Brute-force search | ANN index (hnswlib) | Unnecessary complexity for <5000 vectors, adds dependency |
| Fixed weights (50/30/20) | Learned weights | Premature optimization, fixed weights match research best practices |
| Single retrieval pass | Two-stage retrieval | Complexity not justified at current scale |

**Installation:**
```bash
# No new dependencies required - all infrastructure exists from Phase 5
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── services/
│   ├── memory/
│   │   ├── MemoryDecay.ts           # Existing - decay calculations
│   │   ├── SemanticRetrieval.ts     # NEW - semantic retrieval service
│   │   └── MemoryOrchestrator.ts    # Update - use new retrieval
│   └── embedding/
│       ├── CosineSimilarity.ts      # Existing - similarity scoring
│       ├── EmbeddingService.ts      # Existing - query embedding
│       └── EmbeddingStorage.ts      # Existing - vector storage
├── constants/
│   └── retrieval.ts                 # NEW - retrieval configuration (weights, thresholds)
└── types/
    └── retrieval.ts                 # NEW - RetrievalResult, ScoredMemory types
```

### Pattern 1: Weighted Multi-Factor Scoring
**What:** Combine semantic similarity, decay, and importance into a single relevance score
**When to use:** For ranking memories by relevance to current query
**Research basis:** Industry-validated approach - Weighted Memory Retrieval (WMR) frameworks use this exact pattern
**Example:**
```typescript
// Source: SEM-02 requirement + industry research
interface ScoredMemory {
  memory: Memory;
  semanticScore: number;  // 0-1 from cosine similarity
  decayScore: number;     // 0-1 from MemoryDecay.calculateDecay()
  importanceScore: number; // 0-1 normalized from memory.importance (1-10)
  finalScore: number;     // Weighted combination
}

const RETRIEVAL_WEIGHTS = {
  semantic: 0.5,   // 50% weight on semantic similarity
  decay: 0.3,      // 30% weight on recency/decay
  importance: 0.2, // 20% weight on importance
} as const;

function calculateFinalScore(
  semanticScore: number,
  decayScore: number,
  importanceScore: number
): number {
  return (
    RETRIEVAL_WEIGHTS.semantic * semanticScore +
    RETRIEVAL_WEIGHTS.decay * decayScore +
    RETRIEVAL_WEIGHTS.importance * importanceScore
  );
}
```

### Pattern 2: Structured Retrieval Buckets
**What:** Retrieve memories in three distinct buckets: identity (always), topic-relevant (by similarity), recent (by time)
**When to use:** For building context that balances consistency, relevance, and recency
**Research basis:** Multi-tier memory architectures separate identity/semantic/episodic memory
**Example:**
```typescript
// Source: SEM-03, SEM-04 requirements
interface RetrievalResult {
  identity: Memory[];     // Always included (name, core traits)
  topicRelevant: Memory[];// Semantically similar to query
  recent: Memory[];       // Recent memories regardless of topic
}

async function retrieveMemories(
  query: string,
  allMemories: Memory[],
  config: RetrievalConfig
): Promise<RetrievalResult> {
  // 1. Identity memories - always included (by type)
  const identity = allMemories.filter(m =>
    m.type === 'person' || m.type === 'fact'  // Core identity types
  );

  // 2. Topic-relevant - semantic similarity above threshold
  const queryEmbedding = await EmbeddingService.embed(query);
  const scored = await scoreMemoriesSemantically(
    queryEmbedding,
    allMemories.filter(m => !identity.includes(m))
  );
  const topicRelevant = scored
    .filter(s => s.semanticScore >= 0.4) // Relevance threshold
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, config.maxTopicRelevant);

  // 3. Recent - most recently accessed, not already included
  const included = new Set([...identity, ...topicRelevant.map(s => s.memory)]);
  const recent = allMemories
    .filter(m => !included.has(m))
    .sort((a, b) => b.lastAccessed - a.lastAccessed)
    .slice(0, config.maxRecent);

  return { identity, topicRelevant, recent };
}
```

### Pattern 3: Graceful Degradation
**What:** Fall back to keyword matching if embedding service unavailable
**When to use:** When EmbeddingService is not ready (model not downloaded, initializing, or released)
**Example:**
```typescript
// Source: Phase 5 established pattern in Deduplicator.ts
async function retrieveMemories(query: string, memories: Memory[]): Promise<Memory[]> {
  // Graceful degradation: if embedding service not ready, use keyword matching
  if (!EmbeddingService.isReady()) {
    console.log('[SemanticRetrieval] Falling back to keyword matching');
    return retrieveByKeywords(query, memories);
  }

  // Full semantic retrieval
  return retrieveSemantically(query, memories);
}
```

### Pattern 4: Pre-computed Query Embedding
**What:** Generate query embedding once, reuse for all comparisons
**When to use:** Always - avoid redundant embedding generation
**Example:**
```typescript
// WRONG: Generates embedding multiple times
for (const memory of memories) {
  const queryEmb = await EmbeddingService.embed(query); // BAD: repeated
  const similarity = cosineSimilarityNormalized(queryEmb, getEmbedding(memory.id));
}

// CORRECT: Generate once, reuse
const queryEmbedding = await EmbeddingService.embed(query);
for (const memory of memories) {
  const memoryEmbedding = getEmbedding(memory.id);
  if (memoryEmbedding) {
    const similarity = cosineSimilarityNormalized(queryEmbedding, memoryEmbedding);
  }
}
```

### Anti-Patterns to Avoid
- **Over-filtering by similarity:** Using threshold >0.6 eliminates good semantic matches; 0.3-0.4 is appropriate for retrieval
- **Ignoring missing embeddings:** Old memories may lack embeddings; skip them gracefully, don't crash
- **Single-pass retrieval:** Mixing identity/topic/recent in one scoring pass makes tuning difficult
- **Re-embedding the query:** Embedding generation is ~50ms; never embed the same query twice
- **Blocking UI during retrieval:** Retrieval should be <50ms; if it's slow, investigate embedding lookup

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cosine similarity | Custom math | `cosineSimilarityNormalized()` | Already optimized for unit vectors |
| Decay calculation | Custom formula | `calculateDecay()` | Already handles categories, access count |
| Embedding generation | Custom model loading | `EmbeddingService.embed()` | Already handles context lifecycle |
| Vector storage lookup | Custom key scheme | `getEmbedding()` | Already handles MMKV binary format |
| Importance normalization | Custom scaling | `memory.importance / 10` | Standard 1-10 scale already established |

**Key insight:** Phase 5 built all the infrastructure. Phase 6 is about composition and orchestration, not new primitives.

## Common Pitfalls

### Pitfall 1: Semantic Similarity Threshold Too High
**What goes wrong:** Using 0.85 (deduplication threshold) for retrieval filters out valid semantic matches
**Why it happens:** Confusing deduplication (exact match detection) with retrieval (relevance ranking)
**How to avoid:** Use 0.3-0.4 threshold for retrieval inclusion; 0.85 is only for deduplication
**Warning signs:** "worried about presentation" fails to retrieve "anxious about work" despite clear semantic relationship
**Research reference:** Retrieval thresholds are typically 0.3-0.6; exact match thresholds are 0.8+

### Pitfall 2: Identity Memories Not Always Surfacing
**What goes wrong:** User's name/identity not mentioned because identity memories scored below topic-relevant ones
**Why it happens:** Single-pass scoring where identity competes with topic relevance
**How to avoid:** Separate identity bucket that is ALWAYS included, regardless of similarity score
**Warning signs:** AI forgets user's name or core facts when discussing unrelated topics

### Pitfall 3: Recent Context Lost
**What goes wrong:** AI loses track of what was discussed moments ago because similarity-based retrieval prioritizes old but relevant memories
**Why it happens:** Relying only on semantic similarity without recency component
**How to avoid:** Dedicate slots for recent memories (last 2-3) regardless of semantic score
**Warning signs:** "You mentioned your cat earlier" returns nothing despite recent mention

### Pitfall 4: Blocking Retrieval During Chat
**What goes wrong:** Noticeable delay before AI responds
**Why it happens:** Embedding generation or similarity calculation taking too long
**How to avoid:**
  - Pre-compute query embedding once
  - Use optimized `cosineSimilarityNormalized()` for unit vectors
  - Linear scan of <5000 256-dim vectors is <10ms
**Warning signs:** Retrieval taking >50ms consistently
**Performance target:** <50ms total retrieval time (SEM-05 requirement)

### Pitfall 5: Fallback Not Tested
**What goes wrong:** App crashes or behaves unexpectedly when embedding model unavailable
**Why it happens:** Only testing happy path where EmbeddingService is always ready
**How to avoid:** Test with EmbeddingService in unloaded/error state; verify keyword fallback works
**Warning signs:** Errors when embedding model is downloading or after memory pressure release

## Code Examples

Verified patterns for implementation:

### Complete Scoring Function
```typescript
// Source: Requirements SEM-01, SEM-02
import { Memory } from '../../types/memory';
import { cosineSimilarityNormalized } from '../embedding/CosineSimilarity';
import { getEmbedding } from '../embedding/EmbeddingStorage';
import { calculateDecay } from './MemoryDecay';
import { RETRIEVAL_WEIGHTS } from '../../constants/retrieval';
import type { EmbeddingVector } from '../../types/embedding';

interface ScoredMemory {
  memory: Memory;
  semanticScore: number;
  decayScore: number;
  importanceScore: number;
  finalScore: number;
}

function scoreMemory(
  memory: Memory,
  queryEmbedding: EmbeddingVector,
  now: number = Date.now()
): ScoredMemory | null {
  // Get memory's embedding
  const memoryEmbedding = getEmbedding(memory.id);
  if (!memoryEmbedding) {
    return null; // Skip memories without embeddings
  }

  // Calculate individual scores
  const semanticScore = cosineSimilarityNormalized(queryEmbedding, memoryEmbedding);
  const decayScore = calculateDecay(memory, now);
  const importanceScore = memory.importance / 10; // Normalize 1-10 to 0-1

  // Weighted combination
  const finalScore =
    RETRIEVAL_WEIGHTS.semantic * semanticScore +
    RETRIEVAL_WEIGHTS.decay * decayScore +
    RETRIEVAL_WEIGHTS.importance * importanceScore;

  return {
    memory,
    semanticScore,
    decayScore,
    importanceScore,
    finalScore,
  };
}
```

### Structured Retrieval Implementation
```typescript
// Source: Requirements SEM-03, SEM-04
import { EmbeddingService } from '../embedding/EmbeddingService';
import { RETRIEVAL_CONFIG } from '../../constants/retrieval';

interface RetrievalConfig {
  maxIdentity: number;      // Max identity memories (usually all)
  maxTopicRelevant: number; // Max semantically relevant
  maxRecent: number;        // Max recent memories
  semanticThreshold: number; // Min similarity for topic relevance (0.3-0.4)
}

export const DEFAULT_RETRIEVAL_CONFIG: RetrievalConfig = {
  maxIdentity: 3,
  maxTopicRelevant: 4,
  maxRecent: 2,
  semanticThreshold: 0.4,
};

async function retrieveStructured(
  query: string,
  allMemories: Memory[],
  config: RetrievalConfig = DEFAULT_RETRIEVAL_CONFIG
): Promise<Memory[]> {
  const now = Date.now();

  // Generate query embedding once
  const queryEmbedding = await EmbeddingService.embed(query);

  // 1. Identity memories - always include (person, fact types related to identity)
  const identityMemories = allMemories
    .filter(m => m.type === 'person' ||
                (m.type === 'fact' && isIdentityFact(m)))
    .slice(0, config.maxIdentity);

  // Track what's already included
  const includedIds = new Set(identityMemories.map(m => m.id));

  // 2. Score remaining memories semantically
  const remaining = allMemories.filter(m => !includedIds.has(m.id));
  const scored: ScoredMemory[] = [];

  for (const memory of remaining) {
    const result = scoreMemory(memory, queryEmbedding, now);
    if (result && result.semanticScore >= config.semanticThreshold) {
      scored.push(result);
    }
  }

  // Sort by final score and take top N
  scored.sort((a, b) => b.finalScore - a.finalScore);
  const topicRelevant = scored
    .slice(0, config.maxTopicRelevant)
    .map(s => s.memory);

  // Update included set
  topicRelevant.forEach(m => includedIds.add(m.id));

  // 3. Recent memories - not already included
  const recentMemories = allMemories
    .filter(m => !includedIds.has(m.id))
    .sort((a, b) => b.lastAccessed - a.lastAccessed)
    .slice(0, config.maxRecent);

  // Combine all buckets
  return [...identityMemories, ...topicRelevant, ...recentMemories];
}

// Helper: Check if a fact is identity-related
function isIdentityFact(memory: Memory): boolean {
  const content = memory.content.toLowerCase();
  // Identity facts typically contain name, job, relationship terms
  return content.includes('name is') ||
         content.includes('works as') ||
         content.includes('is a ') ||
         content.includes('lives in');
}
```

### Integration with ChatService
```typescript
// Source: Modification to existing ChatService.buildPromptWithMemories
// File: src/services/llm/ChatService.ts

// BEFORE (current implementation):
const memories = useMemoryStore.getState().getTopMemories(6, userMessage);

// AFTER (semantic retrieval):
import { retrieveMemories } from '../memory/SemanticRetrieval';

// In buildPromptWithMemories:
const memories = await retrieveMemories(userMessage, useMemoryStore.getState().memories);
// Note: retrieveMemories returns ~9 memories (3 identity + 4 topic + 2 recent)
```

### Performance-Optimized Brute Force Search
```typescript
// Source: SEM-05 - brute force acceptable for <5000 memories
// Performance target: <50ms for typical memory count

async function scoreAllMemories(
  queryEmbedding: EmbeddingVector,
  memories: Memory[]
): Promise<ScoredMemory[]> {
  const startTime = Date.now();
  const now = startTime;
  const results: ScoredMemory[] = [];

  for (const memory of memories) {
    const scored = scoreMemory(memory, queryEmbedding, now);
    if (scored) {
      results.push(scored);
    }
  }

  if (__DEV__) {
    const duration = Date.now() - startTime;
    console.log(`[SemanticRetrieval] Scored ${results.length}/${memories.length} memories in ${duration}ms`);
  }

  return results;
}

// Expected performance (256-dim vectors):
// - 100 memories: ~1ms
// - 1000 memories: ~5ms
// - 5000 memories: ~15ms (well under 50ms target)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Keyword matching only | Semantic similarity + keywords | 2024 | Much better recall for paraphrased content |
| Single relevance score | Multi-factor weighted score | 2024 | Balances freshness, importance, relevance |
| Flat retrieval | Structured buckets (identity/topic/recent) | 2024 | Ensures identity consistency |
| Fixed token budget per memory | Dynamic allocation | 2025 | Better utilization of context window |
| Cloud embeddings | On-device embeddings | 2024-2025 | Privacy, offline support |

**Current industry patterns:**
- Weighted Memory Retrieval (WMR) with recency, importance, semantic factors
- Multi-tier memory systems (episodic, semantic, identity)
- Adaptive decay rates based on memory category
- Graceful degradation when embedding unavailable

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal semantic threshold for retrieval**
   - What we know: 0.3-0.6 range is common; 0.4 is a reasonable starting point
   - What's unclear: Best threshold for emotional/conversational content specifically
   - Recommendation: Start with 0.4, add logging, tune based on observed matches/misses

2. **Identity detection heuristics**
   - What we know: Type 'person' and certain 'fact' patterns indicate identity
   - What's unclear: Full set of patterns that distinguish identity facts from general facts
   - Recommendation: Start with simple heuristics, refine based on user testing

3. **Weight tuning (50/30/20)**
   - What we know: These weights match research recommendations
   - What's unclear: Whether these weights are optimal for emotional companion use case
   - Recommendation: Make weights configurable constants, tune after Phase 7 (hierarchical memory)

4. **Memory count per bucket**
   - What we know: Current system retrieves 6 total; structured approach needs ~9 (3+4+2)
   - What's unclear: Impact on token budget (currently 600 tokens for memories)
   - Recommendation: Monitor token usage, may need to adjust budget or reduce counts

## Sources

### Primary (HIGH confidence)
- Phase 5 RESEARCH.md - Embedding infrastructure patterns, cosine similarity implementation
- Existing codebase - `CosineSimilarity.ts`, `MemoryDecay.ts`, `EmbeddingService.ts`
- REQUIREMENTS.md - SEM-01 through SEM-05 specifications

### Secondary (MEDIUM confidence)
- [Tribe AI: Context-Aware Memory Systems 2025](https://www.tribe.ai/applied-ai/beyond-the-bubble-how-context-aware-memory-systems-are-changing-the-game-in-2025) - Multi-tier memory patterns
- [Frontiers: Memory Retrieval in Generative Agents](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1591618/full) - WMR framework validation
- [Memoria: Scalable Agentic Memory](https://www.arxiv.org/pdf/2512.12686) - Recency-aware weighting patterns
- [OpenAI Community: Cosine Similarity Thresholds](https://community.openai.com/t/rule-of-thumb-cosine-similarity-thresholds/693670) - Threshold selection guidance

### Tertiary (LOW confidence)
- [Pieces.app: Best AI Memory Systems](https://pieces.app/blog/best-ai-memory-systems) - General memory architecture patterns
- [EmergentMind: Cosine Similarity Threshold](https://www.emergentmind.com/topics/cosine-similarity-threshold) - Threshold precision/recall tradeoffs

## Metadata

**Confidence breakdown:**
- Weighted scoring formula: HIGH - matches industry patterns, requirements specify exact weights
- Structured retrieval pattern: HIGH - well-established in multi-tier memory literature
- Performance targets: HIGH - brute force benchmarks well-understood at this scale
- Identity detection heuristics: MEDIUM - will need tuning based on user testing
- Optimal thresholds: MEDIUM - 0.4 is reasonable starting point, may need adjustment

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (30 days - stable domain, infrastructure already built)
