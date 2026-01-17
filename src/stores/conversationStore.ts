/**
 * Conversation Store
 *
 * Manages the list of conversations and active conversation state.
 * Handles multi-conversation persistence via MMKV.
 */

import { create } from 'zustand';
import { storage } from '@/src/storage/storage';
import { Conversation, generateConversationId } from '@/src/types/chat';

// Storage keys
const CONVERSATIONS_INDEX_KEY = 'conversations_index';
const ACTIVE_CONVERSATION_ID_KEY = 'active_conversation_id';
const CONVERSATION_PREFIX = 'conversation:';

interface ConversationStoreState {
  // State
  conversationIds: string[]; // Reverse chronological order (newest first)
  activeConversationId: string | null;

  // Actions
  loadConversations: () => void;
  createConversation: (title?: string, preview?: string) => string;
  switchConversation: (conversationId: string) => void;
  removeConversation: (conversationId: string) => void;
  removeAllConversations: () => void;
  updateConversationMetadata: (
    conversationId: string,
    updates: { title?: string; preview?: string; lastMessageAt?: number }
  ) => void;
  getConversation: (conversationId: string) => Conversation | null;
  saveConversation: (conversation: Conversation) => void;
}

export const useConversationStore = create<ConversationStoreState>(
  (set, get) => ({
    conversationIds: [],
    activeConversationId: null,

    loadConversations: () => {
      const indexJson = storage.getString(CONVERSATIONS_INDEX_KEY);
      const conversationIds = indexJson ? JSON.parse(indexJson) : [];
      const activeConversationId =
        storage.getString(ACTIVE_CONVERSATION_ID_KEY) || null;

      set({ conversationIds, activeConversationId });
    },

    createConversation: (
      title = 'New Conversation',
      preview = 'Start a conversation...'
    ) => {
      const id = generateConversationId();
      const now = Date.now();

      const newConversation: Conversation = {
        id,
        title,
        preview,
        messages: [],
        startedAt: now,
        lastMessageAt: now,
      };

      // Persist conversation to MMKV BEFORE updating state
      const conversationKey = `${CONVERSATION_PREFIX}${id}`;
      storage.set(conversationKey, JSON.stringify(newConversation));

      // Add to index (at the beginning for reverse chronological order)
      const currentIds = get().conversationIds;
      const updatedIds = [id, ...currentIds];

      // Persist index to MMKV
      storage.set(CONVERSATIONS_INDEX_KEY, JSON.stringify(updatedIds));

      // Set as active conversation
      storage.set(ACTIVE_CONVERSATION_ID_KEY, id);

      // Update state
      set({
        conversationIds: updatedIds,
        activeConversationId: id,
      });

      return id;
    },

    switchConversation: (conversationId: string) => {
      // Persist active conversation ID to MMKV BEFORE updating state
      storage.set(ACTIVE_CONVERSATION_ID_KEY, conversationId);

      // Update state
      set({ activeConversationId: conversationId });
    },

    removeConversation: (conversationId: string) => {
      const { conversationIds, activeConversationId } = get();

      // Remove from MMKV
      const conversationKey = `${CONVERSATION_PREFIX}${conversationId}`;
      storage.remove(conversationKey);

      // Remove from index
      const updatedIds = conversationIds.filter((id) => id !== conversationId);

      // Persist updated index to MMKV
      storage.set(CONVERSATIONS_INDEX_KEY, JSON.stringify(updatedIds));

      // If deleting active conversation, switch to most recent or null
      let newActiveId = activeConversationId;
      if (activeConversationId === conversationId) {
        newActiveId = updatedIds.length > 0 ? updatedIds[0] : null;
        if (newActiveId) {
          storage.set(ACTIVE_CONVERSATION_ID_KEY, newActiveId);
        } else {
          storage.remove(ACTIVE_CONVERSATION_ID_KEY);
        }
      }

      // Update state
      set({
        conversationIds: updatedIds,
        activeConversationId: newActiveId,
      });
    },

    removeAllConversations: () => {
      const { conversationIds } = get();

      // Delete all conversation data from MMKV
      conversationIds.forEach((id) => {
        const conversationKey = `${CONVERSATION_PREFIX}${id}`;
        storage.remove(conversationKey);
      });

      // Clear index and active conversation
      storage.remove(CONVERSATIONS_INDEX_KEY);
      storage.remove(ACTIVE_CONVERSATION_ID_KEY);

      // Update state
      set({
        conversationIds: [],
        activeConversationId: null,
      });
    },

    updateConversationMetadata: (conversationId, updates) => {
      const conversation = get().getConversation(conversationId);
      if (!conversation) return;

      const updatedConversation = {
        ...conversation,
        ...updates,
      };

      // Persist to MMKV BEFORE updating state
      get().saveConversation(updatedConversation);
    },

    getConversation: (conversationId: string): Conversation | null => {
      const conversationKey = `${CONVERSATION_PREFIX}${conversationId}`;
      const conversationJson = storage.getString(conversationKey);

      if (!conversationJson) return null;

      return JSON.parse(conversationJson);
    },

    saveConversation: (conversation: Conversation) => {
      const conversationKey = `${CONVERSATION_PREFIX}${conversation.id}`;
      storage.set(conversationKey, JSON.stringify(conversation));
    },
  })
);
