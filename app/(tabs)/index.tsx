import { useMemo } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { COURSES } from '@/src/pitchputt/data';
import { useSessionStore } from '@/src/pitchputt/store';

const COURSE_NEIGHBORHOODS: Record<string, string> = {
  'course-stanley': 'Coal Harbour',
  'course-qe': 'Cambie Village',
  'course-rupert': 'East Vancouver',
};

const COURSE_BG_STYLES = ['#d6eadf', '#e8f0f9', '#f3eefa'];

export default function HomeScreen() {
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
  const avatarLetter = firstName.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.homeHeader}>
          <View>
            <Text style={styles.greeting}>Hey, {firstName}</Text>
            <Text style={styles.greetingSub}>Pick your course</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>
        </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f6f2' },
  container: { paddingHorizontal: 15, paddingTop: 14, paddingBottom: 20, gap: 12 },
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  greeting: { color: '#1a1a1a', fontSize: 28, fontWeight: '700' },
  greetingSub: { color: '#6b6b6b', marginTop: 2, fontSize: 14 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2D6A4F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
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
