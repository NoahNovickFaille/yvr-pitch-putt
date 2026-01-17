import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { Menu } from 'lucide-react-native';
import { useConversationStore } from '@/src/stores/conversationStore';
import { DarkColors, DarkSpacing, DarkTypography } from '@/constants/darkTheme';

export function ChatHeader() {
  const navigation = useNavigation<DrawerNavigationProp<{}>>();
  const { activeConversationId, getConversation } = useConversationStore();

  const conversation = activeConversationId
    ? getConversation(activeConversationId)
    : null;

  const title = conversation?.title || 'New Conversation';

  const handleMenuPress = () => {
    navigation.openDrawer();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Menu button - using Pressable for better hit testing */}
        <Pressable
          style={styles.menuButton}
          onPress={handleMenuPress}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        >
          <Menu size={24} color={DarkColors.textSecondary} />
        </Pressable>

        {/* Conversation title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {/* Right spacer for balance */}
        <View style={styles.rightSpacer} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: DarkColors.background,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DarkSpacing.sm,
    paddingVertical: DarkSpacing.sm,
    backgroundColor: DarkColors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DarkColors.border,
  },
  menuButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: DarkSpacing.sm,
  },
  title: {
    fontSize: DarkTypography.headline,
    fontWeight: DarkTypography.weightSemibold,
    color: DarkColors.text,
  },
  rightSpacer: {
    width: 48,
  },
});
