# Conversation Service

The conversation service manages multi-conversation support, including creation, switching, persistence, and metadata generation.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  ConversationTitleGenerator                  │
│  (Generates titles/previews from messages)                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  ConversationStore (Zustand)                 │
│  (Manages conversation list and active conversation)         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    ChatStore (Zustand)                       │
│  (Manages messages for active conversation)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    MMKV Storage                              │
│  (Persistent key-value storage)                              │
└─────────────────────────────────────────────────────────────┘
```

## Files

| File | Location | Purpose |
|------|----------|---------|
| `ConversationTitleGenerator.ts` | `src/services/conversation/` | Generates titles (simple + LLM-based) |
| `conversationStore.ts` | `src/stores/` | Manages conversation list (Zustand store) |
| `chatStore.ts` | `src/stores/` | Manages active conversation messages |
| `conversationMigration.ts` | `src/services/migration/` | One-time migration from single to multi-conversation |

## Storage Schema

### Keys

```
conversations_index      → ["conv_1", "conv_2", ...]  (newest first)
active_conversation_id   → "conv_1"
conversation:conv_1      → { id, title, preview, messages, ... }
conversation:conv_2      → { id, title, preview, messages, ... }
```

### Conversation Object

```typescript
interface Conversation {
  id: string;                    // Unique ID (timestamp-based)
  title: string;                 // Display title (from first message or LLM)
  preview: string;               // Truncated preview text
  messages: ChatMessage[];
  startedAt: number;             // Timestamp of creation
  endedAt?: number;              // Timestamp when conversation ended (for memory extraction)
  lastMessageAt: number;         // Timestamp of last message
  titleGeneratedByLLM?: boolean; // True if smart title was generated
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
```

## ConversationStore

Manages the list of conversations and which one is active.

### State

```typescript
interface ConversationStoreState {
  conversationIds: string[];     // Reverse chronological (newest first)
  activeConversationId: string | null;

  // Actions
  loadConversations: () => void;
  createConversation: (title?, preview?) => string;
  switchConversation: (id: string) => void;
  removeConversation: (id: string) => void;
  removeAllConversations: () => void;
  updateConversationMetadata: (id, updates) => void;
  getConversation: (id: string) => Conversation | null;
  saveConversation: (conversation: Conversation) => void;
}
```

### Usage

```typescript
import { useConversationStore } from '@/src/stores/conversationStore';

// Load conversations on app startup
useConversationStore.getState().loadConversations();

// Create new conversation
const newId = useConversationStore.getState().createConversation(
  'New Conversation',
  'Start chatting...'
);

// Switch to different conversation
useConversationStore.getState().switchConversation(otherConvId);

// Get current conversation
const conv = useConversationStore.getState().getConversation(activeId);

// Delete conversation
useConversationStore.getState().removeConversation(convId);
```

## ChatStore

Manages messages for the currently active conversation.

### State

```typescript
interface ChatState {
  messages: ChatMessage[];
  currentConversationId: string | null;
  isGenerating: boolean;
  partialResponse: string;

