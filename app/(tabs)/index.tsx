import { useCallback, useMemo, useRef } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnUI, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { COURSES, getCourseById } from '@/src/pitchputt/data';
import type { Round } from '@/src/pitchputt/types';
import { useRoundsStore, useSessionStore } from '@/src/pitchputt/store';

const COURSE_NEIGHBORHOODS: Record<string, string> = {
  'course-stanley': 'Coal Harbour',
  'course-qe': 'Cambie Village',
  'course-rupert': 'East Vancouver',
};

const COURSE_BG_STYLES = ['#d6eadf', '#e8f0f9', '#f3eefa'];

const RESUME_DELETE_WIDTH = 56;
const RESUME_SWIPE_SPRING = { damping: 34, stiffness: 400 };

type ResumeRoundRowProps = {
  round: Round;
  resumeHoleNumber: number;
  subtitle: string;
  onConfirmDelete: () => void;
};

function ResumeRoundRow({
  round,
  resumeHoleNumber,
  subtitle,
  onConfirmDelete,
}: ResumeRoundRowProps) {
  const translateX = useSharedValue(0);
  const panStartX = useSharedValue(0);

  const snapClosed = useCallback(() => {
    runOnUI(() => {
      'worklet';
      translateX.value = withSpring(0, RESUME_SWIPE_SPRING);
    })();
  }, [translateX]);

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
          translateX.value = Math.min(0, Math.max(-RESUME_DELETE_WIDTH, next));
        })
        .onEnd((e) => {
          const shouldOpen =
            translateX.value < -RESUME_DELETE_WIDTH / 2 || e.velocityX < -380;
          if (shouldOpen) {
            translateX.value = withSpring(-RESUME_DELETE_WIDTH, RESUME_SWIPE_SPRING);
          } else {
            translateX.value = withSpring(0, RESUME_SWIPE_SPRING);
          }
        }),
    [panStartX, translateX],
  );

  const foregroundStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={styles.resumeSwipeShell}
      accessibilityHint="Swipe left to discard this in-progress round."
    >
      <View style={styles.resumeSwipeUnderlay} pointerEvents="box-none">
        <Pressable
          style={styles.resumeSwipeDeleteBtn}
          onPress={() => {
            snapClosed();
            onConfirmDelete();
          }}
          accessibilityLabel="Discard round"
          accessibilityRole="button"
        >
          <View style={styles.resumeTrashCircle}>
            <Feather name="trash-2" size={20} color="#B85C38" />
          </View>
        </Pressable>
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.resumeSwipeForeground, foregroundStyle]}>
          <Pressable
            style={styles.resumeRow}
            onPress={() =>
              router.push({
                pathname: '/hole',
                params: { roundId: round.id, hole: String(resumeHoleNumber) },
              })
            }
          >
            <View style={styles.resumePlayCircle}>
              <Feather name="play" size={20} color="#ffffff" style={styles.resumePlayIcon} />
            </View>
            <View style={styles.resumeTextCol}>
              <Text style={styles.resumeTitle}>Resume round</Text>
              <Text style={styles.resumeDetail} numberOfLines={2}>
                {subtitle}
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default function HomeScreen() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['36%'], []);
  const rounds = useRoundsStore((state) => state.rounds);
  const activeRoundId = useRoundsStore((state) => state.activeRoundId);
  const deleteRound = useRoundsStore((state) => state.deleteRound);
  const userId = useSessionStore((state) => state.userId);
  const userName = useSessionStore((state) => state.userName);
  const userEmail = useSessionStore((state) => state.userEmail);
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
  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.35} />,
    [],
  );

  const avatarLetter = firstName.charAt(0).toUpperCase();
  const activeRound = useMemo(() => {
    if (!activeRoundId) return null;
    const match = rounds.find((round) => round.id === activeRoundId);
    if (!match || match.completedAt) return null;
    return match;
  }, [activeRoundId, rounds]);
  const activeCourse = useMemo(
    () => (activeRound ? getCourseById(activeRound.courseId) : undefined),
    [activeRound],
  );
  const resumeHoleNumber = useMemo(() => {
    if (!activeRound) return null;
    const course = getCourseById(activeRound.courseId);
    if (!course) return 1;
    const enteredHoles = Object.entries(activeRound.holeScores)
      .filter(([, byPlayer]) => Object.values(byPlayer).some((score) => typeof score === 'number'))
      .map(([holeNum]) => Number(holeNum))
      .filter((holeNum) => Number.isFinite(holeNum));
    if (enteredHoles.length === 0) return 1;
    return Math.min(course.holes.length, Math.max(...enteredHoles) + 1);
  }, [activeRound]);
  const resumeRoundSubtitle = useMemo(() => {
    if (!activeRound || resumeHoleNumber == null) return '';
    const courseName = activeCourse?.name.replace(' Pitch & Putt', '') ?? 'Your round';
    const n = activeRound.players.length;
    const players = `${n} ${n === 1 ? 'player' : 'players'}`;
    const totalHoles = activeCourse?.holes.length ?? 18;
    return `${courseName} · ${players} · Hole ${resumeHoleNumber} of ${totalHoles}`;
  }, [activeRound, activeCourse, resumeHoleNumber]);
  const navigateFromMenu = (path: '/(tabs)' | '/logout' | '/(tabs)/stats' | '/membership-card') => {
    bottomSheetRef.current?.close();
    router.push(path);
  };

  const confirmDiscardActiveRound = useCallback(() => {
    if (!activeRound) return;
    Alert.alert(
      'Discard this round?',
      'This removes the in-progress round and all scores entered so far. If you are signed in, it is removed from your account too. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteRound(activeRound.id);
            if (!result.ok) {
              Alert.alert(
                'Could not discard round',
                result.message ?? 'Check your connection and try again.',
              );
            }
          },
        },
      ],
    );
  }, [activeRound, deleteRound]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.homeHeader}>
            <Text style={styles.greeting}>Hey, {firstName}</Text>
            <Pressable style={styles.avatarBtn} onPress={() => bottomSheetRef.current?.snapToIndex(0)}>
              <Text style={styles.avatarText}>{avatarLetter}</Text>
            </Pressable>
          </View>
          <Text style={styles.greetingSub}>Pick your course</Text>

          {activeRound && resumeHoleNumber != null ? (
            <ResumeRoundRow
              round={activeRound}
              resumeHoleNumber={resumeHoleNumber}
              subtitle={resumeRoundSubtitle}
              onConfirmDelete={confirmDiscardActiveRound}
            />
          ) : null}

          {COURSES.map((course, index) => (
            <Pressable
              key={course.id}
              onPress={() => router.push({ pathname: '/player-setup', params: { courseId: course.id } })}
              style={styles.courseCard}
            >
              <View style={[styles.courseImage, { backgroundColor: COURSE_BG_STYLES[index % COURSE_BG_STYLES.length] }]}>
                <View style={styles.courseBadge}>
                  <Text style={styles.courseBadgeText}>{course.holes.length} holes</Text>
                </View>
              </View>
              <View style={styles.courseBody}>
                <View>
                  <Text style={styles.courseName}>{course.name.replace(' Pitch & Putt', '')}</Text>
                  <Text style={styles.courseMeta}>{COURSE_NEIGHBORHOODS[course.id] ?? `${course.city}, ${course.province}`}</Text>
                </View>
                <Feather name="arrow-right" size={20} color="#6b6b6b" />
              </View>
            </Pressable>
          ))}

          <Pressable style={styles.historyRow} onPress={() => router.push('/(tabs)/history')}>
            <View style={styles.historyIconCircle}>
              <Feather name="clock" size={11} color="#6b6b6b" />
            </View>
            <Text style={styles.historyText}>Round history</Text>
          </Pressable>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f6f2' },
  screen: { flex: 1 },
  container: { paddingHorizontal: 15, paddingTop: 14, paddingBottom: 20, gap: 12 },
  homeHeader: {
    flexDirection: 'row',
    alignContent: 'flex-start',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
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
  greeting: { color: '#1a1a1a', fontSize: 28, fontWeight: '700' },
  greetingSub: { color: '#6b6b6b', marginTop: 0, fontSize: 14 },
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
  courseCard: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  courseImage: {
    height: 110,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 10,
  },
  courseBadge: {
    backgroundColor: 'rgba(26,26,26,0.75)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  courseBadgeText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  courseBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  courseName: { color: '#1a1a1a', fontSize: 18, fontWeight: '700' },
  courseMeta: { color: '#6b6b6b', marginTop: 3, fontSize: 13 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#ffffff',
    gap: 8,
    marginTop: 4,
  },
  historyIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#6b6b6b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyText: { color: '#1a1a1a', fontSize: 14, fontWeight: '600' },
  resumeSwipeShell: {
    position: 'relative',
    alignSelf: 'stretch',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#f7f6f2',
    marginTop: 6,
  },
  resumeSwipeUnderlay: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 0,
    width: RESUME_DELETE_WIDTH,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resumeSwipeDeleteBtn: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 72,
  },
  resumeTrashCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#B85C38',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  resumeSwipeForeground: {
    zIndex: 1,
    width: '100%',
    backgroundColor: 'transparent',
  },
  resumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2D6A4F',
    backgroundColor: '#e8f4ee',
    gap: 14,
  },
  resumePlayCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2D6A4F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumePlayIcon: { marginLeft: 2 },
  resumeTextCol: { flex: 1, gap: 4, minWidth: 0 },
  resumeTitle: { color: '#1a1a1a', fontSize: 16, fontWeight: '800' },
  resumeDetail: { color: '#4a5c52', fontSize: 13, fontWeight: '600', lineHeight: 18 },
});
