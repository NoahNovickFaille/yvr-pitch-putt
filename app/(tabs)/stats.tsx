import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getCourseById } from '@/src/pitchputt/data';
import { roundTotals } from '@/src/pitchputt/scoring';
import { useRoundsStore } from '@/src/pitchputt/store';

export default function StatsScreen() {
  const completedRounds = useRoundsStore((state) => state.rounds.filter((round) => round.completedAt));

  const aggregate = completedRounds.reduce(
    (acc, round) => {
      const course = getCourseById(round.courseId);
      if (!course) return acc;

      const totals = roundTotals(round, course.holes, round.players);
      totals.forEach((result) => {
        acc.totalStrokes += result.total;
        acc.totalPlayers += 1;
      });

      return acc;
    },
    { totalStrokes: 0, totalPlayers: 0 },
  );

  const average = aggregate.totalPlayers > 0 ? (aggregate.totalStrokes / aggregate.totalPlayers).toFixed(1) : '--';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Stats</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Completed rounds</Text>
          <Text style={styles.value}>{completedRounds.length}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Average total score</Text>
          <Text style={styles.value}>{average}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#030712' },
  container: { padding: 16, gap: 12 },
  heading: { color: 'white', fontSize: 30, fontWeight: '700' },
  card: { borderWidth: 1, borderColor: '#1f2937', backgroundColor: '#111827', borderRadius: 12, padding: 12 },
  label: { color: '#9ca3af' },
  value: { color: 'white', fontSize: 28, fontWeight: '800' },
});
