# Core Services

Business logic layer for LLM inference, memory management, model downloads, safety checks, speech recognition, and semantic embeddings.

## Directory Structure

### llm/
Core LLM functionality:
- **LLMService** - Singleton managing llama.rn context lifecycle (init, release, inference)
- **ChatService** - High-level chat orchestration (user message → memory retrieval → LLM → response)
- **systemPrompt** - Constructs system prompt with structured memory context injection
- **TokenBudget** - Calculates and enforces 4096 token context window limits
- **memoryMonitor** - iOS memory pressure monitoring (releases LLM on warning)

### memory/
Persistent memory system with semantic retrieval:
- **MemoryExtractor** - Uses LLM to parse conversations into structured Memory objects (6 semantic categories)
- **MemoryDecay** - Exponential decay calculations with category-specific half-lives
- **MemoryOrchestrator** - Coordinates extraction, storage, and retrieval
- **SemanticRetrieval** - 3-bucket memory retrieval (identity + topic-relevant + recent)
- **extractionPrompt** - LLM prompt for memory extraction (JSON schema with categories)

### embedding/
On-device semantic similarity:
- **EmbeddingService** - Singleton managing llama.rn context for embeddings (all-MiniLM-L6-v2)
- **EmbeddingStorage** - Binary storage for 256-dim embedding vectors in MMKV
- **CosineSimilarity** - Optimized cosine similarity for normalized vectors
- **Deduplicator** - Semantic duplicate detection (0.85 threshold) with memory merging
- **EmbeddingMigration** - Migrates pre-embedding memories by generating embeddings

### download/
Model file download management:
- Background downloads with progress tracking
- Resume support for interrupted downloads
- File integrity verification
- Uses `@kesha-antonov/react-native-background-downloader`

### safety/
Crisis detection system:
- Keyword-based pattern matching for self-harm/crisis language
- Triggers modal with crisis resources (988, Crisis Text Line, IASP)
- Runs on EVERY user message before LLM processing
- Non-blocking - conversation continues after acknowledgment

### speech/
Voice input integration:
- Wraps `@jamsch/expo-speech-recognition`
- On-device transcription (no network calls)
- Push-to-talk interface support
- Handles permissions and error states

## Key Patterns

### Service Initialization
Most services are stateless singletons. LLMService and EmbeddingService maintain contexts but can release/re-init.

### Context Window Management
CRITICAL: 4096 token budget shared between:
1. System prompt: 500 tokens
2. Memories: 650 tokens (605 content + 45 headers for structured sections)
3. Conversation history: 2000 tokens (~20-30 messages)
4. Response buffer: 900 tokens
5. Overhead: ~46 tokens

Note: While models support larger contexts (Llama: 128K, Gemma: 8K), 4K balances memory usage and capacity on mobile.

TokenBudget.ts calculates token counts and truncates history if needed.

### Memory Extraction Flow
1. Conversation ends (app backgrounded or user leaves chat)
2. MemoryOrchestrator checks guards (LLM ready, cooldown, user idle)
3. MemoryExtractor sends to LLM with extraction prompt
4. LLM returns JSON with 6 semantic categories (identity, relationship, preference, situation, event, emotion)
5. Deduplicator checks each memory against existing via embeddings (0.85 threshold)
6. Duplicate memories merged (importance boosted); new memories get embeddings generated
7. Memories stored in MMKV with category-based importance + decay rate

### Memory Retrieval Flow
1. SemanticRetrieval uses 3-bucket architecture:
   - Identity bucket (3): Always-included core facts
   - Topic-relevant bucket (4): Semantically similar to query (≥0.4 threshold)
   - Recent bucket (2): Most recently accessed
2. Weighted scoring: semantic×0.5 + decay×0.3 + importance×0.2
3. TokenBudget.buildStructuredMemorySection organizes into About/Situation/Context headers
4. Falls back to keyword matching if EmbeddingService not ready

### iOS Memory Management
App monitors iOS memory warnings:
- Immediate LLM context release (prevents app termination)
- EmbeddingService can also release on memory pressure
- Re-initialization on next user message
- Graceful degradation (shows loading state during re-init)

## Important Notes

- LLMService is thread-safe but llama.rn operations block the JS thread during inference
- EmbeddingService uses separate context from LLMService (embedding: true required)
- Memory extraction runs in background (not real-time during chat)
- All persistence uses synchronous MMKV operations
- Safety checks use simple regex patterns (no ML-based detection)
- Model files stored in app Documents directory:
  - Chat models: ~1.7-2GB depending on model (Q4_K_M quantization)
  - Embedding model: ~21MB for all-MiniLM-L6-v2

## Available Chat Models

Three models optimized for confidant/companion use (defined in `src/constants/model.ts`):

| Model | Parameters | Size | Personality |
|-------|------------|------|-------------|
| **Llama 3.2 3B** | 3.2B | ~2GB | Thoughtful and consistent companion (default) |
| **Gemma 2 2B** | 2.6B | ~1.7GB | Warm and expressive, naturally heartfelt |
| **Dolphin 3.0 3B** | 3B | ~2GB | Open and judgment-free listener |

All models use Q4_K_M quantization and are sourced from bartowski's HuggingFace repos.

## Testing Considerations

- Test memory extraction with multi-day, multi-topic conversations
- Verify crisis detection doesn't have false negatives
- Monitor token budget - logs warnings when approaching 4096 limit
- Test memory pressure handling on older devices (iPhone 12 or older)
- Validate decay calculations produce reasonable memory rankings over time
- Test deduplication with semantically similar but not identical memories
- Verify semantic retrieval performance target (<50ms)
