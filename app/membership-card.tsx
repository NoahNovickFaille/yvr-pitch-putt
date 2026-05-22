import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BarcodeScanningResult, CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as Device from 'expo-device';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import Barcode from 'react-native-barcode-svg';

import { supabase } from '@/src/lib/supabase';
import { useSessionStore } from '@/src/pitchputt/store';

function normalizeMembershipNumber(value: string): string {
  return value.replace(/[^0-9a-z]/gi, '').toUpperCase();
}

/** Simulator maps the Mac webcam to the front camera; back is often blank. */
function defaultScannerFacing(): CameraType {
  return Device.isDevice ? 'back' : 'front';
}

export default function MembershipCardScreen() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['30%'], []);
  const userId = useSessionStore((state) => state.userId);
  const [membershipNumber, setMembershipNumber] = useState<string | null>(null);
  const [draftNumber, setDraftNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannerTorch, setScannerTorch] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [isOpeningScanner, setIsOpeningScanner] = useState(false);
  const [facing, setFacing] = useState<CameraType>(defaultScannerFacing);
  const isSimulator = !Device.isDevice;
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const { data, error: dbError } = await supabase
          .from('profiles')
          .select('membership_number')
          .eq('id', userId)
          .maybeSingle();
        if (cancelled) return;
        if (dbError) {
          console.warn('[membership-card] load profile', dbError.message);
          setError('Could not load your membership number.');
        } else {
          setMembershipNumber((data?.membership_number as string | null) ?? null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const saveMembershipNumber = async (value: string) => {
    const normalized = normalizeMembershipNumber(value);
    if (!userId || !normalized.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ membership_number: normalized.trim() })
        .eq('id', userId);
      if (dbError) {
        console.warn('[membership-card] save membership_number', dbError.message);
        setError('Could not save your membership number. Try again.');
        return;
      }
      setMembershipNumber(normalized.trim());
      setDraftNumber('');
    } finally {
      setIsSaving(false);
    }
  };

  const closeScanner = useCallback(() => {
    setScannerVisible(false);
    setScannerReady(false);
    setScannerTorch(false);
    scannedRef.current = false;
  }, []);

  const ensureCameraPermission = async () => {
    if (cameraPermission?.granted) {
      return true;
    }
    const response = await requestCameraPermission();
    return response.granted;
  };

  const handleScanPress = async () => {
    if (isOpeningScanner || isSaving) return;
    setError(null);
    setIsOpeningScanner(true);
    try {
      const ok = await ensureCameraPermission();
      if (!ok) {
        setError('Camera permission is required to scan your card.');
        return;
      }
      scannedRef.current = false;
      setScannerTorch(false);
      setScannerReady(false);
      setFacing(defaultScannerFacing());
      setScannerVisible(true);
    } finally {
      setIsOpeningScanner(false);
    }
  };

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (scannedRef.current || isSaving) return;
    const value = typeof result.data === 'string' ? result.data.trim() : '';
    if (!value) return;
    scannedRef.current = true;
    closeScanner();
    await saveMembershipNumber(value);
  };

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.35} />,
    [],
  );

  const deleteCurrentCard = async () => {
    if (!userId || !membershipNumber) return;
    setIsSaving(true);
    setError(null);
    try {
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ membership_number: null })
        .eq('id', userId);
      if (dbError) {
        console.warn('[membership-card] delete membership_number', dbError.message);
        setError('Could not delete your membership card. Try again.');
        return;
      }
      setMembershipNumber(null);
      setDraftNumber('');
      bottomSheetRef.current?.close();
    } finally {
      setIsSaving(false);
    }
  };

  const scanBusy = isOpeningScanner || isSaving;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topbar}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#1a1a1a" />
          </Pressable>
          <Text style={styles.title}>Membership card</Text>
          {membershipNumber && userId ? (
            <Pressable style={styles.editBtn} onPress={() => bottomSheetRef.current?.snapToIndex(0)}>
              <Feather name="edit-2" size={18} color="#1a1a1a" />
            </Pressable>
          ) : (
            <View style={styles.backBtnPlaceholder} />
          )}
        </View>
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#2D6A4F" />
            <Text style={styles.loadingText}>Loading your membership card…</Text>
          </View>
        ) : !userId ? (
          <View style={styles.cardPlaceholder}>
            <Text style={styles.placeholderTitle}>Sign in to add your card</Text>
            <Text style={styles.placeholderBody}>
              Create an account or sign in from the Home screen to link your physical membership card and keep it in
              this app.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Pitch &amp; Putt YVR</Text>
              {membershipNumber ? (
                <View style={styles.barcodeWrap}>
                  <Barcode
                    value={membershipNumber}
                    format="CODE128"
                    singleBarWidth={2}
                    height={80}
                    lineColor="#1a1a1a"
                    backgroundColor="transparent"
                  />
                  <Text style={styles.barcodeNumber}>{membershipNumber}</Text>
                </View>
              ) : (
                <Text style={styles.placeholderBody}>
                  Scan the barcode on your physical membership card or enter the number below to store it here.
                </Text>
              )}
            </View>

            <View style={styles.actions}>
              {!membershipNumber ? (
                <>
                  <Pressable
                    style={[styles.actionPrimary, scanBusy && styles.actionPrimaryDisabled]}
                    onPress={() => void handleScanPress()}
                    disabled={scanBusy}
                  >
                    {isOpeningScanner ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Feather name="camera" size={16} color="#ffffff" />
                    )}
                    <Text style={styles.actionPrimaryText}>
                      {isOpeningScanner ? 'Opening camera…' : isSaving ? 'Saving…' : 'Scan physical card'}
                    </Text>
                  </Pressable>
                  <View style={styles.manualRow}>
                    <TextInput
                      style={styles.input}
                      value={draftNumber}
                      onChangeText={(text) => setDraftNumber(normalizeMembershipNumber(text))}
                      placeholder="Or type membership number"
                      keyboardType="default"
                      autoCapitalize="characters"
                      autoCorrect={false}
                      editable={!scanBusy}
                    />
                    <Pressable
                      style={[styles.saveBtn, (!draftNumber.trim() || scanBusy) && styles.saveBtnDisabled]}
                      disabled={!draftNumber.trim() || scanBusy}
                      onPress={() => void saveMembershipNumber(draftNumber)}
                    >
                      {isSaving && !scannerVisible ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.saveBtnText}>Save</Text>
                      )}
                    </Pressable>
                  </View>
                </>
              ) : null}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          </>
        )}

        <Modal visible={scannerVisible} animationType="slide" presentationStyle="fullScreen">
          <SafeAreaView style={styles.scannerSafeArea}>
            <View style={styles.scannerTopbar}>
              <Pressable style={styles.backBtn} onPress={closeScanner} disabled={isSaving}>
                <Feather name="x" size={20} color="#ffffff" />
              </Pressable>
              <Text style={styles.scannerTitle}>Scan membership card</Text>
              <View style={styles.scannerTopbarActions}>
                <Pressable
                  style={styles.backBtn}
                  onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
                  disabled={!scannerReady}
                  accessibilityLabel="Flip camera"
                >
                  <Feather name="refresh-cw" size={20} color="#ffffff" />
                </Pressable>
                {!isSimulator ? (
                  <Pressable
                    style={styles.backBtn}
                    onPress={() => setScannerTorch((t) => !t)}
                    disabled={!scannerReady}
                    accessibilityLabel={scannerTorch ? 'Turn off flashlight' : 'Turn on flashlight'}
                  >
                    <Feather name={scannerTorch ? 'zap-off' : 'zap'} size={20} color="#ffffff" />
                  </Pressable>
                ) : null}
              </View>
            </View>
            <View style={styles.scannerBody}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing={facing}
                enableTorch={scannerTorch}
                barcodeScannerSettings={{
                  barcodeTypes: ['code128', 'code39', 'ean13', 'ean8', 'qr', 'pdf417', 'datamatrix'],
                }}
                onCameraReady={() => setScannerReady(true)}
                onMountError={(e) => {
                  setError(e.message ?? 'Camera could not start. Try again or enter the number manually.');
                  closeScanner();
                }}
                onBarcodeScanned={scannerVisible && scannerReady && !isSaving ? handleBarcodeScanned : undefined}
              />
              <View style={styles.scannerOverlay} pointerEvents="box-none">
                <View style={styles.scannerFrame} />
                {!scannerReady ? (
                  <View style={styles.scannerLoading}>
                    <ActivityIndicator color="#ffffff" size="large" />
                    <Text style={styles.scannerHint}>Starting camera…</Text>
                  </View>
                ) : (
                  <Text style={styles.scannerHint}>
                    {isSimulator
                      ? 'Using your Mac camera. In Simulator: I/O → Camera → choose your webcam.'
                      : 'Align the barcode inside the frame.'}
                  </Text>
                )}
                <Pressable style={styles.closeScannerBtn} onPress={closeScanner} disabled={isSaving}>
                  <Text style={styles.closeScannerBtnText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        </Modal>

        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose
          backdropComponent={renderBackdrop}
          backgroundStyle={styles.sheetBackground}
          handleIndicatorStyle={styles.sheetHandle}
        >
          <BottomSheetView style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>Manage card</Text>
            <Pressable
              style={styles.sheetItem}
              disabled={scanBusy}
              onPress={() => {
                bottomSheetRef.current?.close();
                void handleScanPress();
              }}
            >
              <Text style={styles.sheetItemText}>Scan new card</Text>
              <Feather name="camera" size={16} color="#2D6A4F" />
            </Pressable>
            <Pressable style={styles.sheetItem} onPress={() => void deleteCurrentCard()} disabled={isSaving}>
              <Text style={styles.sheetItemDanger}>Delete current card</Text>
              <Feather name="trash-2" size={16} color="#B85C38" />
            </Pressable>
          </BottomSheetView>
        </BottomSheet>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f6f2' },
  container: { flex: 1, paddingHorizontal: 15, paddingTop: 14, paddingBottom: 20, gap: 14 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: { width: 32, height: 32 },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#1a1a1a', fontSize: 30, fontWeight: '700' },
  loadingWrap: {
    marginTop: 16,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: { color: '#6b6b6b', fontSize: 14 },
  cardPlaceholder: {
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 8,
  },
  placeholderTitle: { color: '#1a1a1a', fontSize: 20, fontWeight: '700' },
  placeholderBody: { color: '#6b6b6b', fontSize: 14, lineHeight: 20 },
  card: {
    marginTop: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 10,
  },
  cardTitle: { color: '#1a1a1a', fontSize: 18, fontWeight: '800', letterSpacing: 0.4 },
  barcodeWrap: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#f7f6f2',
  },
  barcodeNumber: { marginTop: 6, color: '#1a1a1a', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
  actions: { marginTop: 16, gap: 10 },
  actionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 10,
    backgroundColor: '#2D6A4F',
  },
  actionPrimaryDisabled: { opacity: 0.75 },
  actionPrimaryText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  manualRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1a1a1a',
  },
  saveBtn: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#2D5A8E',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  saveBtnDisabled: { backgroundColor: '#9bb3cf' },
  saveBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  errorText: { marginTop: 2, color: '#B85C38', fontSize: 13 },
  scannerSafeArea: { flex: 1, backgroundColor: '#000000' },
  scannerTopbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 8,
    paddingBottom: 8,
  },
  scannerTopbarActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scannerTitle: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  scannerBody: {
    flex: 1,
    position: 'relative',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  scannerLoading: {
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },
  scannerFrame: {
    width: '88%',
    maxWidth: 360,
    aspectRatio: 1.9,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  scannerHint: { marginTop: 14, color: '#ffffff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  closeScannerBtn: {
    marginTop: 20,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.62)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  closeScannerBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  sheetBackground: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  sheetHandle: { width: 44, backgroundColor: '#d4d4d4' },
  sheetContent: { paddingHorizontal: 16, paddingBottom: 20, gap: 10 },
  sheetTitle: { color: '#1a1a1a', fontSize: 20, fontWeight: '700', marginTop: 2 },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  sheetItemText: { color: '#1a1a1a', fontSize: 15, fontWeight: '600' },
  sheetItemDanger: { color: '#B85C38', fontSize: 15, fontWeight: '700' },
});
