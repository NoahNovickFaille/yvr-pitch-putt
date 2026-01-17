import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { DarkColors, DarkSpacing } from '@/constants/darkTheme';

export function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation = Animated.parallel([
      animate(dot1, 0),
      animate(dot2, 150),
      animate(dot3, 300),
    ]);

    animation.start();

    return () => animation.stop();
  }, [dot1, dot2, dot3]);

  const getDotStyle = (animValue: Animated.Value) => ({
    transform: [
      {
        translateY: animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -6],
        }),
      },
    ],
    opacity: animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    }),
  });

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Animated.View style={[styles.dot, getDotStyle(dot1)]} />
        <Animated.View style={[styles.dot, getDotStyle(dot2)]} />
        <Animated.View style={[styles.dot, getDotStyle(dot3)]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: DarkSpacing.lg,
    paddingVertical: DarkSpacing.xs,
    alignItems: 'flex-start',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DarkSpacing.lg,
    paddingVertical: 14,
    borderRadius: DarkSpacing.radiusLg,
    borderBottomLeftRadius: DarkSpacing.xs,
    backgroundColor: DarkColors.assistantMessage,
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DarkColors.textSecondary,
  },
});
