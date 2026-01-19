# Phase 5: Embedding Infrastructure - Research

**Researched:** 2026-01-19
**Domain:** On-device embedding inference, vector storage, semantic deduplication
**Confidence:** HIGH

## Summary

This phase adds embedding infrastructure for semantic similarity operations. The research evaluated two viable approaches: (1) using llama.rn's built-in embedding support with a GGUF embedding model like all-MiniLM-L6-v2, or (2) using Apple's native NLContextualEmbedding via @react-native-ai/apple.

**Key finding:** llama.rn already supports embeddings natively via `context.embedding(text)` and requires only `embedding: true` during initialization. This is the recommended approach because:
- Already a dependency (no new libraries)
- Uses same Metal GPU acceleration as the chat model
- all-MiniLM-L6-v2 GGUF is ~21MB (Q4_K_M quantization)
- Single model file download, simple architecture

Apple's NLContextualEmbedding requires iOS 17+ and would add a dependency, though it has zero bundle size impact and produces 512-dimensional vectors.

**Primary recommendation:** Use llama.rn with all-MiniLM-L6-v2-Q4_K_M.gguf (~21MB) for embeddings. Store vectors as Base64-encoded Float32Array in MMKV. Implement simple cosine similarity in TypeScript for deduplication.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| llama.rn | ^0.10.0 | Embedding inference | Already used for LLM, has native embedding support |
| all-MiniLM-L6-v2 | Q4_K_M | Embedding model | 384-dim vectors, 21MB, MTEB-validated quality |
| react-native-mmkv | ^4.1.1 | Vector storage | Already used, supports ArrayBuffer natively |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | - | Cosine similarity | Hand-roll ~15 lines TypeScript |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| llama.rn embeddings | @react-native-ai/apple | Requires iOS 17+, adds dependency, but zero model download |
| all-MiniLM-L6-v2 | EmbeddingGemma | Larger (200MB+) but higher quality, overkill for dedup |
| MMKV ArrayBuffer | SQLite with vector extension | More complex, not needed for <10K vectors |

**Model Download URL:**
```
https://huggingface.co/second-state/All-MiniLM-L6-v2-Embedding-GGUF/resolve/main/all-MiniLM-L6-v2-Q4_K_M.gguf
```

File size: ~21MB
Dimensions: 384
Context window: 256 tokens

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
│       └── MemoryExtractor.ts       # Modified to generate embeddings
├── constants/
│   └── embedding.ts                 # Model config, thresholds
└── types/
    └── embedding.ts                 # EmbeddingVector, SimilarityResult types
```

### Pattern 1: Separate Embedding Context
**What:** Initialize a dedicated llama.rn context for embeddings, separate from the chat context
**When to use:** Always - embedding models require `embedding: true` flag which is incompatible with chat
**Example:**
```typescript
// Source: llama.rn README
import { initLlama } from 'llama.rn';

class EmbeddingService {
  private context: LlamaContext | null = null;

  async initialize(modelPath: string): Promise<void> {
    this.context = await initLlama({
      model: modelPath,
      embedding: true,  // REQUIRED for embedding mode
      n_ctx: 256,       // all-MiniLM-L6-v2 max context
      n_gpu_layers: 99, // Metal acceleration
      use_mlock: true,
    });
  }

  async embed(text: string): Promise<number[]> {
    if (!this.context) throw new Error('EmbeddingService not initialized');
    const result = await this.context.embedding(text);
    return result.embedding; // Array<number> with 384 elements
  }
}
```

### Pattern 2: Background Embedding Generation
**What:** Generate embeddings after memory extraction, not blocking UI
**When to use:** Always - embeddings run in background after extraction completes
**Example:**
```typescript
// In MemoryOrchestrator after extraction
const extracted = await extractMemories(conversationText);

