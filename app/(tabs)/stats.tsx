import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { COURSES, getCourseById } from '@/src/pitchputt/data';
import { isRoundFullyScored } from '@/src/pitchputt/roundCompleteness';
import { useRoundsStore, useSessionStore } from '@/src/pitchputt/store';

type RangeKey = 'year' | '90d' | '30d' | 'all';
type StatsMetrics = {
  bestRound: string;
  avgScore: string;
  hioCount: number;
  roundsPlayed: number;
  bestHole: { label: string; avg: string } | null;
  dist: { label: string; count: number; color: string }[];
};

function StatsSkeleton({ showHoleAverages }: { showHoleAverages: boolean }) {
  return (
    <>
      <View style={styles.statGrid}>
        <View style={styles.skeletonStatCard} />
        <View style={styles.skeletonStatCard} />
        <View style={styles.skeletonStatCard} />
        <View style={styles.skeletonStatCard} />
      </View>
      <View style={styles.bestHoleCard}>
        <View style={styles.skeletonCircle} />
        <View style={styles.skeletonBestHoleTextWrap}>
          <View style={styles.skeletonLineShort} />
          <View style={styles.skeletonLineWide} />
        </View>
      </View>
      {showHoleAverages ? (
        <View style={styles.holeAvgCard}>
          <View style={[styles.skeletonLineShort, styles.skeletonSectionTitle]} />
          <View style={styles.holeAvgGrid}>
            {Array.from({ length: 12 }).map((_, index) => (
              <View key={index} style={[styles.holeCell, styles.skeletonBlock]} />
            ))}
          </View>
        </View>
      ) : null}
      <View style={styles.barSection}>
        {Array.from({ length: 5 }).map((_, index) => (
          <View key={index} style={styles.barRow}>
            <View style={[styles.skeletonLineShort, styles.skeletonBarLabel]} />
            <View style={[styles.barTrack, styles.skeletonBlock]} />
            <View style={[styles.skeletonLineShort, styles.skeletonBarCount]} />
          </View>
        ))}
      </View>
    </>
  );
}

