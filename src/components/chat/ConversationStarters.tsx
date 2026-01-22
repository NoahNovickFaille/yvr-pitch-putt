import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { DarkColors, DarkTypography, DarkSpacing } from '@/constants/darkTheme';
import { PressableButton } from '../ui/PressableButton';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useMemoryStore } from '../../stores/memoryStore';
import { Memory } from '../../types/memory';

interface ConversationStartersProps {
  onSelectPrompt: (message: string) => void;
}

interface Prompt {
  emoji: string;
  label: string;
  message: string;
}

const STATIC_PROMPTS: Prompt[] = [
  { emoji: '💭', label: 'Something on my mind', message: 'I have something on my mind...' },
  { emoji: '🌤️', label: "How's my day going", message: 'Let me tell you about my day...' },
  { emoji: '🌙', label: 'Wind down for the night', message: 'I want to wind down...' },
  { emoji: '✨', label: 'Just want to talk', message: 'I just want to talk...' },
];

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

function getPersonalizedPrompt(memories: Memory[]): Prompt | null {
  const now = Date.now();

  // Find the most recent relevant memory for personalization
  // Priority: situation > emotion > relationship
  const candidates: { memory: Memory; prompt: Prompt }[] = [];

  for (const memory of memories) {
    if (memory.importance < 5) continue;

    const age = now - memory.createdAt;

    if (memory.category === 'situation' && age <= SEVEN_DAYS_MS) {
      candidates.push({
        memory,
        prompt: {
          emoji: '📋',
          label: `How did it go?`,
          message: `I wanted to follow up on ${memory.content.slice(0, 50)}${memory.content.length > 50 ? '...' : ''}`,
        },
      });
    } else if (memory.category === 'emotion' && age <= SEVEN_DAYS_MS) {
      // Extract the emotion for a check-in
      candidates.push({
        memory,
        prompt: {
          emoji: '💙',
          label: 'Check in on feelings',
          message: `I've been thinking about how I've been feeling lately...`,
        },
      });
    } else if (memory.category === 'relationship' && age <= FOURTEEN_DAYS_MS) {
      candidates.push({
        memory,
        prompt: {
          emoji: '👋',
          label: 'Update on someone',
          message: `I wanted to share an update about someone in my life...`,
        },
      });
    }
  }

  if (candidates.length === 0) return null;

  // Sort by recency (most recent first)
  candidates.sort((a, b) => b.memory.createdAt - a.memory.createdAt);

  return candidates[0].prompt;
}

export function ConversationStarters({ onSelectPrompt }: ConversationStartersProps) {
  const userName = useOnboardingStore((state) => state.userName);
  const memories = useMemoryStore((state) => state.memories);

  const prompts = useMemo(() => {
    const personalizedPrompt = getPersonalizedPrompt(memories);

    if (personalizedPrompt) {
      // Return 2 static prompts + 1 personalized
      return [STATIC_PROMPTS[0], STATIC_PROMPTS[1], personalizedPrompt];
    }

    // Return 3 static prompts (excluding the last one to keep it to 3)
    return [STATIC_PROMPTS[0], STATIC_PROMPTS[1], STATIC_PROMPTS[3]];
  }, [memories]);

  const displayName = userName || 'there';

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Sparkles size={48} color={DarkColors.accent} strokeWidth={1.5} />
      </View>

      <Text style={styles.greeting}>Hi {displayName}</Text>
      <Text style={styles.subtext}>Where should we start?</Text>

      <View style={styles.pillsContainer}>
        {prompts.map((prompt, index) => (
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
