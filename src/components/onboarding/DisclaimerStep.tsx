import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DarkColors, DarkSpacing, DarkTypography } from '@/constants/darkTheme';
import { DISCLAIMER_TEXT } from '@/src/constants/disclaimer';

interface DisclaimerStepProps {
  onNext: () => void;
}

export function DisclaimerStep({ onNext }: DisclaimerStepProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="alert-circle" size={48} color={DarkColors.warning} />
        <Text style={styles.title}>Important Notice</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>{DISCLAIMER_TEXT.intro}</Text>

        {DISCLAIMER_TEXT.bullets.map((bullet, index) => (
          <View key={index} style={styles.bulletRow}>
            <Text style={styles.bulletPoint}>{'  \u2022  '}</Text>
            <Text style={styles.bulletText}>{bullet}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setAcknowledged(!acknowledged)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, acknowledged && styles.checkboxChecked]}>
            {acknowledged && (
              <Ionicons name="checkmark" size={16} color={DarkColors.userMessageText} />
            )}
          </View>
          <Text style={styles.checkboxLabel}>{DISCLAIMER_TEXT.acknowledgmentLabel}</Text>
        </TouchableOpacity>

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
          style={[styles.continueButton, !acknowledged && styles.continueButtonDisabled]}
          onPress={onNext}
          disabled={!acknowledged}
          activeOpacity={0.8}
        >
          <Text style={[styles.continueText, !acknowledged && styles.continueTextDisabled]}>
            Get Started
          </Text>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: DarkSpacing.xxl,
    paddingTop: DarkSpacing.lg,
  },
  title: {
    fontSize: DarkTypography.title1,
    fontWeight: DarkTypography.weightBold,
    color: DarkColors.text,
    marginTop: DarkSpacing.lg,
  },
  scrollView: {
    flex: 1,
    marginBottom: DarkSpacing.xxl,
  },
  intro: {
    fontSize: DarkTypography.body,
    lineHeight: 26,
    color: DarkColors.textSecondary,
    marginBottom: DarkSpacing.xxl,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: DarkSpacing.lg,
  },
  bulletPoint: {
    fontSize: DarkTypography.body,
    color: DarkColors.warning,
    fontWeight: DarkTypography.weightBold,
  },
  bulletText: {
    flex: 1,
    fontSize: DarkTypography.body,
    lineHeight: 26,
    color: DarkColors.text,
  },
  footer: {
    gap: DarkSpacing.lg,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DarkSpacing.md,
    paddingVertical: DarkSpacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: DarkSpacing.radiusXs,
    borderWidth: 2,
    borderColor: DarkColors.border,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: DarkColors.accent,
    borderColor: DarkColors.accent,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: DarkTypography.callout,
    color: DarkColors.text,
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
    alignItems: 'center',
    justifyContent: 'center',
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
