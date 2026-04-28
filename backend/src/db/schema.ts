/**
 * In-memory data store for MVP.
 * Phase 5: replace with PostgreSQL via Prisma or Knex.
 *
 * Schema design mirrors the intended production tables:
 *   users, rooms, matches, chat_messages, anti_cheat_events
 */

export interface UserRecord {
  id: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  isGuest: boolean;
  createdAt: number;
  stats: UserStats;
}

export interface UserStats {
  matchesPlayed: number;
  matchesWon: number;
  handsWon: number;
  courtsAchieved: number;
  biggestPileClaimed: number;
  totalPilesClaimed: number;
  winStreak: number;
  rankedRating: number;
  disconnectRate: number;
}

export interface RoomRecord {
  id: string;
  code: string;           // 4-digit invite code
  hostId: string;
  mode: 'classic' | 'casual' | 'ranked' | 'private';
  state: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  createdAt: number;
  matchId?: string;
}

// In-memory stores
export const users = new Map<string, UserRecord>();
export const rooms = new Map<string, RoomRecord>();

export function createGuestUser(socketId: string): UserRecord {
  const suffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  const names = ['RangKing', 'SarMaster', 'TrumpAce', 'Player', 'CardShark'];
  const base = names[Math.floor(Math.random() * names.length)];
  const user: UserRecord = {
    id: socketId,
    displayName: `${base}_${suffix}`,
    isGuest: true,
    createdAt: Date.now(),
    stats: {
      matchesPlayed: 0, matchesWon: 0, handsWon: 0,
      courtsAchieved: 0, biggestPileClaimed: 0,
      totalPilesClaimed: 0, winStreak: 0,
      rankedRating: 1000, disconnectRate: 0,
    },
  };
  users.set(socketId, user);
  return user;
}

export function generateRoomCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
