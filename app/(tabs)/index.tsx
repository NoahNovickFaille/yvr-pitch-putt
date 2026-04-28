import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { COURSES } from '@/src/pitchputt/data';
import { useSessionStore } from '@/src/pitchputt/store';

export default function HomeScreen() {
  const userId = useSessionStore((state) => state.userId);
  const [selectedCourseId, setSelectedCourseId] = useState(COURSES[0]?.id);
  const selectedCourse = useMemo(
    () => COURSES.find((course) => course.id === selectedCourseId) ?? COURSES[0],
    [selectedCourseId],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Select a Course</Text>
        {COURSES.map((course) => (
          <Pressable
            key={course.id}
            onPress={() => setSelectedCourseId(course.id)}
            style={[styles.courseCard, selectedCourseId === course.id && styles.courseCardSelected]}
          >
            <Text style={styles.courseName}>{course.name}</Text>
            <Text style={styles.courseMeta}>{course.city}, {course.province} - {course.holes.length} holes</Text>
          </Pressable>
        ))}

        <View style={styles.ctaWrap}>
          <Pressable
            style={[styles.startButton, !userId && styles.startButtonDisabled]}
            disabled={!userId}
            onPress={() =>
              router.push({ pathname: '/player-setup', params: { courseId: selectedCourse.id } })
            }
          >
            <Text style={styles.startButtonText}>Start Round</Text>
          </Pressable>
          {!userId ? <Text style={styles.hint}>Sign in first from the auth screen.</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#030712' },
  container: { padding: 16, gap: 12 },
  heading: { color: 'white', fontSize: 28, fontWeight: '700' },
  courseCard: { borderWidth: 1, borderColor: '#1f2937', backgroundColor: '#0f172a', borderRadius: 14, padding: 14 },
  courseCardSelected: { borderColor: '#10b981' },
  courseName: { color: 'white', fontSize: 17, fontWeight: '600' },
  courseMeta: { color: '#9ca3af', marginTop: 4 },
  ctaWrap: { marginTop: 8, gap: 6 },
  startButton: { backgroundColor: '#10b981', padding: 14, borderRadius: 12, alignItems: 'center' },
  startButtonDisabled: { opacity: 0.5 },
  startButtonText: { color: '#022c22', fontWeight: '700' },
  hint: { color: '#9ca3af', textAlign: 'center' },
});
