export type AuthProvider = 'apple' | 'google' | 'email';

export interface PlayerInput {
  id: string;
  name: string;
  /** First slot is the device owner / scorer. */
  isOwner?: boolean;
  /** Set when another user has claimed this player slot via share link. */
  linkedUserId?: string;
}

export interface Course {
  id: string;
  slug: string;
  name: string;
  city: string;
  province: string;
  holes: Hole[];
}

export interface Hole {
  id: string;
  number: number;
  par: number;
  yardage: number;
  assetKey: string;
}

export interface RoundScore {
  [playerId: string]: number;
}

export interface Round {
  id: string;
  courseId: string;
  ownerId: string;
  createdAt: string;
  completedAt?: string;
  players: PlayerInput[];
  holeScores: Record<number, RoundScore>;
}
