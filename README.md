# Cove

A local-first emotional companion app for iOS. All AI processing happens on-device using a 3B parameter LLM, ensuring complete privacy - your conversations never leave your phone.

## What is Cove?

Cove is a warm, empathetic AI companion that remembers your conversations and builds context over time. Unlike cloud-based chatbots, everything runs locally:

- **On-Device LLM**: Uses llama.rn with Metal GPU acceleration
- **Persistent Memory**: Remembers facts, emotions, and events across sessions with semantic retrieval
- **Crisis Detection**: Safety-first design with immediate crisis resource display
- **Complete Privacy**: Zero network calls for AI inference

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS simulator
npm run ios
```

On first launch, the app downloads model files:
- **Chat model**: User selects from available models (~1.7-2GB each)
- **Embedding model**: ~21MB (all-MiniLM-L6-v2)

### Available Chat Models

| Model | Size | Personality |
|-------|------|-------------|
| **Llama 3.2 3B** | ~2GB | Thoughtful and consistent companion (default) |
| **Gemma 2 2B** | ~1.7GB | Warm and expressive, naturally heartfelt |
| **Dolphin 3.0 3B** | ~2GB | Open and judgment-free listener |

All models use Q4_K_M quantization for optimal quality-to-size ratio. Selected based on [research](research/gemini-model-selection-research.md) into companion/confidant applications. Downloads support resume if interrupted.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         App UI Layer                             │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  Chat View  │  │ Conversations │  │     Settings           │  │
│  └──────┬──────┘  └───────┬──────┘  └────────────────────────┘  │
└─────────┼─────────────────┼─────────────────────────────────────┘
          │                 │
          ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Zustand Stores                              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  chatStore  │  │ conversation │  │     memoryStore        │  │
│  │             │  │    Store     │  │                        │  │
│  └──────┬──────┘  └───────┬──────┘  └───────────┬────────────┘  │
└─────────┼─────────────────┼─────────────────────┼───────────────┘
          │                 │                     │
          └────────────┬────┴─────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                        MMKV Storage                              │
│  (Synchronous key-value persistence)                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         Services                                 │
│  ┌───────────┐  ┌────────────┐  ┌─────────────┐  ┌────────┐    │
│  │    LLM    │  │   Memory   │  │  Embedding  │  │ Safety │    │
│  │  Service  │  │  Service   │  │   Service   │  │Service │    │
│  └─────┬─────┘  └──────┬─────┘  └──────┬──────┘  └───┬────┘    │
│        │               │               │             │          │
│        │       ┌───────┴───────┐       │             │          │
│        │       │               │       │             │          │
│        ▼       ▼               ▼       ▼             │          │
│  ┌──────────────────┐  ┌──────────┐  ┌───────────┐   │          │
│  │ CompletionQueue  │  │Extraction│  │ Embedding │   │          │
│  │ (Priority-based) │  │  Queue   │  │  Storage  │   │          │
│  └────────┬─────────┘  └──────────┘  └───────────┘   │          │
│           │                                          │          │
│           ▼                                          │          │
│  ┌──────────────────┐                                │          │
│  │   LlamaContext   │◀───────────────────────────────┘          │
│  │   (llama.rn)     │                                           │
│  └──────────────────┘                                           │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
app/                          # Expo Router pages (file-based routing)
├── _layout.tsx              # Root layout with navigation
├── (drawer)/                # Drawer navigation group
│   ├── _layout.tsx          # Drawer layout configuration
│   ├── index.tsx            # Home/conversations list
│   ├── chat.tsx             # Main chat interface
│   └── profile.tsx          # User profile and settings
└── modal.tsx                # Modal screens

src/
├── components/              # App-specific components
│   ├── chat/               # Chat UI components
│   └── ...
├── constants/              # Model definitions, memory constants
├── hooks/                  # Custom React hooks
│   ├── useChat.ts         # Chat interaction logic
│   ├── useLLM.ts          # LLM lifecycle management
│   ├── useModelDownload.ts # Download progress tracking
│   ├── useEmbeddingModel.ts # Embedding model lifecycle
│   └── useMemoryExtraction.ts # Memory extraction triggers
├── services/               # Core services (each has README.md)
│   ├── llm/               # LLM inference and chat
│   ├── memory/            # Persistent memory with semantic retrieval
│   ├── embedding/         # Semantic similarity (dedup, retrieval)
│   ├── safety/            # Crisis detection
│   ├── download/          # Model download management
│   └── conversation/      # Title generation
├── storage/                # MMKV configuration
├── stores/                 # Zustand state management
│   ├── chatStore.ts       # Current conversation messages, streaming state
│   ├── conversationStore.ts # Conversation list management
│   ├── memoryStore.ts     # Persistent memory state
│   ├── modelStore.ts      # Selected model, downloaded models
│   └── onboardingStore.ts # User profile and first-launch state
└── types/                  # TypeScript type definitions

components/                  # Expo template components (rarely modified)
constants/                   # Expo template constants
hooks/                       # Expo template hooks
```