if (extracted.length > 0) {
  // Store memories first (fast)
  useMemoryStore.getState().addMemories(extracted);

  // Queue embedding generation (background, non-blocking)
  InteractionManager.runAfterInteractions(async () => {
    for (const memory of extracted) {
      const embedding = await EmbeddingService.embed(memory.content);
      await EmbeddingStorage.store(memory.id, embedding);
    }
  });
}
```

### Pattern 3: Vector Storage as Base64
**What:** Store Float32Array as Base64 string in MMKV
**When to use:** For embedding persistence - more portable than raw ArrayBuffer
**Example:**
```typescript
// Encode for storage
function encodeEmbedding(embedding: number[]): string {
  const float32 = new Float32Array(embedding);
  const bytes = new Uint8Array(float32.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Decode from storage
function decodeEmbedding(base64: string): number[] {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return Array.from(new Float32Array(bytes.buffer));
}
```

### Anti-Patterns to Avoid
- **Sharing context between chat and embedding:** Chat models cannot generate embeddings - requires separate context with `embedding: true`
- **Blocking UI during embedding:** Always use InteractionManager or background scheduling
- **Storing raw Float32Array:** MMKV getBuffer returns raw bytes that need careful handling - Base64 is more reliable
- **Re-computing embeddings on every memory access:** Store once, retrieve from MMKV

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Embedding inference | Custom ONNX/CoreML pipeline | llama.rn `context.embedding()` | Already integrated, Metal-accelerated |
| Vector normalization | Manual L2 norm | Model does it (all-MiniLM outputs normalized) | Embedding models output unit vectors |
| Batch embedding | Custom batching logic | Sequential with InteractionManager | Batch adds complexity, single calls are <50ms |

**Key insight:** The embedding model is small enough (~21MB) that initialization is fast (<1s) and per-embedding inference is <50ms on Metal. Complex batching or caching strategies are unnecessary overhead.

## Common Pitfalls

### Pitfall 1: Initializing Embedding Context During Chat
**What goes wrong:** Embedding context competes with chat context for Metal/GPU resources
**Why it happens:** Both contexts try to use GPU simultaneously
**How to avoid:** Initialize embedding context lazily, only when needed (after extraction). Consider releasing chat context during heavy embedding work.
**Warning signs:** Memory warnings, slow inference, context failures

### Pitfall 2: Using Wrong Similarity Threshold
**What goes wrong:** Too low (0.7) creates false duplicates, too high (0.95) misses real duplicates
**Why it happens:** Semantic similarity is subjective, 0.85 is empirically good for short text dedup
**How to avoid:** Start with 0.85, tune based on observed merges. Log similarity scores during development.
**Warning signs:** Unrelated memories being merged, or nearly identical memories not being merged

### Pitfall 3: Forgetting to Handle Missing Embeddings
**What goes wrong:** Crash when comparing memories without embeddings (migration incomplete)
**Why it happens:** Old memories exist before embedding system was added
**How to avoid:** Always check for embedding existence before similarity comparison. Fall back to no-match (similarity = 0) for missing embeddings.
**Warning signs:** Undefined access errors, NaN in similarity calculations

### Pitfall 4: Blocking Migration on App Start
**What goes wrong:** App hangs on first launch after update while migrating embeddings
**Why it happens:** Trying to embed all existing memories synchronously
**How to avoid:** Use background task with progress tracking. Embed in small batches with `requestAnimationFrame` or `InteractionManager` between batches.
**Warning signs:** Unresponsive UI on first launch, memory warnings

### Pitfall 5: Comparing Embeddings from Different Models
**What goes wrong:** Completely wrong similarity scores, potentially crashes
**Why it happens:** Different models produce incompatible vector spaces
**How to avoid:** Store model identifier with embeddings. Invalidate all embeddings if model changes.
**Warning signs:** All similarities near 0 or 1, dimension mismatch errors

## Code Examples

Verified patterns from official sources:

### Cosine Similarity (Hand-roll this)
```typescript
// Source: Standard algorithm, adapted from multiple implementations
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
```

### llama.rn Embedding API
```typescript
// Source: llama.rn types.d.ts
// NativeEmbeddingResult = { embedding: Array<number> }

// Direct embedding call
const result = await context.embedding(text);
console.log(result.embedding.length); // 384 for all-MiniLM-L6-v2

// Parallel embedding (non-blocking queue)
const { requestId, promise } = await context.parallel.embedding(text);
const result = await promise;
```

### MMKV Buffer Storage
```typescript
// Source: react-native-mmkv README
// Store embedding as ArrayBuffer
const float32 = new Float32Array(embedding);
storage.set(`embedding:${memoryId}`, float32.buffer);

// Retrieve embedding
const buffer = storage.getBuffer(`embedding:${memoryId}`);
if (buffer) {
  const embedding = Array.from(new Float32Array(buffer));
}
```

### Deduplication Logic
```typescript
// Check if new memory is duplicate of existing
async function findDuplicate(
  newContent: string,
  existingMemories: Memory[],
  threshold: number = 0.85
): Promise<Memory | null> {
  const newEmbedding = await EmbeddingService.embed(newContent);

  for (const memory of existingMemories) {
    const storedEmbedding = EmbeddingStorage.get(memory.id);
    if (!storedEmbedding) continue;

    const similarity = cosineSimilarity(newEmbedding, storedEmbedding);
    if (similarity >= threshold) {
      return memory; // Found duplicate
    }
  }

  return null; // No duplicate found
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cloud embeddings (OpenAI ada-002) | On-device (MiniLM, Apple NL) | 2024 | Privacy, offline support |
| Large models (500MB+) | Quantized small models (~20MB) | 2024 | Mobile feasibility |
| SQLite vector extensions | Simple key-value storage | Current | Simplicity for <10K vectors |
| sentence-transformers Python | llama.cpp/llama.rn GGUF | 2024 | Cross-platform native inference |

**Deprecated/outdated:**
- react-native-transformers: Deprecated as of July 2025, no longer maintained
- Large embedding models on mobile: Memory constraints make >100MB models impractical
- Cloud-only embeddings: Privacy concerns, offline requirement

## Open Questions

Things that couldn't be fully resolved:

1. **Exact embedding inference time on target devices**
   - What we know: Benchmarks suggest <50ms on iPhone 16 Pro with Metal
   - What's unclear: Performance on older devices (iPhone 12, 13)
   - Recommendation: Add timing logs, consider timeout/fallback for slow devices

2. **Optimal deduplication threshold**
   - What we know: 0.85 is commonly used, adjustable
   - What's unclear: Best threshold for emotional/memory content specifically
   - Recommendation: Start with 0.85, add logging, tune based on observed behavior

3. **Memory pressure with two llama.rn contexts**
   - What we know: Both chat and embedding contexts use Metal
   - What's unclear: Whether simultaneous contexts cause issues
   - Recommendation: Initialize embedding context lazily, release when not in active use

## Sources

### Primary (HIGH confidence)
- [llama.rn GitHub](https://github.com/mybigday/llama.rn) - README, TypeScript definitions for embedding API
- [react-native-mmkv GitHub](https://github.com/mrousavy/react-native-mmkv) - ArrayBuffer storage API
- [second-state/All-MiniLM-L6-v2-Embedding-GGUF](https://huggingface.co/second-state/All-MiniLM-L6-v2-Embedding-GGUF) - Model files, quantization options

### Secondary (MEDIUM confidence)
- [Callstack: On-Device Text Embeddings](https://www.callstack.com/blog/on-device-ai-introducing-apple-embeddings-in-react-native) - Apple NLContextualEmbedding details
- [React Native AI Docs: Embeddings](https://www.react-native-ai.dev/docs/apple/embeddings) - API documentation, performance benchmarks
- [llama.cpp Discussion #7712](https://github.com/ggml-org/llama.cpp/discussions/7712) - Embedding model usage tutorial

### Tertiary (LOW confidence)
- WebSearch results for cosine similarity implementations - verified against standard algorithm
- WebSearch results for mobile embedding performance - needs device testing to validate

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - llama.rn embedding support verified in TypeScript definitions and README
- Architecture: HIGH - Follows established llama.rn patterns already used in codebase
- Pitfalls: MEDIUM - Based on general embedding/mobile knowledge, some needs validation

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (30 days - stable domain)
