import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { getCourseById } from '@/src/pitchputt/data';
import { useRoundsStore } from '@/src/pitchputt/store';

export default function RoundHistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const round = useRoundsStore((state) => state.rounds.find((item) => item.id === id));
  const deleteRound = useRoundsStore((state) => state.deleteRound);
  const course = round ? getCourseById(round.courseId) : undefined;
  const isRoundComplete = Boolean(round?.completedAt);
  const screenTitle = isRoundComplete ? 'Round complete' : 'Scorecard';
  const totalsByPlayer = useMemo(() => {
    if (!round || !course) return [];
    return round.players.map((player) => {
      let total = 0;
      let enteredPar = 0;
      course.holes.forEach((hole) => {
        const strokes = round.holeScores[hole.number]?.[player.id];
        if (typeof strokes === 'number') {
          total += strokes;
          enteredPar += hole.par;
          return;
        }
        if (isRoundComplete) {
          total += hole.par;
          enteredPar += hole.par;
        }
      });
      return {
        playerId: player.id,
        total,
        vsPar: enteredPar > 0 ? total - enteredPar : 0,
      };
    });
  }, [round, course, isRoundComplete]);

  if (!round || !course) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.errorText}>Round not found.</Text>
      </SafeAreaView>
    );
  }

  const scoreType = (score: number, par: number) => {
    const delta = score - par;
    if (score === 1) return 'hio';
    if (delta < 0) return 'birdie';
    if (delta === 1) return 'bogey';
    if (delta >= 2) return 'double';
    return 'plain';
  };

  const formatVsPar = (value: number) => {
    if (value === 0) return 'E';
    return value > 0 ? `+${value}` : `${value}`;
  };

  const confirmDeleteRound = () => {
    Alert.alert(
      'Delete this round?',
      'This removes the round from your history. If you are signed in, the copy on your account is removed too. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteRound(round.id);
            router.back();
          },
        },
      ],
    );
  };

  const playerColGap =
    round.players.length <= 2 ? 32 : round.players.length === 3 ? 24 : round.players.length === 4 ? 30 : 30;
  const playerColsOffset = round.players.length >= 4 ? 14 : 25;
  const playerColWidth = round.players.length <= 2 ? 62 : round.players.length === 3 ? 56 : 44;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.scTopbar}>
          <View style={styles.scTopbarSide}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color="#1a1a1a" />
            </Pressable>
          </View>
          <Text style={styles.scTitle} numberOfLines={1}>
            {screenTitle}
          </Text>
          <View style={[styles.scTopbarSide, styles.scTopbarSideRight]}>
            {isRoundComplete ? (
              <Pressable
                style={styles.deleteBtn}
                onPress={confirmDeleteRound}
                accessibilityLabel="Delete round"
                accessibilityRole="button"
              >
                <Feather name="trash-2" size={18} color="#B85C38" />
              </Pressable>
            ) : (
              <Pressable
                style={styles.exitRoundBtn}
                onPress={() => router.replace('/(tabs)')}
                accessibilityLabel="Exit round"
                accessibilityRole="button"
              >
                <Text style={styles.exitRoundBtnText}>Exit round</Text>
              </Pressable>
            )}
          </View>
        </View>
        <Text style={styles.scMeta}>{course.name.replace(' Pitch & Putt', '')} · {course.holes.length} holes</Text>

        <View style={styles.scTable}>
          <View style={[styles.scHeadRow, { columnGap: playerColGap }]}>
            <View style={styles.scHoleCol} />
            {round.players.map((player, index) => (
              <View
                key={player.id}
                style={[styles.scPlayerCol, { width: playerColWidth }, index === 0 && { marginLeft: playerColsOffset }]}
              >
                <Text style={styles.scHeadCell}>{player.name}</Text>
              </View>
            ))}
          </View>

          {course.holes.map((hole) => (
            <View key={hole.id} style={[styles.scBodyRow, { columnGap: playerColGap }]}>
              <View style={styles.scHoleCol}>
                <Text style={styles.scHoleCell}>{hole.number}</Text>
              </View>
              {round.players.map((player, index) => {
                const enteredScore = round.holeScores[hole.number]?.[player.id];
                const score = typeof enteredScore === 'number' ? enteredScore : isRoundComplete ? hole.par : null;
                const cellType = typeof score === 'number' ? scoreType(score, hole.par) : 'plain';
                return (
                  <View
                    key={player.id}
                    style={[
                      styles.scScoreCol,
                      styles.scPlayerCol,
                      { width: playerColWidth },
                      index === 0 && { marginLeft: playerColsOffset },
                    ]}
                  >
                    {cellType === 'hio' && typeof score === 'number' ? (
                      <View style={styles.doubleCircleOuter}>
                        <View style={styles.doubleCircleInner}>
                          <Text style={styles.scScoreText}>{score}</Text>
                        </View>
                      </View>
                    ) : null}
                    {cellType === 'birdie' && typeof score === 'number' ? (
                      <View style={styles.singleCircle}>
                        <Text style={styles.scScoreText}>{score}</Text>
                      </View>
                    ) : null}
                    {cellType === 'bogey' && typeof score === 'number' ? (
                      <View style={styles.singleSquare}>
                        <Text style={styles.scScoreText}>{score}</Text>
                      </View>
                    ) : null}
                    {cellType === 'double' && typeof score === 'number' ? (
                      <View style={styles.doubleSquareOuter}>
                        <View style={styles.doubleSquareInner}>
                          <Text style={styles.scScoreText}>{score}</Text>
                        </View>
                      </View>
                    ) : null}
                    {cellType === 'plain' ? <Text style={styles.scScoreText}>{score ?? '—'}</Text> : null}
                  </View>
                );
              })}
            </View>
          ))}

          <View style={[styles.scBodyRow, styles.scTotalRow, { columnGap: playerColGap }]}>
            <View style={styles.scHoleCol}>
              <Text style={styles.scTotalLabel}>Total</Text>
            </View>
            {round.players.map((player, index) => {
              const total = totalsByPlayer.find((item) => item.playerId === player.id)?.total ?? 0;
              return (
                <View
                  key={player.id}
                  style={[styles.scPlayerCol, { width: playerColWidth }, index === 0 && { marginLeft: playerColsOffset }]}
                >
                  <Text style={styles.scTotalVal}>{total}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.summaryRow}>
          {round.players.map((player) => {
            const totals = totalsByPlayer.find((item) => item.playerId === player.id);
            const vsPar = totals?.vsPar ?? 0;
            return (
              <View key={player.id} style={styles.summaryCell}>
                <Text style={styles.summaryName}>{player.name}</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    vsPar < 0 && styles.summaryUnder,
                    vsPar === 0 && styles.summaryEven,
                    vsPar > 0 && styles.summaryOver,
                  ]}
                >
                  {formatVsPar(vsPar)}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f6f2' },
  container: { paddingHorizontal: 15, paddingTop: 14, paddingBottom: 22, gap: 10 },
  scTopbar: {
    paddingTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scTopbarSide: {
    minWidth: 100,
    flexShrink: 0,
    justifyContent: 'center',
  },
  scTopbarSideRight: { alignItems: 'flex-end' },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitRoundBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#e8f4ee',
    borderWidth: 1,
    borderColor: '#2D6A4F',
  },
  exitRoundBtnText: { color: '#2D6A4F', fontSize: 12, fontWeight: '700' },
  scTitle: {
    flex: 1,
    color: '#1a1a1a',
    fontSize: 31,
    fontWeight: '700',
    textAlign: 'center',
  },
  scMeta: { color: '#6b6b6b', fontSize: 14, marginTop: -2, marginBottom: 2 },
  scTable: {
    backgroundColor: 'transparent',
    borderRadius: 10,
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 8,
    paddingRight: 2,
  },
  scHeadRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingVertical: 7,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    borderBottomWidth: 0.5,
  },
  scHeadCell: { textAlign: 'center', color: '#6b6b6b', fontSize: 12, fontWeight: '700' },
  scHoleCol: { width: 45, flex: 0, alignItems: 'flex-start', justifyContent: 'center', paddingLeft: 4 },
  scPlayerCol: { width: 62, alignItems: 'center', justifyContent: 'center' },
  scBodyRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    minHeight: 40,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  scHoleCell: { color: '#6b6b6b', fontSize: 12, fontWeight: '600' },
  scScoreCol: { alignItems: 'center' },
  scScoreText: { color: '#1a1a1a', fontWeight: '700', fontSize: 12 },
  singleCircle: {
    minWidth: 30,
    minHeight: 30,
    borderRadius: 15,
    borderWidth: 1.2,
    borderColor: '#2D6A4F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doubleCircleOuter: {
    minWidth: 32,
    minHeight: 32,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#2D5A8E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doubleCircleInner: {
    minWidth: 24,
    minHeight: 24,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#2D5A8E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleSquare: {
    minWidth: 30,
    minHeight: 30,
    borderRadius: 4,
    borderWidth: 1.2,
    borderColor: '#B85C38',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doubleSquareOuter: {
    minWidth: 32,
    minHeight: 32,
    borderRadius: 4,
    borderWidth: 1.2,
    borderColor: '#B85C38',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doubleSquareInner: {
    minWidth: 24,
    minHeight: 24,
    borderRadius: 3,
    borderWidth: 1.2,
    borderColor: '#B85C38',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scTotalRow: { borderBottomWidth: 0, borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.06)', paddingTop: 8, paddingBottom: 8 },
  scTotalLabel: { color: '#6b6b6b', fontSize: 12, fontWeight: '700' },
  scTotalVal: { textAlign: 'center', color: '#1a1a1a', fontSize: 14, fontWeight: '800' },
  summaryRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 360,
    justifyContent: 'space-evenly',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingVertical: 8,
  },
  summaryCell: { alignItems: 'center', minWidth: 88 },
  summaryName: { color: '#6b6b6b', fontSize: 12, fontWeight: '600' },
  summaryValue: { marginTop: 1, fontSize: 20, fontWeight: '800' },
  summaryUnder: { color: '#2D6A4F' },
  summaryEven: { color: '#6b6b6b' },
  summaryOver: { color: '#B85C38' },
  errorText: { color: '#B85C38', padding: 20 },
});
