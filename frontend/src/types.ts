export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number;
}

export type PlayerId = string;
export type TeamId = 'A' | 'B';
export type SeatIndex = 0 | 1 | 2 | 3;

export type GamePhase =
  | 'WAITING'
  | 'DEALING_INITIAL'
  | 'TRUMP_SELECTION'
  | 'DEALING_REMAINING'
  | 'HAND_IN_PROGRESS'
  | 'HAND_COMPLETED'
  | 'MATCH_COMPLETED';

export interface TrickCard {
  playerId: PlayerId;
  card: Card;
}

export interface PlayerPublicInfo {
  id: PlayerId;
  displayName: string;
  avatarUrl?: string;
  isBot: boolean;
  isConnected: boolean;
  seat: SeatIndex;
  team: TeamId;
  cardCount: number;
}

export interface PlayerGameView {
  matchId: string;
  myPlayerId: PlayerId;
  myHand: Card[];
  players: PlayerPublicInfo[];
  seatMap: Record<SeatIndex, PlayerId>;
  phase: GamePhase;
  trumpSuit: Suit | null;
  trumpCallerId: PlayerId | null;
  currentTurnSeat: SeatIndex | null;
  callerSeat: SeatIndex | null;
  dealerSeat: SeatIndex | null;
  currentTrick: TrickCard[];
  centerPileTrickCount: number;
  lastTrickWinnerId: PlayerId | null;
  teamAClaimedTricks: number;
  teamBClaimedTricks: number;
  teamAHandsWon: number;
  teamBHandsWon: number;
  legalCardIds: string[];
  handNumber: number;
  completedTricksThisHand: number;
  handHistory?: CompletedHand[];
}

export interface CompletedHand {
  handNumber: number;
  teamAClaimedTricks: number;
  teamBClaimedTricks: number;
  winner: TeamId;
  trumpSuit: Suit | null;
}

export interface ChatMessage {
  id: string;
  senderId: PlayerId;
  senderName: string;
  text: string;
  channel: 'team' | 'table' | 'spectator';
  timestamp: number;
}

export interface EmoteEvent {
  senderId: PlayerId;
  emoteId: string;
  timestamp: number;
}

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export const SUIT_COLORS: Record<Suit, string> = {
  spades: '#e2e8f0',
  hearts: '#f87171',
  diamonds: '#fb923c',
  clubs: '#86efac',
};

export const SUIT_LABELS: Record<Suit, string> = {
  spades: 'Spades',
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
};

// Seat positions for the 4-player table (South=0, West=1, North=2, East=3)
// The local player is always rendered at the bottom (South).
export type TablePosition = 'bottom' | 'left' | 'top' | 'right';

export function getSeatPosition(
  seat: SeatIndex,
  mySeat: SeatIndex,
): TablePosition {
  const offset = ((seat - mySeat) + 4) % 4;
  return (['bottom', 'right', 'top', 'left'] as TablePosition[])[offset];
}
