import { supabase } from "@/src/lib/supabase";

import { COURSES, getCourseById } from "./data";
import type { Round } from "./types";
import { isSupabaseAuthUserId, isUuid } from "./sessionUtils";

function clampStrokes(strokes: number): number {
  return Math.min(15, Math.max(1, Math.round(strokes)));
}

export async function getAuthedUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user?.id) return null;
  return data.session.user.id;
}

function shouldSyncRound(ownerId: string | null, roundId: string): boolean {
  return isSupabaseAuthUserId(ownerId) && isUuid(roundId);
}

async function resolveCourseUuidByClientCourseId(
  clientCourseId: string,
): Promise<{ courseUuid: string; slug: string } | null> {
  const course = getCourseById(clientCourseId);
  if (!course) return null;
  const { data, error } = await supabase
    .from("courses")
    .select("id")
    .eq("slug", course.slug)
    .maybeSingle();
  if (error || !data?.id) {
    console.warn("[roundsRemote] resolve course failed", error?.message);
    return null;
  }
  return { courseUuid: data.id, slug: course.slug };
}

async function resolveHoleUuid(
  courseUuid: string,
  holeNumber: number,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("holes")
    .select("id")
    .eq("course_id", courseUuid)
    .eq("hole_number", holeNumber)
    .maybeSingle();
  if (error || !data?.id) {
    console.warn("[roundsRemote] resolve hole failed", error?.message);
    return null;
  }
  return data.id;
}

export type RemoteRoundResult = { ok: true } | { ok: false; message: string };

/**
 * Inserts `rounds` + `round_players` for an authenticated user.
 * Round and player ids must already be UUIDs (aligned with local store).
 */
export async function insertRoundRemote(round: Round): Promise<RemoteRoundResult> {
  if (!shouldSyncRound(round.ownerId, round.id)) {
    return { ok: true };
  }

  const authId = await getAuthedUserId();
  if (!authId || authId !== round.ownerId) {
    return { ok: false, message: "Not signed in or owner mismatch." };
  }

  const resolved = await resolveCourseUuidByClientCourseId(round.courseId);
  if (!resolved) {
    return { ok: false, message: "Course not found in Supabase." };
  }

  const { courseUuid } = resolved;

  const { error: roundError } = await supabase.from("rounds").insert({
    id: round.id,
    owner_id: authId,
    course_id: courseUuid,
    status: "active",
    started_at: round.createdAt,
  });

  if (roundError) {
    console.warn("[roundsRemote] insert round", roundError.message);
    return { ok: false, message: roundError.message };
  }

  const playerRows = round.players.map((player, index) => ({
    id: player.id,
    round_id: round.id,
    display_name: player.name,
    sort_order: index,
    is_owner: index === 0,
  }));

  const { error: playersError } = await supabase
    .from("round_players")
    .insert(playerRows);

  if (playersError) {
    console.warn("[roundsRemote] insert players", playersError.message);
    return { ok: false, message: playersError.message };
  }

  return { ok: true };
}

export async function upsertHoleScoreRemote(
  round: Round,
  holeNumber: number,
  playerId: string,
  strokes: number,
): Promise<void> {
  if (!shouldSyncRound(round.ownerId, round.id) || !isUuid(playerId)) {
    return;
  }

  const authId = await getAuthedUserId();
  if (!authId || authId !== round.ownerId) return;

  const resolved = await resolveCourseUuidByClientCourseId(round.courseId);
  if (!resolved) return;

  const holeUuid = await resolveHoleUuid(resolved.courseUuid, holeNumber);
  if (!holeUuid) return;

  const s = clampStrokes(strokes);
  const { error } = await supabase.from("hole_scores").upsert(
    {
      round_id: round.id,
      player_id: playerId,
      hole_id: holeUuid,
      strokes: s,
    },
    { onConflict: "player_id,hole_id" },
  );

  if (error) {
    console.warn("[roundsRemote] upsert hole_scores", error.message);
  }
}

export async function completeRoundRemote(
  round: Round,
  completedAtIso: string,
): Promise<void> {
  if (!shouldSyncRound(round.ownerId, round.id)) return;

  const authId = await getAuthedUserId();
  if (!authId || authId !== round.ownerId) return;

  const { error } = await supabase
    .from("rounds")
    .update({
      status: "completed",
      completed_at: completedAtIso,
    })
    .eq("id", round.id)
    .eq("owner_id", authId);

  if (error) {
    console.warn("[roundsRemote] complete round", error.message);
  }
}

/**
 * Deletes the round on Supabase (`round_players` / `hole_scores` cascade from schema).
 * No-op for guest rounds or non-UUID ids.
 */
