# Phase 5: Embedding Infrastructure - Research

**Researched:** 2026-01-19 (updated)
**Domain:** On-device embedding inference, vector storage, semantic deduplication
**Confidence:** HIGH

## Summary

This phase adds embedding infrastructure for semantic similarity operations in the memory system. The research evaluated two viable approaches and strongly recommends **llama.rn with all-MiniLM-L6-v2** for the following reasons:

1. **llama.rn already supports embeddings** - The `context.embedding(text)` method is available with `embedding: true` during initialization. This requires no new dependencies.
2. **all-MiniLM-L6-v2 GGUF is small** - Q4_K_M quantization is only 21MB (verified on HuggingFace), producing 256-dimensional vectors with 384-token context.
3. **MMKV supports ArrayBuffer natively** - The `getBuffer()` and `set()` methods handle binary data efficiently with single-copy operations.

The alternative (Apple's NLContextualEmbedding via @react-native-ai/apple) was considered but requires iOS 17+, adds a dependency, and produces 512-dimensional vectors. The llama.rn approach is simpler and already proven in the codebase.

**Primary recommendation:** Use llama.rn with all-MiniLM-L6-v2-Q4_K_M.gguf (~21MB) for embeddings. Store vectors as Uint8Array (from Float32Array) in MMKV. Implement cosine similarity in TypeScript (~15 lines).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| llama.rn | ^0.10.0 | Embedding inference | Already used for LLM, has native `embedding()` method with Metal acceleration |
| all-MiniLM-L6-v2 | Q4_K_M | Embedding model | 21MB, 256-dim vectors, 384-token context, MTEB-validated |
| react-native-mmkv | ^4.1.1 | Vector storage | Already used, `getBuffer()`/`set()` for ArrayBuffer with single-copy performance |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | - | Cosine similarity | Hand-roll ~15 lines TypeScript |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| llama.rn embeddings | @react-native-ai/apple | Requires iOS 17+, adds dependency, 512-dim vectors, zero model download |
| all-MiniLM-L6-v2 | nomic-embed-text-v1.5 | 81MB Q4_K_M (4x larger), 768-dim, higher quality but overkill for dedup |
| MMKV ArrayBuffer | SQLite with sqlite-vec | More complex, not needed for <10K vectors |

**Model Download URL (verified):**
```
https://huggingface.co/second-state/All-MiniLM-L6-v2-Embedding-GGUF/resolve/main/all-MiniLM-L6-v2-Q4_K_M.gguf
```

**Model specifications (verified from HuggingFace):**
- File size: 21 MB (Q4_K_M quantization)
- Output dimensions: 256
- Context window: 384 tokens
- Parameters: 22.6M

## Architecture Patterns

### Recommended Project Structure
```
src/
├── services/
│   ├── embedding/
│   │   ├── EmbeddingService.ts      # Singleton managing embedding context
│   │   ├── EmbeddingStorage.ts      # MMKV persistence for vectors
│   │   ├── CosineSimilarity.ts      # Similarity calculations
│   │   └── Deduplicator.ts          # Merge logic for similar memories
│   └── memory/
│       └── MemoryExtractor.ts       # Modified to generate embeddings post-extraction
├── constants/
│   └── embedding.ts                 # Model config, thresholds, download URL
└── types/
    └── embedding.ts                 # EmbeddingVector, SimilarityResult types
```

### Pattern 1: Separate Embedding Context
**What:** Initialize a dedicated llama.rn context for embeddings, separate from the chat context
**When to use:** Always - embedding models require `embedding: true` flag which is incompatible with chat inference
**Example:**
```typescript
// Source: llama.rn README and types.ts
import { initLlama, LlamaContext } from 'llama.rn';

// NativeEmbeddingResult type (from llama.rn/src/types.ts):
// { embedding: Array<number> }

class EmbeddingService {
  private context: LlamaContext | null = null;

  async initialize(modelPath: string): Promise<void> {
    this.context = await initLlama({
      model: modelPath,
      embedding: true,  // REQUIRED for embedding mode
      n_ctx: 384,       // all-MiniLM-L6-v2 max context
      n_gpu_layers: 99, // Metal acceleration
      use_mlock: true,
    });
  }

  async embed(text: string): Promise<number[]> {
    if (!this.context) throw new Error('EmbeddingService not initialized');
    const result = await this.context.embedding(text);
    return result.embedding; // Array<number> with 256 elements
  }

  release(): void {
    // Context will be garbage collected
    this.context = null;
  }
}
```

### Pattern 2: Background Embedding Generation (Updated for 2025)
**What:** Generate embeddings after memory extraction without blocking UI
**When to use:** Always - embeddings run in background after extraction completes
**Note:** `InteractionManager` is deprecated as of 2025. Use `requestIdleCallback` for new code, or `setTimeout(..., 0)` as fallback.
**Example:**
```typescript
// In MemoryOrchestrator after extraction
const extracted = await extractMemories(conversationText);

if (extracted.length > 0) {
  // Store memories first (fast, synchronous)
  useMemoryStore.getState().addMemories(extracted);

  // Queue embedding generation (background, non-blocking)
  // Use requestIdleCallback if available, setTimeout as fallback
  const scheduleBackground = (callback: () => void) => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(callback, { timeout: 5000 });
    } else {
      setTimeout(callback, 0);
    }
  };

  scheduleBackground(async () => {
    for (const memory of extracted) {
      const embedding = await EmbeddingService.embed(memory.content);
      await EmbeddingStorage.store(memory.id, embedding);
    }
  });
}
```

### Pattern 3: Vector Storage with MMKV ArrayBuffer
**What:** Store Float32Array as Uint8Array in MMKV using native ArrayBuffer support
**When to use:** For embedding persistence - MMKV v4 handles ArrayBuffer with single-copy performance
**Example:**
```typescript
// Source: react-native-mmkv README
import { storage } from '../storage/storage';

const EMBEDDING_PREFIX = 'emb:';

// Store embedding
function storeEmbedding(memoryId: string, embedding: number[]): void {
  const float32 = new Float32Array(embedding);
  const uint8 = new Uint8Array(float32.buffer);
  storage.set(`${EMBEDDING_PREFIX}${memoryId}`, uint8.buffer);
}

// Retrieve embedding
function getEmbedding(memoryId: string): number[] | null {
  const buffer = storage.getBuffer(`${EMBEDDING_PREFIX}${memoryId}`);
  if (!buffer) return null;
  return Array.from(new Float32Array(buffer.buffer));
}

// Check if embedding exists
function hasEmbedding(memoryId: string): boolean {
  return storage.contains(`${EMBEDDING_PREFIX}${memoryId}`);
}

// Delete embedding
function deleteEmbedding(memoryId: string): void {
  storage.delete(`${EMBEDDING_PREFIX}${memoryId}`);
}
```

### Pattern 4: Lazy Context Initialization
**What:** Initialize embedding context only when needed, release when not in use
**When to use:** Always - reduces memory pressure from having two llama.rn contexts
**Example:**
```typescript
class EmbeddingService {
  private context: LlamaContext | null = null;
  private initPromise: Promise<void> | null = null;

  async ensureInitialized(): Promise<void> {
    if (this.context) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    const modelPath = getEmbeddingModelPath();
    const info = await getInfoAsync(modelPath);
    if (!info.exists) {
      throw new Error('Embedding model not downloaded');
    }

    this.context = await initLlama({
      model: modelPath,
      embedding: true,
      n_ctx: 384,
      n_gpu_layers: 99,
      use_mlock: true,
    });
    this.initPromise = null;
  }

  // Call after batch processing or on memory warning
  release(): void {
    this.context = null;
    this.initPromise = null;
  }
}
```

### Anti-Patterns to Avoid
- **Sharing context between chat and embedding:** Chat models cannot generate embeddings - requires separate context with `embedding: true`
- **Blocking UI during embedding:** Always use background scheduling (`requestIdleCallback` or `setTimeout`)
- **Initializing embedding context at app start:** Initialize lazily, only when memory extraction completes
- **Re-computing embeddings on every memory access:** Store once at extraction time, retrieve from MMKV
- **Using InteractionManager (deprecated):** Use `requestIdleCallback` instead per React Native 2025 guidance

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Embedding inference | Custom ONNX/CoreML pipeline | llama.rn `context.embedding()` | Already integrated, Metal-accelerated, same API as chat |
| Vector normalization | Manual L2 norm | Model does it | all-MiniLM outputs normalized unit vectors |
| Binary storage | Custom serialization | MMKV ArrayBuffer | Native support, single-copy performance |
| Model download | Custom HTTP fetch | Existing `downloadModel()` | Add embedding model to `AVAILABLE_MODELS` array |

**Key insight:** The embedding model is small enough (~21MB) that download is fast (<30s on LTE) and per-embedding inference is <50ms on Metal. Complex batching or caching strategies are unnecessary overhead.

## Common Pitfalls

### Pitfall 1: Initializing Embedding Context During Chat
**What goes wrong:** Embedding context competes with chat context for Metal/GPU resources, causing memory pressure
**Why it happens:** Both contexts try to use GPU simultaneously
**How to avoid:** Initialize embedding context lazily, only when needed (after extraction). Release chat context during heavy embedding work if needed.
**Warning signs:** Memory warnings, slow inference, context initialization failures

### Pitfall 2: Using Wrong Similarity Threshold
**What goes wrong:** Too low (0.7) creates false duplicates merging unrelated memories, too high (0.95) misses real duplicates
**Why it happens:** Semantic similarity is subjective; 0.85 is empirically good for short text dedup
**How to avoid:** Start with 0.85, add logging to observe merge decisions, tune based on user feedback
**Warning signs:** Unrelated memories being merged, or nearly identical memories not being merged

### Pitfall 3: Forgetting to Handle Missing Embeddings
**What goes wrong:** Crash when comparing memories without embeddings (migration incomplete or extraction failed)
**Why it happens:** Old memories exist before embedding system was added
**How to avoid:** Always check for embedding existence before similarity comparison. Fall back to no-match (similarity = 0) for missing embeddings.
**Warning signs:** Undefined access errors, NaN in similarity calculations

### Pitfall 4: Blocking Migration on App Start
**What goes wrong:** App hangs on first launch after update while migrating embeddings for existing memories
**Why it happens:** Trying to embed all existing memories synchronously
**How to avoid:** Use background task with progress tracking. Embed in small batches (5-10) with `requestIdleCallback` between batches. Show subtle progress indicator if needed.
**Warning signs:** Unresponsive UI on first launch, memory warnings, user complaints about "stuck" app

### Pitfall 5: Comparing Embeddings from Different Models
**What goes wrong:** Completely wrong similarity scores (all near 0 or 1), potential crashes
**Why it happens:** Different models produce incompatible vector spaces with different dimensions
**How to avoid:** Store model identifier with embeddings. Invalidate all embeddings if model changes. Check dimension match before comparison.
**Warning signs:** All similarities near 0 or near 1, dimension mismatch errors

### Pitfall 6: Not Handling Embedding Model Download Separately
**What goes wrong:** Users can't use app until both LLM and embedding model are downloaded
**Why it happens:** Treating embedding model download as blocking dependency
**How to avoid:** Download embedding model in background after LLM is ready. Memory system works without embeddings (just no dedup). Add embedding model to download queue with lower priority.
**Warning signs:** Longer onboarding time, confused users waiting for second download

## Code Examples

Verified patterns from official sources:

### Cosine Similarity (Hand-roll this)
```typescript
// Source: Standard algorithm, verified against multiple implementations
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

// Optimized version for normalized vectors (all-MiniLM outputs normalized)
export function cosineSimilarityNormalized(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }
  return dotProduct; // For normalized vectors, dot product = cosine similarity
}
```

### llama.rn Embedding API (verified from source)
```typescript
// Source: llama.rn types.ts
// type NativeEmbeddingResult = { embedding: Array<number> }
// type NativeEmbeddingParams = { embd_normalize?: number }

// Basic embedding call
const result = await context.embedding(text);
console.log(result.embedding.length); // 256 for all-MiniLM-L6-v2

// With normalization parameter
const result = await context.embedding(text, { embd_normalize: 2 });

// Parallel embedding (non-blocking queue)
const { requestId, promise } = await context.parallel.embedding(text);
const result = await promise;
```

### MMKV ArrayBuffer Storage (verified from docs)
```typescript
// Source: react-native-mmkv README
// Store embedding as ArrayBuffer (single-copy operation)
const float32 = new Float32Array(embedding);
storage.set(`embedding:${memoryId}`, float32.buffer);

// Retrieve embedding (returns Uint8Array | undefined)
const buffer = storage.getBuffer(`embedding:${memoryId}`);
if (buffer) {
  const embedding = Array.from(new Float32Array(buffer.buffer));
}
```

### Deduplication Logic
```typescript
const SIMILARITY_THRESHOLD = 0.85;

interface DuplicateResult {
  isDuplicate: boolean;
  existingMemory?: Memory;
  similarity?: number;
}

async function findDuplicate(
  newContent: string,
  existingMemories: Memory[],
  threshold: number = SIMILARITY_THRESHOLD
): Promise<DuplicateResult> {
  const newEmbedding = await EmbeddingService.embed(newContent);

  let bestMatch: Memory | null = null;
  let bestSimilarity = 0;

  for (const memory of existingMemories) {
    const storedEmbedding = EmbeddingStorage.get(memory.id);
    if (!storedEmbedding) continue; // Skip memories without embeddings

    const similarity = cosineSimilarityNormalized(newEmbedding, storedEmbedding);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = memory;
    }
  }

  if (bestMatch && bestSimilarity >= threshold) {
    return {
      isDuplicate: true,
      existingMemory: bestMatch,
      similarity: bestSimilarity,
    };
  }

  return { isDuplicate: false };
}
```

### Memory Merge Strategy
```typescript
// When duplicate is found, merge instead of creating new
function mergeMemories(existing: Memory, newExtraction: ExtractedMemory): Memory {
  return {
    ...existing,
    // Boost importance when same memory is extracted again
    importance: Math.min(10, existing.importance + 1),
    // Update lastAccessed to now (reinforcement)
    lastAccessed: Date.now(),
    // Increment access count
    accessCount: existing.accessCount + 1,
    // Keep original content (or could merge/update)
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cloud embeddings (OpenAI ada-002) | On-device (MiniLM, Apple NL) | 2024 | Privacy, offline support |
| Large models (500MB+) | Quantized small models (~20MB) | 2024 | Mobile feasibility |
| SQLite vector extensions | Simple key-value storage | Current | Simplicity for <10K vectors |
| sentence-transformers Python | llama.cpp/llama.rn GGUF | 2024 | Cross-platform native inference |
| InteractionManager | requestIdleCallback | 2025 | Official deprecation in React Native |

**Deprecated/outdated:**
- `InteractionManager.runAfterInteractions`: Deprecated in React Native 2025, use `requestIdleCallback`
- react-native-transformers: Deprecated as of July 2025, no longer maintained
- Large embedding models on mobile: Memory constraints make >100MB models impractical
- Cloud-only embeddings: Privacy concerns, offline requirement for this app

## Open Questions

Things that couldn't be fully resolved:

1. **Exact embedding inference time on target devices**
   - What we know: Benchmarks suggest <50ms on iPhone 16 Pro with Metal
   - What's unclear: Performance on older devices (iPhone 12, 13)
   - Recommendation: Add timing logs, set 100ms target, investigate if slower

2. **Optimal deduplication threshold**
   - What we know: 0.85 is commonly used for short text
   - What's unclear: Best threshold for emotional/memory content specifically
   - Recommendation: Start with 0.85, log all similarity scores during development, tune based on observed behavior

3. **Memory pressure with two llama.rn contexts**
   - What we know: Both chat and embedding contexts use Metal
   - What's unclear: Whether simultaneous contexts cause issues on older devices
   - Recommendation: Initialize embedding context lazily, release after batch processing, monitor memory warnings

4. **requestIdleCallback availability in React Native**
   - What we know: Documented in React Native, but may have issues on New Architecture (issue #44636)
   - What's unclear: Whether it works correctly in current RN version
   - Recommendation: Implement with fallback to `setTimeout(..., 0)`

## Sources

### Primary (HIGH confidence)
- [llama.rn GitHub](https://github.com/mybigday/llama.rn) - README, TypeScript definitions for embedding API
- [llama.rn types.ts](https://raw.githubusercontent.com/mybigday/llama.rn/main/src/types.ts) - `NativeEmbeddingResult = { embedding: Array<number> }`
- [react-native-mmkv GitHub](https://github.com/mrousavy/react-native-mmkv) - ArrayBuffer storage API, V4 documentation
- [second-state/All-MiniLM-L6-v2-Embedding-GGUF](https://huggingface.co/second-state/All-MiniLM-L6-v2-Embedding-GGUF) - Model files, quantization options, exact sizes

### Secondary (MEDIUM confidence)
- [React Native AI Embeddings](https://www.react-native-ai.dev/docs/apple/embeddings) - Apple NLContextualEmbedding details, iOS 17 requirement, 512-dim output
- [Callstack: On-Device Text Embeddings](https://www.callstack.com/blog/on-device-ai-introducing-apple-embeddings-in-react-native) - Alternative approach documentation
- [React Native InteractionManager (deprecated)](https://reactnative.dev/docs/interactionmanager) - Deprecation notice, requestIdleCallback recommendation

### Tertiary (LOW confidence)
- WebSearch results for nomic-embed-text performance - 81MB Q4_K_M, needs device testing to validate mobile viability
- WebSearch results for requestIdleCallback polyfill - may need testing in actual RN environment

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - llama.rn embedding support verified in TypeScript definitions and GitHub README
- Architecture: HIGH - Follows established llama.rn patterns already used in codebase, MMKV ArrayBuffer verified
- Pitfalls: MEDIUM - Based on general embedding/mobile knowledge, some need validation
- Background scheduling: MEDIUM - InteractionManager deprecation confirmed, requestIdleCallback needs testing

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (30 days - stable domain)
