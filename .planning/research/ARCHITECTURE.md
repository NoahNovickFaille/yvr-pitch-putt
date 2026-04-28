# Architecture Research

**Domain:** Local-first AI emotional companion iOS app
**Researched:** 2026-01-16
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
+-----------------------------------------------------------------------+
|                        PRESENTATION LAYER                              |
|  +---------------+  +----------------+  +------------------+           |
|  | Chat Screen   |  | Insights Screen|  | Settings Screen  |          |
|  | (+ Voice UI)  |  | (v2 feature)   |  | + Onboarding     |          |
|  +-------+-------+  +-------+--------+  +--------+---------+          |
|          |                  |                    |                     |
+----------+------------------+--------------------+---------------------+
           |                  |                    |
+----------v------------------v--------------------v---------------------+
|                        SERVICE LAYER                                   |
|  +---------------+  +----------------+  +------------------+           |
|  | LLM Service   |  | Memory Service |  | Crisis Service   |          |
|  | - init/load   |  | - extraction   |  | - detection      |          |
|  | - completion  |  | - retrieval    |  | - resources      |          |
|  | - streaming   |  | - decay calc   |  | - intervention   |          |
|  +-------+-------+  +-------+--------+  +--------+---------+          |
|          |                  |                    |                     |
|  +-------v------------------v--------------------v---------+          |
|  |              Context Window Manager                     |          |
|  |  - Rolling window (5-8 messages + top 10 memories)      |          |
|  |  - System prompt injection                              |          |
|  |  - Token budget enforcement (4096 limit)                |          |
|  +--------------------------------------------------------+          |
|                                                                        |
+------------------------------------------------------------------------+
                              |
+-----------------------------v------------------------------------------+
|                        DATA LAYER                                      |
|  +---------------+  +----------------+  +------------------+           |
|  | llama.rn      |  | MMKV Storage   |  | Speech Service   |          |
|  | - model file  |  | - conversations|  | - iOS Speech API |          |
|  | - context     |  | - messages     |  | - on-device STT  |          |
|  | - completion  |  | - memories     |  |                  |          |
|  |               |  | - settings     |  |                  |          |
|  +---------------+  +----------------+  +------------------+           |
+------------------------------------------------------------------------+
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Chat Screen** | User interaction, message display, input handling | React Native view with FlatList, TextInput, streaming token display |
| **LLM Service** | Model lifecycle, inference, streaming responses | Singleton wrapping llama.rn context; prewarm on app launch |
| **Memory Service** | Extract, store, retrieve, decay memories | Background processing after conversation end; relevance scoring |
| **Crisis Service** | Detect distress signals, show resources | Regex-based pre-send check; non-dismissable modal with hotlines |
| **Context Window Manager** | Build prompt within token budget | Combines system prompt + rolling messages + top memories |
| **MMKV Storage** | Persist conversations, messages, memories, settings | JSON serialization with key pattern `conv:{id}`, `msgs:{id}` |
| **Speech Service** | Voice-to-text transcription | Wrapper around @react-native-voice/voice; iOS on-device by default |

## Recommended Project Structure

```
src/
+-- screens/               # Presentation layer
|   +-- ChatScreen.tsx     # Main conversation interface
|   +-- SettingsScreen.tsx # App settings + crisis resources
|   +-- OnboardingScreen.tsx # First-launch flow with disclaimer
|   +-- InsightsScreen.tsx # v2: Weekly reflections
|
+-- components/            # Reusable UI components
|   +-- chat/
|   |   +-- MessageBubble.tsx
|   |   +-- ChatInput.tsx  # Text + microphone button
|   |   +-- StreamingText.tsx
|   |   +-- TypingIndicator.tsx
|   +-- crisis/
|   |   +-- CrisisModal.tsx # Non-dismissable resources modal
|   |   +-- CrisisResources.tsx
|   +-- common/
|       +-- Button.tsx
|       +-- LoadingScreen.tsx
|
+-- services/              # Business logic layer
|   +-- llm/
|   |   +-- LLMService.ts  # Model init, completion, streaming
|   |   +-- ContextBuilder.ts # Builds prompt within token budget
|   |   +-- SystemPrompt.ts # System prompt template
|   +-- memory/
|   |   +-- MemoryService.ts # CRUD for memories
|   |   +-- MemoryExtractor.ts # Post-conversation extraction
|   |   +-- MemoryRetriever.ts # Relevance scoring + decay
|   +-- crisis/
|   |   +-- CrisisDetector.ts # Pattern matching
|   |   +-- CrisisResources.ts # Hotline data
|   +-- speech/
|       +-- SpeechService.ts # Voice recognition wrapper
|
+-- storage/               # Data access layer
|   +-- storage.ts         # MMKV instance(s)
|   +-- conversationStore.ts
|   +-- messageStore.ts
|   +-- memoryStore.ts
|   +-- settingsStore.ts
|   +-- keys.ts            # Storage key patterns
|
+-- hooks/                 # React hooks
|   +-- useChat.ts         # Chat state management
|   +-- useLLM.ts          # LLM loading/ready state
|   +-- useMemories.ts     # Memory retrieval
|   +-- useVoiceInput.ts   # Speech-to-text hook
|   +-- useMMKVString.ts   # MMKV reactive bindings
|
+-- types/                 # TypeScript definitions
|   +-- conversation.ts
|   +-- message.ts
|   +-- memory.ts
|   +-- settings.ts
|
+-- utils/                 # Helpers
|   +-- tokenEstimator.ts  # Rough token counting
|   +-- dateHelpers.ts
|   +-- idGenerator.ts
|
+-- constants/
|   +-- model.ts           # Model URLs, paths, config
|   +-- crisis.ts          # Crisis keywords, resources
|   +-- prompts.ts         # System prompt templates
|
+-- App.tsx                # Root with navigation
+-- navigation.tsx         # React Navigation setup
```

