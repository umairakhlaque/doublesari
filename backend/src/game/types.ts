export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  id: string; // e.g. "A_spades"
  suit: Suit;
  rank: Rank;
  value: number; // 2..14, A=14
}

export type PlayerId = string;
export type TeamId = 'A' | 'B';
export type SeatIndex = 0 | 1 | 2 | 3; // 0=South, 1=West, 2=North, 3=East

export type GamePhase =
  | 'WAITING'
  | 'DEALING_INITIAL'
  | 'TRUMP_SELECTION'
  | 'DEALING_REMAINING'
  | 'HAND_IN_PROGRESS'
  | 'HAND_COMPLETED'
  | 'MATCH_COMPLETED';

export type TableDirection = 'clockwise' | 'counter-clockwise';

export type CallerRotation =
  | 'classic'          // dealer's left in CW, dealer's right in CCW
  | 'loser-calls'
  | 'winner-calls'
  | 'dealer-left'
  | 'dealer-right';

export interface RulesetConfig {
  matchFormat: 3 | 5 | 7;             // best-of
  tableDirection: TableDirection;
  callerRotation: CallerRotation;
  allowRedeal: boolean;
  allowTeamChat: boolean;
  allowUndo: boolean;
  timerSeconds: number;               // per-turn timer (0 = no timer)
  kotEnabled: boolean;                // Court/Kot bonus scoring
  beRangaMode: boolean;               // No trump caller at start
  rankedMode: boolean;
  botFillEnabled: boolean;
}

export const DEFAULT_RULESET: RulesetConfig = {
  matchFormat: 5,
  tableDirection: 'clockwise',
  callerRotation: 'classic',
  allowRedeal: false,
  allowTeamChat: true,
  allowUndo: false,
  timerSeconds: 30,
  kotEnabled: false,
  beRangaMode: false,
  rankedMode: false,
  botFillEnabled: true,
};

export interface PlayerInfo {
  id: PlayerId;
  displayName: string;
  avatarUrl?: string;
  isBot: boolean;
  isConnected: boolean;
  seat: SeatIndex;
  team: TeamId;
}

export interface TrickCard {
  playerId: PlayerId;
  card: Card;
}

export interface Trick {
  cards: TrickCard[];            // in play order
  ledSuit: Suit | null;
  winnerId: PlayerId | null;
}

export interface CenterPileState {
  trickCount: number;
  lastClaimedByTeam: TeamId | null;
}

export interface HandState {
  handNumber: number;
  dealerSeat: SeatIndex;
  callerSeat: SeatIndex;
  trumpSuit: Suit | null;
  trumpCallerId: PlayerId | null;
  leadSeat: SeatIndex;
  currentTurnSeat: SeatIndex;
  phase: GamePhase;

  // Cards per player (server-side only — never fully serialized to client)
  hands: Record<PlayerId, Card[]>;

  // Trick tracking
  currentTrick: Trick;
  completedTricksThisHand: number;

  // Double Sar pile logic
  centerPile: CenterPileState;
  lastTrickWinnerId: PlayerId | null;
  teamAClaimedTricks: number;
  teamBClaimedTricks: number;
}

export interface MatchState {
  matchId: string;
  roomId: string;
  ruleset: RulesetConfig;
  players: Record<PlayerId, PlayerInfo>;
  seatMap: Record<SeatIndex, PlayerId>;  // seat -> playerId

  // Match-level scores (hands won)
  teamAHandsWon: number;
  teamBHandsWon: number;
  handsToWin: number;                    // ceil(matchFormat / 2)

  currentHand: HandState | null;
  handHistory: CompletedHand[];

  phase: GamePhase;
  winner: TeamId | null;
}

export interface CompletedHand {
  handNumber: number;
  teamAClaimedTricks: number;
  teamBClaimedTricks: number;
  winner: TeamId;
  trumpSuit: Suit | null;
}

// What each player sees (serialized per-player, hides opponents' cards)
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
  legalCardIds: string[];              // only populated on this player's turn
  handNumber: number;
  completedTricksThisHand: number;
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

// Events emitted server → client
export type ServerEvent =
  | 'room_created'
  | 'room_joined'
  | 'player_seated'
  | 'match_started'
  | 'initial_cards_dealt'
  | 'trump_selection_required'
  | 'trump_selected'
  | 'remaining_cards_dealt'
  | 'turn_started'
  | 'legal_cards_updated'
  | 'card_played'
  | 'trick_completed'
  | 'center_pile_updated'
  | 'double_sar_claimed'
  | 'hand_completed'
  | 'match_completed'
  | 'chat_message'
  | 'emote_received'
  | 'player_disconnected'
  | 'bot_activated'
  | 'player_reconnected'
  | 'error_message'
  | 'game_state_sync';

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

export const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
  '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};
