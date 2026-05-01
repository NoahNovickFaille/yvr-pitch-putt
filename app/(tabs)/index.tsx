import { useCallback, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';

import { COURSES } from '@/src/pitchputt/data';
import { useSessionStore } from '@/src/pitchputt/store';

const COURSE_NEIGHBORHOODS: Record<string, string> = {
  'course-stanley': 'Coal Harbour',
  'course-qe': 'Cambie Village',
  'course-rupert': 'East Vancouver',
};

const COURSE_BG_STYLES = ['#d6eadf', '#e8f0f9', '#f3eefa'];

export default function HomeScreen() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['36%'], []);
  const userName = useSessionStore((state) => state.userName);
  const userEmail = useSessionStore((state) => state.userEmail);
  const firstName = useMemo(() => {
    if (userName?.trim()) {
      return userName.trim();
    }
    const localPart = userEmail?.split('@')[0]?.trim();
    if (!localPart) return 'Marcus';
    return localPart.charAt(0).toUpperCase() + localPart.slice(1);
  }, [userEmail, userName]);
  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.35} />,
    [],
  );

  const avatarLetter = firstName.charAt(0).toUpperCase();
  const navigateFromMenu = (path: '/(tabs)' | '/logout' | '/(tabs)/stats' | '/membership-card') => {
    bottomSheetRef.current?.close();
    router.push(path);
  };

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
});
