import React, { useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface PressableButtonProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  hitSlop?: number | { top?: number; bottom?: number; left?: number; right?: number };
  haptic?: boolean;
  activeOpacity?: number;
  activeScale?: number;
  children: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link' | 'menuitem';
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * A unified button component with consistent touch behavior:
 * - Immediate visual feedback via opacity/scale
 * - Optional haptic feedback
 * - Consistent hit slop for easier tapping
 * - Proper accessibility
 */
export function PressableButton({
  onPress,
  style,
  disabled = false,
  hitSlop = 12,
  haptic = true,
  activeOpacity = 0.7,
  activeScale = 0.97,
  children,
  accessibilityLabel,
  accessibilityRole = 'button',
  testID,
}: PressableButtonProps) {
  const pressed = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(pressed.value ? activeOpacity : 1, { duration: 50 }),
    transform: [{ scale: withTiming(pressed.value ? activeScale : 1, { duration: 50 }) }],
  }));

  const handlePressIn = useCallback(() => {
    pressed.value = true;
  }, [pressed]);

  const handlePressOut = useCallback(() => {
    pressed.value = false;
  }, [pressed]);

  const handlePress = useCallback(() => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  }, [haptic, onPress]);

  const normalizedHitSlop = typeof hitSlop === 'number'
    ? { top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }
    : hitSlop;

  return (
    <AnimatedPressable
      style={[style, animatedStyle, disabled && styles.disabled]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      hitSlop={normalizedHitSlop}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled }}
      testID={testID}
    >
      {children}
    </AnimatedPressable>
  );
}

/**
 * A variant for icon-only buttons with larger hit area
 */
export function IconButton({
  hitSlop = 16,
  activeScale = 0.9,
  ...props
}: PressableButtonProps) {
  return <PressableButton hitSlop={hitSlop} activeScale={activeScale} {...props} />;
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
});
