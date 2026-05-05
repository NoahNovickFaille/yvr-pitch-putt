import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { getCourseById } from '@/src/pitchputt/data';
import { useRoundsStore } from '@/src/pitchputt/store';

export default function FinalScorecardScreen() {
  const { roundId } = useLocalSearchParams<{ roundId: string }>();
  const round = useRoundsStore((state) => state.rounds.find((item) => item.id === roundId));
  const completeRound = useRoundsStore((state) => state.completeRound);

  const course = useMemo(() => (round ? getCourseById(round.courseId) : undefined), [round]);
  const totalsByPlayer = useMemo(() => {
    if (!round || !course) return [];
    return round.players.map((player) => {
      let total = 0;
      let parForScoredHoles = 0;
      for (const hole of course.holes) {
        const strokes = round.holeScores[hole.number]?.[player.id];
        if (typeof strokes === 'number') {
          total += strokes;
          parForScoredHoles += hole.par;
        }
      }
      return {
        playerId: player.id,
        total,
        vsPar: total - parForScoredHoles,
      };
    });
  }, [round, course]);

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
  const playerColGap =
    round.players.length <= 2 ? 32 : round.players.length === 3 ? 24 : round.players.length === 4 ? 30 : 30;
  const playerColsOffset = round.players.length >= 4 ? 14 : 25;
  const playerColWidth = round.players.length <= 2 ? 62 : round.players.length === 3 ? 56 : 44;
  const handleSaveScorecard = () => {
    if (!round.completedAt) {
      completeRound(round.id);
    }
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.scTopbar}>
          <View style={styles.scTitleWrap}>
            <Text style={styles.scTitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.82}>
              Round complete
            </Text>
          </View>
          <Pressable
            style={styles.editBtn}
            onPress={() => router.replace({ pathname: '/hole', params: { roundId: round.id, hole: String(course.holes.length) } })}
          >
            <Feather name="edit-2" size={16} color="#6b6b6b" />
          </Pressable>
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
                const raw = round.holeScores[hole.number]?.[player.id];
                const hasScore = typeof raw === 'number';
                const cellType = hasScore ? scoreType(raw, hole.par) : null;
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
                    {!hasScore ? (
                      <Text style={styles.scScoreEmpty}>—</Text>
                    ) : null}
                    {hasScore && cellType === 'hio' ? (
                      <View style={styles.doubleCircleOuter}>
                        <View style={styles.doubleCircleInner}>
                          <Text style={styles.scScoreText}>{raw}</Text>
                        </View>
                      </View>
                    ) : null}
                    {hasScore && cellType === 'birdie' ? (
                      <View style={styles.singleCircle}>
                        <Text style={styles.scScoreText}>{raw}</Text>
                      </View>
                    ) : null}
                    {hasScore && cellType === 'bogey' ? (
                      <View style={styles.singleSquare}>
                        <Text style={styles.scScoreText}>{raw}</Text>
                      </View>
                    ) : null}
                    {hasScore && cellType === 'double' ? (
                      <View style={styles.doubleSquareOuter}>
                        <View style={styles.doubleSquareInner}>
                          <Text style={styles.scScoreText}>{raw}</Text>
                        </View>
                      </View>
                    ) : null}
                    {hasScore && cellType === 'plain' ? <Text style={styles.scScoreText}>{raw}</Text> : null}
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

        <Pressable
          style={styles.finishButton}
          onPress={handleSaveScorecard}
        >
          <Text style={styles.finishButtonText}>Save scorecard</Text>
        </Pressable>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  scTitleWrap: { flex: 1, minWidth: 0, paddingRight: 4 },
  scTitle: {
    color: '#1a1a1a',
    fontSize: 27,
    fontWeight: '700',
  },
  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
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
  scScorePill: {
    minWidth: 30,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scScoreText: { color: '#1a1a1a', fontWeight: '700', fontSize: 12 },
  scScoreEmpty: { color: '#aaaaaa', fontWeight: '600', fontSize: 12 },
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
  finishButton: { backgroundColor: '#2D6A4F', borderRadius: 12, alignItems: 'center', paddingVertical: 14, marginTop: 6 },
  finishButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  errorText: { color: '#B85C38', padding: 20 },
});
