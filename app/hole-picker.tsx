import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getCourseById } from '@/src/pitchputt/data';
import { useRoundsStore } from '@/src/pitchputt/store';

export default function HolePickerScreen() {
  const { roundId } = useLocalSearchParams<{ roundId: string }>();
  const round = useRoundsStore((state) => state.rounds.find((item) => item.id === roundId));
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
      <View style={styles.container}>
        <Text style={styles.heading}>Jump to Hole</Text>
        <View style={styles.grid}>
          {course.holes.map((hole) => (
            <Pressable
              key={hole.id}
              onPress={() => router.replace({ pathname: '/hole', params: { roundId, hole: String(hole.number) } })}
              style={styles.holeBtn}
            >
              <Text style={styles.holeBtnText}>{hole.number}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#030712' },
  container: { flex: 1, padding: 16, gap: 12 },
  heading: { color: 'white', fontSize: 30, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  holeBtn: {
    width: 58,
    height: 58,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  holeBtnText: { color: '#e2e8f0', fontWeight: '700' },
  errorText: { color: '#fca5a5', padding: 20 },
});
