import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DarkColors, DarkSpacing, DarkTypography } from '@/constants/darkTheme';

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/splash-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Cove</Text>
        <Text style={styles.tagline}>Your private emotional companion</Text>

        <View style={styles.pills}>
          <View style={styles.pill}>
            <Ionicons name="shield-checkmark" size={16} color={DarkColors.accent} />
            <Text style={styles.pillText}>100% Private</Text>
          </View>
          <View style={styles.pill}>
            <Ionicons name="time" size={16} color={DarkColors.accent} />
            <Text style={styles.pillText}>Always Available</Text>
          </View>
          <View style={styles.pill}>
            <Ionicons name="heart" size={16} color={DarkColors.accent} />
            <Text style={styles.pillText}>Remembers You</Text>
          </View>
        </View>

        <Text style={styles.description}>
          Cove uses on-device AI to have meaningful conversations while keeping everything completely private.
          No cloud, no accounts, no data ever leaves your phone.
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
          style={styles.continueButton}
          onPress={onNext}
          activeOpacity={0.8}
        >
          <Text style={styles.continueText}>Get Started</Text>
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
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: DarkSpacing.xl,
  },
  logo: {
    width: 150,
    height: 150,
  },
  title: {
    fontSize: DarkTypography.largeTitle,
    fontWeight: DarkTypography.weightBold,
    color: DarkColors.text,
    textAlign: 'center',
    marginBottom: DarkSpacing.sm,
  },
  tagline: {
    fontSize: DarkTypography.title3,
    fontWeight: DarkTypography.weightMedium,
    color: DarkColors.accent,
    textAlign: 'center',
    marginBottom: DarkSpacing.xxxl,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: DarkSpacing.sm,
    marginBottom: DarkSpacing.xxxl,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DarkSpacing.xs,
    backgroundColor: DarkColors.surfaceElevated,
    paddingVertical: DarkSpacing.sm,
    paddingHorizontal: DarkSpacing.md,
    borderRadius: DarkSpacing.radiusFull,
  },
  pillText: {
    fontSize: DarkTypography.footnote,
    fontWeight: DarkTypography.weightMedium,
    color: DarkColors.text,
  },
  description: {
    fontSize: DarkTypography.body,
    lineHeight: 26,
    color: DarkColors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: DarkSpacing.lg,
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