export async function deleteRoundRemote(
  round: Pick<Round, "id" | "ownerId">,
): Promise<void> {
  if (!shouldSyncRound(round.ownerId, round.id)) {
    return;
  }

  const authId = await getAuthedUserId();
  if (!authId || authId !== round.ownerId) {
    return;
  }

  const { error } = await supabase
    .from("rounds")
    .delete()
    .eq("id", round.id)
    .eq("owner_id", authId);

  if (error) {
    console.warn("[roundsRemote] delete round", error.message);
  }
}

type DbRoundRow = {
  id: string;
  owner_id: string;
  course_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
};

type DbPlayerRow = {
  id: string;
  round_id: string;
  display_name: string;
  sort_order: number;
};

type DbHoleScoreRow = {
  round_id: string;
  player_id: string;
  strokes: number;
  hole_id: string;
};

/**
 * Loads the signed-in user's rounds from Supabase (GET) and maps them into local `Round` shapes.
 * Merge into `useRoundsStore` via `hydrateRoundsFromDatabase`.
 */
export async function fetchRemoteRounds(): Promise<Round[]> {
  const authId = await getAuthedUserId();
  if (!authId) return [];

  const { data: roundRows, error: roundsError } = await supabase
    .from("rounds")
    .select("id, owner_id, course_id, status, started_at, completed_at")
    .eq("owner_id", authId)
    .order("started_at", { ascending: false });

  if (roundsError || !roundRows?.length) {
    if (roundsError) {
      console.warn("[roundsRemote] fetch rounds", roundsError.message);
    }
    return [];
  }

  const rounds = roundRows as DbRoundRow[];
  const courseUuids = [...new Set(rounds.map((r) => r.course_id))];

  const { data: courseRows, error: coursesError } = await supabase
    .from("courses")
    .select("id, slug")
    .in("id", courseUuids);

  if (coursesError || !courseRows?.length) {
    if (coursesError) {
      console.warn("[roundsRemote] fetch courses", coursesError.message);
    }
    return [];
  }

  const clientIdBySlug = new Map(
    COURSES.map((c) => [c.slug, c.id] as const),
  );

  const clientCourseIdByUuid = new Map(
    courseRows.map((row) => {
      const clientId = clientIdBySlug.get(row.slug);
      return [row.id, clientId ?? null] as const;
    }),
  );

  const roundIds = rounds.map((r) => r.id);

  const { data: playerRows, error: playersError } = await supabase
    .from("round_players")
    .select("id, round_id, display_name, sort_order")
    .in("round_id", roundIds)
    .order("sort_order", { ascending: true });

  if (playersError) {
    console.warn("[roundsRemote] fetch players", playersError.message);
    return [];
  }

  const playersByRound = new Map<string, DbPlayerRow[]>();
  for (const row of (playerRows ?? []) as DbPlayerRow[]) {
    const list = playersByRound.get(row.round_id) ?? [];
    list.push(row);
    playersByRound.set(row.round_id, list);
  }

  const { data: scoreRows, error: scoresError } = await supabase
    .from("hole_scores")
    .select("round_id, player_id, strokes, hole_id")
    .in("round_id", roundIds);

  if (scoresError) {
    console.warn("[roundsRemote] fetch hole_scores", scoresError.message);
    return [];
  }

  const holeIds = [
    ...new Set((scoreRows ?? []).map((s) => (s as DbHoleScoreRow).hole_id)),
  ];

  const holeNumberById = new Map<string, number>();
  if (holeIds.length > 0) {
    const { data: holeMeta, error: holesError } = await supabase
      .from("holes")
      .select("id, hole_number")
      .in("id", holeIds);

    if (holesError) {
      console.warn("[roundsRemote] fetch holes", holesError.message);
      return [];
    }
    for (const h of holeMeta ?? []) {
      holeNumberById.set(h.id, h.hole_number);
    }
  }

  const scoresByRound = new Map<string, DbHoleScoreRow[]>();
  for (const row of (scoreRows ?? []) as DbHoleScoreRow[]) {
    const list = scoresByRound.get(row.round_id) ?? [];
    list.push(row);
    scoresByRound.set(row.round_id, list);
  }

  const result: Round[] = [];

  for (const r of rounds) {
    const courseClientId = clientCourseIdByUuid.get(r.course_id);
    if (!courseClientId) continue;

    const dbPlayers = playersByRound.get(r.id) ?? [];
    const players = dbPlayers.map((p) => ({
      id: p.id,
      name: p.display_name,
    }));

    const holeScores: Round["holeScores"] = {};
    for (const s of scoresByRound.get(r.id) ?? []) {
      const holeNum = holeNumberById.get(s.hole_id);
      if (holeNum == null) continue;
      if (!holeScores[holeNum]) holeScores[holeNum] = {};
      holeScores[holeNum][s.player_id] = s.strokes;
    }

    result.push({
      id: r.id,
      courseId: courseClientId,
      ownerId: r.owner_id,
      createdAt: r.started_at,
      completedAt: r.completed_at ?? undefined,
      players,
      holeScores,
    });
  }

  return result;
}
