# App Components

Chat interface components and modals specific to Cove.

## Structure

### chat/
- **ChatInput** - Text input with send button for message composition
- **MessageBubble** - Individual message display (user vs assistant styling)
- **MessageList** - Scrollable conversation history with auto-scroll to bottom
- **StreamingMessage** - Live-updating message display during LLM token generation
- **TypingIndicator** - Animated "..." indicator while assistant is thinking

### modals/
- Modal dialogs (crisis resources, settings, etc.)

## Key Patterns

### Message Streaming
- StreamingMessage updates character-by-character as tokens arrive
- Once complete, converts to permanent MessageBubble
- Smooth scrolling maintained during streaming

### Styling
- Uses themed components from root `components/` for consistency
- Chat bubbles differentiate user (right-aligned, primary color) vs assistant (left-aligned, muted)

## Usage

Components consume `useChatStore` for message state and `useChat` hook for sending messages.
