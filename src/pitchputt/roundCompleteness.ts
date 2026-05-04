import type { Course, Round } from "./types";

/** True when every player has a numeric stroke count on every hole in the course. */
export function isRoundFullyScored(round: Round, course: Course): boolean {
  for (const hole of course.holes) {
    for (const player of round.players) {
      if (typeof round.holeScores[hole.number]?.[player.id] !== "number") {
        return false;
      }
    }
  }
  return true;
}
