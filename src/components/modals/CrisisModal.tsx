import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { DarkColors, DarkSpacing } from '@/constants/darkTheme';

interface CrisisModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const DISMISS_DELAY_MS = 5000;

export function CrisisModal({ visible, onDismiss }: CrisisModalProps) {
  const [canDismiss, setCanDismiss] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (visible) {
      setCanDismiss(false);
      setCountdown(5);

      // Haptic feedback when modal appears
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanDismiss(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [visible]);

  const handleCall988 = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL('tel:988');
  };

  const handleTextCrisisLine = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL('sms:741741&body=HOME');
  };

  const handleDismiss = () => {
    if (canDismiss) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onDismiss();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        // Block Android back button until timer expires
        if (canDismiss) onDismiss();
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>We're Here for You</Text>

          <Text style={styles.message}>
            It sounds like you might be going through a really difficult time.
            You don't have to face this alone.
          </Text>

          <View style={styles.resources}>
            <TouchableOpacity
              style={styles.hotlineButton}
              onPress={handleCall988}
              activeOpacity={0.8}
            >
              <Text style={styles.hotlineTitle}>Call 988</Text>
              <Text style={styles.hotlineSubtitle}>
                Suicide & Crisis Lifeline
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.hotlineButton}
              onPress={handleTextCrisisLine}
              activeOpacity={0.8}
            >
              <Text style={styles.hotlineTitle}>Text HOME to 741741</Text>
              <Text style={styles.hotlineSubtitle}>Crisis Text Line</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.availability}>
            Available 24/7, free and confidential
          </Text>

          <TouchableOpacity
            style={[
              styles.continueButton,
              !canDismiss && styles.continueButtonDisabled,
            ]}
            onPress={handleDismiss}
            disabled={!canDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.continueText}>
              {canDismiss
                ? 'I understand, continue'
                : `Please read the resources above (${countdown}s)`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: DarkColors.overlayHeavy,
    justifyContent: 'center',
    alignItems: 'center',
    padding: DarkSpacing.xl,
  },
  modal: {
    backgroundColor: DarkColors.modalBackground,
    borderRadius: DarkSpacing.radiusLg,
    padding: DarkSpacing.xxl,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: DarkSpacing.lg,
    color: DarkColors.modalText,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: DarkSpacing.xxl,
    color: DarkColors.modalTextSecondary,
  },
  resources: {
    gap: DarkSpacing.itemSpacing,
    marginBottom: DarkSpacing.lg,
  },
  hotlineButton: {
    backgroundColor: DarkColors.dangerBright,
    paddingVertical: DarkSpacing.lg,
    paddingHorizontal: DarkSpacing.xl,
    borderRadius: DarkSpacing.radiusSm + 2,
  },
  hotlineTitle: {
    color: DarkColors.modalBackground,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  hotlineSubtitle: {
    color: DarkColors.textOnDangerBright,
    fontSize: 14,
    textAlign: 'center',
    marginTop: DarkSpacing.xs,
  },
  availability: {
    fontSize: 14,
    textAlign: 'center',
    color: DarkColors.modalTextTertiary,
    marginBottom: DarkSpacing.xxl,
  },
  continueButton: {
    paddingVertical: DarkSpacing.lg,
    borderRadius: DarkSpacing.radiusSm + 2,
    backgroundColor: DarkColors.modalSurface,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueText: {
    fontSize: 16,
    textAlign: 'center',
    color: DarkColors.modalTextSecondary,
    fontWeight: '500',
  },
});
