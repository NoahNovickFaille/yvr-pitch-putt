# App Hooks

Custom React hooks for chat, LLM, embedding, and model management.

## Hooks

### useChat
Main chat orchestration hook. Handles:
- Sending user messages
- Triggering LLM generation with streaming
- Token-by-token response updates
- Integrates with chatStore, LLMService, and memory system (semantic retrieval)

### useMemoryExtraction
Detects when to extract memories from conversations. Triggers:
- Memory extraction when app backgrounds
- Memory extraction when user switches to a different conversation
- Conversation metadata update (endedAt timestamp)
- Uses AppState for background detection and conversation store for switch detection
- Integrates with ExtractionQueue for retry on failure
- Extracted memories are deduplicated via EmbeddingService and get embeddings generated

### useLLM
Low-level LLM interaction hook. Manages:
- Model initialization and release
- Context window management
- Streaming inference
- Memory pressure handling
- Wraps LLMService singleton

### useEmbeddingModel
Embedding model lifecycle management. Handles:
- Download state tracking (isDownloaded, downloadProgress)
- Initialization state (isReady)
- Automatic initialization after download
- Manual download trigger (startDownload)
- Memory pressure handling

Usage:
```typescript
const { isDownloaded, isReady, startDownload, downloadProgress } = useEmbeddingModel();

if (!isDownloaded) {
  return <Button onPress={startDownload}>Download ({downloadProgress}%)</Button>;
}

if (!isReady) {
  return <Text>Initializing...</Text>;
}

// EmbeddingService.embed() now available
```

### useFollowUp
Proactive follow-up check-in triggered by conversation changes and app foreground. Handles:
- Checking for due follow-up candidates on conversation switch, app startup, and foreground transitions
- Subscribes to `activeConversationId` — triggers check whenever the user opens/creates/switches conversations
- Generating a natural LLM opening message if a follow-up is due and the conversation is empty
- Guards: cooldown (30s between foreground checks), empty conversation, LLM readiness polling
- Builds system prompt with memories + follow-up context section
- Uses LOW priority LLM completion (yields to user-initiated chat)
- Marks follow-ups as delivered after successful generation

Usage: Called in ChatScreen alongside `useChat`. No return value — side-effect only.

```typescript
// In ChatScreen
useFollowUp(); // Triggers on conversation change + foreground transitions
```

### useModelDownload
Handles chat model file download on first launch:
- Progress tracking (bytes downloaded / total size)
- Resume capability for interrupted downloads
- File verification
- Uses background downloader

## Usage Pattern

Most screens/components only need `useChat` - it orchestrates the others internally. Lower-level hooks available for custom flows.

The embedding model hook (`useEmbeddingModel`) is used internally by memory extraction for deduplication and semantic retrieval. Most components don't need to interact with it directly.

## Important

All hooks assume MMKV storage is synchronous. No async storage operations in hook state updates.
