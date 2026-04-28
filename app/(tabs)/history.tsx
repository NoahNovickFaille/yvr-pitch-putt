import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { formatDistanceToNowStrict } from 'date-fns';

import { getCourseById } from '@/src/pitchputt/data';
import { useRoundsStore } from '@/src/pitchputt/store';

export default function HistoryScreen() {
  const rounds = useRoundsStore((state) => state.rounds.filter((round) => round.completedAt));

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Round History</Text>
        {rounds.length === 0 ? <Text style={styles.empty}>No completed rounds yet.</Text> : null}
        {rounds.map((round) => {
          const course = getCourseById(round.courseId);
          return (
            <Pressable
              key={round.id}
              style={styles.card}
              onPress={() => router.push({ pathname: '/history/[id]', params: { id: round.id } })}
            >
              <Text style={styles.title}>{course?.name ?? 'Unknown course'}</Text>
              <Text style={styles.meta}>{round.players.length} players</Text>
              <Text style={styles.meta}>
                {round.completedAt
                  ? `${formatDistanceToNowStrict(new Date(round.completedAt))} ago`
                  : 'Incomplete'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#030712' },
  container: { padding: 16, gap: 12 },
  heading: { color: 'white', fontSize: 30, fontWeight: '700' },
  empty: { color: '#9ca3af' },
  card: { borderRadius: 12, borderColor: '#1f2937', borderWidth: 1, backgroundColor: '#111827', padding: 12 },
  title: { color: 'white', fontWeight: '600', fontSize: 16 },
  meta: { color: '#94a3b8' },
});
