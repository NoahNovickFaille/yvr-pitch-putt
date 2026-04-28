import { Hole, PlayerInput, Round } from './types';

export function scoreDelta(strokes: number | undefined, par: number): number | null {
  if (!strokes) {
    return null;
  }
  return strokes - par;
}

export function scoreLabel(delta: number | null): string {
  if (delta === null) return '-';
  if (delta <= -2) return 'Eagle+';
  if (delta === -1) return 'Birdie';
  if (delta === 0) return 'Par';
  if (delta === 1) return 'Bogey';
  if (delta === 2) return 'Double';
  return `+${delta}`;
}

export function roundTotals(round: Round, holes: Hole[], players: PlayerInput[]) {
  return players.map((player) => {
    const total = holes.reduce((sum, hole) => {
      const holeEntry = round.holeScores[hole.number];
      return sum + (holeEntry?.[player.id] ?? 0);
    }, 0);

    const parTotal = holes.reduce((sum, hole) => sum + hole.par, 0);

    return {
      player,
      total,
      vsPar: total > 0 ? total - parTotal : 0,
    };
  });
}
