# Embedding Service

On-device semantic similarity using all-MiniLM-L6-v2 via llama.rn.

## Key Files

| File | Purpose |
|------|---------|
| `EmbeddingService.ts` | Singleton managing llama.rn context for embeddings |
| `EmbeddingStorage.ts` | Binary storage for embedding vectors in MMKV |
| `CosineSimilarity.ts` | Optimized cosine similarity for normalized vectors |
| `Deduplicator.ts` | Semantic duplicate detection with memory merging |
| `EmbeddingMigration.ts` | Migrates pre-embedding memories by generating embeddings |
| `index.ts` | Public exports |

## Model Details

- **Model**: all-MiniLM-L6-v2-Q4_K_M.gguf
- **Size**: ~21MB
- **Dimensions**: 256
- **Max tokens**: 384
- Uses separate llama.rn context from chat LLM (`embedding: true` required)

## Usage

```typescript
import { EmbeddingService } from './EmbeddingService';

// Initialize (call after model is downloaded)
await EmbeddingService.initialize();

// Generate embedding
const vector = await EmbeddingService.embed("user likes hiking");
// vector is number[] with 256 elements

// Check if ready
if (EmbeddingService.isReady()) {
  // Safe to use
}

// Release on memory pressure
EmbeddingService.release();
```

## Deduplication

Semantic duplicate detection before storing new memories.

### How It Works

```typescript
import { findDuplicate, mergeMemories } from './Deduplicator';

// Check if new memory is a duplicate
const result = await findDuplicate(newContent, existingMemories);

if (result.isDuplicate && result.existingMemory) {
  // Merge: boost importance, refresh access time
  const updated = mergeMemories(result.existingMemory, newType, newContent);
  memoryStore.updateMemory(updated);
} else {
  // Add as new memory
  memoryStore.addMemories([{ content: newContent, category: inferredCategory }]);
}
```

### Threshold

- **DEDUPLICATION_THRESHOLD**: 0.85
- High threshold = finds near-identical content only
- Lower than retrieval threshold (0.4) because dedup needs precision, retrieval needs recall

### Merge Behavior

When duplicate detected:
- Importance boosted by +1 (capped at 10)
- `lastAccessed` refreshed to now
- `accessCount` incremented
- Content preserved from existing memory

## Cosine Similarity

Optimized similarity calculation for normalized embedding vectors.

```typescript
import { cosineSimilarityNormalized } from './CosineSimilarity';

// For normalized vectors (output from all-MiniLM-L6-v2)
const similarity = cosineSimilarityNormalized(vectorA, vectorB);
// Returns -1 to 1, where 1 = identical
```

The `cosineSimilarityNormalized` function is optimized for pre-normalized vectors (which all-MiniLM-L6-v2 outputs), avoiding the normalization overhead.

## Embedding Storage

Binary storage for 256-dim float vectors in MMKV.

```typescript
import { storeEmbedding, getEmbedding, deleteEmbedding } from './EmbeddingStorage';

// Store embedding for a memory
storeEmbedding(memoryId, vector);

// Retrieve embedding
const vector = getEmbedding(memoryId);
// Returns number[] or null if not found

// Delete embedding
deleteEmbedding(memoryId);
```

Vectors are stored as Float32Array binary for efficient MMKV storage.

## Migration

Generates embeddings for pre-existing memories that don't have them.

```typescript
import { migrateMemoriesToEmbeddings } from './EmbeddingMigration';

// Run on app startup (after EmbeddingService is ready)
await migrateMemoriesToEmbeddings();
```

The migration:
1. Finds memories without embeddings
2. Generates embedding for each
3. Stores in EmbeddingStorage
4. Runs incrementally (can resume if interrupted)

## Integration with Memory System

### During Extraction

1. MemoryExtractor extracts memories from conversation
2. For each extracted memory:
   - Deduplicator.findDuplicate() checks existing memories
   - If duplicate → mergeMemories() updates existing
   - If new → EmbeddingService.embed() generates vector
   - EmbeddingStorage.storeEmbedding() persists vector

### During Retrieval

1. SemanticRetrieval.retrieveMemories() called with user query
2. EmbeddingService.embed() generates query vector
3. For each memory:
   - EmbeddingStorage.getEmbedding() loads vector
   - cosineSimilarityNormalized() computes similarity
4. Memories scored: semantic×0.5 + decay×0.3 + importance×0.2
5. 3-bucket selection: identity (3) + topic-relevant (4) + recent (2)

## Hook Usage

```typescript
import { useEmbeddingModel } from '../hooks/useEmbeddingModel';

function MyComponent() {
  const { isDownloaded, isReady, startDownload, downloadProgress } = useEmbeddingModel();

  if (!isDownloaded) {
    return <Button onPress={startDownload}>Download ({downloadProgress}%)</Button>;
  }

  if (!isReady) {
    return <Text>Initializing embedding model...</Text>;
  }

  // Can now use EmbeddingService.embed()
}
```

## Memory Considerations

- Embedding context uses ~50MB when loaded (vs ~1.5GB for chat LLM)
- Can coexist with chat LLM in memory on modern iPhones
- Release on memory warning via EmbeddingService.release()
- Re-initialize when needed via EmbeddingService.initialize()

## Important Notes

- NEVER share context with LLMService - embedding models require separate init
- Initialize lazily (only when needed for memory extraction)
- Release after batch operations to conserve memory
- Model must be downloaded before initialize() will succeed
- Graceful degradation: If EmbeddingService not ready, deduplication skipped and retrieval falls back to keyword matching

## Debugging

```typescript
if (__DEV__) {
  console.log('[EmbeddingService] Initialized');
  console.log('[Deduplicator] Found duplicate: ...', similarity);
  console.log('[EmbeddingStorage] Stored embedding for:', memoryId);
}
```

Key log prefixes:
- `[EmbeddingService]` - Context lifecycle
- `[Deduplicator]` - Duplicate detection
- `[EmbeddingStorage]` - Vector storage operations
- `[EmbeddingMigration]` - Migration progress
