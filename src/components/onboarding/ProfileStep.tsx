import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Linking, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DarkColors, DarkSpacing, DarkTypography } from '@/constants/darkTheme';

interface ProfileStepProps {
  onNext: (name: string, bio: string) => void;
}

const BIO_MAX_LENGTH = 500;

export function ProfileStep({ onNext }: ProfileStepProps) {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const trimmedName = name.trim();
  const trimmedBio = bio.trim();
  const isValid = trimmedName.length > 0;

  const handleContinue = () => {
    if (isValid) {
      onNext(trimmedName, trimmedBio);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="person-circle-outline" size={64} color={DarkColors.accent} />
          </View>

          <Text style={styles.title}>Let&apos;s get to know you</Text>

          <Text style={styles.subtitle}>
            This helps personalize our conversations. You can use any name you prefer.
          </Text>

          <TextInput
            style={[styles.input, isValid && styles.inputValid]}
            placeholder="Your name"
            placeholderTextColor={DarkColors.textTertiary}
            value={name}
            onChangeText={setName}
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={styles.bioLabel}>About you (optional)</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="Tell me a bit about yourself..."
            placeholderTextColor={DarkColors.textTertiary}
            value={bio}
            onChangeText={(text) => setBio(text.slice(0, BIO_MAX_LENGTH))}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            autoCapitalize="sentences"
            autoCorrect={true}
          />
          <Text style={styles.charCount}>
            {bio.length}/{BIO_MAX_LENGTH}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.crisisFooter}>
            In crisis? Call{' '}
            <Text
              style={styles.crisisLink}
              onPress={() => Linking.openURL('tel:988')}
            >
              988
            </Text>
          </Text>

          <TouchableOpacity
            style={[styles.continueButton, !isValid && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={!isValid}
            activeOpacity={0.8}
          >
            <Text style={[styles.continueText, !isValid && styles.continueTextDisabled]}>
              Continue
            </Text>
            <Ionicons
              name="arrow-forward"
              size={20}
              color={isValid ? DarkColors.userMessageText : DarkColors.textTertiary}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DarkColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: DarkSpacing.xxl,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: DarkSpacing.xxxl,
  },
  title: {
    fontSize: DarkTypography.title1,
    fontWeight: DarkTypography.weightBold,
    color: DarkColors.text,
    textAlign: 'center',
    marginBottom: DarkSpacing.md,
  },
  subtitle: {
    fontSize: DarkTypography.callout,
    lineHeight: 24,
    color: DarkColors.textSecondary,
    textAlign: 'center',
    marginBottom: DarkSpacing.xl,
  },
  input: {
    fontSize: DarkTypography.headline,
    color: DarkColors.text,
    backgroundColor: DarkColors.surfaceElevated,
    padding: DarkSpacing.lg,
    borderRadius: DarkSpacing.radiusMd,
    borderWidth: 1,
    borderColor: DarkColors.border,
  },
  inputValid: {
    borderColor: DarkColors.accent,
  },
  bioLabel: {
    fontSize: DarkTypography.footnote,
    color: DarkColors.textSecondary,
    marginTop: DarkSpacing.xl,
    marginBottom: DarkSpacing.sm,
  },
  bioInput: {
    minHeight: 100,
    paddingTop: DarkSpacing.lg,
  },
  charCount: {
    fontSize: DarkTypography.caption1,
    color: DarkColors.textTertiary,
    textAlign: 'right',
    marginTop: DarkSpacing.xs,
  },
  footer: {
    gap: DarkSpacing.lg,
    paddingTop: DarkSpacing.xl,
  },
  crisisFooter: {
    fontSize: DarkTypography.footnote,
    color: DarkColors.textTertiary,
    textAlign: 'center',
  },
  crisisLink: {
    color: DarkColors.danger,
    fontWeight: DarkTypography.weightSemibold,
  },
  continueButton: {
    backgroundColor: DarkColors.accent,
    paddingVertical: DarkSpacing.lg,
    paddingHorizontal: DarkSpacing.xxl,
    borderRadius: DarkSpacing.radiusMd,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DarkSpacing.sm,
  },
  continueButtonDisabled: {
    backgroundColor: DarkColors.surfaceElevated,
  },
  continueText: {
    fontSize: DarkTypography.headline,
    fontWeight: DarkTypography.weightSemibold,
    color: DarkColors.userMessageText,
  },
  continueTextDisabled: {
    color: DarkColors.textTertiary,
  },
});