export default function StatsScreen() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['36%'], []);
  const rounds = useRoundsStore((state) => state.rounds);
  const userId = useSessionStore((state) => state.userId);
  const userName = useSessionStore((state) => state.userName);
  const userEmail = useSessionStore((state) => state.userEmail);
  const [range, setRange] = useState<RangeKey>('year');
  const [courseId, setCourseId] = useState<'all' | string>('all');
  const [selectedHole, setSelectedHole] = useState<number | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
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

  const rangeLabel = useMemo(() => {
    if (range === 'year') return '2026';
    if (range === '90d') return 'Last 90 days';
    if (range === '30d') return 'Last 30 days';
    return 'All time';
  }, [range]);

  const rangeStart = useMemo(() => {
    const now = new Date();
    if (range === 'year') return new Date('2026-01-01T00:00:00.000Z');
    if (range === '90d') return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    if (range === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return null;
  }, [range]);

  const filteredRounds = useMemo(
    () =>
      rounds.filter((round) => {
        if (!round.completedAt) return false;
        if (courseId !== 'all' && round.courseId !== courseId) return false;
        if (!rangeStart) return true;
        return new Date(round.completedAt) >= rangeStart;
      }),
    [rounds, courseId, rangeStart],
  );

  const metrics = useMemo<StatsMetrics>(() => {
    let bestRound = Number.POSITIVE_INFINITY;
    let totalScore = 0;
    let totalEntries = 0;
    let hioCount = 0;
    const roundsPlayed = filteredRounds.length;

    let underCount = 0;
    let parCount = 0;
    let bogeyCount = 0;
    let doubleCount = 0;

    const holeAverages = new Map<string, { sum: number; count: number; courseName: string; holeNumber: number }>();

    filteredRounds.forEach((round) => {
      const course = getCourseById(round.courseId);
      if (!course) return;
      const isFullyScored = isRoundFullyScored(round, course);

      round.players.forEach((player) => {
        let strokeSum = 0;
        let parSum = 0;

        course.holes.forEach((hole) => {
          const strokes = round.holeScores[hole.number]?.[player.id];
          if (typeof strokes !== 'number') return;

          const delta = strokes - hole.par;

          if (strokes === 1) hioCount += 1;
          if (delta < 0) underCount += 1;
          else if (delta === 0) parCount += 1;
          else if (delta === 1) bogeyCount += 1;
          else doubleCount += 1;

          const holeKey = `${course.id}-${hole.number}`;
          const current = holeAverages.get(holeKey) ?? {
            sum: 0,
            count: 0,
            courseName: course.name.replace(' Pitch & Putt', ''),
            holeNumber: hole.number,
          };
          current.sum += strokes;
          current.count += 1;
          holeAverages.set(holeKey, current);

          strokeSum += strokes;
          parSum += hole.par;
        });

        if (parSum === 0) return;

        const vsPar = strokeSum - parSum;
        if (vsPar < bestRound) bestRound = vsPar;
        if (isFullyScored) {
          totalScore += strokeSum;
          totalEntries += 1;
        }
      });
    });

    let bestHole: { label: string; avg: string } | null = null;
    holeAverages.forEach((value) => {
      const avg = value.sum / value.count;
      if (!bestHole || avg < Number(bestHole.avg)) {
        bestHole = {
          label: `Hole ${value.holeNumber}, ${value.courseName}`,
          avg: avg.toFixed(1),
        };
      }
    });

    return {
      bestRound: Number.isFinite(bestRound) ? `${bestRound > 0 ? '+' : ''}${bestRound}` : '--',
      avgScore: totalEntries > 0 ? (totalScore / totalEntries).toFixed(1) : '--',
      hioCount,
      roundsPlayed,
      bestHole,
      dist: [
        { label: 'HIO', count: hioCount, color: '#2D6A4F' },
        { label: 'Birdie', count: underCount - hioCount, color: '#4a9e6a' },
        { label: 'Par', count: parCount, color: '#c8c6be' },
        { label: 'Bogey', count: bogeyCount, color: '#e8a87c' },
        { label: 'Double+', count: doubleCount, color: '#d4755a' },
      ],
    };
  }, [filteredRounds]);

  const selectedCourse = courseId === 'all' ? null : getCourseById(courseId);
  const courseLabel = selectedCourse?.name.replace(' Pitch & Putt', '') ?? 'All courses';
  const holeAveragesForCourse = useMemo(() => {
    if (!selectedCourse) return [];
    return selectedCourse.holes.map((hole) => {
      let sum = 0;
      let count = 0;
      filteredRounds.forEach((round) => {
        if (round.courseId !== selectedCourse.id) return;
        round.players.forEach((player) => {
          const strokes = round.holeScores[hole.number]?.[player.id];
          if (typeof strokes === 'number') {
            sum += strokes;
            count += 1;
          }
        });
      });
      const avg = count > 0 ? Number((sum / count).toFixed(1)) : null;
      return { holeNumber: hole.number, par: hole.par, avg };
    });
  }, [selectedCourse, filteredRounds]);
  const selectedHoleDist = useMemo(() => {
    if (!selectedCourse || selectedHole === null) return null;

    let hioCount = 0;
    let birdieCount = 0;
    let parCount = 0;
    let bogeyCount = 0;
    let doubleCount = 0;
    const holePar = selectedCourse.holes.find((hole) => hole.number === selectedHole)?.par ?? 3;

    filteredRounds.forEach((round) => {
      if (round.courseId !== selectedCourse.id) return;
      round.players.forEach((player) => {
        const strokes = round.holeScores[selectedHole]?.[player.id];
        if (typeof strokes !== 'number') return;
        const delta = strokes - holePar;
        if (strokes === 1) hioCount += 1;
        if (delta < 0) birdieCount += 1;
        else if (delta === 0) parCount += 1;
        else if (delta === 1) bogeyCount += 1;
        else doubleCount += 1;
      });
    });

    return [
      { label: 'HIO', count: hioCount, color: '#2D6A4F' },
      { label: 'Birdie', count: Math.max(0, birdieCount - hioCount), color: '#4a9e6a' },
      { label: 'Par', count: parCount, color: '#c8c6be' },
      { label: 'Bogey', count: bogeyCount, color: '#e8a87c' },
      { label: 'Double+', count: doubleCount, color: '#d4755a' },
    ];
  }, [filteredRounds, selectedCourse, selectedHole]);
  const displayedDist = selectedHoleDist ?? metrics.dist;
  const maxDist = Math.max(...displayedDist.map((item) => item.count), 1);
  const distTitle = selectedHole ? `Hole ${selectedHole} breakdown` : 'Scoring breakdown';

  useEffect(() => {
    // Keep skeleton rendering while expensive stats payload is loading.
    setIsLoadingStats(true);
    const timeout = setTimeout(() => {
      setIsLoadingStats(false);
    }, 550);
    return () => clearTimeout(timeout);
  }, [range, courseId]);
  useEffect(() => {
    setSelectedHole(null);
  }, [courseId, range]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topbar}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={18} color="#1a1a1a" />
          </Pressable>
          <View style={styles.topbarTitleWrap}>
            <Text style={styles.heading}>Your stats</Text>
          </View>
          <Pressable style={styles.avatarBtn} onPress={() => bottomSheetRef.current?.snapToIndex(0)}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </Pressable>
        </View>
        <Text style={styles.subheading}>{courseLabel} · {rangeLabel}</Text>

        <View style={styles.filterRow}>
          {(['year', '90d', '30d', 'all'] as RangeKey[]).map((key) => (
            <Pressable key={key} style={[styles.filterChip, range === key && styles.filterChipActive]} onPress={() => setRange(key)}>
              <Text style={[styles.filterChipText, range === key && styles.filterChipTextActive]}>
                {key === 'year' ? '2026' : key === '90d' ? '90d' : key === '30d' ? '30d' : 'All'}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.courseFilterRow}>
          <Pressable style={[styles.filterChip, courseId === 'all' && styles.filterChipActive]} onPress={() => setCourseId('all')}>
            <Text style={[styles.filterChipText, courseId === 'all' && styles.filterChipTextActive]}>All courses</Text>
          </Pressable>
          {COURSES.map((course) => (
            <Pressable
              key={course.id}
              style={[styles.filterChip, courseId === course.id && styles.filterChipActive]}
              onPress={() => setCourseId(course.id)}
            >
              <Text style={[styles.filterChipText, courseId === course.id && styles.filterChipTextActive]}>
                {course.name.replace(' Pitch & Putt', '')}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {isLoadingStats ? (
          <StatsSkeleton showHoleAverages={Boolean(selectedCourse)} />
        ) : (
          <>
            <View style={styles.statGrid}>
              <View style={[styles.statCard, styles.featuredCard]}>
                <Text style={styles.statVal}>{metrics.bestRound}</Text>
                <Text style={styles.statLbl}>Best round</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statVal}>{metrics.avgScore}</Text>
                <Text style={styles.statLbl}>Avg score</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statVal}>{metrics.hioCount}</Text>
                <Text style={styles.statLbl}>Hole in ones</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statVal}>{metrics.roundsPlayed}</Text>
                <Text style={styles.statLbl}>Rounds played</Text>
              </View>
            </View>

            <View style={styles.bestHoleCard}>
              <View style={styles.bestHoleIcon}>
                <Text style={styles.bestHoleIconText}>★</Text>
              </View>
              <View>
                <Text style={styles.bestHoleLabel}>Best hole</Text>
                <Text style={styles.bestHoleValue}>
                  {metrics.bestHole ? `${metrics.bestHole.label} · avg ${metrics.bestHole.avg}` : 'No rounds yet'}
                </Text>
              </View>
            </View>

            {selectedCourse ? (
              <View style={styles.holeAvgCard}>
                <Text style={styles.holeAvgTitle}>Hole averages</Text>
                <View style={styles.holeAvgGrid}>
                  {holeAveragesForCourse.map((item) => {
                    const delta = item.avg === null ? null : item.avg - item.par;
                    return (
                      <Pressable
                        key={item.holeNumber}
                        onPress={() => setSelectedHole((prev) => (prev === item.holeNumber ? null : item.holeNumber))}
                        style={[
                          styles.holeCell,
                          delta !== null && delta < 0 && styles.holeCellUnder,
                          delta !== null && delta === 0 && styles.holeCellPar,
                          delta !== null && delta > 0 && styles.holeCellOver,
                          selectedHole === item.holeNumber && styles.holeCellSelected,
                        ]}
                      >
                        <Text style={styles.holeCellNum}>{item.holeNumber}</Text>
                        <Text style={styles.holeCellAvg}>{item.avg === null ? '·' : item.avg.toFixed(1)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View style={styles.barSection}>
              <Text style={styles.barSectionTitle}>{distTitle}</Text>
              {displayedDist.map((item) => (
                <View key={item.label} style={styles.barRow}>
                  <Text style={[styles.barLabel, { color: item.label === 'Par' ? '#6b6b6b' : item.color }]}>{item.label}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${(item.count / maxDist) * 100}%`, backgroundColor: item.color }]} />
                  </View>
                  <Text style={styles.barCount}>{item.count}</Text>
                </View>
              ))}
            </View>
          </>
        )}
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
  subheading: { color: '#6b6b6b', fontSize: 14 },
  skeletonBlock: { backgroundColor: '#e8e7e2' },
  skeletonLineShort: { height: 12, width: 90, borderRadius: 999, backgroundColor: '#e8e7e2' },
  skeletonLineWide: { height: 12, width: '80%', borderRadius: 999, backgroundColor: '#e8e7e2' },
  skeletonStatCard: { width: '48%', height: 98, borderRadius: 12, backgroundColor: '#e8e7e2' },
  skeletonCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#e8e7e2' },
  skeletonBestHoleTextWrap: { flex: 1, gap: 8 },
  skeletonSectionTitle: { width: 110 },
  skeletonBarLabel: { width: 62 },
  skeletonBarCount: { width: 24 },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  courseFilterRow: { gap: 8, paddingRight: 10 },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: { backgroundColor: '#e8f4ee', borderColor: '#2D6A4F' },
  filterChipText: { color: '#6b6b6b', fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: '#2D6A4F', fontWeight: '700' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '48%',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  featuredCard: { backgroundColor: '#e8f4ee', borderColor: '#2D6A4F' },
  statVal: { color: '#1a1a1a', fontSize: 30, fontWeight: '800', lineHeight: 34 },
  statLbl: { color: '#6b6b6b', fontSize: 13, fontWeight: '600', marginTop: 2 },
  bestHoleCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bestHoleIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2D6A4F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bestHoleIconText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  bestHoleLabel: { color: '#6b6b6b', fontSize: 12, fontWeight: '600' },
  bestHoleValue: { color: '#1a1a1a', fontSize: 14, fontWeight: '600' },
  holeAvgCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
  },
  holeAvgTitle: { color: '#1a1a1a', fontSize: 15, fontWeight: '700' },
  holeAvgGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  holeCell: {
    width: '15.5%',
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  holeCellUnder: { backgroundColor: '#e8f4ee', borderColor: '#2D6A4F' },
  holeCellPar: { backgroundColor: '#f2f2f2', borderColor: '#cfcfcf' },
  holeCellOver: { backgroundColor: '#faeae3', borderColor: '#B85C38' },
  holeCellSelected: { borderWidth: 2, borderColor: '#2D5A8E' },
  holeCellNum: { color: '#1a1a1a', fontSize: 12, fontWeight: '700' },
  holeCellAvg: { color: '#6b6b6b', fontSize: 11, fontWeight: '600' },
  barSection: { gap: 8, marginTop: 2 },
  barSectionTitle: { color: '#1a1a1a', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 62, fontSize: 13, fontWeight: '700' },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#ecebe6',
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 999 },
  barCount: { width: 24, textAlign: 'right', color: '#6b6b6b', fontSize: 13, fontWeight: '700' },
});