### Structure Rationale

- **screens/**: One file per screen keeps navigation simple; screens compose from components
- **services/**: Domain-specific services encapsulate business logic; services don't import from screens
- **storage/**: Thin wrappers around MMKV with typed interfaces; all JSON serialization happens here
- **hooks/**: Bridge between services and React components; manage loading states and subscriptions
- **Separation of llm/ and memory/**: Memory extraction uses LLM but has distinct concerns (when to run, how to merge)

## Architectural Patterns

### Pattern 1: Singleton LLM Context

**What:** Single llama.rn context instance shared across the app, initialized once at startup.

**When to use:** Always for on-device LLM apps. Model loading takes 5-15 seconds and consumes 2.5-3GB RAM.

**Trade-offs:**
- Pros: Avoids repeated initialization, predictable memory usage, consistent context state
- Cons: App startup blocked until model loads; memory not released until app terminates

**Example:**
```typescript
// services/llm/LLMService.ts
import { initLlama, LlamaContext } from 'llama.rn';

class LLMService {
  private static instance: LLMService;
  private context: LlamaContext | null = null;
  private initPromise: Promise<void> | null = null;

  static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  async initialize(modelPath: string): Promise<void> {
    if (this.context) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.context = await initLlama({
        model: `file://${modelPath}`,
        use_mlock: true,
        n_ctx: 4096,
        n_gpu_layers: 99, // Use Metal on iOS
      });
    })();

    return this.initPromise;
  }

  async completion(
    messages: Array<{ role: string; content: string }>,
    onToken: (token: string) => void
  ): Promise<string> {
    if (!this.context) throw new Error('LLM not initialized');

    const result = await this.context.completion(
      {
        messages,
        n_predict: 512,
        temperature: 0.7,
        stop: ['</s>', '<|end|>', '<|eot_id|>'],
      },
      (data) => onToken(data.token)
    );

    return result.text;
  }

  isReady(): boolean {
    return this.context !== null;
  }
}

export default LLMService.getInstance();
```

### Pattern 2: Rolling Context Window with Token Budget

**What:** Maintain conversation continuity within 4096 token limit by combining rolling recent messages + top relevant memories + system prompt.

**When to use:** Any chat application with limited context window. Critical for on-device LLMs.

**Trade-offs:**
- Pros: Balances short-term coherence with long-term memory; predictable token usage
- Cons: Older messages in current session may be dropped; requires token estimation

**Example:**
```typescript
// services/llm/ContextBuilder.ts
const TOKEN_BUDGET = 4096;
const RESPONSE_RESERVE = 512;
const SYSTEM_PROMPT_RESERVE = 400;
const MEMORY_BUDGET = 600;

interface ContextParts {
  systemPrompt: string;
  memories: string;
  recentMessages: Array<{ role: string; content: string }>;
}

function buildContext(
  allMessages: Array<{ role: string; content: string }>,
  memories: Memory[],
  systemPromptTemplate: string
): ContextParts {
  // 1. Calculate available tokens for messages
  const availableForMessages = TOKEN_BUDGET
    - RESPONSE_RESERVE
    - SYSTEM_PROMPT_RESERVE
    - MEMORY_BUDGET;

  // 2. Format relevant memories
  const memoryText = formatMemoriesForPrompt(memories.slice(0, 10));

  // 3. Build system prompt with memory injection
  const systemPrompt = systemPromptTemplate.replace(
    '{memory_context}',
    memoryText || 'No previous context available.'
  );

  // 4. Select recent messages within budget (work backwards)
  const recentMessages: Array<{ role: string; content: string }> = [];
  let tokenCount = 0;

  for (let i = allMessages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(allMessages[i].content);
    if (tokenCount + msgTokens > availableForMessages) break;
    recentMessages.unshift(allMessages[i]);
    tokenCount += msgTokens;
  }

  return { systemPrompt, memories: memoryText, recentMessages };
}

function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token for English
  return Math.ceil(text.length / 4);
}
```

### Pattern 3: Background Memory Extraction

**What:** Extract memories asynchronously after conversation ends, not during active chat.

**When to use:** When memory extraction requires LLM inference (expensive) and shouldn't block UI.

**Trade-offs:**
- Pros: Keeps chat responsive; can run when app backgrounded
- Cons: Memories not immediately available for next message; requires conversation end detection

**Example:**
```typescript
// services/memory/MemoryExtractor.ts
import { AppState, AppStateStatus } from 'react-native';

class MemoryExtractor {
  private pendingConversationId: string | null = null;

  constructor() {
    // Detect conversation end via app backgrounding
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = async (nextState: AppStateStatus) => {
    if (nextState === 'background' && this.pendingConversationId) {
      await this.extractMemories(this.pendingConversationId);
      this.pendingConversationId = null;
    }
  };

  markConversationActive(conversationId: string) {
    this.pendingConversationId = conversationId;
  }

  async extractMemories(conversationId: string): Promise<void> {
    const messages = await messageStore.getMessages(conversationId);
    if (messages.length < 4) return; // Too short, skip

    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const extractionPrompt = `Extract key information from this conversation as JSON:
{
  "people_mentioned": ["name or relationship"],
  "events": ["brief description"],
  "emotions": ["primary emotions expressed"],
  "important_facts": ["facts about their life"]
}

Conversation:
${conversationText}`;

    const result = await llmService.completion([
      { role: 'user', content: extractionPrompt }
    ], () => {}); // No streaming needed

    const extracted = JSON.parse(result);
    await memoryStore.mergeExtractedMemories(extracted, conversationId);

    await conversationStore.markProcessed(conversationId);
  }
}
```

### Pattern 4: Pre-Send Crisis Detection

**What:** Intercept user messages before LLM processing to detect crisis language and show resources.

**When to use:** Any mental health or emotional support application. Non-negotiable safety layer.

**Trade-offs:**
- Pros: Immediate intervention; doesn't depend on LLM response quality
- Cons: Regex-based detection has false positives; must balance safety vs friction

**Example:**
```typescript
// services/crisis/CrisisDetector.ts
const CRISIS_PATTERNS = [
  /\b(suicid|kill myself|end my life|want to die|don't want to live)\b/i,
  /\b(self.?harm|cut myself|hurt myself)\b/i,
  /\b(no reason to live|better off dead|can't go on)\b/i,
];

export function detectCrisisLanguage(message: string): boolean {
  return CRISIS_PATTERNS.some(pattern => pattern.test(message));
}

// In ChatScreen or useChat hook:
async function handleSendMessage(text: string) {
  // ALWAYS check before sending to LLM
  if (detectCrisisLanguage(text)) {
    showCrisisModal(); // Non-dismissable for 5 seconds
    // Continue after user acknowledges
  }

  // Then proceed with normal message flow
  await sendToLLM(text);
}
```

## Data Flow

### Chat Message Flow

```
User types message
       |
       v
[Crisis Detection] --crisis detected--> [Crisis Modal] --> User acknowledges
       |                                                          |
       | (no crisis)                                              |
       v                                                          v
[Context Builder]                                           [Continue]
  - Get recent messages (last 5-8)
  - Retrieve relevant memories (top 10)
  - Apply memory decay scoring
  - Build system prompt
  - Enforce token budget
       |
       v
[LLM Service.completion()]
       |
       v
[Streaming callback] --> [StreamingText component] --> User sees tokens appear
       |
       v
[Completion finished]
       |
       v
[Save assistant message to MMKV]
       |
       v
[Mark conversation as active for memory extraction]
```

### Memory Extraction Flow

```
[App goes to background] or [User explicitly ends conversation]
       |
       v
[MemoryExtractor.extractMemories()]
       |
       v
[Load all messages for conversation]
       |
       v
[Build extraction prompt]
       |
       v
[LLM inference (non-streaming)]
       |
       v
[Parse JSON response]
       |
       v
[MemoryStore.mergeExtractedMemories()]
  - Check for duplicates
  - Update mention counts
  - Refresh lastMentioned timestamps
  - Assign decay rates by category
       |
       v
[Mark conversation as processed]
```

### Memory Retrieval Flow

```
[User sends new message]
       |
       v
[MemoryRetriever.getRelevantMemories()]
       |
       v
[Load all memories from MMKV]
       |
       v
[Apply decay calculation]
  - daysSinceLastMention = (now - lastMentioned) / (1000 * 60 * 60 * 24)
  - decayFactor = exp(-decayRate * daysSinceLastMention / 7)
  - effectiveImportance = importance * decayFactor
       |
       v
[Filter memories with effectiveImportance > threshold]
       |
       v
[Sort by effectiveImportance descending]
       |
       v
[Take top 10]
       |
       v
[Format for system prompt injection]
```

### Key Data Flows

1. **Message persistence:** Every message immediately persisted to MMKV before LLM call returns. Guarantees no data loss on crash.
2. **Streaming tokens:** LLM callback updates React state on each token; UI re-renders show progressive text appearance.
3. **Memory decay:** Calculated at retrieval time, not stored. Keeps memory records immutable except for mention counts.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 conversations | Current architecture is sufficient. MMKV handles this easily. |
| 100-1000 conversations | Consider indexing conversations by date range. May need to archive older conversations to reduce memory scan. |
| 1000+ conversations | Memory retrieval needs optimization. Consider vector embeddings for semantic search instead of keyword matching. |

### Scaling Priorities

1. **First bottleneck: Memory retrieval speed.** Loading all memories into JS, calculating decay, and sorting becomes slow at ~500+ memories. **Fix:** Implement simple relevance scoring in storage layer or add embedding-based retrieval.

2. **Second bottleneck: Conversation list load time.** MMKV loads entire JSON array for conversation index. **Fix:** Paginate conversation list, only load metadata for visible items.

3. **Third bottleneck: Storage size.** Each conversation with 20 messages ~10KB. 1000 conversations = 10MB. Not a problem for device storage, but JSON parsing becomes slow. **Fix:** Consider moving to SQLite for structured queries if truly scaling.

## Anti-Patterns

### Anti-Pattern 1: Re-initializing LLM Context Per Message

**What people do:** Create new llama.rn context for each completion call.

**Why it's wrong:** Model initialization takes 5-15 seconds and allocates 2.5-3GB RAM. Doing this per-message makes the app unusable and may trigger iOS memory warnings.

**Do this instead:** Use singleton pattern. Initialize once at app launch, reuse context for all completions.

### Anti-Pattern 2: Blocking UI During Memory Extraction

**What people do:** Run memory extraction synchronously after each assistant response.

**Why it's wrong:** Memory extraction requires LLM inference (3-10 seconds). Blocking the chat UI makes the app feel frozen.

**Do this instead:** Defer extraction to background. Trigger when app goes to background, or after configurable idle time (e.g., 30 seconds no messages).

### Anti-Pattern 3: Storing Raw Messages in System Prompt

**What people do:** Concatenate entire conversation history into system prompt, hoping the model handles overflow.

**Why it's wrong:** Exceeding context window (4096 tokens) causes undefined behavior - truncation, garbage output, or crashes. Token budget is hard limit.

**Do this instead:** Use rolling window. Calculate token budget, select recent messages that fit, inject summarized memories instead of raw history.

### Anti-Pattern 4: Crisis Detection in LLM Response

**What people do:** Rely on the LLM to detect crisis language and respond appropriately.

**Why it's wrong:** LLM responses are unpredictable. Model may not recognize crisis signals, may respond inappropriately, or may hallucinate resources. This is a safety-critical path.

**Do this instead:** Pre-send detection with regex patterns. Deterministic, fast, reliable. Show resources before LLM ever sees the message.

### Anti-Pattern 5: Synchronous MMKV in Render

**What people do:** Call `storage.getString()` directly in render functions.

**Why it's wrong:** While MMKV is fast, parsing large JSON objects (conversation with 100 messages) blocks the JS thread. Causes jank.

**Do this instead:** Use MMKV hooks (`useMMKVString`) for reactive updates, or load data in useEffect and store in state.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Hugging Face (model download) | One-time HTTPS fetch via react-native-fs | Resume-capable download; store in DocumentDirectory |
| iOS Speech Recognition | Native module via @react-native-voice/voice | On-device by default; request microphone + speech permissions |
| App Store / TestFlight | Standard Expo/RN build | Requires Apple Developer account; review guidelines for mental health apps |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Screen <-> Services | Hooks (useChat, useLLM) | Hooks manage loading states, expose clean API to components |
| Services <-> Storage | Direct function calls | Storage layer is thin; services own business logic |
| LLMService <-> MemoryService | MemoryService calls LLMService | One-way dependency; LLMService doesn't know about memories |
| CrisisService <-> UI | Event/callback | Crisis detection triggers modal; doesn't block message flow after acknowledgment |

### Dependency Graph

```
                 +-------------+
                 | ChatScreen  |
                 +------+------+
                        |
          +-------------+-------------+
          |             |             |
    +-----v-----+ +-----v-----+ +-----v-----+
    |  useChat  | |  useLLM   | |useVoiceInput|
    +-----+-----+ +-----+-----+ +-----+-----+
          |             |             |
    +-----v-----+ +-----v-----+ +-----v-----+
    |ChatService| |LLMService | |SpeechService|
    +-----+-----+ +-----+-----+ +-----+-----+
          |             |
    +-----v-----+ +-----v-----+
    |MemoryServ.| |CrisisServ.|
    +-----+-----+ +-----+-----+
          |
    +-----v-----+
    |  Storage  |
    +-----------+
```

## Build Order Implications

Based on component dependencies, recommended build sequence:

### Phase 1: Foundation (No dependencies)
1. **Storage layer** - MMKV setup, key patterns, typed stores
2. **Type definitions** - Conversation, Message, Memory, Settings interfaces
3. **LLM Service shell** - Initialization, without completion logic yet

### Phase 2: Core Chat (Depends on Phase 1)
1. **LLM completion** - Streaming responses working
2. **Chat UI** - Basic message display, input
3. **Message persistence** - Save/load from MMKV
4. **Speech input** - Voice-to-text integration

### Phase 3: Memory System (Depends on Phases 1-2)
1. **Memory extraction** - Post-conversation processing
2. **Memory retrieval** - Decay calculation, relevance scoring
3. **Context builder** - Rolling window with memory injection

### Phase 4: Safety & Polish (Depends on Phases 1-3)
1. **Crisis detection** - Pre-send check, resources modal
2. **Onboarding** - Privacy explanation, disclaimer
3. **Settings** - Crisis resources, app info
4. **Model download flow** - First-launch experience

This ordering ensures each phase has its dependencies ready. Storage must exist before anything can persist. LLM must work before memory extraction can run. Memory must work before context building makes sense.

## Sources

- [llama.rn GitHub](https://github.com/mybigday/llama.rn) - Official React Native llama.cpp binding
- [react-native-mmkv GitHub](https://github.com/mrousavy/react-native-mmkv) - MMKV storage for React Native
- [Building a Modern Chat App in React Native (VideoSDK)](https://www.videosdk.live/developer-hub/socketio/chat-app-react-native) - Chat architecture patterns
- [Scaling React Native: Advanced Architecture Patterns](https://medium.com/@ripenapps-technologies/scaling-react-native-advanced-architecture-patterns-for-enterprise-apps-1453649bc544) - Enterprise patterns
- [How Does LLM Memory Work? (DataCamp)](https://www.datacamp.com/blog/how-does-llm-memory-work) - Memory system architectures
- [ChatGPT Memory Architecture (Blockchain News)](https://blockchain.news/ainews/chatgpt-memory-architecture-four-layer-context-system-prioritizes-speed-over-rag-and-vector-databases) - Four-layer memory system
- [iOS Memory Management & Performance 2025](https://www.alimertgulec.com/en/blog/ios-memory-management-performance-2025) - iOS memory best practices
- [Mental Health App Development Guide 2026 (TopFlightApps)](https://topflightapps.com/ideas/how-to-build-a-mental-health-app/) - Safety layer patterns
- [React Native Speech Recognition Guide (Picovoice)](https://picovoice.ai/blog/react-native-speech-recognition/) - Speech integration
- [Zustand MMKV Storage (DEV Community)](https://dev.to/mehdifaraji/zustand-mmkv-storage-blazing-fast-persistence-for-zustand-in-react-native-3ef1) - State persistence patterns

---
*Architecture research for: Cove - Local-first iOS emotional companion*
*Researched: 2026-01-16*
