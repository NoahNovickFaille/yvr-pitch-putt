export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;              // Auto-generated from first message
  preview: string;            // First 100 chars of first user message
  messages: ChatMessage[];
  startedAt: number;
  endedAt?: number;
  lastMessageAt: number;      // For sorting conversations
}

// Helper for creating message IDs
export function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper for creating conversation IDs
export function generateConversationId(): string {
  return `conv-${Date.now()}`;
}
