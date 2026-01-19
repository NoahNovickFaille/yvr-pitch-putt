import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Plus, Settings, MessageCircle } from 'lucide-react-native';
import { useConversationStore } from '@/src/stores/conversationStore';
import { ConversationListItem } from './ConversationListItem';
import { IconButton, PressableButton } from '@/src/components/ui';
import { DarkColors, DarkSpacing, DarkTypography } from '@/constants/darkTheme';

interface CustomDrawerContentProps {
  closeDrawer: () => void;
}

export function CustomDrawerContent({ closeDrawer }: CustomDrawerContentProps) {
  const {
    conversationIds,
    activeConversationId,
    createConversation,
    switchConversation,
    removeConversation,
    getConversation,
  } = useConversationStore();

  const handleNewChat = useCallback(() => {
    const newId = createConversation();
    switchConversation(newId);
    closeDrawer();
    router.replace('/(drawer)/chat');
  }, [createConversation, switchConversation, closeDrawer]);

  const handleConversationPress = useCallback(
    (conversationId: string) => {
      switchConversation(conversationId);
      closeDrawer();
      router.replace('/(drawer)/chat');
    },
    [switchConversation, closeDrawer]
  );

  const handleDelete = useCallback(
    (conversationId: string) => {
      removeConversation(conversationId);
    },
    [removeConversation]
  );

  const handleSettingsPress = useCallback(() => {
    closeDrawer();
    router.push('/(drawer)/profile');
  }, [closeDrawer]);

  const renderConversation = useCallback(
    ({ item }: { item: string }) => {
      const conversation = getConversation(item);
      if (!conversation) return null;

      return (
        <ConversationListItem
          id={conversation.id}
          title={conversation.title}
          preview={conversation.preview}
          lastMessageAt={conversation.lastMessageAt}
          isActive={conversation.id === activeConversationId}
          onPress={() => handleConversationPress(conversation.id)}
          onDelete={() => handleDelete(conversation.id)}
        />
      );
    },
    [activeConversationId, getConversation, handleConversationPress, handleDelete]
  );

  const renderEmptyState = useCallback(
    () => (
      <View style={styles.emptyState}>
        <MessageCircle size={48} color={DarkColors.textTertiary} />
        <Text style={styles.emptyText}>No conversations yet</Text>
        <Text style={styles.emptySubtext}>Start a new chat to begin</Text>
      </View>
    ),
    []
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brandName}>Cove</Text>
        <IconButton
          style={styles.newChatButton}
          onPress={handleNewChat}
          accessibilityLabel="Create new conversation"
        >
          <Plus size={20} color={DarkColors.accent} />
        </IconButton>
      </View>

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Conversations</Text>
      </View>

      {/* Conversation list */}
      <FlatList
        data={conversationIds}
        renderItem={renderConversation}
        keyExtractor={(item) => item}
        contentContainerStyle={conversationIds.length === 0 ? styles.emptyListContent : styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Footer with Settings */}
      <View style={styles.footer}>
        <PressableButton
          style={styles.settingsButton}
          onPress={handleSettingsPress}
          accessibilityLabel="Open settings"
        >
          <Settings size={20} color={DarkColors.textSecondary} />
          <Text style={styles.settingsText}>Settings</Text>
        </PressableButton>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DarkColors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DarkSpacing.lg,
    paddingVertical: DarkSpacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DarkColors.border,
  },
  brandName: {
    fontSize: DarkTypography.title2,
    fontWeight: DarkTypography.weightBold,
    color: DarkColors.text,
  },
  newChatButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DarkColors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    paddingHorizontal: DarkSpacing.lg,
    paddingTop: DarkSpacing.md,
    paddingBottom: DarkSpacing.xs,
  },
  sectionTitle: {
    fontSize: DarkTypography.footnote,
    fontWeight: DarkTypography.weightMedium,
    color: DarkColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingBottom: DarkSpacing.md,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: DarkSpacing.xxl,
    gap: DarkSpacing.sm,
  },
  emptyText: {
    fontSize: DarkTypography.headline,
    fontWeight: DarkTypography.weightSemibold,
    color: DarkColors.textSecondary,
    marginTop: DarkSpacing.md,
  },
  emptySubtext: {
    fontSize: DarkTypography.subheadline,
    color: DarkColors.textTertiary,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DarkColors.border,
    paddingHorizontal: DarkSpacing.lg,
    paddingVertical: DarkSpacing.md,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: DarkSpacing.sm,
    gap: DarkSpacing.md,
  },
  settingsText: {
    fontSize: DarkTypography.callout,
    color: DarkColors.textSecondary,
    fontWeight: DarkTypography.weightMedium,
  },
});
