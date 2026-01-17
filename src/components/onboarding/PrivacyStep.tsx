import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DarkColors, DarkSpacing, DarkTypography } from '@/constants/darkTheme';

interface PrivacyStepProps {
  onNext: () => void;
}

export function PrivacyStep({ onNext }: PrivacyStepProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={64} color={DarkColors.accent} />
        </View>

        <Text style={styles.title}>Your Privacy Matters</Text>

        <Text style={styles.description}>
          Everything stays on your device. No cloud, no accounts, complete privacy.
          Your conversations and memories never leave your phone.
        </Text>

        <View style={styles.features}>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={24} color={DarkColors.success} />
            <Text style={styles.featureText}>100% on-device AI processing</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={24} color={DarkColors.success} />
            <Text style={styles.featureText}>No account required</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={24} color={DarkColors.success} />
            <Text style={styles.featureText}>No data collection</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.crisisFooter}>
          In crisis? Call <Text style={styles.crisisLink} onPress={() => {}}>988</Text>
        </Text>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={onNext}
          activeOpacity={0.8}
        >
          <Text style={styles.continueText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color={DarkColors.userMessageText} />
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
    marginBottom: DarkSpacing.lg,
  },
  description: {
    fontSize: DarkTypography.body,
    lineHeight: 26,
    color: DarkColors.textSecondary,
    textAlign: 'center',
    marginBottom: DarkSpacing.xxxl,
  },
  features: {
    gap: DarkSpacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DarkSpacing.md,
  },
  featureText: {
    fontSize: DarkTypography.callout,
    color: DarkColors.text,
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
  continueText: {
    fontSize: DarkTypography.headline,
    fontWeight: DarkTypography.weightSemibold,
    color: DarkColors.userMessageText,
  },
});
