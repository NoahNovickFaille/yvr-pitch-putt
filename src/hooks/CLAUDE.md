# App Hooks

Custom React hooks for chat, LLM, model management, and speech features.

## Hooks

### useChat
Main chat orchestration hook. Handles:
- Sending user messages
- Triggering LLM generation with streaming
- Token-by-token response updates
- Integrates with chatStore, LLMService, and memory system

### useMemoryExtraction
Detects when to extract memories from conversations. Triggers:
- Memory extraction when app backgrounds
- Memory extraction when user switches to a different conversation
- Conversation metadata update (endedAt timestamp)
- Uses AppState for background detection and conversation store for switch detection
- Integrates with ExtractionQueue for retry on failure

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
