import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist, StateStorage } from "zustand/middleware";

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
import { Round } from "./types";

const buildParThreeHoleScores = (
  playerIds: string[],
  adjustments: Record<number, number[]>,
) => {
  const holeScores: Round["holeScores"] = {};
  for (let hole = 1; hole <= 18; hole += 1) {
    holeScores[hole] = {};
    playerIds.forEach((playerId, index) => {
      const delta = adjustments[hole]?.[index] ?? 0;
      holeScores[hole][playerId] = 3 + delta;
    });
  }
  return holeScores;
};

const SAMPLE_ROUNDS: Round[] = [
  {
    id: "sample-round-stanley-2026-04-14",
    courseId: "course-stanley",
    ownerId: "seed-user",
    createdAt: "2026-04-14T18:00:00.000Z",
    completedAt: "2026-04-14T19:35:00.000Z",
    players: [
      { id: "sr1-p1", name: "Marcus" },
      { id: "sr1-p2", name: "Jess" },
      { id: "sr1-p3", name: "Tom" },
    ],
    holeScores: buildParThreeHoleScores(["sr1-p1", "sr1-p2", "sr1-p3"], {
      1: [-1, 0, 0],
      3: [-2, 0, 0],
      4: [-1, -1, 0],
      5: [0, 0, 2],
      6: [1, 0, 0],
      7: [-1, 0, 1],
      8: [0, -1, 0],
      9: [0, 0, 1],
      10: [-1, 1, 2],
      12: [-1, -1, 1],
      14: [0, 1, 0],
      15: [-2, 0, 0],
      16: [0, 0, 1],
      17: [-1, 0, 0],
      18: [0, -1, 3],
    }),
  },
  {
    id: "sample-round-qe-2026-04-08",
    courseId: "course-qe",
    ownerId: "seed-user",
    createdAt: "2026-04-08T16:20:00.000Z",
    completedAt: "2026-04-08T17:48:00.000Z",
    players: [
      { id: "sr2-p1", name: "Marcus" },
      { id: "sr2-p2", name: "Jess" },
    ],
    holeScores: buildParThreeHoleScores(["sr2-p1", "sr2-p2"], {
      2: [0, -1],
      4: [-1, 0],
      6: [1, 0],
      8: [0, -1],
      10: [1, 0],
      11: [0, -1],
      13: [0, 1],
      15: [0, -1],
      17: [-1, 0],
    }),
  },
  {
    id: "sample-round-rupert-2026-03-29",
    courseId: "course-rupert",
    ownerId: "seed-user",
    createdAt: "2026-03-29T15:10:00.000Z",
    completedAt: "2026-03-29T16:40:00.000Z",
    players: [
      { id: "sr3-p1", name: "Marcus" },
      { id: "sr3-p2", name: "Tom" },
    ],
    holeScores: buildParThreeHoleScores(["sr3-p1", "sr3-p2"], {
      1: [1, 0],
      3: [-1, 1],
      5: [0, 1],
      7: [1, 0],
      8: [0, 1],
      11: [0, 1],
      14: [0, -1],
      16: [1, 1],
    }),
  },
  {
    id: "sample-round-stanley-2026-03-22-4p",
    courseId: "course-stanley",
    ownerId: "seed-user",
    createdAt: "2026-03-22T17:00:00.000Z",
    completedAt: "2026-03-22T18:42:00.000Z",
    players: [
      { id: "sr4-p1", name: "Marcus" },
      { id: "sr4-p2", name: "Jess" },
      { id: "sr4-p3", name: "Tom" },
      { id: "sr4-p4", name: "Ava" },
    ],
    holeScores: buildParThreeHoleScores(
      ["sr4-p1", "sr4-p2", "sr4-p3", "sr4-p4"],
      {
        1: [-1, 0, 0, 1],
        2: [0, -1, 1, 0],
        3: [0, 0, 2, -1],
        4: [-1, 0, 0, 1],
        5: [0, 1, 0, 0],
        6: [1, 0, 1, -1],
        7: [-1, 0, 0, 0],
        8: [0, 1, -1, 0],
        9: [0, 0, 1, 0],
        10: [1, -1, 2, 0],
        11: [0, 0, 0, 1],
        12: [-1, 1, 0, 0],
        13: [0, 0, 1, -1],
        14: [0, 1, 0, 0],
        15: [-1, 0, 1, 0],
        16: [1, 0, 0, 1],
        17: [0, -1, 0, 0],
        18: [0, 1, 2, -1],
      },
    ),
  },
  {
    id: "sample-round-qe-2026-03-15-1p",
    courseId: "course-qe",
    ownerId: "seed-user",
    createdAt: "2026-03-15T10:10:00.000Z",
    completedAt: "2026-03-15T11:32:00.000Z",
    players: [{ id: "sr5-p1", name: "Marcus" }],
    holeScores: buildParThreeHoleScores(["sr5-p1"], {
      1: [-1],
      2: [0],
      3: [1],
      4: [-1],
      5: [0],
      6: [0],
      7: [-2],
      8: [1],
      9: [0],
      10: [-1],
      11: [0],
      12: [0],
      13: [1],
      14: [0],
      15: [-1],
      16: [0],
      17: [0],
      18: [1],
    }),
  },
];

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
  createRound: (round: Round) => void;
  updateScore: (
    roundId: string,
    holeNumber: number,
    playerId: string,
    strokes: number,
  ) => void;
  setActiveRound: (roundId: string | null) => void;
  completeRound: (roundId: string) => void;
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
    (set) => ({
      activeRoundId: null,
      rounds: SAMPLE_ROUNDS,
      createRound: (round) =>
        set((state) => ({
          rounds: [round, ...state.rounds],
          activeRoundId: round.id,
        })),
      updateScore: (roundId, holeNumber, playerId, strokes) =>
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
        })),
      setActiveRound: (roundId) => set({ activeRoundId: roundId }),
      completeRound: (roundId) =>
        set((state) => ({
          rounds: state.rounds.map((round) =>
            round.id === roundId
              ? { ...round, completedAt: new Date().toISOString() }
              : round,
          ),
          activeRoundId: null,
        })),
    }),
    {
      name: "pitchputt-rounds-storage",
      storage: createJSONStorage(() => resilientPersistStorage),
      partialize: (state) => ({
        activeRoundId: state.activeRoundId,
        rounds: state.rounds,
      }),
    },
  ),
);
