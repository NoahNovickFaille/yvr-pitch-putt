import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { getCourseById } from '@/src/pitchputt/data';
import { createRoundShareToken } from '@/src/pitchputt/roundShareRemote';
import { isSupabaseAuthUserId, isUuid } from '@/src/pitchputt/sessionUtils';
import { buildRoundClaimUrl, buildRoundShareMessage } from '@/src/pitchputt/shareLinks';
import type { PlayerInput } from '@/src/pitchputt/types';
import { useRoundsStore, useSessionStore } from '@/src/pitchputt/store';

function isPlayerOwner(player: PlayerInput, index: number) {
  return player.isOwner ?? index === 0;
}

export default function RoundHistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const round = useRoundsStore((state) => state.rounds.find((item) => item.id === id));
  const deleteRound = useRoundsStore((state) => state.deleteRound);
  const completeRound = useRoundsStore((state) => state.completeRound);
  const userId = useSessionStore((state) => state.userId);
  const course = round ? getCourseById(round.courseId) : undefined;
  const isRoundComplete = Boolean(round?.completedAt);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [sharingPlayerId, setSharingPlayerId] = useState<string | null>(null);
  const screenTitle = isRoundComplete ? 'Round complete' : 'Scorecard';
  const totalsByPlayer = useMemo(() => {
    if (!round || !course) return [];
    return round.players.map((player) => {
      let total = 0;
      let enteredPar = 0;
      course.holes.forEach((hole) => {
        const strokes = round.holeScores[hole.number]?.[player.id];
        if (typeof strokes !== 'number') {
          return;
        }
        total += strokes;
        enteredPar += hole.par;
      });
      return {
        playerId: player.id,
        total,
        vsPar: enteredPar > 0 ? total - enteredPar : 0,
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

  const confirmDeleteRound = () => {
    Alert.alert(
      'Delete this round?',
      'This removes the round from your history. If you are signed in, the copy on your account is removed too. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteRound(round.id);
            if (result.ok) {
              router.back();
            } else {
              Alert.alert(
                'Could not delete round',
                result.message ?? 'Check your connection and try again.',
              );
            }
          },
        },
      ],
    );
  };

  const confirmExitRound = () => {
    Alert.alert(
      'Exit this round?',
      'This will finish the round as incomplete and move it to history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish incomplete round',
          style: 'destructive',
          onPress: () => {
            completeRound(round.id);
            router.replace('/(tabs)/history');
          },
        },
      ],
    );
  };

  const shareablePlayers = useMemo(
    () =>
      (round?.players ?? []).filter(
        (player, index) => !isPlayerOwner(player, index) && !player.linkedUserId,
      ),
    [round?.players],
  );
  const canShare =
    isRoundComplete &&
    isSupabaseAuthUserId(userId) &&
    isUuid(round?.id ?? '') &&
    round?.ownerId === userId &&
    shareablePlayers.length > 0;

  const shareWithPlayer = async (player: PlayerInput) => {
    if (!round || !course) return;
    setSharingPlayerId(player.id);
    const created = await createRoundShareToken(round.id, player.id);
    setSharingPlayerId(null);
    if (!created.ok) {
      Alert.alert('Could not share', created.message);
      return;
    }
    const url = buildRoundClaimUrl(created.token);
    const courseLabel = course.name.replace(' Pitch & Putt', '');
    try {
      await Share.share({
        message: buildRoundShareMessage(player.name, courseLabel, url),
      });
      setShareModalVisible(false);
    } catch {
      /* user dismissed share sheet */
    }
  };

  const playerColGap =
    round.players.length <= 2 ? 32 : round.players.length === 3 ? 24 : round.players.length === 4 ? 30 : 30;
  const playerColsOffset = round.players.length >= 4 ? 14 : 25;
  const playerColWidth = round.players.length <= 2 ? 62 : round.players.length === 3 ? 56 : 44;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.scTopbar}>
          <View style={styles.scTopbarSideLeft}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color="#1a1a1a" />
            </Pressable>
          </View>
          <View style={styles.scTitleWrap}>
            <Text style={styles.scTitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.82}>
              {screenTitle}
            </Text>
          </View>
          <View style={styles.scTopbarSideRight}>
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
                onPress={confirmExitRound}
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
                const score = typeof enteredScore === 'number' ? enteredScore : null;
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

        {canShare ? (
          <Pressable
            style={styles.shareButton}
            onPress={() => setShareModalVisible(true)}
          >
            <Text style={styles.shareButtonText}>Share with a player</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <Modal
        visible={shareModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setShareModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Share scorecard</Text>
            <Text style={styles.modalBody}>
              Choose a player. They get a one-time link to claim this round in the app.
            </Text>
            <View style={styles.sharePlayerList}>
              {shareablePlayers.map((player) => {
                const busy = sharingPlayerId === player.id;
                return (
                  <Pressable
                    key={player.id}
                    style={[styles.sharePlayerRow, busy && styles.sharePlayerRowBusy]}
                    onPress={() => void shareWithPlayer(player)}
                    disabled={sharingPlayerId != null}
                  >
                    <Text style={styles.sharePlayerName}>{player.name}</Text>
                    {busy ? (
                      <ActivityIndicator color="#2D6A4F" size="small" />
                    ) : (
                      <Text style={styles.sharePlayerAction}>Create link</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              style={styles.modalCloseBtn}
              onPress={() => setShareModalVisible(false)}
              disabled={sharingPlayerId != null}
            >
              <Text style={styles.modalCloseBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  scTopbarSideLeft: {
    width: 40,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  scTitleWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: 4,
  },
  scTopbarSideRight: {
    flexShrink: 0,
    maxWidth: '42%',
    justifyContent: 'center',
    alignItems: 'flex-end',
    alignSelf: 'stretch',
  },
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
    color: '#1a1a1a',
    fontSize: 27,
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
  shareButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  shareButtonText: { color: '#2D6A4F', fontWeight: '700', fontSize: 15 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  modalTitle: { color: '#1a1a1a', fontSize: 19, fontWeight: '800' },
  modalBody: { color: '#6b6b6b', fontSize: 14, lineHeight: 20 },
  sharePlayerList: { gap: 8 },
  sharePlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f7f6f2',
  },
  sharePlayerRowBusy: { opacity: 0.7 },
  sharePlayerName: { color: '#1a1a1a', fontSize: 16, fontWeight: '600' },
  sharePlayerAction: { color: '#2D6A4F', fontSize: 14, fontWeight: '700' },
  modalCloseBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    backgroundColor: '#ffffff',
  },
  modalCloseBtnText: { color: '#1a1a1a', fontSize: 14, fontWeight: '700' },
  errorText: { color: '#B85C38', padding: 20 },
});
