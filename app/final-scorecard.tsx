import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { getCourseById } from '@/src/pitchputt/data';
import { createRoundShareToken } from '@/src/pitchputt/roundShareRemote';
import { buildRoundClaimUrl, buildRoundShareMessage } from '@/src/pitchputt/shareLinks';
import { isSupabaseAuthUserId, isUuid } from '@/src/pitchputt/sessionUtils';
import type { PlayerInput } from '@/src/pitchputt/types';
import { useRoundsStore, useSessionStore } from '@/src/pitchputt/store';

function isPlayerOwner(player: PlayerInput, index: number) {
  return player.isOwner ?? index === 0;
}

export default function FinalScorecardScreen() {
  const { roundId } = useLocalSearchParams<{ roundId: string }>();
  const round = useRoundsStore((state) => state.rounds.find((item) => item.id === roundId));
  const completeRound = useRoundsStore((state) => state.completeRound);
  const userId = useSessionStore((state) => state.userId);
  const [showGuestSignupModal, setShowGuestSignupModal] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [sharingPlayerId, setSharingPlayerId] = useState<string | null>(null);

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
  const shareablePlayers = useMemo(
    () =>
      (round?.players ?? []).filter(
        (player, index) => !isPlayerOwner(player, index) && !player.linkedUserId,
      ),
    [round?.players],
  );
  const canShare =
    Boolean(round && course) &&
    isSupabaseAuthUserId(userId) &&
    isUuid(round?.id ?? "") &&
    shareablePlayers.length > 0;

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

  const shareWithPlayer = async (player: PlayerInput) => {
    if (!round.completedAt) {
      completeRound(round.id);
    }
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

  const handleSaveScorecard = () => {
    const isGuestUser = !userId || userId.startsWith('guest-');
    if (!round.completedAt) {
      completeRound(round.id);
    }
    if (isGuestUser) {
      setShowGuestSignupModal(true);
      return;
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

        {canShare ? (
          <Pressable
            style={styles.shareButton}
            onPress={() => setShareModalVisible(true)}
          >
            <Text style={styles.shareButtonText}>Share with a player</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.finishButton} onPress={handleSaveScorecard}>
          <Text style={styles.finishButtonText}>Save scorecard</Text>
        </Pressable>
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
              style={styles.modalSecondaryBtn}
              onPress={() => setShareModalVisible(false)}
              disabled={sharingPlayerId != null}
            >
              <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showGuestSignupModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGuestSignupModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Save this round to your account</Text>
            <Text style={styles.modalBody}>
              Create a free account to back up your rounds and keep your stats synced across devices.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalSecondaryBtn}
                onPress={() => {
                  setShowGuestSignupModal(false);
                  router.replace('/(tabs)');
                }}
              >
                <Text style={styles.modalSecondaryBtnText}>Not now</Text>
              </Pressable>
              <Pressable
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  setShowGuestSignupModal(false);
                  router.replace('/register');
                }}
              >
                <Text style={styles.modalPrimaryBtnText}>Create account</Text>
              </Pressable>
            </View>
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
  finishButton: { backgroundColor: '#2D6A4F', borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, marginTop: 8 },
  finishButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
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
  modalButtons: { flexDirection: 'row', gap: 8, marginTop: 2 },
  modalSecondaryBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    backgroundColor: '#ffffff',
  },
  modalSecondaryBtnText: { color: '#1a1a1a', fontSize: 14, fontWeight: '700' },
  modalPrimaryBtn: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    backgroundColor: '#2D6A4F',
  },
  modalPrimaryBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  errorText: { color: '#B85C38', padding: 20 },
});
