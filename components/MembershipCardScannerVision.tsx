import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera,
  isScannedCode,
  type ScannedObject,
  type ScannedObjectType,
  useCameraDevice,
  useCameraPermission,
  useObjectOutput,
} from 'react-native-vision-camera';

import type { MembershipCardScannerProps } from '@/components/MembershipCardScanner.types';

const MEMBERSHIP_SCAN_TYPES: ScannedObjectType[] = [
  'code-128',
  'code-39',
  'code-39-mod-43',
  'code-93',
  'codabar',
  'ean-13',
  'ean-8',
  'interleaved-2-of-5',
  'itf-14',
  'upc-e',
  'gs1-data-bar',
  'gs1-data-bar-expanded',
  'gs1-data-bar-limited',
  'qr',
  'pdf-417',
  'data-matrix',
  'micro-qr',
  'micro-pdf-417',
  'aztec',
];

/** Only load this module via `require()` outside Expo Go (Nitro is unavailable there). */
export function MembershipCardScannerVision({ onClose, onScan }: MembershipCardScannerProps) {
  const { hasPermission, requestPermission, canRequestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const scannedRef = useRef(false);

  useEffect(() => {
    if (!hasPermission && canRequestPermission) {
      void requestPermission();
    }
  }, [hasPermission, canRequestPermission, requestPermission]);

  const onObjectsScanned = useCallback(
    async (objects: ScannedObject[]) => {
      if (scannedRef.current) return;
      for (const obj of objects) {
        if (!isScannedCode(obj)) continue;
        const decoded = typeof obj.value === 'string' ? obj.value.trim() : '';
        if (!decoded) continue;
        scannedRef.current = true;
        try {
          await onScan(decoded);
        } finally {
          onClose();
        }
        return;
      }
    },
    [onScan, onClose],
  );

  const objectOutput = useObjectOutput({
    types: MEMBERSHIP_SCAN_TYPES,
    onObjectsScanned,
  });

  const outputs = useMemo(() => [objectOutput], [objectOutput]);

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.scannerSafeArea}>
        <View style={styles.scannerTopbar}>
          <Pressable style={styles.backBtn} onPress={onClose}>
            <Feather name="x" size={20} color="#1a1a1a" />
          </Pressable>
          <Text style={styles.scannerTitle}>Scan membership card</Text>
          <View style={styles.backBtnPlaceholder} />
        </View>

        {!hasPermission ? (
          <View style={styles.centerMessage}>
            <Text style={styles.messageText}>Camera access is needed to scan your card.</Text>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => {
                void requestPermission();
              }}
              disabled={!canRequestPermission}
            >
              <Text style={styles.primaryBtnText}>
                {canRequestPermission ? 'Allow camera' : 'Open Settings to enable camera'}
              </Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </Pressable>
          </View>
        ) : device == null ? (
          <View style={styles.centerMessage}>
            <ActivityIndicator color="#ffffff" />
            <Text style={styles.messageMuted}>Opening camera…</Text>
          </View>
        ) : (
          <View style={styles.scannerBody}>
            <Camera style={styles.cameraView} device={device} isActive outputs={outputs} />
            <View style={styles.scannerOverlay} pointerEvents="box-none">
              <View style={styles.scannerFrame} />
              <Text style={styles.scannerHint}>Align the card barcode inside the frame.</Text>
              <Pressable style={styles.closeScannerBtn} onPress={onClose}>
                <Text style={styles.closeScannerBtnText}>Cancel scan</Text>
              </Pressable>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scannerSafeArea: { flex: 1, backgroundColor: '#000000' },
  scannerTopbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: { width: 32, height: 32 },
  scannerTitle: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  centerMessage: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  messageText: { color: '#ffffff', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  messageMuted: { color: '#aaaaaa', fontSize: 14, marginTop: 12 },
  primaryBtn: {
    backgroundColor: '#2D6A4F',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    paddingVertical: 10,
  },
  secondaryBtnText: { color: '#cccccc', fontWeight: '600', fontSize: 14 },
  scannerBody: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  cameraView: {
    width: '100%',
    maxWidth: 460,
    height: '62%',
    borderRadius: 18,
    overflow: 'hidden',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  scannerFrame: {
    width: '86%',
    maxWidth: 360,
    aspectRatio: 1.9,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  scannerHint: { marginTop: 14, color: '#ffffff', fontSize: 14, fontWeight: '600' },
  closeScannerBtn: {
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.62)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  closeScannerBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
});