## Core Services

The app is built around seven core services. Each service folder contains a README.md with detailed documentation:

### [LLM Service](src/services/llm/README.md)

Manages on-device inference using llama.rn with Metal GPU acceleration.

**Key components:**
- `LLMService` - Singleton managing LlamaContext lifecycle
- `ChatService` - Orchestrates user message → response flow
- `CompletionQueue` - Priority queue (chat HIGH, extraction LOW)
- `TokenBudget` - Manages 4096 token context window

**Quick facts:**
- 4096 token context (500 system + 650 memory + 2000 history + 900 response)
- Streaming responses via token callbacks
- Auto-releases on iOS memory pressure

### [Memory Service](src/services/memory/README.md)

Persistent memory system with semantic retrieval and deduplication.

**Key components:**
- `MemoryOrchestrator` - Coordinates extraction timing
- `MemoryExtractor` - LLM-based conversation parsing (6 semantic categories)
- `SemanticRetrieval` - 3-bucket memory retrieval (identity + topic + recent)
- `MemoryDecay` - Relevance scoring with category-specific decay
- `ExtractionQueue` - Persists failed extractions for retry

**Quick facts:**
- Six categories: identity (720h), relationship (336h), preference (168h), situation (72h), event (48h), emotion (24h)
- Weighted scoring: semantic×0.5 + decay×0.3 + importance×0.2
- 3-bucket retrieval: 3 identity + 4 topic-relevant + 2 recent = ~9 memories
- Extraction runs when user is idle (never blocks chat)

### [Embedding Service](src/services/embedding/CLAUDE.md)

On-device semantic similarity using all-MiniLM-L6-v2.

**Key components:**
- `EmbeddingService` - Singleton for embedding generation
- `EmbeddingStorage` - Binary vector storage in MMKV
- `Deduplicator` - Semantic duplicate detection (0.85 threshold)
- `CosineSimilarity` - Fast similarity calculation

**Quick facts:**
- 256-dimension embeddings
- ~21MB model (Q4_K_M quantization)
- Separate context from chat LLM
- Powers both deduplication and semantic retrieval

### [Safety Service](src/services/safety/README.md)

Crisis detection for mental health safety.

**Key components:**
- `CrisisDetector` - Phrase-based detection with negation handling
- `crisisKeywords` - Severity-categorized phrase lists

**Quick facts:**
- Runs BEFORE LLM (instant, no inference delay)
- HIGH severity: immediate self-harm intent (single match)
- MEDIUM severity: emotional distress (2+ matches)
- Negation handling reduces false positives

### [Download Service](src/services/download/README.md)

Manages model acquisition.

**Key components:**
- `ModelDownloadService` - Download, verify, resume
- `downloadStore` - Progress state management

**Quick facts:**
- Resume support (survives app restart)
- Progress persistence to MMKV
- MD5 verification after download
- Background download (within iOS limits)

