import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { MembershipCardScannerProps } from '@/components/MembershipCardScanner.types';

function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

function MembershipCardScannerUnavailable({
  onClose,
  variant,
}: Pick<MembershipCardScannerProps, 'onClose'> & { variant: 'web' | 'expo-go' }) {
  const body =
    variant === 'web'
      ? 'Membership barcode scanning runs in the iOS or Android app.'
      : 'Expo Go does not include the camera scanner. Use a development build (expo run:ios / EAS) or enter your number manually.';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Scanning not available</Text>
          <Text style={styles.body}>{body}</Text>
          <Pressable style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Vision Camera (Nitro) only runs in custom dev / release builds — not in Expo Go.
 * This module never `require`s `MembershipCardScannerVision` on web or in Expo Go.
 */
export function MembershipCardScanner(props: MembershipCardScannerProps) {
  const { onClose, onScan } = props;

  if (Platform.OS === 'web') {
    return <MembershipCardScannerUnavailable onClose={onClose} variant="web" />;
  }

  if (isExpoGo()) {
    return <MembershipCardScannerUnavailable onClose={onClose} variant="expo-go" />;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports -- defer Nitro until after Expo Go check
  const { MembershipCardScannerVision } = require('./MembershipCardScannerVision') as typeof import('./MembershipCardScannerVision');

  return <MembershipCardScannerVision onClose={onClose} onScan={onScan} />;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    maxWidth: 360,
    width: '100%',
  },
  title: { color: '#1a1a1a', fontSize: 18, fontWeight: '800' },
  body: { color: '#6b6b6b', fontSize: 14, lineHeight: 20 },
  btn: {
    marginTop: 4,
    backgroundColor: '#2D6A4F',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});
