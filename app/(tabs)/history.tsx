import { useMemo } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { Feather } from '@expo/vector-icons';

import { getCourseById } from '@/src/pitchputt/data';
import { useRoundsStore } from '@/src/pitchputt/store';

export default function HistoryScreen() {
  const rounds = useRoundsStore((state) => state.rounds);
  const completedRounds = useMemo(
    () =>
      rounds
        .filter((round) => round.completedAt)
        .sort((a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime()),
    [rounds],
  );

  const formatVsPar = (value: number) => {
    if (value === 0) return 'E';
    return value > 0 ? `+${value}` : `${value}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topbar}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#1a1a1a" />
          </Pressable>
          <Text style={styles.heading}>Round history</Text>
          <View style={styles.backBtnPlaceholder} />
        </View>
        {completedRounds.length === 0 ? <Text style={styles.empty}>No completed rounds yet.</Text> : null}
        {completedRounds.map((round) => {
          const course = getCourseById(round.courseId);
          const parTotal = (course?.holes ?? []).reduce((sum, hole) => sum + hole.par, 0);
          const playerScores = round.players.map((player) => {
            const total = (course?.holes ?? []).reduce((sum, hole) => {
              const score = round.holeScores[hole.number]?.[player.id];
              return sum + (typeof score === 'number' ? score : hole.par);
            }, 0);
            return { player, vsPar: total - parTotal };
          });

          return (
            <Pressable
              key={round.id}
              style={styles.card}
              onPress={() => router.push({ pathname: '/history/[id]', params: { id: round.id } })}
            >
              <View style={styles.cardTop}>
                <Text style={styles.title}>{course?.name.replace(' Pitch & Putt', '') ?? 'Unknown course'}</Text>
                <Text style={styles.dateText}>
                  {round.completedAt ? format(new Date(round.completedAt), 'MMM d, yyyy') : 'Incomplete'}
                </Text>
              </View>
              <View style={styles.roundScores}>
                {playerScores.map(({ player, vsPar }) => (
                  <Text key={player.id} style={styles.roundPlayer}>
                    {player.name}{' '}
                    <Text
                      style={[
                        styles.roundScore,
                        vsPar < 0 && styles.neg,
                        vsPar === 0 && styles.even,
                        vsPar > 0 && styles.pos,
                      ]}
                    >
                      {formatVsPar(vsPar)}
                    </Text>
                  </Text>
                ))}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f6f2' },
  container: { paddingHorizontal: 15, paddingTop: 14, paddingBottom: 20, gap: 12 },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: { width: 32, height: 32 },
  heading: { color: '#1a1a1a', fontSize: 30, fontWeight: '700' },
  empty: { color: '#6b6b6b' },
  card: {
    borderRadius: 12,
    borderColor: 'rgba(0,0,0,0.1)',
    borderWidth: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 7,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#1a1a1a', fontWeight: '700', fontSize: 17 },
  dateText: { color: '#6b6b6b', fontSize: 13, fontWeight: '500' },
  roundScores: { gap: 3 },
  roundPlayer: { color: '#1a1a1a', fontSize: 14, fontWeight: '500' },
  roundScore: { fontWeight: '700' },
  neg: { color: '#2D6A4F' },
  even: { color: '#6b6b6b' },
  pos: { color: '#B85C38' },
});
