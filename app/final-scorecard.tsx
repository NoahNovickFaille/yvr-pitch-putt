import { useMemo } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { getCourseById } from '@/src/pitchputt/data';
import { roundTotals } from '@/src/pitchputt/scoring';
import { useRoundsStore } from '@/src/pitchputt/store';

export default function FinalScorecardScreen() {
  const { roundId } = useLocalSearchParams<{ roundId: string }>();
  const round = useRoundsStore((state) => state.rounds.find((item) => item.id === roundId));
  const completeRound = useRoundsStore((state) => state.completeRound);

  const course = useMemo(() => (round ? getCourseById(round.courseId) : undefined), [round]);
  const totals = useMemo(() => {
    if (!round || !course) return [];
    return roundTotals(round, course.holes, round.players).sort((a, b) => a.total - b.total);
  }, [round, course]);

  if (!round || !course) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.errorText}>Round not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Final Scorecard</Text>
        <Text style={styles.subheading}>{course.name}</Text>
        {totals.map((result, index) => (
          <View key={result.player.id} style={styles.row}>
            <Text style={styles.rank}>#{index + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.player}>{result.player.name}</Text>
              <Text style={styles.vsPar}>{result.vsPar > 0 ? `+${result.vsPar}` : result.vsPar} vs par</Text>
            </View>
            <Text style={styles.total}>{result.total}</Text>
          </View>
        ))}

        <Pressable
          style={styles.doneButton}
          onPress={() => {
            completeRound(round.id);
            router.replace('/(tabs)/history');
          }}
        >
          <Text style={styles.doneButtonText}>Save to History</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#030712' },
  container: { padding: 16, gap: 12 },
  heading: { color: 'white', fontSize: 30, fontWeight: '700' },
  subheading: { color: '#9ca3af' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
  },
  rank: { color: '#6ee7b7', fontWeight: '700', width: 36 },
  player: { color: 'white', fontWeight: '600', fontSize: 16 },
  vsPar: { color: '#9ca3af' },
  total: { color: '#f8fafc', fontWeight: '800', fontSize: 24 },
  doneButton: { marginTop: 10, backgroundColor: '#10b981', borderRadius: 12, alignItems: 'center', padding: 14 },
  doneButtonText: { color: '#022c22', fontWeight: '700' },
  errorText: { color: '#fca5a5', padding: 20 },
});
