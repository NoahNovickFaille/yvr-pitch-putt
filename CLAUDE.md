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
- Rolling window of recent messages + relevant memories (managed by `src/services/llm/TokenBudget.ts`)
- Memory extraction runs AFTER conversation ends (not real-time)
- Crisis detection runs on every user message (see `src/services/safety/`)

### Memory System
- Memories decay over time using exponential decay (see `src/services/memory/MemoryDecay.ts`)
- Memory extraction uses LLM to parse conversations into structured facts (see `src/services/memory/MemoryExtractor.ts`)

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
  (tabs)/              # Tab navigation screens
src/
  components/          # App-specific components (chat UI, modals)
  constants/           # Model definitions and app constants
  hooks/               # App hooks (useChat, useLLM, useModelDownload, useSpeech)
  services/            # Core services (llm, memory, download, safety, speech)
  storage/             # MMKV storage configuration
  stores/              # Zustand state management
  types/               # TypeScript type definitions
```

Note: Root `components/`, `constants/`, `hooks/` are Expo template files (rarely modified). Active development happens in `src/`.

## Common Commands

```bash
npm start      # Start development server
npm run ios    # Run on iOS simulator
npm run lint   # Lint
```
