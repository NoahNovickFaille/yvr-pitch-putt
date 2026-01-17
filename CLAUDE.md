# Cove - Local-First Emotional Companion

React Native/Expo iOS app using on-device LLM for private emotional conversations with persistent memory.

## Architecture

- **Frontend**: React Native with Expo Router (file-based routing in `app/`)
- **LLM**: llama.rn (on-device inference with Metal GPU acceleration)
- **Storage**: react-native-mmkv (synchronous key-value store for conversations/memories)
- **State**: Zustand stores in `src/stores/`
- **Speech**: @jamsch/expo-speech-recognition (on-device voice-to-text)

## Key Patterns

### Storage Strategy
- All data persists via MMKV (synchronous, no async/await needed)
- CRITICAL: Always persist to MMKV BEFORE updating Zustand state
- Messages stored as JSON arrays keyed by conversation ID
- See `src/storage/storage.ts` for the configured MMKV instance

### LLM Context Management
- 4096 token context window shared between system prompt, memories, and conversation history
- Rolling window: Last 8 messages + top 10 relevant memories
- Token budget managed by `src/services/llm/TokenBudget.ts`
- Memory extraction runs AFTER conversation ends (not real-time)

### Memory System
- Memories decay over time using exponential decay formula
- Three decay rates: 0.1 (persistent facts), 0.3 (medium-term), 0.7 (ephemeral)
- Memory extraction uses LLM to parse conversations into structured facts
- See `src/services/memory/MemoryExtractor.ts` and `MemoryDecay.ts`

### iOS Memory Pressure
- App monitors iOS memory warnings via `memoryMonitor.ts`
- LLM context released immediately on memory warning to prevent app termination
- Context re-initialized when user returns to chat

## Directory Structure

```
app/                    # Expo Router pages (file-based routing)
  (tabs)/              # Tab navigation screens
components/            # Expo template components (themed, reusable UI)
constants/             # Expo template constants (theme colors)
hooks/                 # Expo template hooks (color scheme, theme)
src/
  components/          # App-specific components (chat UI, modals)
  constants/           # Model definitions and app constants
  hooks/               # App hooks (useChat, useLLM, useModelDownload, useSpeech)
  services/            # Core services (llm, memory, download, safety, speech)
  storage/             # MMKV storage configuration
  stores/              # Zustand state management
  types/               # TypeScript type definitions
```

## Common Commands

```bash
# Start development server
npm start

# Run on iOS simulator
npm run ios

# Lint
npm run lint
```

## Development Guidelines

- Test memory extraction with multi-day conversation scenarios
- Monitor token usage - context window fills fast
- Crisis detection runs on every user message (see `src/services/safety/`)
- Streaming responses use callback-based token emission from llama.rn
- Model downloads can be interrupted - use background downloader with resume support

## Important Notes

- Root `components/`, `constants/`, `hooks/` = Expo template files (rarely modified)
- Active development happens in `src/` subdirectories
- All LLM operations run on device - no network calls for inference
- App bundles without model - downloads on first launch (~1.8GB)
