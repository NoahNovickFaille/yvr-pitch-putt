# Cove

A local-first emotional companion app for iOS. All AI processing happens on-device using a 3B parameter LLM, ensuring complete privacy - your conversations never leave your phone.

## What is Cove?

Cove is a warm, empathetic AI companion that remembers your conversations and builds context over time. Unlike cloud-based chatbots, everything runs locally:

- **On-Device LLM**: Uses llama.rn with Metal GPU acceleration
- **Persistent Memory**: Remembers facts, emotions, and events across sessions
- **Voice Input**: On-device speech recognition (no cloud transcription)
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

On first launch, the app downloads a ~1.8GB model file. This happens once and supports resume if interrupted.

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
│  ┌───────────┐  ┌────────────┐  ┌────────┐  ┌────────────────┐  │
│  │    LLM    │  │   Memory   │  │ Safety │  │    Speech      │  │
│  │  Service  │  │  Service   │  │Service │  │   Service      │  │
│  └─────┬─────┘  └──────┬─────┘  └───┬────┘  └───────┬────────┘  │
│        │               │            │               │            │
│        │       ┌───────┴───────┐    │               │            │
│        │       │               │    │               │            │
│        ▼       ▼               ▼    │               │            │
│  ┌──────────────────┐  ┌──────────┐ │  ┌────────────────────┐   │
│  │ CompletionQueue  │  │Extraction│ │  │  iOS Speech        │   │
│  │ (Priority-based) │  │  Queue   │ │  │  Framework         │   │
│  └────────┬─────────┘  └──────────┘ │  └────────────────────┘   │
│           │                         │                            │
│           ▼                         │                            │
│  ┌──────────────────┐               │                            │
│  │   LlamaContext   │◀──────────────┘                            │
│  │   (llama.rn)     │                                            │
│  └──────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
app/                          # Expo Router pages (file-based routing)
├── _layout.tsx              # Root layout with navigation
├── (drawer)/                # Drawer navigation group
│   ├── _layout.tsx          # Drawer layout configuration
│   ├── index.tsx            # Home/landing screen
│   ├── chat.tsx             # Main chat interface
│   └── settings.tsx         # Settings screen
└── modal.tsx                # Modal screens

src/
├── components/              # App-specific components
│   ├── chat/               # Chat UI components
│   └── ...
├── constants/              # Model definitions, app constants
├── hooks/                  # Custom React hooks
│   ├── useChat.ts         # Chat interaction logic
│   ├── useLLM.ts          # LLM lifecycle management
│   ├── useModelDownload.ts # Download progress tracking
│   └── useSpeech.ts       # Voice input handling
├── services/               # Core services (each has README.md)
│   ├── llm/               # LLM inference and chat
│   ├── memory/            # Persistent memory with decay
│   ├── safety/            # Crisis detection
│   ├── download/          # Model download management
│   ├── speech/            # Voice recognition
│   └── conversation/      # Title generation
├── storage/                # MMKV configuration
├── stores/                 # Zustand state management
│   ├── chatStore.ts       # Current conversation messages
│   ├── conversationStore.ts # Conversation list management
│   ├── memoryStore.ts     # Persistent memory state
│   └── onboardingStore.ts # First-launch state
└── types/                  # TypeScript type definitions

components/                  # Expo template components (rarely modified)
constants/                   # Expo template constants
hooks/                       # Expo template hooks
```

## Core Services

The app is built around six core services. Each service folder contains a README.md with detailed documentation:

### [LLM Service](src/services/llm/README.md)

Manages on-device inference using llama.rn with Metal GPU acceleration.

**Key components:**
- `LLMService` - Singleton managing LlamaContext lifecycle
- `ChatService` - Orchestrates user message → response flow
- `CompletionQueue` - Priority queue (chat HIGH, extraction LOW)
- `TokenBudget` - Manages 2048 token context window

**Quick facts:**
- 2048 token context (400 system + 300 memory + 800 history + 512 response)
- Streaming responses via token callbacks
- Auto-releases on iOS memory pressure

### [Memory Service](src/services/memory/README.md)

Persistent memory system with Ebbinghaus-inspired decay.

**Key components:**
- `MemoryOrchestrator` - Coordinates extraction timing
- `MemoryExtractor` - LLM-based conversation parsing
- `MemoryDecay` - Relevance scoring with decay + reinforcement
- `ExtractionQueue` - Persists failed extractions for retry

**Quick facts:**
- Three memory types: fact, emotion, event
- Decay half-lives: 1 week (persistent), 1 day (temporal), 4 hours (contextual)
- Access count reinforcement boosts frequently-used memories
- Extraction runs when user is idle (never blocks chat)

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

Manages ~1.8GB model acquisition.

**Key components:**
- `ModelDownloadService` - Download, verify, resume
- `downloadStore` - Progress state management

**Quick facts:**
- Resume support (survives app restart)
- Progress persistence to MMKV
- MD5 verification after download
- Background download (within iOS limits)

### [Speech Service](src/services/speech/README.md)

On-device voice-to-text transcription.

**Key components:**
- `SpeechService` - Wrapper for expo-speech-recognition

**Quick facts:**
- On-device only (no cloud transcription)
- Interim results for real-time feedback
- Dictation-optimized for natural speech

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
1. User types/speaks message
   │
   ├── [Speech] Convert voice to text (if voice input)
   │
   ▼
2. Crisis Detection (instant, no LLM)
   │
   ├── Crisis detected? → Show resources, stop
   │
   ▼
3. Memory Retrieval
   │
   ├── Get top 6 relevant memories
   ├── Apply decay + keyword scoring
   │
   ▼
4. Token Budgeting
   │
   ├── Build system prompt with memories
   ├── Truncate conversation history
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
   └── Persist extracted memories
```

## Key Design Patterns

### 1. Persist Before State
All stores persist to MMKV before updating Zustand state, ensuring data survives crashes.

### 2. Priority Queue
Chat (HIGH) preempts memory extraction (LOW), ensuring responsive UX.

### 3. Graceful Degradation
- Memory pressure → release LLM context → reinit on next message
- Extraction cancelled → queue for retry → process when idle

### 4. Safety First
Crisis detection runs before any LLM call, showing resources immediately.

## Development

### Debugging

All services log with prefixes in `__DEV__` mode:
- `[LLMService]` - Context lifecycle
- `[ChatService]` - Message flow
- `[MemoryStore]` - Memory operations
- `[MemoryExtractor]` - Extraction process
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

## Tech Stack

- **Framework**: React Native + Expo (SDK 52)
- **Routing**: Expo Router (file-based)
- **State**: Zustand
- **Storage**: react-native-mmkv
- **LLM**: llama.rn (llama.cpp bindings)
- **Speech**: @jamsch/expo-speech-recognition
- **Download**: @kesha-antonov/react-native-background-downloader

## Privacy

Cove is designed with privacy as a core principle:

- **No cloud inference**: LLM runs entirely on-device
- **No cloud speech**: Voice recognition uses iOS on-device engine
- **No analytics**: No tracking or telemetry
- **Local storage**: All data stored in app sandbox
- **No network**: AI features work completely offline

## License

[Add license information]
