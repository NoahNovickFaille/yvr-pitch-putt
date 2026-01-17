import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Menu, Cpu, MessageSquare, Brain, Shield, Trash2, Phone, MessageCircle, AlertTriangle } from 'lucide-react-native';
import { useConversationStore } from '../stores/conversationStore';
import { useMemoryStore } from '../stores/memoryStore';
import { DarkColors, DarkSpacing, DarkTypography } from '@/constants/darkTheme';
import { DISCLAIMER_TEXT } from '../constants/disclaimer';

export function SettingsScreen() {
  const navigation = useNavigation();
  const { removeAllConversations, conversationIds } = useConversationStore();
  const { memories, clearAll } = useMemoryStore();

  const handleMenuPress = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const handleCall988 = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL('tel:988');
  };

  const handleTextCrisisLine = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL('sms:741741&body=HOME');
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all conversations and memories. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            removeAllConversations();
            clearAll();
            Alert.alert('Cleared', 'All conversations and memories have been deleted.');
          },
        },
      ]
    );
  };

  const handleDeleteAllConversations = () => {
    Alert.alert(
      'Delete All Conversations',
      `Are you sure you want to delete all ${conversationIds.length} conversations? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => {
            removeAllConversations();
            Alert.alert('Deleted', 'All conversations have been deleted.');
          },
        },
      ]
    );
  };

  const handleDeleteAllMemories = () => {
    Alert.alert(
      'Delete All Memories',
      `Are you sure you want to delete all ${memories.length} memories? This will reset Confidant's knowledge of you. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => {
            clearAll();
            Alert.alert('Deleted', 'All memories have been deleted.');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable
            style={styles.menuButton}
            onPress={handleMenuPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Menu size={24} color={DarkColors.textSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.rightSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Crisis Resources Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Crisis Resources</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.crisisButton}
              onPress={handleCall988}
              activeOpacity={0.8}
            >
              <Phone size={20} color="#FFFFFF" />
              <View style={styles.crisisButtonContent}>
                <Text style={styles.crisisButtonTitle}>Call 988</Text>
                <Text style={styles.crisisButtonSubtitle}>Suicide & Crisis Lifeline</Text>
              </View>
            </TouchableOpacity>
            <View style={{ height: DarkSpacing.itemSpacing }} />
            <TouchableOpacity
              style={styles.crisisButton}
              onPress={handleTextCrisisLine}
              activeOpacity={0.8}
            >
              <MessageCircle size={20} color="#FFFFFF" />
              <View style={styles.crisisButtonContent}>
                <Text style={styles.crisisButtonTitle}>Text HOME to 741741</Text>
                <Text style={styles.crisisButtonSubtitle}>Crisis Text Line</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.crisisAvailability}>Available 24/7, free and confidential</Text>
          </View>
        </View>

        {/* Model Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Model Information</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Cpu size={18} color={DarkColors.accent} />
              </View>
              <Text style={styles.infoLabel}>Model</Text>
              <Text style={styles.infoValue}>Llama 3.2 3B</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <MessageSquare size={18} color={DarkColors.accent} />
              </View>
              <Text style={styles.infoLabel}>Conversations</Text>
              <Text style={styles.infoValue}>{conversationIds.length}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Brain size={18} color={DarkColors.accent} />
              </View>
              <Text style={styles.infoLabel}>Stored Memories</Text>
              <Text style={styles.infoValue}>{memories.length}</Text>
            </View>
          </View>
        </View>

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>

          <TouchableOpacity
            style={[styles.card, styles.dangerCard]}
            onPress={handleDeleteAllConversations}
            activeOpacity={0.7}
            disabled={conversationIds.length === 0}
          >
            <View style={styles.dangerRow}>
              <Trash2 size={20} color={DarkColors.danger} />
              <View style={styles.dangerContent}>
                <Text style={styles.dangerText}>Delete All Conversations</Text>
                <Text style={styles.dangerSubtext}>
                  Remove all {conversationIds.length} conversation{conversationIds.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, styles.dangerCard]}
            onPress={handleDeleteAllMemories}
            activeOpacity={0.7}
            disabled={memories.length === 0}
          >
            <View style={styles.dangerRow}>
              <Trash2 size={20} color={DarkColors.danger} />
              <View style={styles.dangerContent}>
                <Text style={styles.dangerText}>Delete All Memories</Text>
                <Text style={styles.dangerSubtext}>
                  Remove all {memories.length} stored memor{memories.length !== 1 ? 'ies' : 'y'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.card}>
            <View style={styles.privacyRow}>
              <Shield size={20} color={DarkColors.success} />
              <Text style={styles.privacyText}>
                All conversations and memories are stored locally on your device using on-device AI.
                No data is sent to external servers.
              </Text>
            </View>
          </View>
        </View>

        {/* About This App / Disclaimer Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This App</Text>
          <View style={styles.card}>
            <View style={styles.disclaimerRow}>
              <AlertTriangle size={20} color={DarkColors.warning} />
              <Text style={styles.disclaimerIntro}>{DISCLAIMER_TEXT.intro}</Text>
            </View>
            <View style={styles.disclaimerBullets}>
              {DISCLAIMER_TEXT.bullets.map((bullet, index) => (
                <Text key={index} style={styles.disclaimerBullet}>
                  {'\u2022'} {bullet}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* Danger Zone Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.dangerSectionTitle]}>Danger Zone</Text>
          <TouchableOpacity
            style={styles.clearAllCard}
            onPress={handleClearAllData}
            activeOpacity={0.7}
            disabled={conversationIds.length === 0 && memories.length === 0}
          >
            <View style={styles.dangerRow}>
              <Trash2 size={20} color={DarkColors.danger} />
              <View style={styles.dangerContent}>
                <Text style={styles.dangerText}>Clear All Data</Text>
                <Text style={styles.dangerSubtext}>
                  Delete all conversations and memories permanently
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidant v1.0</Text>
          <Text style={styles.footerSubtext}>
            Your private emotional companion
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DarkColors.background,
  },
  header: {
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
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: DarkTypography.headline,
    fontWeight: DarkTypography.weightSemibold,
    color: DarkColors.text,
  },
  rightSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: DarkSpacing.screenPadding,
  },
  section: {
    marginBottom: DarkSpacing.sectionSpacing,
  },
  sectionTitle: {
    fontSize: DarkTypography.footnote,
    fontWeight: DarkTypography.weightMedium,
    color: DarkColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: DarkSpacing.itemSpacing,
  },
  card: {
    backgroundColor: DarkColors.surface,
    borderRadius: DarkSpacing.radiusMd,
    padding: DarkSpacing.cardPadding,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: DarkSpacing.md,
  },
  infoIcon: {
    width: 32,
    marginRight: DarkSpacing.md,
  },
  infoLabel: {
    flex: 1,
    fontSize: DarkTypography.callout,
    color: DarkColors.text,
  },
  infoValue: {
    fontSize: DarkTypography.callout,
    fontWeight: DarkTypography.weightSemibold,
    color: DarkColors.accent,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DarkColors.border,
    marginLeft: 44,
  },
  dangerCard: {
    marginBottom: DarkSpacing.itemSpacing,
    backgroundColor: DarkColors.dangerMuted,
    borderWidth: 1,
    borderColor: DarkColors.danger,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DarkSpacing.md,
  },
  dangerContent: {
    flex: 1,
  },
  dangerText: {
    fontSize: DarkTypography.callout,
    fontWeight: DarkTypography.weightSemibold,
    color: DarkColors.danger,
    marginBottom: 2,
  },
  dangerSubtext: {
    fontSize: DarkTypography.footnote,
    color: DarkColors.textSecondary,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: DarkSpacing.md,
  },
  privacyText: {
    flex: 1,
    fontSize: DarkTypography.callout,
    color: DarkColors.text,
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: DarkSpacing.sectionSpacing,
  },
  footerText: {
    fontSize: DarkTypography.footnote,
    color: DarkColors.textSecondary,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: DarkTypography.caption1,
    color: DarkColors.textTertiary,
  },
  // Crisis Resources Styles
  crisisButton: {
    backgroundColor: '#DC2626',
    paddingVertical: DarkSpacing.lg,
    paddingHorizontal: DarkSpacing.lg,
    borderRadius: DarkSpacing.radiusSm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: DarkSpacing.md,
  },
  crisisButtonContent: {
    flex: 1,
  },
  crisisButtonTitle: {
    color: '#FFFFFF',
    fontSize: DarkTypography.callout,
    fontWeight: DarkTypography.weightSemibold,
  },
  crisisButtonSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: DarkTypography.footnote,
    marginTop: 2,
  },
  crisisAvailability: {
    fontSize: DarkTypography.footnote,
    color: DarkColors.textSecondary,
    textAlign: 'center',
    marginTop: DarkSpacing.lg,
  },
  // Disclaimer Styles
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: DarkSpacing.md,
    marginBottom: DarkSpacing.md,
  },
  disclaimerIntro: {
    flex: 1,
    fontSize: DarkTypography.callout,
    color: DarkColors.text,
    lineHeight: 22,
  },
  disclaimerBullets: {
    marginLeft: 32,
  },
  disclaimerBullet: {
    fontSize: DarkTypography.footnote,
    color: DarkColors.textSecondary,
    lineHeight: 20,
    marginBottom: DarkSpacing.sm,
  },
  // Danger Zone Styles
  dangerSectionTitle: {
    color: DarkColors.danger,
  },
  clearAllCard: {
    backgroundColor: DarkColors.dangerMuted,
    borderRadius: DarkSpacing.radiusMd,
    padding: DarkSpacing.cardPadding,
    borderWidth: 1,
    borderColor: DarkColors.danger,
  },
});
