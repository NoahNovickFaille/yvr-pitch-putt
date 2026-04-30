import { useCallback, useMemo, useRef } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Feather, Ionicons } from '@expo/vector-icons';

import { getCourseById } from '@/src/pitchputt/data';
import { HoleIllustration } from '@/src/pitchputt/HoleIllustration';
import { useRoundsStore } from '@/src/pitchputt/store';

export default function HoleScreen() {
  const { roundId, hole } = useLocalSearchParams<{ roundId: string; hole: string }>();
  const holeNumber = Number(hole || '1');
  const round = useRoundsStore((state) => state.rounds.find((item) => item.id === roundId));
  const updateScore = useRoundsStore((state) => state.updateScore);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['68%'], []);
  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.42} />,
    [],
  );

  const course = useMemo(() => (round ? getCourseById(round.courseId) : undefined), [round]);
  const currentHole = course?.holes.find((item) => item.number === holeNumber);

  if (!round || !course || !currentHole) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.errorText}>Round not found.</Text>
      </SafeAreaView>
    );
  }
  const isFinalHole = holeNumber === course.holes.length;

  const formatScore = (delta: number | null) => {
    if (delta === null) return 'E';
    if (delta === 0) return 'E';
    return delta > 0 ? `+${delta}` : `${delta}`;
  };

  const scoreTone = (delta: number | null) => {
    if (delta === null || delta === 0) return styles.scoreEven;
    return delta < 0 ? styles.scoreUnder : styles.scoreOver;
  };

  const getRunningRoundDelta = (playerId: string) => {
    let strokesTotal = 0;
    let parTotal = 0;

    for (const holeDef of course.holes) {
      const i = holeDef.number;
      if (!holeDef) continue;

      const strokes = round.holeScores[i]?.[playerId];
      if (typeof strokes !== 'number') continue;

      strokesTotal += strokes;
      parTotal += holeDef.par;
    }

    if (parTotal === 0) return null;
    return strokesTotal - parTotal;
  };

  const saveAndContinue = () => {
    // Persist default par score for untouched players so "3" is saved without extra taps.
    round.players.forEach((player) => {
      const existing = round.holeScores[holeNumber]?.[player.id];
      if (typeof existing !== 'number') {
        updateScore(round.id, holeNumber, player.id, currentHole.par);
      }
    });

    bottomSheetRef.current?.close();
    if (isFinalHole) {
      router.replace({ pathname: '/final-scorecard', params: { roundId } });
      return;
    }
    router.replace({ pathname: '/hole', params: { roundId, hole: String(holeNumber + 1) } });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topbar}>
          <Text style={styles.holeTitle}>Hole {currentHole.number}</Text>
          <Pressable
            style={styles.iconBtn}
            onPress={() => router.push({ pathname: '/hole-picker', params: { roundId, hole: String(holeNumber) } })}
          >
            <Ionicons name="document-text-outline" size={16} color="#888" />
          </Pressable>
        </View>

        <View style={styles.illustrationWrap}>
          <HoleIllustration assetKey={currentHole.assetKey} />
        </View>

        <View style={styles.bottomStrip}>
          <View style={styles.playersRow}>
            {round.players.map((player, index) => {
              const delta = getRunningRoundDelta(player.id);
              return (
                <View key={player.id} style={styles.playerCell}>
                  <Text style={[styles.pScore, scoreTone(delta)]}>{formatScore(delta)}</Text>
                  <Text style={styles.pName}>{player.name}</Text>
                  {index < round.players.length - 1 ? <View style={styles.sep} /> : null}
                </View>
              );
            })}
          </View>
        </View>

        <Pressable style={styles.primaryBtn} onPress={() => bottomSheetRef.current?.snapToIndex(0)}>
          <Text style={styles.primaryBtnText}>Enter scores</Text>
        </Pressable>

        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose
          backdropComponent={renderBackdrop}
          backgroundStyle={styles.sheetBackground}
          handleIndicatorStyle={styles.sheetHandle}
        >
          <BottomSheetView style={styles.scorePanel}>
            <View style={styles.scorePanelHeader}>
              <Text style={styles.scorePanelTitle}>Enter scores</Text>
              <Pressable style={styles.closeBtn} onPress={() => bottomSheetRef.current?.close()}>
                <Feather name="x" size={18} color="#6b6b6b" />
              </Pressable>
            </View>
            {round.players.map((player) => {
              const strokes = round.holeScores[holeNumber]?.[player.id];
              const delta = getRunningRoundDelta(player.id);
              const displayValue = strokes ?? currentHole.par;
              return (
                <View key={player.id} style={styles.scoreRow}>
                  <View style={styles.scoreRowHeader}>
                    <Text style={styles.scoreRowName}>{player.name}</Text>
                    <Text style={[styles.scoreRowDelta, scoreTone(delta)]}>{formatScore(delta)}</Text>
                  </View>
                  <View style={styles.stepper}>
                    <Pressable
                      style={styles.stepperBtn}
                      onPress={() => updateScore(round.id, holeNumber, player.id, Math.max(1, displayValue - 1))}
                    >
                      <Feather name="minus" size={18} color="#1a1a1a" />
                    </Pressable>
                    <Text style={styles.stepperValue}>{displayValue}</Text>
                    <Pressable
                      style={styles.stepperBtn}
                      onPress={() => updateScore(round.id, holeNumber, player.id, Math.min(15, displayValue + 1))}
                    >
                      <Feather name="plus" size={18} color="#1a1a1a" />
                    </Pressable>
                  </View>
                </View>
              );
            })}

            <Pressable style={styles.saveBtn} onPress={saveAndContinue}>
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
          </BottomSheetView>
        </BottomSheet>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f6f2' },
  container: { flex: 1, paddingHorizontal: 15, paddingTop: 8, paddingBottom: 16 },
  errorText: { color: '#B85C38', padding: 20 },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  holeTitle: { color: '#1a1a1a', fontSize: 30, fontWeight: '700' },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  illustrationWrap: {
    flex: 1,
    minHeight: 320,
    marginTop: 10,
    overflow: 'hidden',
    backgroundColor: '#f7f6f2',
  },
  bottomStrip: {
    marginTop: 8,
    paddingVertical: 6,
  },
  playersRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  playerCell: { flex: 1, alignItems: 'center' },
  pScore: { fontSize: 26, fontWeight: '800', lineHeight: 30 },
  scoreUnder: { color: '#2D6A4F' },
  scoreEven: { color: '#6b6b6b' },
  scoreOver: { color: '#B85C38' },
  pName: { color: '#6b6b6b', marginTop: 2, fontSize: 13, fontWeight: '600' },
  sep: {
    position: 'absolute',
    right: -1,
    top: 4,
    bottom: 4,
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  primaryBtn: {
    backgroundColor: '#2D6A4F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 2,
  },
  primaryBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  sheetBackground: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  sheetHandle: { backgroundColor: '#aaaaaa', width: 42 },
  scorePanel: {
    flex: 1,
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 12,
  },
  scorePanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scorePanelTitle: { color: '#1a1a1a', fontSize: 20, fontWeight: '700' },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  scoreRowHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreRowName: { color: '#1a1a1a', fontWeight: '600', fontSize: 18, minWidth: 96 },
  scoreRowDelta: { fontWeight: '800', fontSize: 20 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f6f2',
  },
  stepperValue: { minWidth: 34, textAlign: 'center', color: '#1a1a1a', fontWeight: '800', fontSize: 20 },
  saveBtn: { backgroundColor: '#2D6A4F', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});
