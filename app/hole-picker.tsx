import { useCallback, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { getCourseById } from '@/src/pitchputt/data';
import { useRoundsStore } from '@/src/pitchputt/store';

export default function HolePickerScreen() {
  const { roundId, hole } = useLocalSearchParams<{ roundId: string; hole: string }>();
  const round = useRoundsStore((state) => state.rounds.find((item) => item.id === roundId));
  const course = round ? getCourseById(round.courseId) : undefined;
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['80%'], []);
  const currentHoleNumber = Number(hole || '1');

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.35} />,
    [],
  );

  if (!round || !course) {
    return (
      <View style={styles.safeArea}>
        <Text style={styles.errorText}>Round not found.</Text>
      </View>
    );
  }

  const primaryPlayerId = round.players[0]?.id;

  const closePicker = () => {
    bottomSheetRef.current?.close();
  };

  const getHoleState = (holeNumber: number) => {
    const holeDef = course.holes.find((h) => h.number === holeNumber);
    const score = primaryPlayerId ? round.holeScores[holeNumber]?.[primaryPlayerId] : undefined;

    if (holeNumber === currentHoleNumber) {
      return { status: 'current' as const, display: typeof score === 'number' ? String(score) : '—' };
    }

    if (!holeDef || typeof score !== 'number') {
      return { status: 'empty' as const, display: '·' };
    }

    const delta = score - holeDef.par;
    if (delta < 0) return { status: 'under' as const, display: String(score) };
    if (delta === 0) return { status: 'par' as const, display: String(score) };
    return { status: 'over' as const, display: String(score) };
  };

  return (
    <View style={styles.safeArea}>
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onClose={() => router.back()}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <BottomSheetView style={styles.container}>
          <View style={styles.pickerTopbar}>
            <Text style={styles.pickerTitle}>Jump to hole</Text>
            <Pressable onPress={closePicker}>
              <Text style={styles.pickerDone}>Done</Text>
            </Pressable>
          </View>

          <View style={styles.grid}>
            {course.holes.map((holeItem) => {
              const state = getHoleState(holeItem.number);
              return (
                <Pressable
                  key={holeItem.id}
                  onPress={() => {
                    router.replace({ pathname: '/hole', params: { roundId, hole: String(holeItem.number) } });
                  }}
                  style={[
                    styles.holeCell,
                    state.status === 'under' && styles.holeCellUnder,
                    state.status === 'par' && styles.holeCellPar,
                    state.status === 'over' && styles.holeCellOver,
                    state.status === 'current' && styles.holeCellCurrent,
                  ]}
                >
                  <Text style={styles.holeNum}>{holeItem.number}</Text>
                  <Text style={styles.holeScore}>{state.display}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendUnder]} />
              <Text style={styles.legendText}>Under</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendPar]} />
              <Text style={styles.legendText}>Par</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendOver]} />
              <Text style={styles.legendText}>Over</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendCurrent]} />
              <Text style={styles.legendText}>Current</Text>
            </View>
          </View>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    paddingTop: 4,
    paddingHorizontal: 16,
    paddingBottom: 22,
  },
  sheetBackground: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetHandle: { width: 44, backgroundColor: '#d4d4d4' },
  pickerTopbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerTitle: { color: '#1a1a1a', fontSize: 22, fontWeight: '700' },
  pickerDone: { color: '#2D5A8E', fontSize: 16, fontWeight: '600' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    rowGap: 10,
    columnGap: '2%',
  },
  holeCell: {
    width: '15%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  holeCellUnder: { backgroundColor: '#e8f4ee', borderColor: '#2D6A4F' },
  holeCellPar: { backgroundColor: '#f2f2f2', borderColor: '#cfcfcf' },
  holeCellOver: { backgroundColor: '#faeae3', borderColor: '#B85C38' },
  holeCellCurrent: { backgroundColor: '#e8f0f9', borderColor: '#2D5A8E' },
  holeNum: { color: '#1a1a1a', fontSize: 14, fontWeight: '700' },
  holeScore: { color: '#6b6b6b', fontSize: 13, fontWeight: '600' },
  legendRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 999 },
  legendUnder: { backgroundColor: '#2D6A4F' },
  legendPar: { backgroundColor: '#cccccc' },
  legendOver: { backgroundColor: '#B85C38' },
  legendCurrent: { backgroundColor: '#2D5A8E', opacity: 0.5 },
  legendText: { color: '#6b6b6b', fontSize: 12, fontWeight: '600' },
  errorText: { color: '#B85C38', padding: 20 },
});
