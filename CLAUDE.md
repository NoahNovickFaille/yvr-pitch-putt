# Cove - Local-First Emotional Companion

React Native/Expo iOS app using on-device LLM for private emotional conversations with persistent memory.

## Architecture

- **Frontend**: React Native with Expo Router (file-based routing in `app/`)
- **LLM**: llama.rn (on-device inference with Metal GPU acceleration)
- **Embeddings**: llama.rn with all-MiniLM-L6-v2 (on-device semantic similarity)
- **Storage**: react-native-mmkv (synchronous key-value store for conversations/memories)
- **State**: Zustand stores in `src/stores/`
- **Speech**: @jamsch/expo-speech-recognition (on-device voice-to-text)

## Available Models

Users can choose from three conversation models, each optimized for the confidant use case:

| Model | Size | Best For |
|-------|------|----------|
| **Llama 3.2 3B** (default) | ~2GB | Balanced all-rounder with strong instruction following |
| **Gemma 2 2B** | ~1.7GB | Warmer, more expressive conversations - naturally heartfelt |
| **Dolphin 3.0 3B** | ~2GB | Open and judgment-free listening - no safety refusals |

**Why these models?** Based on research into small language models for confidant/companion applications:
- All use Q4_K_M quantization (best quality-to-size ratio for mobile)
- Transformer architecture chosen over SSMs (e.g., LiquidAI) for superior conversational depth
- Fine-tuned variants selected to avoid "trite" responses and robotic behavior
- See `research/gemini-model-selection-research.md` for detailed analysis

Model definitions live in `src/constants/model.ts`. The system dynamically loads whichever model the user selects.

## Key Patterns

### Storage Strategy
- All data persists via MMKV (synchronous, no async/await needed)
- CRITICAL: Always persist to MMKV BEFORE updating Zustand state
- Messages stored as JSON arrays keyed by conversation ID
- See `src/storage/storage.ts` for the configured MMKV instance

### LLM Context Management
- Rolling window of recent messages + relevant memories (managed by `src/services/llm/TokenBudget.ts`)
- Memory extraction runs AFTER conversation ends (not real-time)
- Crisis detection runs on every user message (see `src/services/safety/`)

### Memory System
- **6 semantic categories**: identity, relationship, preference, situation, event, emotion
- **Category-specific decay**: 720h (identity) → 24h (emotion)
- **Semantic retrieval**: 3-bucket architecture (identity + topic-relevant + recent)
- **Deduplication**: Embedding-based duplicate detection (0.85 threshold)
- **Weighted scoring**: semantic×0.5 + decay×0.3 + importance×0.2
- **Token budget**: 650 tokens (605 content + 45 headers)
- See `src/services/memory/` and `src/services/embedding/`

### iOS Memory Pressure
- LLM context released on iOS memory warning to prevent termination; re-initialized when user returns

## Code Quality Standards

IMPORTANT: Apply these standards to ALL code changes.

### TypeScript
- Use strict typing - avoid `any`, prefer explicit types/interfaces
- Define interfaces for props, state, and API responses in `src/types/`
- Use type guards for runtime type narrowing

### React Native
- Memoize expensive computations with `useMemo`, callbacks with `useCallback`
- Use `FlatList` for lists (never `ScrollView` with `.map()`)
- Avoid inline styles - use `StyleSheet.create()`
- Keep components small and focused (<150 lines)

### DRY Principles
- Extract repeated logic into custom hooks in `src/hooks/`
- Shared UI patterns go in `src/components/`
- Constants and magic values go in `src/constants/`
- Before writing new code, check if similar functionality exists

## Directory Structure

```
app/                    # Expo Router pages (file-based routing)
  (drawer)/            # Drawer navigation group
    index.tsx          # Home/conversations list
    chat.tsx           # Main chat interface
    profile.tsx        # User profile and settings
src/
  components/          # App-specific components (chat UI, modals, onboarding)
  constants/           # Model definitions, memory constants, app constants
  hooks/               # App hooks
    useChat.ts         # Chat interaction and crisis handling
    useLLM.ts          # LLM lifecycle management
    useModelDownload.ts # Download progress and controls
    useEmbeddingModel.ts # Embedding model lifecycle
    useMemoryExtraction.ts # Triggers extraction on conversation end
    useConversationEnd.ts # App background detection
    useEmbeddingMigration.ts # Legacy memory embedding migration
  services/            # Core services (each has README.md with detailed docs)
    llm/              # LLM inference, chat orchestration, token budgeting
    memory/           # Memory extraction, decay, semantic retrieval
    embedding/        # Embedding generation, storage, deduplication
    download/         # Model download with resume support
    safety/           # Crisis detection
    speech/           # Voice input
    conversation/     # Title generation, conversation persistence
    migration/        # Data schema migrations
  storage/             # MMKV storage configuration
  stores/              # Zustand state management
    chatStore.ts       # Active conversation messages, streaming state
    conversationStore.ts # Conversation list and metadata
    memoryStore.ts     # Extracted memories
    modelStore.ts      # Selected model and download status
    onboardingStore.ts # User profile and onboarding state
  types/               # TypeScript type definitions
```

Note: Root `components/`, `constants/`, `hooks/` are Expo template files (rarely modified). Active development happens in `src/`.

## Common Commands

```bash
bun start      # Start development server
bun run ios    # Run on iOS simulator
bun run lint   # Lint
```