  // Actions
  addUserMessage: (content: string) => ChatMessage;
  startGeneration: () => void;
  appendToken: (token: string) => void;
  completeGeneration: (fullText: string) => void;
  clearConversation: () => void;
  switchConversation: (id: string | null) => void;
  getCurrentConversation: () => Conversation | null;
}
```

### Message Flow

```
User types message
       │
       ▼
┌─────────────────┐
│ addUserMessage  │ ────▶ Persist to MMKV
└────────┬────────┘       Update Zustand state
         │
         ▼
┌─────────────────┐
│ startGeneration │ ────▶ isGenerating = true
└────────┬────────┘       partialResponse = ''
         │
         ▼
┌─────────────────┐
│  appendToken    │ ────▶ partialResponse += token
│  (streaming)    │       (called many times)
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ completeGeneration  │ ────▶ Add assistant message
└─────────────────────┘       Persist to MMKV
                              isGenerating = false
```

### Critical: Persist Before State

```typescript
// In addUserMessage:

// 1. Create message
const message: ChatMessage = { ... };

// 2. Update messages array
const newMessages = [...state.messages, message];

// 3. Load and update conversation
const conversation = loadConversation(conversationId);
const updatedConversation = { ...conversation, messages: newMessages };

// 4. CRITICAL: Persist BEFORE state update
persistConversation(updatedConversation);

// 5. Then update Zustand state
set({ messages: newMessages });
```

## ConversationTitleGenerator

Generates titles and previews from message content.

### API

```typescript
import {
  generateTitleFromMessage,
  generatePreviewFromMessage,
  generateTitleAndPreview
} from './ConversationTitleGenerator';

// Generate title (max 50 chars)
const title = generateTitleFromMessage("Hello, I've been feeling anxious about...");
// → "Hello, I've been feeling anxious about..."

// Generate preview (max 100 chars)
const preview = generatePreviewFromMessage("Hello, I've been...");
// → "Hello, I've been..."

// Generate both at once
const { title, preview } = generateTitleAndPreview(firstUserMessage);
```

### Current Implementation

Two approaches available:

**Simple truncation** (initial title):
- Title: First 50 characters of first user message
- Preview: First 100 characters
- Ellipsis added if truncated

**Smart title generation** (after conversation develops):
- Uses LLM to generate 2-5 word thematic titles
- Runs as LOW priority background task (won't block chat)
- Triggered after 3+ user messages and 3+ assistant messages
- Sets `titleGeneratedByLLM: true` on the conversation
- Fire-and-forget pattern with graceful error handling

```typescript
import { generateSmartTitle } from './ConversationTitleGenerator';

// Called automatically by useChat after sufficient exchanges
const title = await generateSmartTitle(messages);
// → "Work Stress Discussion" or "Family Relationship Concerns"
```

## Conversation Switching Flow

```
User taps different conversation
              │
              ▼
┌──────────────────────────────────────┐
│ conversationStore.switchConversation │
│   • Persist active_conversation_id   │
│   • Update activeConversationId      │
└──────────────────────┬───────────────┘
                       │
                       ▼
┌──────────────────────────────────────┐
│    chatStore.switchConversation      │
│   • Load conversation from MMKV      │
│   • Update messages array            │
│   • Update currentConversationId     │
└──────────────────────────────────────┘
```

## Migration Service

One-time migration from single-conversation to multi-conversation format.

### Legacy Format (Pre-Migration)

```
chat_messages        → ChatMessage[]
conversation_meta    → { startedAt?, endedAt? }
```

### New Format (Post-Migration)

```
conversations_index      → string[]
active_conversation_id   → string
conversation:{id}        → Conversation
```

### Migration Flow

```typescript
import { migrateToMultiConversation } from '../migration/conversationMigration';

// Called once on app startup
const migrated = migrateToMultiConversation();

if (migrated) {
  console.log('Migrated legacy conversation to new format');
}
```

### Migration Logic

1. Check if already migrated (idempotent)
2. Load legacy `chat_messages` and `conversation_meta`
3. Generate conversation ID from timestamp
4. Generate title/preview from first user message
5. Write new format to MMKV
6. Delete legacy keys (only if migration successful)

## Conversation List UI

```typescript
function ConversationList() {
  const { conversationIds, activeConversationId } = useConversationStore();

  return (
    <FlatList
      data={conversationIds}
      renderItem={({ item: convId }) => {
        const conv = useConversationStore.getState().getConversation(convId);
        return (
          <ConversationRow
            conversation={conv}
            isActive={convId === activeConversationId}
            onPress={() => switchToConversation(convId)}
          />
        );
      }}
    />
  );
}
```

## New Conversation Flow

```
User taps "New Conversation"
              │
              ▼
┌──────────────────────────────────────┐
│ conversationStore.createConversation │
│   • Generate unique ID               │
│   • Create Conversation object       │
│   • Persist to MMKV                  │
│   • Add to conversationIds (front)   │
│   • Set as activeConversationId      │
└──────────────────────┬───────────────┘
                       │
                       ▼
┌──────────────────────────────────────┐
│    chatStore.switchConversation      │
│   • Clear messages array             │
│   • Set currentConversationId        │
└──────────────────────────────────────┘
              │
              ▼
        Chat UI ready
        for new messages
```

## Delete Conversation Flow

```
User deletes conversation
              │
              ▼
┌──────────────────────────────────────┐
│ conversationStore.removeConversation │
│   • Delete from MMKV                 │
│   • Remove from conversationIds      │
│   • If was active:                   │
│     - Switch to next most recent     │
│     - Or set activeId to null        │
└──────────────────────────────────────┘
```

## ID Generation

```typescript
function generateConversationId(): string {
  return `conv-${Date.now()}`;
}
// → "conv-1704067200000"
```

Components:
- `conv-` prefix for clarity (hyphen, not underscore)
- Timestamp for ordering and uniqueness

## Performance Considerations

1. **Lazy Loading**: Conversations loaded on-demand from MMKV
2. **Index-First**: conversationIds loaded first, full data loaded when needed
3. **Synchronous MMKV**: No async/await overhead for storage operations
4. **Minimal Re-renders**: Zustand's selective subscriptions

## Debugging

```typescript
if (__DEV__) {
  console.log('[ConversationStore] Creating conversation:', id);
  console.log('[ConversationStore] Switching to:', conversationId);
  console.log('[ChatStore] Loaded', conversation.messages.length, 'messages');
}
```

## Integration Points

### With Memory Service

When conversation ends (user navigates away):
- MemoryOrchestrator extracts memories from messages
- Extracted memories are deduplicated via EmbeddingService (0.85 similarity threshold)
- Duplicate memories get importance boosted; new memories get embeddings generated
- Memories persist independently of conversation with semantic category and embedding

### With Chat Service

- ChatService reads messages from chatStore
- Sends to LLM with memory context
- Updates chatStore with responses

### With LLM Service

- Messages formatted for LLM prompt
- Token budget applied to conversation history
- Recent messages prioritized over old
