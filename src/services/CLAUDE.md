# Core Services

Business logic layer for LLM inference, memory management, model downloads, safety checks, and speech recognition.

## Directory Structure

### llm/
Core LLM functionality:
- **LLMService** - Singleton managing llama.rn context lifecycle (init, release, inference)
- **ChatService** - High-level chat orchestration (user message → memory retrieval → LLM → response)
- **systemPrompt** - Constructs system prompt with memory context injection
- **TokenBudget** - Calculates and enforces 4096 token context window limits
- **memoryMonitor** - iOS memory pressure monitoring (releases LLM on warning)

### memory/
Persistent memory system:
- **MemoryExtractor** - Uses LLM to parse conversations into structured Memory objects
- **MemoryDecay** - Exponential decay calculations (reduces importance over time)
- **MemoryOrchestrator** - Coordinates extraction, storage, and retrieval
- **extractionPrompt** - LLM prompt for memory extraction (JSON schema output)

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
Most services are stateless singletons. LLMService maintains context but can release/re-init.

### Context Window Management
CRITICAL: 4096 token budget shared between:
1. System prompt: 500 tokens
2. Memories: 600 tokens (10-15 memories)
3. Conversation history: 2000 tokens (~20-30 messages)
4. Response buffer: 900 tokens
5. Overhead: 96 tokens

Note: Llama 3.2 3B supports 128K context, but 4K balances memory usage and capacity on mobile.

TokenBudget.ts calculates token counts and truncates history if needed.

### Memory Extraction Flow
1. Conversation ends (app backgrounded or user leaves chat)
2. MemoryOrchestrator reads conversation messages
3. MemoryExtractor sends to LLM with extraction prompt
4. LLM returns JSON with entities, emotions, facts
5. Memories stored in MMKV with importance + decay rate
6. Future chats retrieve top 10 memories by effective importance

### iOS Memory Management
App monitors iOS memory warnings:
- Immediate LLM context release (prevents app termination)
- Re-initialization on next user message
- Graceful degradation (shows loading state during re-init)

## Important Notes

- LLMService is thread-safe but llama.rn operations block the JS thread during inference
- Memory extraction runs in background (not real-time during chat)
- All persistence uses synchronous MMKV operations
- Safety checks use simple regex patterns (no ML-based detection)
- Model files stored in app Documents directory (~1.8GB for Q4_K_M quantization)

## Testing Considerations

- Test memory extraction with multi-day, multi-topic conversations
- Verify crisis detection doesn't have false negatives
- Monitor token budget - logs warnings when approaching 4096 limit
- Test memory pressure handling on older devices (iPhone 12 or older)
- Validate decay calculations produce reasonable memory rankings over time
