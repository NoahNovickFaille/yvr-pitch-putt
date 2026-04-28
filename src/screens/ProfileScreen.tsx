import { DarkColors, DarkSpacing, DarkTypography } from '@/constants/darkTheme';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { AlertTriangle, Check, Menu, MessageCircle, Pencil, Phone, Shield, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ModelSelector } from '../components/settings/ModelSelector';
import { DISCLAIMER_TEXT } from '../constants/disclaimer';
import { useDownloadStore } from '../services/download/downloadStore';
import { deleteAllModels } from '../services/download/ModelDownloadService';
import { LLMService } from '../services/llm/LLMService';
import { useConversationStore } from '../stores/conversationStore';
import { useMemoryStore } from '../stores/memoryStore';
import { useModelStore } from '../stores/modelStore';
import { useOnboardingStore } from '../stores/onboardingStore';

type SettingsTab = 'general' | 'nerds';

const BIO_MAX_LENGTH = 500;

export function ProfileScreen() {
  const navigation = useNavigation();
  const { removeAllConversations, conversationIds } = useConversationStore();
  const { memories, clearAll } = useMemoryStore();
  const { userName, userBio, updateProfile, resetOnboarding } = useOnboardingStore();
  const { clearAllModelData } = useModelStore();
  const { setModelState } = useDownloadStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(userName || '');
  const [editBio, setEditBio] = useState(userBio || '');
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  useEffect(() => {
    setEditName(userName || '');
    setEditBio(userBio || '');
  }, [userName, userBio]);

  const handleMenuPress = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const handleEditPress = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditName(userName || '');
    setEditBio(userBio || '');
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      Alert.alert('Name Required', 'Please enter a name.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateProfile(trimmedName, editBio.trim());
    setIsEditing(false);
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
      'This will permanently delete all conversations, memories, and downloaded AI models (~2GB). This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // 1. Release LLM context first (prevents crashes during file deletion)
            LLMService.release();

            // 2. Delete all model files from disk
            await deleteAllModels();

            // 3. Reset model store state
            clearAllModelData();

            // 4. Reset download store state
            setModelState({ status: 'not_downloaded' });

            // 5. Clear conversations and memories
            removeAllConversations();
            clearAll();

            // 6. Reset onboarding state (redirects to onboarding flow)
            resetOnboarding();

            Alert.alert('Cleared', 'All conversations, memories, and AI models have been deleted.');
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

  const handleTabSwitch = (tab: SettingsTab) => {
    if (tab === activeTab) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
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

      {/* Tab Toggle */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'general' && styles.tabActive]}
          onPress={() => handleTabSwitch('general')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'general' && styles.tabTextActive]}>
            General
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'nerds' && styles.tabActive]}
          onPress={() => handleTabSwitch('nerds')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'nerds' && styles.tabTextActive]}>
            For Nerds
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {activeTab === 'general' ? (
          <>
        {/* Profile Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Profile</Text>
            {!isEditing && (
              <TouchableOpacity onPress={handleEditPress} style={styles.editButton}>
                <Pencil size={16} color={DarkColors.accent} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.card}>
            {isEditing ? (
              <>
                <View style={styles.editField}>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <TextInput
                    style={styles.input}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Your name"
                    placeholderTextColor={DarkColors.textTertiary}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
                <View style={styles.editField}>
                  <Text style={styles.fieldLabel}>About you</Text>
                  <TextInput
                    style={[styles.input, styles.bioInput]}
                    value={editBio}
                    onChangeText={(text) => setEditBio(text.slice(0, BIO_MAX_LENGTH))}
                    placeholder="Tell me a bit about yourself..."
                    placeholderTextColor={DarkColors.textTertiary}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <Text style={styles.charCount}>{editBio.length}/{BIO_MAX_LENGTH}</Text>
                </View>
                <View style={styles.editActions}>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
                    <X size={18} color={DarkColors.textSecondary} />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
                    <Check size={18} color={DarkColors.userMessageText} />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.profileField}>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <Text style={styles.fieldValue}>{userName || 'Not set'}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.profileField}>
                  <Text style={styles.fieldLabel}>About you</Text>
                  <Text style={[styles.fieldValue, !userBio && styles.fieldValueEmpty]}>
                    {userBio || 'No bio added yet'}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Privacy & Data Section - Featured card with accent */}
        <View style={styles.privacyCard}>
          <View style={styles.privacyIconContainer}>
            <Shield size={24} color={DarkColors.success} />
          </View>
          <View style={styles.privacyContent}>
            <Text style={styles.privacyTitle}>Your data stays on your device</Text>
            <Text style={styles.privacyDescription}>
              All conversations and memories are stored locally using on-device AI. Nothing is sent to external servers.
            </Text>
          </View>
        </View>

        {/* Important Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Important Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <AlertTriangle size={18} color={DarkColors.warning} />
              <Text style={styles.infoHeaderText}>Please understand</Text>
            </View>
            <View style={styles.infoBullets}>
              {DISCLAIMER_TEXT.bullets.map((bullet, index) => (
                <View key={index} style={styles.infoBulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.infoBulletText}>{bullet}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Crisis Resources Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Crisis Resources</Text>
          <View style={styles.crisisCard}>
            <TouchableOpacity
              style={styles.crisisButton}
              onPress={handleCall988}
              activeOpacity={0.8}
            >
              <View style={styles.crisisIconContainer}>
                <Phone size={18} color={DarkColors.text} />
              </View>
              <View style={styles.crisisButtonContent}>
                <Text style={styles.crisisButtonTitle}>Call 988</Text>
                <Text style={styles.crisisButtonSubtitle}>Suicide & Crisis Lifeline</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.crisisDivider} />
            <TouchableOpacity
              style={styles.crisisButton}
              onPress={handleTextCrisisLine}
              activeOpacity={0.8}
            >
              <View style={styles.crisisIconContainer}>
                <MessageCircle size={18} color={DarkColors.text} />
              </View>
              <View style={styles.crisisButtonContent}>
                <Text style={styles.crisisButtonTitle}>Text HOME to 741741</Text>
                <Text style={styles.crisisButtonSubtitle}>Crisis Text Line</Text>
              </View>
            </TouchableOpacity>
          </View>
          <Text style={styles.crisisAvailability}>Available 24/7, free and confidential</Text>
        </View>

        {/* Danger Zone Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.dangerSectionTitle]}>Danger Zone</Text>
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
          <Text style={styles.footerText}>Cove v1.0</Text>
          <Text style={styles.footerSubtext}>
            Your private companion
          </Text>
        </View>
          </>
        ) : (
          <ModelSelector />
        )}
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: DarkSpacing.screenPadding,
    paddingVertical: DarkSpacing.md,
    gap: DarkSpacing.sm,
    backgroundColor: DarkColors.background,
  },
  tab: {
    flex: 1,
    paddingVertical: DarkSpacing.sm,
    paddingHorizontal: DarkSpacing.md,
    borderRadius: DarkSpacing.radiusSm,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: DarkColors.accent,
  },
  tabText: {
    fontSize: DarkTypography.callout,
    fontWeight: DarkTypography.weightMedium,
    color: DarkColors.textSecondary,
  },
  tabTextActive: {
    color: DarkColors.userMessageText,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: DarkSpacing.screenPadding,
    paddingBottom: DarkSpacing.screenPadding + 40,
  },
  section: {
    marginBottom: DarkSpacing.sectionSpacing,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DarkSpacing.itemSpacing,
  },
  sectionTitle: {
    fontSize: DarkTypography.footnote,
    fontWeight: DarkTypography.weightMedium,
    color: DarkColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: DarkSpacing.itemSpacing,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: DarkSpacing.sm,
    paddingHorizontal: DarkSpacing.md,
  },
  editButtonText: {
    fontSize: DarkTypography.footnote,
    color: DarkColors.accent,
    fontWeight: DarkTypography.weightMedium,
  },
  card: {
    backgroundColor: DarkColors.surface,
    borderRadius: DarkSpacing.radiusMd,
    padding: DarkSpacing.cardPadding,
  },
  profileField: {
    paddingVertical: DarkSpacing.sm,
  },
  fieldLabel: {
    fontSize: DarkTypography.footnote,
    color: DarkColors.textSecondary,
    marginBottom: DarkSpacing.xs,
  },
  fieldValue: {
    fontSize: DarkTypography.callout,
    color: DarkColors.text,
    lineHeight: 22,
  },
  fieldValueEmpty: {
    color: DarkColors.textTertiary,
    fontStyle: 'italic',
  },
  editField: {
    marginBottom: DarkSpacing.lg,
  },
  input: {
    fontSize: DarkTypography.callout,
    color: DarkColors.text,
    backgroundColor: DarkColors.surfaceElevated,
    padding: DarkSpacing.md,
    borderRadius: DarkSpacing.radiusSm,
    borderWidth: 1,
    borderColor: DarkColors.border,
  },
  bioInput: {
    minHeight: 100,
    paddingTop: DarkSpacing.md,
  },
  charCount: {
    fontSize: DarkTypography.caption1,
    color: DarkColors.textTertiary,
    textAlign: 'right',
    marginTop: DarkSpacing.xs,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: DarkSpacing.md,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: DarkSpacing.sm,
    paddingHorizontal: DarkSpacing.md,
  },
  cancelButtonText: {
    fontSize: DarkTypography.callout,
    color: DarkColors.textSecondary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: DarkColors.accent,
    paddingVertical: DarkSpacing.sm,
    paddingHorizontal: DarkSpacing.lg,
    borderRadius: DarkSpacing.radiusSm,
  },
  saveButtonText: {
    fontSize: DarkTypography.callout,
    fontWeight: DarkTypography.weightSemibold,
    color: DarkColors.userMessageText,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DarkColors.border,
    marginLeft: 0,
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
  privacyCard: {
    flexDirection: 'row',
    backgroundColor: DarkColors.successMuted,
    borderRadius: DarkSpacing.radiusMd,
    padding: DarkSpacing.lg,
    marginBottom: DarkSpacing.sectionSpacing,
    borderWidth: 1,
    borderColor: DarkColors.successBorder,
    gap: DarkSpacing.md,
  },
  privacyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DarkColors.successContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: DarkTypography.callout,
    fontWeight: DarkTypography.weightSemibold,
    color: DarkColors.text,
    marginBottom: DarkSpacing.xs,
  },
  privacyDescription: {
    fontSize: DarkTypography.footnote,
    color: DarkColors.textSecondary,
    lineHeight: 18,
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
  crisisCard: {
    backgroundColor: DarkColors.surface,
    borderRadius: DarkSpacing.radiusMd,
    overflow: 'hidden',
  },
  crisisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: DarkSpacing.md,
    paddingHorizontal: DarkSpacing.cardPadding,
    gap: DarkSpacing.md,
  },
  crisisIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DarkColors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crisisButtonContent: {
    flex: 1,
  },
  crisisButtonTitle: {
    color: DarkColors.text,
    fontSize: DarkTypography.callout,
    fontWeight: DarkTypography.weightMedium,
  },
  crisisButtonSubtitle: {
    color: DarkColors.textSecondary,
    fontSize: DarkTypography.footnote,
    marginTop: 2,
  },
  crisisDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DarkColors.border,
    marginLeft: DarkSpacing.cardPadding + 36 + DarkSpacing.md,
  },
  crisisAvailability: {
    fontSize: DarkTypography.caption1,
    color: DarkColors.textTertiary,
    textAlign: 'center',
    marginTop: DarkSpacing.sm,
  },
  infoCard: {
    backgroundColor: DarkColors.surface,
    borderRadius: DarkSpacing.radiusMd,
    padding: DarkSpacing.cardPadding,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DarkSpacing.sm,
    marginBottom: DarkSpacing.md,
  },
  infoHeaderText: {
    fontSize: DarkTypography.footnote,
    fontWeight: DarkTypography.weightMedium,
    color: DarkColors.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoBullets: {
    gap: DarkSpacing.sm,
  },
  infoBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: DarkSpacing.sm,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: DarkColors.textTertiary,
    marginTop: 7,
  },
  infoBulletText: {
    flex: 1,
    fontSize: DarkTypography.footnote,
    color: DarkColors.textSecondary,
    lineHeight: 18,
  },
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
