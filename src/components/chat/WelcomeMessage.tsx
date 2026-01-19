import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { DarkColors, DarkTypography, DarkSpacing } from '@/constants/darkTheme';

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'this morning';
  if (hour < 17) return 'this afternoon';
  return 'this evening';
}

export function WelcomeMessage() {
  const timeGreeting = getTimeOfDayGreeting();

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Sparkles size={48} color={DarkColors.accent} strokeWidth={1.5} />
      </View>
      <Text style={styles.greeting}>
        How can I help you{'\n'}{timeGreeting}?
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: DarkSpacing.xxl,
    paddingBottom: 40, // Slight offset for visual balance
  },
  iconContainer: {
    marginBottom: DarkSpacing.xl,
  },
  greeting: {
    fontSize: DarkTypography.title1,
    fontWeight: DarkTypography.weightRegular,
    color: DarkColors.text,
    textAlign: 'center',
    lineHeight: 36,
  },
});
