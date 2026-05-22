import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist, StateStorage } from "zustand/middleware";

import {
  completeRoundRemote,
  deleteRoundRemote,
  fetchRemoteRounds,
  getAuthedUserId,
  insertRoundRemote,
  type RemoteRoundResult,
  upsertHoleScoresForHoleRemote,
} from "./roundsRemote";
import { enqueueHoleScoresSync as queueHoleScoresSync } from "./roundRemoteSyncQueue";
import { isSupabaseAuthUserId, isUuid } from "./sessionUtils";
import { Round } from "./types";

function roundUsesRemoteSync(round: Round): boolean {
  return isSupabaseAuthUserId(round.ownerId) && isUuid(round.id);
}

/** In-memory mirror when AsyncStorage native module is unavailable (same class of error as Supabase). */
const persistMemoryByKey = new Map<string, string>();

const resilientPersistStorage: StateStorage = {
  getItem: async (name) => {
    try {
      const fromDisk = await AsyncStorage.getItem(name);
      if (fromDisk != null) persistMemoryByKey.set(name, fromDisk);
      return fromDisk ?? persistMemoryByKey.get(name) ?? null;
    } catch {
      return persistMemoryByKey.get(name) ?? null;
    }
  },
  setItem: async (name, value) => {
    persistMemoryByKey.set(name, value);
    try {
      await AsyncStorage.setItem(name, value);
    } catch {
      /* session survives in RAM; reinstall/rebuild restores disk persistence */
    }
  },
  removeItem: async (name) => {
    persistMemoryByKey.delete(name);
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      /* noop */
    }
  },
};

function isPersistedSampleRound(round: Round): boolean {
  return round.ownerId === "seed-user" || round.id.startsWith("sample-");
}

interface SessionState {
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  setSession: (
    userId: string,
    userEmail: string,
    userName?: string | null,
  ) => void;
  clearSession: () => void;
}

interface RoundsState {
  activeRoundId: string | null;
  rounds: Round[];
  clearRounds: () => void;
  /** When signed in with Supabase, merges server rounds into local state (source of truth for synced rows). */
  hydrateRoundsFromDatabase: () => Promise<void>;
  createRound: (round: Round) => void;
  updateScore: (
    roundId: string,
    holeNumber: number,
    playerId: string,
    strokes: number,
  ) => void;
  adjustScore: (
    roundId: string,
    holeNumber: number,
    playerId: string,
    delta: number,
    fallback: number,
  ) => void;
  syncHoleScoresToRemote: (roundId: string, holeNumber: number) => Promise<void>;
  /** Fire-and-forget: syncs one hole without blocking navigation. */
  scheduleHoleScoresSync: (roundId: string, holeNumber: number) => void;
  syncGuestRoundsToUser: (userId: string) => Promise<void>;
  setActiveRound: (roundId: string | null) => void;
  completeRound: (roundId: string) => void;
  deleteRound: (roundId: string) => Promise<RemoteRoundResult>;
}

export const useSessionStore = create<SessionState>((set) => ({
  userId: null,
  userEmail: null,
  userName: null,
  setSession: (userId, userEmail, userName = null) =>
    set({ userId, userEmail, userName }),
  clearSession: () => set({ userId: null, userEmail: null, userName: null }),
}));

