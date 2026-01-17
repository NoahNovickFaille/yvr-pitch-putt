import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { MessageSquare, Trash2 } from 'lucide-react-native';
import { DarkColors, DarkSpacing, DarkTypography } from '@/constants/darkTheme';

interface ConversationListItemProps {
  id: string;
  title: string;
  preview: string;
  lastMessageAt: number;
  isActive: boolean;
  onPress: () => void;
  onDelete: () => void;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;

  // More than a week, show date
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ConversationListItem({
  id,
  title,
  preview,
  lastMessageAt,
  isActive,
  onPress,
  onDelete,
}: ConversationListItemProps) {
  const handleDelete = () => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  const renderRightActions = () => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={handleDelete}
      activeOpacity={0.8}
    >
      <Trash2 size={20} color={DarkColors.text} />
    </TouchableOpacity>
  );

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <TouchableOpacity
        style={[styles.container, isActive && styles.activeContainer]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <MessageSquare
            size={18}
            color={isActive ? DarkColors.accent : DarkColors.textTertiary}
          />
        </View>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text
              style={[styles.title, isActive && styles.activeTitle]}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text style={styles.timestamp}>
              {formatRelativeTime(lastMessageAt)}
            </Text>
          </View>
          <Text
            style={styles.preview}
            numberOfLines={1}
          >
            {preview}
          </Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DarkColors.surface,
    paddingHorizontal: DarkSpacing.lg,
    paddingVertical: DarkSpacing.md,
    marginHorizontal: DarkSpacing.sm,
    marginVertical: DarkSpacing.xs,
    borderRadius: DarkSpacing.radiusSm,
  },
  activeContainer: {
    backgroundColor: DarkColors.surfaceElevated,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: DarkColors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: DarkSpacing.md,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    flex: 1,
    fontSize: DarkTypography.subheadline,
    fontWeight: DarkTypography.weightMedium,
    color: DarkColors.text,
    marginRight: DarkSpacing.sm,
  },
  activeTitle: {
    color: DarkColors.text,
  },
  timestamp: {
    fontSize: DarkTypography.caption1,
    color: DarkColors.textTertiary,
  },
  preview: {
    fontSize: DarkTypography.caption1,
    color: DarkColors.textSecondary,
  },
  deleteAction: {
    backgroundColor: DarkColors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
    height: '100%',
    marginVertical: DarkSpacing.xs,
    marginRight: DarkSpacing.sm,
    borderRadius: DarkSpacing.radiusSm,
  },
});