### [Conversation Service](src/services/conversation/README.md)

Multi-conversation management and persistence.

**Key components:**
- `ConversationTitleGenerator` - Title/preview from messages
- `conversationStore` - Conversation list state
- `chatStore` - Active conversation messages
- `conversationMigration` - Legacy format migration

**Quick facts:**
- Conversations stored as keyed JSON in MMKV
- Newest-first ordering
- Auto-generates title from first message

## Data Flow: User Message → Response

```
1. User types message
   │
   ▼
2. Crisis Detection (instant, no LLM)
   │
   ├── Crisis detected? → Show resources, stop
   │
   ▼
3. Semantic Memory Retrieval
   │
   ├── Get identity memories (always included, 3 max)
   ├── Score remaining by embedding similarity
   ├── Get topic-relevant (above 0.4 threshold, 4 max)
   ├── Get recent (most recently accessed, 2 max)
   │
   ▼
4. Token Budgeting
   │
   ├── Build structured system prompt (About/Situation/Context)
   ├── Fit memories within 650 tokens
   ├── Truncate conversation history to 2000 tokens
   │
   ▼
5. LLM Completion (HIGH priority)
   │
   ├── Stream tokens via callback
   ├── Display partial response
   │
   ▼
6. Response Complete
   │
   ├── Add to conversation
   ├── Persist to MMKV
   │
   ▼
7. (Later) Memory Extraction
   │
   ├── When user idle
   ├── LOW priority queue
   ├── Deduplicate via embeddings
   └── Persist extracted memories + embeddings
```

## Key Design Patterns

### 1. Persist Before State
All stores persist to MMKV before updating Zustand state, ensuring data survives crashes.

### 2. Priority Queue
Chat (HIGH) preempts memory extraction (LOW), ensuring responsive UX.

### 3. Graceful Degradation
- Memory pressure → release LLM context → reinit on next message
- Extraction cancelled → queue for retry → process when idle
- Embedding model not ready → fall back to keyword matching

### 4. Safety First
Crisis detection runs before any LLM call, showing resources immediately.

### 5. Semantic Intelligence
- Memory deduplication prevents bloat from repeated mentions
- Semantic retrieval finds topically relevant memories, not just keyword matches
- Identity memories always surface regardless of topic

## Development

### Debugging

All services log with prefixes in `__DEV__` mode:
- `[LLMService]` - Context lifecycle
- `[ChatService]` - Message flow
- `[MemoryStore]` - Memory operations
- `[MemoryExtractor]` - Extraction process
- `[SemanticRetrieval]` - Retrieval operations
- `[Deduplicator]` - Duplicate detection
- `[ExtractionQueue]` - Queue operations
- `[CrisisDetector]` - Safety checks

### Common Commands

```bash
npm start          # Start Expo dev server
npm run ios        # Run on iOS simulator
npm run lint       # Run ESLint
```

### Testing Scenarios

1. **Memory decay**: Create memories, wait, check relevance scores
2. **Crisis detection**: Test phrase matching and negation handling
3. **Token budgeting**: Long conversations should truncate correctly
4. **Download resume**: Kill app mid-download, restart
5. **Memory pressure**: Simulate iOS memory warning
6. **Semantic retrieval**: Verify topic-relevant memories surface
7. **Deduplication**: Test similar but not identical memory content

## Tech Stack

- **Framework**: React Native + Expo (SDK 52)
- **Routing**: Expo Router (file-based)
- **State**: Zustand
- **Storage**: react-native-mmkv
- **LLM**: llama.rn (llama.cpp bindings)
- **Embeddings**: llama.rn with all-MiniLM-L6-v2 (256-dim)
- **Download**: @kesha-antonov/react-native-background-downloader

## Privacy

Cove is designed with privacy as a core principle:

- **No cloud inference**: LLM runs entirely on-device
- **No analytics**: No tracking or telemetry
- **Local storage**: All data stored in app sandbox
- **No network**: AI features work completely offline

## License

[Add license information]