export const useRoundsStore = create<RoundsState>()(
  persist(
    (set, get) => ({
      activeRoundId: null,
      rounds: [],
      clearRounds: () => set({ activeRoundId: null, rounds: [] }),
      hydrateRoundsFromDatabase: async () => {
        const authId = await getAuthedUserId();
        if (!authId || !isSupabaseAuthUserId(authId)) return;

        const remote = await fetchRemoteRounds();
        const remoteIds = new Set(remote.map((r) => r.id));
        const local = get().rounds;

        const localsToKeep = local.filter((r) => {
          if (isPersistedSampleRound(r)) return false;
          if (!isSupabaseAuthUserId(r.ownerId)) return true;
          if (r.ownerId !== authId) return true;
          return !remoteIds.has(r.id);
        });

        const byId = new Map<string, Round>();
        for (const r of remote) {
          byId.set(r.id, r);
        }
        for (const r of localsToKeep) {
          if (!byId.has(r.id)) {
            byId.set(r.id, r);
          }
        }

        const merged = Array.from(byId.values()).sort(
          (a, b) =>
            new Date(b.completedAt ?? b.createdAt).getTime() -
            new Date(a.completedAt ?? a.createdAt).getTime(),
        );

        set((state) => ({
          rounds: merged,
          activeRoundId:
            state.activeRoundId != null &&
            merged.some((r) => r.id === state.activeRoundId)
              ? state.activeRoundId
              : null,
        }));
      },
      createRound: (round) =>
        set((state) => ({
          rounds: [round, ...state.rounds],
          activeRoundId: round.id,
        })),
      updateScore: (roundId, holeNumber, playerId, strokes) => {
        const boundedStrokes = Math.max(1, Math.min(15, Math.round(strokes)));
        set((state) => ({
          rounds: state.rounds.map((round) => {
            if (round.id !== roundId) {
              return round;
            }

            return {
              ...round,
              holeScores: {
                ...round.holeScores,
                [holeNumber]: {
                  ...(round.holeScores[holeNumber] ?? {}),
                  [playerId]: boundedStrokes,
                },
              },
            };
          }),
        }));
      },
      adjustScore: (roundId, holeNumber, playerId, delta, fallback) => {
        const currentRound = get().rounds.find((r) => r.id === roundId);
        const current =
          currentRound?.holeScores?.[holeNumber]?.[playerId] ?? fallback;
        const next = Math.max(1, Math.min(15, current + delta));
        get().updateScore(roundId, holeNumber, playerId, next);
      },
      syncHoleScoresToRemote: async (roundId, holeNumber) => {
        const round = get().rounds.find((r) => r.id === roundId);
        if (!round || !roundUsesRemoteSync(round)) return;

        const ok = await upsertHoleScoresForHoleRemote(round, holeNumber);
        if (!ok) {
          throw new Error(
            `[roundsStore] syncHoleScoresToRemote failed round=${roundId} hole=${holeNumber}`,
          );
        }
      },
      scheduleHoleScoresSync: (roundId, holeNumber) => {
        const round = get().rounds.find((r) => r.id === roundId);
        if (!round || !roundUsesRemoteSync(round)) return;
        queueHoleScoresSync(roundId, holeNumber, (id, hole) =>
          get().syncHoleScoresToRemote(id, hole),
        );
      },
      syncGuestRoundsToUser: async (userId) => {
        const localGuestRounds = get().rounds.filter(
          (round) =>
            round.ownerId === "local-user" ||
            round.ownerId.startsWith("guest-"),
        );

        if (localGuestRounds.length === 0) {
          return;
        }

        const adoptedRounds = localGuestRounds.map((round) => ({
          ...round,
          ownerId: userId,
        }));

        set((state) => ({
          rounds: state.rounds.map((round) => {
            if (
              round.ownerId === "local-user" ||
              round.ownerId.startsWith("guest-")
            ) {
              return { ...round, ownerId: userId };
            }
            return round;
          }),
        }));

        for (const round of adoptedRounds) {
          const inserted = await insertRoundRemote(round);
          if (!inserted.ok) {
            console.warn(
              "[roundsStore] syncGuestRoundsToUser insert:",
              inserted.message,
            );
            continue;
          }

          for (const holeNumberKey of Object.keys(round.holeScores)) {
            const holeNumber = Number(holeNumberKey);
            if (!Number.isFinite(holeNumber)) continue;
            await upsertHoleScoresForHoleRemote(round, holeNumber);
          }

          if (round.completedAt) {
            await completeRoundRemote(round, round.completedAt);
          }
        }
      },
      setActiveRound: (roundId) => set({ activeRoundId: roundId }),
      deleteRound: async (roundId) => {
        const removed = get().rounds.find((r) => r.id === roundId);
        if (!removed) {
          return { ok: true };
        }
        const remote = await deleteRoundRemote(removed);
        if (!remote.ok) {
          return remote;
        }
        set((state) => ({
          rounds: state.rounds.filter((r) => r.id !== roundId),
          activeRoundId:
            state.activeRoundId === roundId ? null : state.activeRoundId,
        }));
        return { ok: true };
      },
      completeRound: (roundId) => {
        const completedAt = new Date().toISOString();
        set((state) => {
          const rounds = state.rounds.map((round) =>
            round.id === roundId
              ? { ...round, completedAt }
              : round,
          );
          const done = rounds.find((r) => r.id === roundId);
          if (done?.completedAt) {
            queueMicrotask(() => {
              void completeRoundRemote(done, done.completedAt!);
            });
          }
          return {
            rounds,
            activeRoundId: null,
          };
        });
      },
    }),
    {
      name: "pitchputt-rounds-storage",
      storage: createJSONStorage(() => resilientPersistStorage),
      partialize: (state) => ({
        activeRoundId: state.activeRoundId,
        rounds: state.rounds,
      }),
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== "object") {
          return current;
        }
        const p = persisted as Pick<RoundsState, "rounds" | "activeRoundId">;
        const filtered = (p.rounds ?? []).filter((r) => !isPersistedSampleRound(r));
        const activeRoundId =
          p.activeRoundId != null &&
          filtered.some((r) => r.id === p.activeRoundId)
            ? p.activeRoundId
            : null;
        return {
          ...current,
          ...p,
          rounds: filtered,
          activeRoundId,
        };
      },
    },
  ),
);
