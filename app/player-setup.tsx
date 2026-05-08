import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { randomUUID } from 'expo-crypto';

import { getCourseById } from '@/src/pitchputt/data';
import { insertRoundRemote } from '@/src/pitchputt/roundsRemote';
import type { Round } from '@/src/pitchputt/types';
import { useRoundsStore, useSessionStore } from '@/src/pitchputt/store';

const PLAYER_COLORS = ['#2D6A4F', '#2D5A8E', '#B85C38', '#6B3FA0'];

export default function PlayerSetupScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const course = useMemo(() => getCourseById(courseId), [courseId]);
  const userId = useSessionStore((state) => state.userId);
  const userName = useSessionStore((state) => state.userName);
  const userEmail = useSessionStore((state) => state.userEmail);
  const createRound = useRoundsStore((state) => state.createRound);
  const [playerCount, setPlayerCount] = useState(3);
  const userFirstName = useMemo(() => {
    const isGuestUser = !userId || userId.startsWith('guest-');
    if (isGuestUser) return 'Guest';
    if (userName?.trim()) return userName.trim();
    const localPart = userEmail?.split('@')[0]?.trim();
    if (!localPart) return 'Guest';
    return localPart.charAt(0).toUpperCase() + localPart.slice(1);
  }, [userEmail, userId, userName]);
  const [players, setPlayers] = useState([userFirstName, '', '', '']);
  const allPlayerNamesFilled = useMemo(
    () => players.slice(0, playerCount).every((name) => name.trim().length > 0),
    [players, playerCount],
  );

  if (!course) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.errorText}>Missing course. Return to Home.</Text>
      </SafeAreaView>
    );
  }

  const startRound = () => {
    const roundId = randomUUID();
    const ownerId = userId ?? 'local-user';
    const activePlayers = players.slice(0, playerCount).map((name) => name.trim()).filter(Boolean);
    const round: Round = {
      id: roundId,
      ownerId,
      courseId: course.id,
      createdAt: new Date().toISOString(),
      players: activePlayers.map((name) => ({ id: randomUUID(), name })),
      holeScores: {},
    };
    createRound(round);
    void insertRoundRemote(round).then((remote) => {
      if (!remote.ok) {
        console.warn('[player-setup] Supabase round insert:', remote.message);
      }
    });

    router.replace({ pathname: '/hole', params: { roundId, hole: '1' } });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#1a1a1a" />
        </Pressable>
        <View style={styles.topbar}>
          <Text style={styles.title}>Who&apos;s playing?</Text>
          <Text style={styles.subtitle}>{course.name.replace(' Pitch & Putt', '')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.inputLabel}>Number of players</Text>
          <View style={styles.playerCountRow}>
            {[1, 2, 3, 4].map((count) => (
              <Pressable
                key={count}
                onPress={() => setPlayerCount(count)}
                style={[styles.countBtn, playerCount === count && styles.countBtnActive]}
              >
                <Text style={[styles.countBtnText, playerCount === count && styles.countBtnTextActive]}>{count}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.playerInputsWrap}>
          <Text style={styles.inputLabel}>Player names</Text>
          {Array.from({ length: playerCount }).map((_, index) => (
            <View key={index} style={styles.playerInputRow}>
              <View style={[styles.playerDot, { backgroundColor: PLAYER_COLORS[index] }]} />
              <TextInput
                style={styles.nameInput}
                value={players[index]}
                onChangeText={(value) =>
                  setPlayers((prev) => {
                    const next = [...prev];
                    next[index] = value;
                    return next;
                  })
                }
                placeholder={`Player ${index + 1}`}
                placeholderTextColor="#aaaaaa"
              />
            </View>
          ))}
        </View>

        <Pressable
          style={[styles.primaryBtn, !allPlayerNamesFilled && styles.primaryBtnDisabled]}
          onPress={startRound}
          disabled={!allPlayerNamesFilled}
        >
          <Text style={styles.primaryBtnText}>Start round →</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f6f2' },
  container: { flex: 1, paddingTop: 14, paddingHorizontal: 15, paddingBottom: 20, gap: 12 },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topbar: { paddingTop: 4 },
  title: { color: '#1a1a1a', fontSize: 29, fontWeight: '700' },
  subtitle: { color: '#6b6b6b', marginTop: 2, fontSize: 14 },
  section: { marginTop: 14, marginBottom: 6, gap: 10 },
  inputLabel: { color: '#6b6b6b', fontSize: 13, fontWeight: '600' },
  playerCountRow: { flexDirection: 'row', gap: 8 },
  countBtn: {
    minWidth: 44,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  countBtnActive: {
    backgroundColor: '#e8f4ee',
    borderColor: '#2D6A4F',
  },
  countBtnText: { color: '#6b6b6b', fontSize: 15, fontWeight: '600' },
  countBtnTextActive: { color: '#2D6A4F', fontWeight: '700' },
  playerInputsWrap: { gap: 10 },
  playerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playerDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  nameInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#1a1a1a',
    fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: '#2D6A4F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  errorText: { color: '#B85C38', padding: 20 },
});
