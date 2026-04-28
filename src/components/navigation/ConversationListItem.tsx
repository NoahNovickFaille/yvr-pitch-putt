import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Trash2 } from 'lucide-react-native';
import { DarkColors, DarkSpacing, DarkTypography } from '@/constants/darkTheme';

interface ConversationListItemProps {
  title: string;
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
  title,
  lastMessageAt,
  isActive,
  onPress,
  onDelete,
}: ConversationListItemProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => swipeableRef.current?.close(),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            swipeableRef.current?.close();
            onDelete();
          },
        },
      ]
    );
  }, [onDelete]);

  const renderRightActions = useCallback(() => (
    <RectButton
      style={styles.deleteAction}
      onPress={handleDelete}
    >
      <Trash2 size={20} color={DarkColors.text} />
    </RectButton>
  ), [handleDelete]);

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      <RectButton
        style={[styles.container, isActive && styles.activeContainer]}
        onPress={handlePress}
        underlayColor={DarkColors.surfaceElevated}
      >
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
        </View>
      </RectButton>
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
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  deleteAction: {
    backgroundColor: DarkColors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
    marginVertical: DarkSpacing.xs,
    marginRight: DarkSpacing.sm,
    borderRadius: DarkSpacing.radiusSm,
  },
});
