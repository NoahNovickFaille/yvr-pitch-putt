import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist, StateStorage } from "zustand/middleware";

import {
  completeRoundRemote,
  deleteRoundRemote,
  fetchRemoteRounds,
  getAuthedUserId,
  upsertHoleScoreRemote,
} from "./roundsRemote";
import { isSupabaseAuthUserId } from "./sessionUtils";
import { Round } from "./types";

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
  /** When signed in with Supabase, merges server rounds into local state (source of truth for synced rows). */
  hydrateRoundsFromDatabase: () => Promise<void>;
  createRound: (round: Round) => void;
  updateScore: (
    roundId: string,
    holeNumber: number,
    playerId: string,
    strokes: number,
  ) => void;
  setActiveRound: (roundId: string | null) => void;
  completeRound: (roundId: string) => void;
  deleteRound: (roundId: string) => void;
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
                  [playerId]: strokes,
                },
              },
            };
          }),
        }));
        const updated = get().rounds.find((r) => r.id === roundId);
        if (updated) {
          queueMicrotask(() => {
            void upsertHoleScoreRemote(
              updated,
              holeNumber,
              playerId,
              strokes,
            );
          });
        }
      },
      setActiveRound: (roundId) => set({ activeRoundId: roundId }),
      deleteRound: (roundId) => {
        const removed = get().rounds.find((r) => r.id === roundId);
        set((state) => ({
          rounds: state.rounds.filter((r) => r.id !== roundId),
          activeRoundId:
            state.activeRoundId === roundId ? null : state.activeRoundId,
        }));
        if (removed) {
          queueMicrotask(() => {
            void deleteRoundRemote(removed);
          });
        }
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
