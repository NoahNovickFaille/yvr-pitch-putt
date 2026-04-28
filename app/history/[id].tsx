import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { getCourseById } from '@/src/pitchputt/data';
import { useRoundsStore } from '@/src/pitchputt/store';

export default function RoundHistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const round = useRoundsStore((state) => state.rounds.find((item) => item.id === id));
  const course = round ? getCourseById(round.courseId) : undefined;

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
        <Text style={styles.heading}>{course.name}</Text>
        {course.holes.map((hole) => (
          <View key={hole.id} style={styles.holeCard}>
            <Text style={styles.holeTitle}>Hole {hole.number} (Par {hole.par})</Text>
            {round.players.map((player) => (
              <Text key={player.id} style={styles.scoreText}>
                {player.name}: {round.holeScores[hole.number]?.[player.id] ?? '-'}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#030712' },
  container: { padding: 16, gap: 12 },
  heading: { color: 'white', fontSize: 28, fontWeight: '700' },
  holeCard: { borderWidth: 1, borderColor: '#1f2937', borderRadius: 12, backgroundColor: '#111827', padding: 12 },
  holeTitle: { color: '#e2e8f0', fontWeight: '700', marginBottom: 6 },
  scoreText: { color: '#cbd5e1' },
  errorText: { color: '#fca5a5', padding: 20 },
});
