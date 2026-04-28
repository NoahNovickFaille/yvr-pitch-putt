import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { getCourseById } from '@/src/pitchputt/data';
import { useRoundsStore, useSessionStore } from '@/src/pitchputt/store';

export default function PlayerSetupScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const course = useMemo(() => getCourseById(courseId), [courseId]);
  const userId = useSessionStore((state) => state.userId);
  const createRound = useRoundsStore((state) => state.createRound);
  const [players, setPlayers] = useState(['You', 'Player 2']);

  if (!course || !userId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.errorText}>Missing course or session. Return to Home.</Text>
      </SafeAreaView>
    );
  }

  const startRound = () => {
    const roundId = `round-${Date.now()}`;
    createRound({
      id: roundId,
      ownerId: userId,
      courseId: course.id,
      createdAt: new Date().toISOString(),
      players: players.filter(Boolean).map((name, index) => ({ id: `${roundId}-p${index}`, name })),
      holeScores: {},
    });

    router.replace({ pathname: '/hole', params: { roundId, hole: '1' } });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Player Setup</Text>
        <Text style={styles.subtitle}>{course.name}</Text>
        {players.map((player, index) => (
          <TextInput
            key={index}
            style={styles.input}
            value={player}
            onChangeText={(value) => setPlayers((prev) => prev.map((p, i) => (i === index ? value : p)))}
            placeholder={`Player ${index + 1}`}
            placeholderTextColor="#6b7280"
          />
        ))}

        <Pressable
          style={styles.secondaryBtn}
          onPress={() => setPlayers((prev) => [...prev, `Player ${prev.length + 1}`])}
        >
          <Text style={styles.secondaryBtnText}>+ Add Player</Text>
        </Pressable>

        <Pressable style={styles.primaryBtn} onPress={startRound}>
          <Text style={styles.primaryBtnText}>Start Scoring</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#030712' },
  container: { flex: 1, padding: 20, gap: 12 },
  title: { color: 'white', fontSize: 28, fontWeight: '700' },
  subtitle: { color: '#9ca3af' },
  input: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 12,
    padding: 12,
    color: 'white',
  },
  secondaryBtn: { borderWidth: 1, borderColor: '#334155', borderRadius: 12, padding: 12, alignItems: 'center' },
  secondaryBtnText: { color: '#cbd5e1', fontWeight: '600' },
  primaryBtn: { backgroundColor: '#10b981', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#022c22', fontWeight: '700' },
  errorText: { color: '#fca5a5', padding: 20 },
});
