/**
 * Conversation Migration Service
 *
 * Handles one-time migration from single-conversation format to multi-conversation format.
 *
 * Legacy format:
 * - 'chat_messages' → ChatMessage[]
 * - 'conversation_meta' → ConversationMeta
 *
 * New format:
 * - 'conversations_index' → string[]
 * - 'conversation:{id}' → Conversation
 * - 'active_conversation_id' → string
 */

import { storage } from '@/src/storage/storage';
import { ChatMessage, Conversation } from '@/src/types/chat';

// Legacy storage keys (deprecated after migration)
const LEGACY_MESSAGES_KEY = 'chat_messages';
const LEGACY_CONVERSATION_META_KEY = 'conversation_meta';

// New storage keys
const CONVERSATIONS_INDEX_KEY = 'conversations_index';
const ACTIVE_CONVERSATION_ID_KEY = 'active_conversation_id';
const CONVERSATION_PREFIX = 'conversation:';

interface LegacyConversationMeta {
  startedAt?: number;
  endedAt?: number;
}

/**
 * Generate a conversation title from the first user message
 */
function generateTitleFromMessages(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find((msg) => msg.role === 'user');

  if (!firstUserMessage) {
    return 'New Conversation';
  }

  const title = firstUserMessage.content.substring(0, 50).trim();
  return title + (firstUserMessage.content.length > 50 ? '...' : '');
}

/**
 * Generate a preview from the first user message
 */
function generatePreviewFromMessages(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find((msg) => msg.role === 'user');

  if (!firstUserMessage) {
    return 'Start a conversation...';
  }

  const preview = firstUserMessage.content.substring(0, 100).trim();
  return preview + (firstUserMessage.content.length > 100 ? '...' : '');
}

/**
 * Migrates legacy single-conversation format to new multi-conversation format.
 * This function is idempotent - safe to call multiple times.
 *
 * @returns true if migration was performed, false if already migrated or no data to migrate
 */
export function migrateToMultiConversation(): boolean {
  // Check if already migrated
  const indexJson = storage.getString(CONVERSATIONS_INDEX_KEY);
  if (indexJson) {
    console.log('[Migration] Already migrated to multi-conversation format');
    return false;
  }

  // Check for legacy data
  const legacyMessagesJson = storage.getString(LEGACY_MESSAGES_KEY);
  if (!legacyMessagesJson) {
    console.log('[Migration] No legacy data found, skipping migration');
    return false;
  }

  console.log('[Migration] Starting migration to multi-conversation format');

  try {
    // Parse legacy data
    const legacyMessages: ChatMessage[] = JSON.parse(legacyMessagesJson);
    const legacyMetaJson = storage.getString(LEGACY_CONVERSATION_META_KEY);
    const legacyMeta: LegacyConversationMeta = legacyMetaJson
      ? JSON.parse(legacyMetaJson)
      : {};

    // Generate conversation ID using legacy startedAt or current timestamp
    const startedAt = legacyMeta.startedAt || Date.now();
    const conversationId = `conv-${startedAt}`;

    // Generate title and preview from messages
    const title = generateTitleFromMessages(legacyMessages);
    const preview = generatePreviewFromMessages(legacyMessages);

    // Find last message timestamp
    const lastMessageAt =
      legacyMessages.length > 0
        ? legacyMessages[legacyMessages.length - 1].timestamp
        : startedAt;

    // Create new conversation object
    const conversation: Conversation = {
      id: conversationId,
      title,
      preview,
      messages: legacyMessages,
      startedAt,
      endedAt: legacyMeta.endedAt,
      lastMessageAt,
    };

    // Write to new format
    const conversationKey = `${CONVERSATION_PREFIX}${conversationId}`;
    storage.set(conversationKey, JSON.stringify(conversation));

    // Create index with single conversation
    storage.set(CONVERSATIONS_INDEX_KEY, JSON.stringify([conversationId]));

    // Set as active conversation
    storage.set(ACTIVE_CONVERSATION_ID_KEY, conversationId);

    // Delete legacy keys
    storage.remove(LEGACY_MESSAGES_KEY);
    storage.remove(LEGACY_CONVERSATION_META_KEY);

    console.log(
      `[Migration] Successfully migrated conversation: ${conversationId}`
    );
    console.log(`[Migration] Title: ${title}`);
    console.log(`[Migration] Messages: ${legacyMessages.length}`);

    return true;
  } catch (error) {
    console.error('[Migration] Failed to migrate conversation:', error);
    // Don't delete legacy data if migration fails
    return false;
  }
}
