import { useMemo } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { getCourseById } from '@/src/pitchputt/data';
import { HoleIllustration } from '@/src/pitchputt/HoleIllustration';
import { scoreDelta, scoreLabel } from '@/src/pitchputt/scoring';
import { useRoundsStore } from '@/src/pitchputt/store';

export default function HoleScreen() {
  const { roundId, hole } = useLocalSearchParams<{ roundId: string; hole: string }>();
  const holeNumber = Number(hole || '1');
  const round = useRoundsStore((state) => state.rounds.find((item) => item.id === roundId));
  const updateScore = useRoundsStore((state) => state.updateScore);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Hole {currentHole.number}</Text>
          <Pressable
            style={styles.pickerBtn}
            onPress={() => router.push({ pathname: '/hole-picker', params: { roundId, hole: String(holeNumber) } })}
          >
            <Text style={styles.pickerBtnText}>Jump to hole</Text>
          </Pressable>
        </View>
        <Text style={styles.meta}>Par {currentHole.par} - {currentHole.yardage} yds</Text>
        <HoleIllustration assetKey={currentHole.assetKey} />

        {round.players.map((player) => {
          const strokes = round.holeScores[holeNumber]?.[player.id];
          const delta = scoreDelta(strokes, currentHole.par);

          return (
            <View key={player.id} style={styles.playerCard}>
              <Text style={styles.playerName}>{player.name}</Text>
              <Text style={styles.symbol}>{scoreLabel(delta)}</Text>
              <View style={styles.buttonsRow}>
                {[1, 2, 3, 4, 5, 6].map((value) => (
                  <Pressable
                    key={value}
                    style={[styles.scoreBtn, strokes === value && styles.scoreBtnActive]}
                    onPress={() => updateScore(round.id, holeNumber, player.id, value)}
                  >
                    <Text style={[styles.scoreBtnText, strokes === value && styles.scoreBtnTextActive]}>{value}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}

        <View style={styles.footerRow}>
          <Pressable
            disabled={holeNumber <= 1}
            style={[styles.navBtn, holeNumber <= 1 && styles.navBtnDisabled]}
            onPress={() => router.replace({ pathname: '/hole', params: { roundId, hole: String(holeNumber - 1) } })}
          >
            <Text style={styles.navBtnText}>Previous</Text>
          </Pressable>
          <Pressable
            style={styles.navBtn}
            onPress={() =>
              isFinalHole
                ? router.replace({ pathname: '/final-scorecard', params: { roundId } })
                : router.replace({ pathname: '/hole', params: { roundId, hole: String(holeNumber + 1) } })
            }
          >
            <Text style={styles.navBtnText}>{isFinalHole ? 'Finish Round' : 'Next Hole'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#030712' },
  container: { padding: 16, gap: 12 },
  errorText: { color: '#fca5a5', padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { color: 'white', fontSize: 30, fontWeight: '700' },
  meta: { color: '#9ca3af' },
  pickerBtn: { borderColor: '#334155', borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  pickerBtnText: { color: '#cbd5e1', fontWeight: '600' },
  playerCard: { backgroundColor: '#111827', borderRadius: 14, borderWidth: 1, borderColor: '#1f2937', padding: 12, gap: 8 },
  playerName: { color: 'white', fontWeight: '700', fontSize: 18 },
  symbol: { color: '#86efac', fontWeight: '600' },
  buttonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scoreBtn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#374151',
    borderWidth: 1,
    backgroundColor: '#0f172a',
  },
  scoreBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  scoreBtnText: { color: '#e5e7eb', fontWeight: '700' },
  scoreBtnTextActive: { color: '#022c22' },
  footerRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  navBtn: { flex: 1, backgroundColor: '#1f2937', borderRadius: 12, alignItems: 'center', padding: 12 },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { color: 'white', fontWeight: '600' },
});
