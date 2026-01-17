import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DarkColors, DarkSpacing, DarkTypography } from '@/constants/darkTheme';

interface NameStepProps {
  onNext: (name: string) => void;
}

export function NameStep({ onNext }: NameStepProps) {
  const [name, setName] = useState('');
  const trimmedName = name.trim();
  const isValid = trimmedName.length > 0;

  const handleContinue = () => {
    if (isValid) {
      onNext(trimmedName);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="person-circle-outline" size={64} color={DarkColors.accent} />
        </View>

        <Text style={styles.title}>What should I call you?</Text>

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
          returnKeyType="done"
          onSubmitEditing={handleContinue}
        />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DarkColors.background,
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
    marginBottom: DarkSpacing.xxxl,
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
  footer: {
    gap: DarkSpacing.lg,
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
