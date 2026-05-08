import { useCallback, useMemo, useRef } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { Feather } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { getCourseById } from '@/src/pitchputt/data';
import type { Round } from '@/src/pitchputt/types';
import { useRoundsStore, useSessionStore } from '@/src/pitchputt/store';

/** Width of the revealed delete action (Spotify-style swipe). */
const DELETE_WIDTH = 56;
const SPRING = { damping: 34, stiffness: 400 };

type HistoryRoundListRowProps = {
  round: Round;
  course: ReturnType<typeof getCourseById> | undefined;
  playerScores: { player: Round['players'][number]; vsPar: number }[];
  formatVsPar: (value: number) => string;
  onConfirmDelete: (round: Round) => void;
  onSwipeOpened: (roundId: string, close: () => void) => void;
  onSwipeClosed: (roundId: string) => void;
};

function HistoryRoundListRow({
  round,
  course,
  playerScores,
  formatVsPar,
  onConfirmDelete,
  onSwipeOpened,
  onSwipeClosed,
}: HistoryRoundListRowProps) {
  const translateX = useSharedValue(0);
  const panStartX = useSharedValue(0);

  const snapClosed = useCallback(() => {
    runOnUI(() => {
      'worklet';
      translateX.value = withSpring(0, SPRING, (finished) => {
        if (finished) runOnJS(onSwipeClosed)(round.id);
      });
    })();
  }, [round.id, translateX, onSwipeClosed]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-22, 22])
        .onStart(() => {
          panStartX.value = translateX.value;
        })
        .onUpdate((e) => {
          const next = panStartX.value + e.translationX;
          translateX.value = Math.min(0, Math.max(-DELETE_WIDTH, next));
        })
        .onEnd((e) => {
          const shouldOpen =
            translateX.value < -DELETE_WIDTH / 2 || e.velocityX < -380;
          if (shouldOpen) {
            runOnJS(onSwipeOpened)(round.id, snapClosed);
            translateX.value = withSpring(-DELETE_WIDTH, SPRING);
          } else {
            translateX.value = withSpring(0, SPRING, (finished) => {
              if (finished) runOnJS(onSwipeClosed)(round.id);
            });
          }
        }),
    [round.id, onSwipeOpened, onSwipeClosed, panStartX, snapClosed, translateX],
  );

  const foregroundStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.swipeRowShell} accessibilityHint="Swipe left on this row to delete the round.">
      <View style={styles.swipeDeleteUnderlay} pointerEvents="box-none">
        <Pressable
          style={styles.swipeDeleteBtn}
          onPress={() => {
            snapClosed();
            onConfirmDelete(round);
          }}
          accessibilityLabel="Delete round"
          accessibilityRole="button"
        >
          <View style={styles.swipeTrashCircle}>
            <Feather name="trash-2" size={20} color="#B85C38" />
          </View>
        </Pressable>
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.swipeRowForeground, foregroundStyle]}>
          <View style={styles.card}>
            <Pressable
              style={styles.cardMain}
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
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default function HistoryScreen() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const exclusiveRowIdRef = useRef<string | null>(null);
  const exclusiveCloseRef = useRef<(() => void) | null>(null);

  const onSwipeOpened = useCallback((roundId: string, close: () => void) => {
    exclusiveCloseRef.current?.();
    exclusiveCloseRef.current = close;
    exclusiveRowIdRef.current = roundId;
  }, []);

  const onSwipeClosed = useCallback((roundId: string) => {
    if (exclusiveRowIdRef.current === roundId) {
      exclusiveRowIdRef.current = null;
      exclusiveCloseRef.current = null;
    }
  }, []);
  const snapPoints = useMemo(() => ['36%'], []);
  const rounds = useRoundsStore((state) => state.rounds);
  const deleteRound = useRoundsStore((state) => state.deleteRound);
  const userId = useSessionStore((state) => state.userId);
  const userName = useSessionStore((state) => state.userName);
  const userEmail = useSessionStore((state) => state.userEmail);
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
  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.35} />,
    [],
  );
  const firstName = useMemo(() => {
    const isGuestUser = !userId || userId.startsWith('guest-');
    if (isGuestUser) {
      return 'Guest';
    }
    if (userName?.trim()) {
      return userName.trim();
    }
    const localPart = userEmail?.split('@')[0]?.trim();
    if (!localPart) return 'Guest';
    return localPart.charAt(0).toUpperCase() + localPart.slice(1);
  }, [userEmail, userId, userName]);
  const avatarLetter = firstName.charAt(0).toUpperCase();

  const navigateFromMenu = (path: '/(tabs)' | '/logout' | '/(tabs)/stats' | '/membership-card') => {
    bottomSheetRef.current?.close();
    router.push(path);
  };

  const confirmDeleteRound = (round: Round) => {
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
            if (!result.ok) {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topbar}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#1a1a1a" />
          </Pressable>
          <View style={styles.topbarTitleWrap}>
            <Text style={styles.heading}>Round history</Text>
          </View>
          <Pressable style={styles.avatarBtn} onPress={() => bottomSheetRef.current?.snapToIndex(0)}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </Pressable>
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
            <HistoryRoundListRow
              key={round.id}
              round={round}
              course={course}
              playerScores={playerScores}
              formatVsPar={formatVsPar}
              onConfirmDelete={confirmDeleteRound}
              onSwipeOpened={onSwipeOpened}
              onSwipeClosed={onSwipeClosed}
            />
          );
        })}
      </ScrollView>

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Menu</Text>
          <Pressable style={styles.sheetItem} onPress={() => navigateFromMenu('/(tabs)')}>
            <Text style={styles.sheetItemText}>Start a round</Text>
            <Feather name="play" size={16} color="#2D6A4F" />
          </Pressable>
          <Pressable style={styles.sheetItem} onPress={() => navigateFromMenu('/(tabs)/stats')}>
            <Text style={styles.sheetItemText}>My stats</Text>
            <Feather name="chevron-right" size={16} color="#6b6b6b" />
          </Pressable>
          <Pressable style={styles.sheetItem} onPress={() => navigateFromMenu('/membership-card')}>
            <Text style={styles.sheetItemText}>Membership card</Text>
            <Feather name="chevron-right" size={16} color="#6b6b6b" />
          </Pressable>
          <Pressable style={styles.sheetItem} onPress={() => navigateFromMenu('/logout')}>
            <Text style={styles.sheetItemDanger}>Log out</Text>
            <Feather name="log-out" size={16} color="#B85C38" />
          </Pressable>
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f6f2' },
  container: { paddingHorizontal: 15, paddingTop: 14, paddingBottom: 20, gap: 12 },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topbarTitleWrap: { flex: 1, paddingHorizontal: 8 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2D6A4F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  sheetBackground: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  sheetHandle: { width: 44, backgroundColor: '#d4d4d4' },
  sheetContent: { paddingHorizontal: 16, paddingBottom: 20, gap: 10 },
  sheetTitle: { color: '#1a1a1a', fontSize: 20, fontWeight: '700', marginTop: 2 },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  sheetItemText: { color: '#1a1a1a', fontSize: 15, fontWeight: '600' },
  sheetItemDanger: { color: '#B85C38', fontSize: 15, fontWeight: '700' },
  heading: { color: '#1a1a1a', fontSize: 30, fontWeight: '700', textAlign: 'left' },
  empty: { color: '#6b6b6b' },
  swipeRowShell: {
    position: 'relative',
    alignSelf: 'stretch',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f7f6f2',
  },
  swipeDeleteUnderlay: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 0,
    width: DELETE_WIDTH,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeTrashCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#B85C38',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  swipeRowForeground: {
    zIndex: 1,
    width: '100%',
    backgroundColor: 'transparent',
  },
  card: {
    borderRadius: 12,
    borderColor: 'rgba(0,0,0,0.1)',
    borderWidth: 1,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  cardMain: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 7,
    minWidth: 0,
  },
  swipeDeleteBtn: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 72,
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
