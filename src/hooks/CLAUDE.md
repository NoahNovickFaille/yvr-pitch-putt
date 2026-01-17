# App Hooks

Custom React hooks for chat, LLM, model management, and speech features.

## Hooks

### useChat
Main chat orchestration hook. Handles:
- Sending user messages
- Triggering LLM generation with streaming
- Token-by-token response updates
- Integrates with chatStore, LLMService, and memory system

### useConversationEnd
Detects when conversation ends (app backgrounded or user leaves chat). Triggers:
- Memory extraction from conversation
- Conversation metadata update (endedAt timestamp)
- Uses AppState and React Navigation lifecycle

### useLLM
Low-level LLM interaction hook. Manages:
- Model initialization and release
- Context window management
- Streaming inference
- Memory pressure handling
- Wraps LLMService singleton

### useModelDownload
Handles model file download on first launch:
- Progress tracking (bytes downloaded / total size)
- Resume capability for interrupted downloads
- File verification
- Uses background downloader

### useSpeech
Speech-to-text functionality:
- On-device voice recognition
- Push-to-talk pattern
- Transcription result handling
- Error handling and permissions

## Usage Pattern

Most screens/components only need `useChat` - it orchestrates the others internally. Lower-level hooks available for custom flows.

## Important

All hooks assume MMKV storage is synchronous. No async storage operations in hook state updates.
