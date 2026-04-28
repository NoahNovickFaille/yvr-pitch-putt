import { create } from 'zustand';
import { storage } from '../storage/storage';
import { ChatMessage, generateMessageId, Conversation } from '../types/chat';

interface ChatState {
  // Data
  messages: ChatMessage[];
  currentConversationId: string | null;

  // Streaming state
  isGenerating: boolean;
  partialResponse: string;

  // Actions
  addUserMessage: (content: string) => ChatMessage;
  startGeneration: () => void;
  appendToken: (token: string) => void;
  completeGeneration: (fullText: string | null) => void;
  clearConversation: () => void;
  switchConversation: (conversationId: string | null) => void;
  getCurrentConversation: () => Conversation | null;
}

const CONVERSATION_PREFIX = 'conversation:';

function getConversationKey(conversationId: string): string {
  return `${CONVERSATION_PREFIX}${conversationId}`;
}

function loadConversation(conversationId: string): Conversation | null {
  const key = getConversationKey(conversationId);
  const json = storage.getString(key);

  if (!json) {
    if (__DEV__) {
      console.log('[ChatStore] No conversation found for ID:', conversationId);
    }
    return null;
  }

  const conversation: Conversation = JSON.parse(json);
  if (__DEV__) {
    console.log('[ChatStore] Loaded conversation:', conversationId, 'with', conversation.messages.length, 'messages');
  }
  return conversation;
}

function persistConversation(conversation: Conversation): void {
  const key = getConversationKey(conversation.id);
  if (__DEV__) {
    console.log('[ChatStore] Persisting conversation:', conversation.id, 'with', conversation.messages.length, 'messages');
  }
  storage.set(key, JSON.stringify(conversation));
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentConversationId: null,
  isGenerating: false,
  partialResponse: '',

  addUserMessage: (content: string) => {
    const state = get();
    const conversationId = state.currentConversationId;

    if (!conversationId) {
      console.warn('[ChatStore] Cannot add message: no active conversation');
      return {
        id: generateMessageId(),
        role: 'user' as const,
        content,
        timestamp: Date.now(),
      };
    }

    const message: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    const newMessages = [...state.messages, message];

    // Get current conversation and update it
    const conversation = loadConversation(conversationId);
    if (conversation) {
      const updatedConversation: Conversation = {
        ...conversation,
        messages: newMessages,
        lastMessageAt: message.timestamp,
      };

      // CRITICAL: Persist BEFORE state update
      persistConversation(updatedConversation);
    }

    set({ messages: newMessages });
    return message;
  },

  startGeneration: () => {
    set({ isGenerating: true, partialResponse: '' });
  },

  appendToken: (token: string) => {
    set((state) => ({
      partialResponse: state.partialResponse + token,
    }));
  },

  completeGeneration: (fullText: string | null) => {
    const state = get();
    const conversationId = state.currentConversationId;

    // If fullText is null, just reset generating state without adding a message
    // This is used when send fails (LLM not ready, error, crisis, etc.)
    if (fullText === null) {
      set({
        isGenerating: false,
        partialResponse: '',
      });
      return;
    }

    if (!conversationId) {
      console.warn('[ChatStore] Cannot complete generation: no active conversation');
      set({
        isGenerating: false,
        partialResponse: '',
      });
      return;
    }

    const message: ChatMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content: fullText.trim(),
      timestamp: Date.now(),
    };

    const newMessages = [...state.messages, message];

    // Get current conversation and update it
    const conversation = loadConversation(conversationId);
    if (conversation) {
      const updatedConversation: Conversation = {
        ...conversation,
        messages: newMessages,
        lastMessageAt: message.timestamp,
      };

      // CRITICAL: Persist BEFORE state update
      persistConversation(updatedConversation);
    }

    set({
      messages: newMessages,
      isGenerating: false,
      partialResponse: '',
    });
  },

  clearConversation: () => {
    if (__DEV__) {
      console.log('[ChatStore] Clearing current conversation from memory (not deleting)');
    }
    set({
      messages: [],
      currentConversationId: null,
      partialResponse: '',
      isGenerating: false,
    });
  },

  switchConversation: (conversationId: string | null) => {
    if (__DEV__) {
      console.log('[ChatStore] Switching to conversation:', conversationId);
    }

    if (!conversationId) {
      set({
        messages: [],
        currentConversationId: null,
        partialResponse: '',
        isGenerating: false,
      });
      return;
    }

    // Load conversation from storage
    const conversation = loadConversation(conversationId);
    if (conversation) {
      set({
        messages: conversation.messages,
        currentConversationId: conversationId,
        partialResponse: '',
        isGenerating: false,
      });
    } else {
      console.warn('[ChatStore] Conversation not found:', conversationId);
      set({
        messages: [],
        currentConversationId: null,
        partialResponse: '',
        isGenerating: false,
      });
    }
  },

  getCurrentConversation: (): Conversation | null => {
    const state = get();
    if (!state.currentConversationId) return null;
    return loadConversation(state.currentConversationId);
  },
}));
