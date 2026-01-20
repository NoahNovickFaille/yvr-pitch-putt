# Embedding Service

On-device semantic similarity using all-MiniLM-L6-v2 via llama.rn.

## Key Files

- **EmbeddingService.ts** - Singleton managing llama.rn context for embeddings
- **EmbeddingStorage.ts** - Binary storage for embedding vectors in MMKV
- Uses separate context from chat LLM (embedding: true required)
- Model: all-MiniLM-L6-v2-Q4_K_M.gguf (21MB, 256-dim output)

## Usage

```typescript
// Initialize (call after model is downloaded)
await EmbeddingService.initialize();

// Generate embedding
const vector = await EmbeddingService.embed("user likes hiking");
// vector is number[] with 256 elements

// Release on memory pressure
EmbeddingService.release();
```

## Important Notes

- NEVER share context with LLMService - embedding models require separate init
- Initialize lazily (only when needed for memory extraction)
- Release after batch operations to conserve memory
- Model must be downloaded before initialize() will succeed

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
