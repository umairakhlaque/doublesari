import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  PlayerGameView, ChatMessage, EmoteEvent,
  Suit, GamePhase, PlayerPublicInfo, TrickCard,
  PlayerId, SeatIndex,
} from '../types';

interface Notification {
  id: string;
  type: 'double_sar' | 'trick_win' | 'hand_win' | 'match_win' | 'info';
  message: string;
  teamId?: 'A' | 'B';
}

interface GameStore {
  // Connection
  myPlayerId: PlayerId | null;
  myDisplayName: string | null;
  isConnected: boolean;

  // Room
  roomId: string | null;
  roomCode: string | null;
  mySeat: SeatIndex | null;
  myTeam: 'A' | 'B' | null;

  // Game state (received from server)
  gameView: PlayerGameView | null;

  // UI state
  selectedCardId: string | null;
  notifications: Notification[];
  chatMessages: ChatMessage[];
  emotes: EmoteEvent[];
  lastTrickWinnerId: PlayerId | null;
  lastDoubleSarTeam: 'A' | 'B' | null;
  matchResult: { winner: 'A' | 'B'; teamAHandsWon: number; teamBHandsWon: number } | null;
  handResult: { winner: 'A' | 'B'; teamAClaimedTricks: number; teamBClaimedTricks: number } | null;
  showHandResult: boolean;

  // Actions
  setConnected: (connected: boolean) => void;
  setMyIdentity: (playerId: PlayerId, displayName: string) => void;
  setRoomInfo: (roomId: string, code: string, seat: SeatIndex, team: 'A' | 'B') => void;
  updateGameView: (view: PlayerGameView) => void;
  selectCard: (cardId: string | null) => void;
  addChatMessage: (msg: ChatMessage) => void;
  addEmote: (emote: EmoteEvent) => void;
  pushNotification: (notification: Omit<Notification, 'id'>) => void;
  dismissNotification: (id: string) => void;
  setLastTrickWinner: (playerId: PlayerId | null) => void;
  setDoubleSarClaimed: (team: 'A' | 'B' | null) => void;
  setMatchResult: (result: GameStore['matchResult']) => void;
  setHandResult: (result: GameStore['handResult']) => void;
  setShowHandResult: (show: boolean) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>()(
  immer((set) => ({
    myPlayerId: null,
    myDisplayName: null,
    isConnected: false,
    roomId: null,
    roomCode: null,
    mySeat: null,
    myTeam: null,
    gameView: null,
    selectedCardId: null,
    notifications: [],
    chatMessages: [],
    emotes: [],
    lastTrickWinnerId: null,
    lastDoubleSarTeam: null,
    matchResult: null,
    handResult: null,
    showHandResult: false,

    setConnected: (connected) => set(s => { s.isConnected = connected; }),

    setMyIdentity: (playerId, displayName) =>
      set(s => { s.myPlayerId = playerId; s.myDisplayName = displayName; }),

    setRoomInfo: (roomId, code, seat, team) =>
      set(s => {
        s.roomId = roomId;
        s.roomCode = code;
        s.mySeat = seat;
        s.myTeam = team;
      }),

    updateGameView: (view) => set(s => { s.gameView = view; }),

    selectCard: (cardId) => set(s => {
      s.selectedCardId = s.selectedCardId === cardId ? null : cardId;
    }),

    addChatMessage: (msg) => set(s => {
      s.chatMessages.push(msg);
      if (s.chatMessages.length > 100) s.chatMessages.shift();
    }),

    addEmote: (emote) => set(s => {
      s.emotes.push(emote);
      if (s.emotes.length > 20) s.emotes.shift();
    }),

    pushNotification: (notif) => set(s => {
      s.notifications.push({ ...notif, id: `${Date.now()}_${Math.random()}` });
      if (s.notifications.length > 5) s.notifications.shift();
    }),

    dismissNotification: (id) => set(s => {
      s.notifications = s.notifications.filter(n => n.id !== id);
    }),

    setLastTrickWinner: (playerId) => set(s => { s.lastTrickWinnerId = playerId; }),

    setDoubleSarClaimed: (team) => set(s => { s.lastDoubleSarTeam = team; }),

    setMatchResult: (result) => set(s => { s.matchResult = result; }),

    setHandResult: (result) => set(s => { s.handResult = result; }),

    setShowHandResult: (show) => set(s => { s.showHandResult = show; }),

    reset: () => set(s => {
      s.roomId = null; s.roomCode = null;
      s.mySeat = null; s.myTeam = null;
      s.gameView = null; s.selectedCardId = null;
      s.notifications = []; s.chatMessages = [];
      s.emotes = []; s.lastTrickWinnerId = null;
      s.lastDoubleSarTeam = null; s.matchResult = null;
      s.handResult = null; s.showHandResult = false;
    }),
  })),
);
