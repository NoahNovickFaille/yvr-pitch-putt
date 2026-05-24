import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { getCourseById } from "@/src/pitchputt/data";
import {
  claimRoundShareToken,
  peekRoundShareToken,
  type ShareRoundPreview,
} from "@/src/pitchputt/roundShareRemote";
import { isSupabaseAuthUserId } from "@/src/pitchputt/sessionUtils";
import { useRoundsStore, useSessionStore } from "@/src/pitchputt/store";

function formatVsPar(value: number) {
  if (value === 0) return "E";
  return value > 0 ? `+${value}` : `${value}`;
}

export default function ClaimScorecardScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const shareToken = typeof token === "string" ? token : "";
  const userId = useSessionStore((state) => state.userId);
  const hydrateRoundsFromDatabase = useRoundsStore(
    (state) => state.hydrateRoundsFromDatabase,
  );

  const [preview, setPreview] = useState<ShareRoundPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const loadPreview = useCallback(async () => {
    if (!shareToken) {
      setPreview({ status: "invalid", token: "" });
      setLoading(false);
      return;
    }
    setLoading(true);
    const next = await peekRoundShareToken(shareToken);
    setPreview(next);
    setLoading(false);
  }, [shareToken]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const round = preview?.round;
  const course = useMemo(
    () => (round ? getCourseById(round.courseId) : undefined),
    [round],
  );

  const targetSummary = useMemo(() => {
    if (!round || !course || !preview?.targetPlayerId) return null;
    const player = round.players.find((p) => p.id === preview.targetPlayerId);
    if (!player) return null;

    let total = 0;
    let parForScoredHoles = 0;
    for (const hole of course.holes) {
      const strokes = round.holeScores[hole.number]?.[player.id];
      if (typeof strokes === "number") {
        total += strokes;
        parForScoredHoles += hole.par;
      }
    }
    return { player, total, vsPar: total - parForScoredHoles };
  }, [course, preview?.targetPlayerId, round]);

  const handleClaim = async () => {
    if (!shareToken || claiming) return;

    if (!isSupabaseAuthUserId(userId)) {
      router.replace("/auth");
      return;
    }

    setClaiming(true);
    const result = await claimRoundShareToken(shareToken);
    if (!result.ok) {
      setClaiming(false);
      Alert.alert("Could not claim scorecard", result.message);
      return;
    }

    await hydrateRoundsFromDatabase();
    setClaiming(false);
    router.replace({ pathname: "/history/[id]", params: { id: result.roundId } });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color="#2D6A4F" size="large" />
          <Text style={styles.loadingText}>Loading scorecard…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!preview || preview.status === "invalid" || !round || !course) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.title}>Link not found</Text>
          <Text style={styles.body}>This share link is invalid or has been removed.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.replace("/(tabs)")}>
            <Text style={styles.primaryBtnText}>Go home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (preview.status === "expired") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.title}>Link expired</Text>
          <Text style={styles.body}>Ask the round owner to send a new share link.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.replace("/(tabs)")}>
            <Text style={styles.primaryBtnText}>Go home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const alreadyClaimed = preview.status === "claimed";
  const signedIn = isSupabaseAuthUserId(userId);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>Shared scorecard</Text>
        <Text style={styles.title}>{course.name.replace(" Pitch & Putt", "")}</Text>
        <Text style={styles.body}>
          {preview.targetPlayerName
            ? `${preview.targetPlayerName}, claim this round to keep it in your history.`
            : "Claim this round to keep it in your history."}
        </Text>

        {targetSummary ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryName}>{targetSummary.player.name}</Text>
            <Text style={styles.summaryScore}>
              {targetSummary.total} ({formatVsPar(targetSummary.vsPar)})
            </Text>
          </View>
        ) : null}

        {alreadyClaimed ? (
          <Text style={styles.notice}>
            This link has already been claimed. Each link works once.
          </Text>
        ) : null}

        {!alreadyClaimed ? (
          <Pressable
            style={[styles.primaryBtn, claiming && styles.primaryBtnDisabled]}
            onPress={() => void handleClaim()}
            disabled={claiming}
          >
            {claiming ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {signedIn ? "Claim scorecard" : "Sign in to claim"}
              </Text>
            )}
          </Pressable>
        ) : null}

        <Pressable style={styles.secondaryBtn} onPress={() => router.replace("/(tabs)")}>
          <Text style={styles.secondaryBtnText}>Go home</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f7f6f2" },
  container: { padding: 20, gap: 14 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  loadingText: { color: "#6b6b6b", fontSize: 14 },
  eyebrow: { color: "#6b6b6b", fontSize: 13, fontWeight: "600" },
  title: { color: "#1a1a1a", fontSize: 28, fontWeight: "800" },
  body: { color: "#6b6b6b", fontSize: 15, lineHeight: 22 },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    padding: 14,
    gap: 4,
  },
  summaryName: { color: "#1a1a1a", fontSize: 16, fontWeight: "700" },
  summaryScore: { color: "#2D6A4F", fontSize: 22, fontWeight: "800" },
  notice: { color: "#B85C38", fontSize: 14, lineHeight: 20 },
  primaryBtn: {
    backgroundColor: "#2D6A4F",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    minHeight: 48,
  },
  primaryBtnDisabled: { backgroundColor: "#6b9e88" },
  primaryBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  secondaryBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#ffffff",
  },
  secondaryBtnText: { color: "#1a1a1a", fontWeight: "600", fontSize: 15 },
});
