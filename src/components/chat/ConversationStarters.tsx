import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { DarkColors, DarkTypography, DarkSpacing } from '@/constants/darkTheme';
import { PressableButton } from '../ui/PressableButton';
import { useOnboardingStore } from '../../stores/onboardingStore';

interface ConversationStartersProps {
  onSelectPrompt: (message: string) => void;
}

interface Prompt {
  emoji: string;
  label: string;
  message: string;
}

const PROMPTS: Prompt[] = [
  { emoji: '💭', label: 'Something on my mind', message: 'I have something on my mind...' },
  { emoji: '🌤️', label: "How's my day going", message: 'Let me tell you about my day...' },
  { emoji: '✨', label: 'Just want to talk', message: 'I just want to talk...' },
];

export function ConversationStarters({ onSelectPrompt }: ConversationStartersProps) {
  const userName = useOnboardingStore((state) => state.userName);
  const displayName = userName || 'there';

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Sparkles size={48} color={DarkColors.accent} strokeWidth={1.5} />
      </View>

      <Text style={styles.greeting}>Hi {displayName}</Text>
      <Text style={styles.subtext}>Where should we start?</Text>

      <View style={styles.pillsContainer}>
        {PROMPTS.map((prompt, index) => (
          <PressableButton
            key={index}
            onPress={() => onSelectPrompt(prompt.message)}
            style={styles.pill}
            accessibilityLabel={prompt.label}
          >
            <Text style={styles.pillText}>
              {prompt.emoji}  {prompt.label}
            </Text>
          </PressableButton>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: DarkSpacing.xxl,
    paddingBottom: 40,
  },
  iconContainer: {
    marginBottom: DarkSpacing.lg,
  },
  greeting: {
    fontSize: DarkTypography.title1,
    fontWeight: DarkTypography.weightRegular,
    color: DarkColors.text,
    textAlign: 'center',
    marginBottom: DarkSpacing.xs,
  },
  subtext: {
    fontSize: DarkTypography.body,
    fontWeight: DarkTypography.weightRegular,
    color: DarkColors.textSecondary,
    textAlign: 'center',
    marginBottom: DarkSpacing.xxl,
  },
  pillsContainer: {
    width: '100%',
    gap: DarkSpacing.md,
  },
  pill: {
    backgroundColor: DarkColors.surface,
    paddingVertical: DarkSpacing.lg,
    paddingHorizontal: DarkSpacing.xl,
    borderRadius: DarkSpacing.radiusFull,
    alignItems: 'center',
  },
  pillText: {
    fontSize: DarkTypography.body,
    fontWeight: DarkTypography.weightMedium,
    color: DarkColors.text,
  },
});
