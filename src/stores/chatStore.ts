import { create } from 'zustand';
import { storage } from '../storage/storage';
import { ChatMessage, generateMessageId } from '../types/chat';

const MESSAGES_KEY = 'chat_messages';
const CONVERSATION_META_KEY = 'conversation_meta';

interface ConversationMeta {
  startedAt: number;
  endedAt?: number;
}

interface ChatState {
  // Data
  messages: ChatMessage[];
  conversationMeta: ConversationMeta | null;

  // Streaming state
  isGenerating: boolean;
  partialResponse: string;

  // Actions
  addUserMessage: (content: string) => ChatMessage;
  startGeneration: () => void;
  appendToken: (token: string) => void;
  completeGeneration: (fullText: string) => void;
  clearConversation: () => void;
  loadFromStorage: () => void;
  markConversationEnded: () => void;
}

function persistMessages(messages: ChatMessage[]): void {
  if (__DEV__) {
    console.log('[ChatStore] Persisting messages:', messages.length);
  }
  storage.set(MESSAGES_KEY, JSON.stringify(messages));
}

function loadMessages(): ChatMessage[] {
  const json = storage.getString(MESSAGES_KEY);
  const messages = json ? JSON.parse(json) : [];
  if (__DEV__) {
    console.log('[ChatStore] Loaded messages:', messages.length);
  }
  return messages;
}

function persistMeta(meta: ConversationMeta): void {
  if (__DEV__) {
    console.log('[ChatStore] Persisting meta:', meta);
  }
  storage.set(CONVERSATION_META_KEY, JSON.stringify(meta));
}

function loadMeta(): ConversationMeta | null {
  const json = storage.getString(CONVERSATION_META_KEY);
  const meta = json ? JSON.parse(json) : null;
  if (__DEV__) {
    console.log('[ChatStore] Loaded meta:', meta);
  }
  return meta;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  conversationMeta: null,
  isGenerating: false,
  partialResponse: '',

  addUserMessage: (content: string) => {
    const message: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    const state = get();
    const newMessages = [...state.messages, message];

    // Start new conversation if none exists
    let meta = state.conversationMeta;
    if (!meta) {
      meta = { startedAt: Date.now() };
      persistMeta(meta);
    }

    // CRITICAL: Persist BEFORE state update
    persistMessages(newMessages);
    set({ messages: newMessages, conversationMeta: meta });

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

  completeGeneration: (fullText: string) => {
    const message: ChatMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content: fullText,
      timestamp: Date.now(),
    };

    const newMessages = [...get().messages, message];

    // CRITICAL: Persist BEFORE state update
    persistMessages(newMessages);
    set({
      messages: newMessages,
      isGenerating: false,
      partialResponse: '',
    });
  },

  clearConversation: () => {
    if (__DEV__) {
      console.log('[ChatStore] Clearing conversation');
    }
    storage.remove(MESSAGES_KEY);
    storage.remove(CONVERSATION_META_KEY);
    set({
      messages: [],
      conversationMeta: null,
      partialResponse: '',
      isGenerating: false,
    });
  },

  loadFromStorage: () => {
    const messages = loadMessages();
    const meta = loadMeta();
    set({ messages, conversationMeta: meta });
  },

  markConversationEnded: () => {
    const state = get();
    if (state.conversationMeta) {
      const meta = { ...state.conversationMeta, endedAt: Date.now() };
      persistMeta(meta);
      set({ conversationMeta: meta });
    }
  },
}));
