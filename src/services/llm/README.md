# LLM Service

The LLM service manages on-device inference using [llama.rn](https://github.com/mybigday/llama.rn) with Metal GPU acceleration. This is the core inference layer that powers all AI interactions in Cove.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      ChatService                        │
│  (High-level orchestration: user message → response)    │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    LLMService (Singleton)               │
│  (Context lifecycle: init, inference, release)          │
│  ┌───────────────────────────────────────────────────┐  │
│  │              CompletionQueue                       │  │
│  │  (Priority queue: HIGH=chat, LOW=extraction)       │  │
│  └───────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              LlamaContext (llama.rn)                    │
│  (Native inference with Metal acceleration)             │
└─────────────────────────────────────────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `LLMService.ts` | Singleton managing LlamaContext lifecycle |
| `ChatService.ts` | High-level chat orchestration with safety and memory |
| `CompletionQueue.ts` | Priority queue preventing "context busy" errors |
| `TokenBudget.ts` | Context window management (4096 tokens) |
| `systemPrompt.ts` | Cove's personality and behavior definition |
| `memoryMonitor.ts` | iOS memory pressure handling |
| `JsonUtils.ts` | LLM response parsing utilities |

## LLMService

The singleton that manages the LlamaContext lifecycle.

### State Machine

```
┌──────────┐     initialize()     ┌──────────────┐
│   idle   │ ──────────────────▶  │ initializing │
└──────────┘                      └──────┬───────┘
     ▲                                   │
     │ release()               success   │   failure
     │                           ┌───────┴───────┐
     │                           ▼               ▼
┌──────────┐     release()  ┌──────────┐   ┌─────────┐
│ unloaded │ ◀───────────── │  ready   │   │  error  │
└──────────┘                └──────────┘   └─────────┘
```

States: `'idle' | 'initializing' | 'ready' | 'error' | 'unloaded'`

### Key Methods

```typescript
// Get the singleton instance
const llm = LLMService.getInstance();

// Initialize with model definition (optional - uses selected model if not provided)
await llm.initialize(modelDefinition);

// Check readiness
if (llm.isReady()) {
  // Safe to use context
}

// Queue a completion (recommended over direct context access)
const result = await llm.queuedCompletion(
  messages,
  options,
  onToken,
  'high' // priority
);

// Subscribe to state changes (for UI reactivity)
const unsubscribe = llm.subscribe((state) => {
  console.log('LLM state:', state); // 'idle' | 'initializing' | 'ready' | 'unloaded'
});

// Release context (called on memory pressure)
llm.release();
```

### Model Initialization

The service validates the model file before loading:

1. Checks file exists at provided path
2. Verifies file size matches expected (within 99%)
3. Initializes LlamaContext with model-specific parameters from `src/constants/model.ts`:
   - `n_ctx: 4096` - Context window size (balances memory/capacity on mobile)
   - `n_gpu_layers: 99` - Offload all layers to Metal GPU
   - `use_mlock: true` - Lock model in memory

### Available Models

Three models optimized for confidant/companion conversations:

| Model | Size | Personality |
|-------|------|-------------|
| **Llama 3.2 3B** | ~2GB | Thoughtful and consistent (default) |
| **Gemma 2 2B** | ~1.7GB | Warm and expressive, naturally heartfelt |
| **Dolphin 3.0 3B** | ~2GB | Open and judgment-free listener |

Models chosen based on research into small language models for emotional companion apps - prioritizing conversational warmth, instruction following, and avoiding "trite" responses over raw benchmark performance.

## ChatService

Orchestrates the complete chat flow from user message to response.

### Message Flow

```
User sends message
       │
       ▼
┌─────────────────┐
│ Crisis Detection │──── Crisis detected? ──▶ Return immediately
└────────┬────────┘      Call onCrisis()
         │
         ▼ (no crisis)
┌─────────────────┐
│ Retrieve Memories│
│ (top 6 relevant) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Build System    │
│ Prompt + Context│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Token Budget    │
│ Enforcement     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ LLM Completion  │──── Streams tokens via onToken()
│ (HIGH priority) │
└────────┬────────┘
         │
         ▼
Response complete
```

### Usage

```typescript
import { sendMessage, continueAfterCrisis } from './ChatService';

const result = await sendMessage(
  userMessage,
  conversationHistory,
  {
    onToken: (token) => {
      // Called for each generated token (streaming)
      setPartialResponse(prev => prev + token);
    },
    onComplete: (fullResponse) => {
      // Called when generation finishes
      addAssistantMessage(fullResponse);
    },
    onCrisis: (crisisResult) => {
      // Called if crisis detected - generation stops
      showCrisisResources(crisisResult);
    }
  }
);

// If user acknowledges crisis dialog and wants to continue
if (userWantsToContinue) {
  await continueAfterCrisis(userMessage, history, callbacks);
}
```

## CompletionQueue

Serializes all LLM operations to prevent "Context is busy" errors.

### Priority System

| Priority | Use Case | Behavior |
|----------|----------|----------|
| `high` | Chat responses | Executes immediately, cancels LOW tasks |
| `low` | Memory extraction | Yields to HIGH priority tasks |

### How It Works

1. All LLM operations go through the queue
2. HIGH priority tasks can cancel in-progress LOW priority tasks
3. Cancelled tasks receive an error: `"Cancelled by higher priority task"`
4. Queue processes items FIFO within same priority level

```typescript
// Internal queue usage (handled by LLMService)
queue.enqueue(
  async (signal) => {
    // Your completion logic
    // Check signal.cancelled periodically for early exit
  },
  'high' // or 'low'
);
```

### Why This Matters

llama.rn's context can only handle one completion at a time. Without the queue:
- User sends message while extraction is running → crash
- Multiple rapid messages → race conditions

The queue ensures clean serialization with appropriate preemption.

## TokenBudget

Manages the 4096 token context window shared between all components. Note: While models support larger contexts (Llama 3.2: 128K, Gemma 2: 8K), 4K provides a good balance between capacity and mobile memory usage.

### Budget Allocation

```
Total Context: 4096 tokens
├── System Prompt:      500 tokens
├── Memory Context:     600 tokens
├── Conversation:      2000 tokens (~20-30 messages)
└── Response Buffer:    900 tokens (n_predict)
    + Overhead:          96 tokens
```

Note: The memory service uses a separate budget of 650 tokens (605 content + 45 headers) for structured sections, but TokenBudget allocates 600 for the raw memory section.

### Key Functions

```typescript
import {
  countTokens,
  buildMemorySectionWithinBudget,
  buildStructuredMemorySection,
  truncateConversationHistory
} from './TokenBudget';

// Count tokens (uses actual tokenizer when model ready)
const count = countTokens("Hello, world!");

// Build structured memory section (recommended)
// Organizes into About them / Current situation / Relevant context
const memorySection = await buildStructuredMemorySection(memories);

// Build simple memory section that fits budget (legacy)
const memorySection = buildMemorySectionWithinBudget(
  memories,
  600 // max tokens
);

// Truncate conversation to fit budget (keeps recent messages)
const truncatedHistory = truncateConversationHistory(
  messages,
  2000 // max tokens
);
```

### Structured Memory Format

The `buildStructuredMemorySection()` function organizes memories into three sections to mitigate the "Lost in the Middle" effect:

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

Section headers act as attention anchors, helping the LLM weight identity information appropriately.

### Token Counting Strategy

1. **Model Ready**: Uses LlamaContext's actual tokenizer for accuracy
2. **Model Not Ready**: Falls back to heuristic (~4 characters per token)

## System Prompt

Defines Cove's personality and behavior.

### Structure

```typescript
const BASE_SYSTEM_PROMPT = `
You are Cove, a warm and empathetic companion...
[personality definition, ~400 tokens]
`;

// Dynamic memory injection with structured sections
async function buildSystemPromptWithStructuredMemories(memories: Memory[]): Promise<string> {
  if (memories.length === 0) return BASE_SYSTEM_PROMPT;

  // Uses buildStructuredMemorySection from TokenBudget
  const structuredSection = await buildStructuredMemorySection(memories);

  return BASE_SYSTEM_PROMPT + `\n\nWhat you know about them:
${structuredSection}

Reference these memories naturally in conversation...`;
}
```

### Structured Memory Sections

Memories are organized into three sections for optimal LLM attention:

1. **About them** - Identity and relationship memories (placed FIRST for primacy effect)
2. **Current situation** - Situation and emotion memories
3. **Relevant context** - Preference and event memories

### Key Personality Traits

- Warm, empathetic, non-judgmental
- Active listening with validation
- Non-clinical (not a therapist)
- Honest but kind
- Remembers user's context

### Stop Words

Configured for all supported models (Llama, Gemma, Dolphin):
- `</s>` - End of sequence
- `<|eot_id|>` - End of turn (Llama)
- `<|end|>` - Alternate end token
- `<|end_of_text|>` - End of text
- `<|im_end|>` - ChatML format (Dolphin)
- `<|EOT|>` - Alternate EOT
- `<|END_OF_TURN_TOKEN|>` - Explicit turn end
- `<|end_of_turn|>` - Gemma format
- `<|endoftext|>` - GPT-style end

## Memory Monitor

Handles iOS memory pressure to prevent app termination.

### How It Works

```typescript
import { setupMemoryMonitor, setupAppStateMonitor } from './memoryMonitor';

// Call once at app initialization
setupMemoryMonitor();
setupAppStateMonitor();
```

### Memory Pressure Response

1. iOS sends `memoryWarning` event when system is low on memory
2. Monitor immediately calls `LLMService.release()`
3. LlamaContext is freed (~1.7-2GB memory returned depending on model)
4. On next user message, context re-initializes automatically

### App State Tracking

Monitors foreground/background transitions for:
- Logging and debugging
- Potential future optimizations (e.g., proactive release on background)

## Error Handling

### Common Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `Model not ready` | Calling inference before init | Wait for `isReady() === true` |
| `Context is busy` | Concurrent completions | Always use `queuedCompletion()` |
| `Cancelled by higher priority task` | Chat preempted extraction | Graceful - re-queue extraction |
| `Model file not found` | Model not downloaded | Check ModelDownloadService |

### Graceful Degradation

The service is designed to degrade gracefully:

1. **Memory pressure**: Release context, reinit on next message
2. **Extraction cancelled**: Re-queue for later via ExtractionQueue
3. **Init failure**: Stay in `idle` state, allow retry

## Integration with Other Services

### Memory Service
- ChatService retrieves memories before each response
- MemoryExtractor uses LOW priority queue for extraction

### Safety Service
- CrisisDetector runs BEFORE any LLM call
- Blocks response generation if crisis detected

### Download Service
- Model must be downloaded before LLMService can initialize
- Use `ModelDownloadService.isModelDownloaded()` to check

## Performance Considerations

1. **Context Size**: 4096 tokens allows ~20-30 messages of history
2. **Metal Acceleration**: All layers on GPU via `n_gpu_layers: 99`
3. **Token Streaming**: Enables responsive UI during generation
4. **Priority Queue**: Chat never blocked by background tasks
