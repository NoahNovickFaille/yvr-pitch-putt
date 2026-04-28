import { create } from 'zustand';
import { Round } from './types';

interface SessionState {
  userId: string | null;
  userEmail: string | null;
  setSession: (userId: string, userEmail: string) => void;
  clearSession: () => void;
}

interface RoundsState {
  activeRoundId: string | null;
  rounds: Round[];
  createRound: (round: Round) => void;
  updateScore: (roundId: string, holeNumber: number, playerId: string, strokes: number) => void;
  setActiveRound: (roundId: string | null) => void;
  completeRound: (roundId: string) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  userId: null,
  userEmail: null,
  setSession: (userId, userEmail) => set({ userId, userEmail }),
  clearSession: () => set({ userId: null, userEmail: null }),
}));

export const useRoundsStore = create<RoundsState>((set) => ({
  activeRoundId: null,
  rounds: [],
  createRound: (round) => set((state) => ({ rounds: [round, ...state.rounds], activeRoundId: round.id })),
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
        round.id === roundId ? { ...round, completedAt: new Date().toISOString() } : round,
      ),
      activeRoundId: null,
    })),
}));
