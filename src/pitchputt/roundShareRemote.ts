import { supabase } from "@/src/lib/supabase";

import { COURSES } from "./data";
import type { Round } from "./types";

export type ShareTokenStatus = "ready" | "claimed" | "expired" | "invalid";

export type ShareRoundPreview = {
  status: ShareTokenStatus;
  token: string;
  expiresAt?: string;
  claimedAt?: string;
  targetPlayerId?: string;
  targetPlayerName?: string;
  round?: Round;
};

type PeekPayload = {
  status: string;
  token?: string;
  expires_at?: string;
  claimed_at?: string;
  target_player?: { id: string; name: string; is_owner?: boolean };
  round?: {
    id: string;
    owner_id: string;
    course_slug: string;
    created_at: string;
    completed_at: string | null;
    players: { id: string; name: string; is_owner?: boolean; user_id?: string | null }[];
    hole_scores: Record<string, Record<string, number>>;
  };
};

function mapPeekToPreview(payload: PeekPayload | null): ShareRoundPreview {
  if (!payload?.status) {
    return { status: "invalid", token: "" };
  }

  const status = payload.status as ShareTokenStatus;
  const clientIdBySlug = new Map(COURSES.map((c) => [c.slug, c.id] as const));
  const rawRound = payload.round;

  let round: Round | undefined;
  if (rawRound) {
    const courseId = clientIdBySlug.get(rawRound.course_slug);
    if (courseId) {
      const holeScores: Round["holeScores"] = {};
      for (const [holeKey, byPlayer] of Object.entries(rawRound.hole_scores ?? {})) {
        const holeNumber = Number(holeKey);
        if (!Number.isFinite(holeNumber)) continue;
        holeScores[holeNumber] = {};
        for (const [playerId, strokes] of Object.entries(byPlayer)) {
          if (typeof strokes === "number") {
            holeScores[holeNumber][playerId] = strokes;
          }
        }
      }

      round = {
        id: rawRound.id,
        courseId,
        ownerId: rawRound.owner_id,
        createdAt: rawRound.created_at,
        completedAt: rawRound.completed_at ?? undefined,
        players: (rawRound.players ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          isOwner: p.is_owner,
          linkedUserId: p.user_id ?? undefined,
        })),
        holeScores,
      };
    }
  }

  return {
    status,
    token: payload.token ?? "",
    expiresAt: payload.expires_at,
    claimedAt: payload.claimed_at,
    targetPlayerId: payload.target_player?.id,
    targetPlayerName: payload.target_player?.name,
    round,
  };
}

export async function createRoundShareToken(
  roundId: string,
  playerId: string,
): Promise<{ ok: true; token: string } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc("create_round_share_token", {
    p_round_id: roundId,
    p_player_id: playerId,
  });

  if (error || typeof data !== "string" || !data) {
    console.warn("[roundShareRemote] create token", error?.message);
    return {
      ok: false,
      message: error?.message ?? "Could not create share link.",
    };
  }

  return { ok: true, token: data };
}

export async function peekRoundShareToken(token: string): Promise<ShareRoundPreview> {
  const { data, error } = await supabase.rpc("peek_round_share_token", {
    p_token: token,
  });

  if (error) {
    console.warn("[roundShareRemote] peek token", error.message);
    return { status: "invalid", token };
  }

  return mapPeekToPreview(data as PeekPayload);
}

export async function claimRoundShareToken(
  token: string,
): Promise<{ ok: true; roundId: string } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc("claim_round_share_token", {
    p_token: token,
  });

  if (error || typeof data !== "string" || !data) {
    console.warn("[roundShareRemote] claim token", error?.message);
    return {
      ok: false,
      message: error?.message ?? "Could not claim this scorecard.",
    };
  }

  return { ok: true, roundId: data };
}
