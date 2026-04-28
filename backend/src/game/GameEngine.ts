/**
 * GameEngine — server-authoritative Double Sar game logic.
 *
 * Double Sar center-pile rule:
 *   Every completed trick goes into a shared center pile.
 *   A team only CLAIMS the pile when the SAME individual player
 *   wins two CONSECUTIVE tricks.  The final-trick winner always
 *   claims any remaining unclaimed pile.
 */

import { v4 as uuid } from 'uuid';
import { createDeck, shuffleDeck, compareTrickCards } from '../utils/deck';
import {
  Card, Suit, PlayerId, TeamId, SeatIndex,
  GamePhase, RulesetConfig, DEFAULT_RULESET,
  PlayerInfo, HandState, MatchState, CompletedHand,
  PlayerGameView, PlayerPublicInfo, Trick, TrickCard,
  CenterPileState,
} from './types';

export class GameEngine {
  public state: MatchState;
  private deck: Card[] = [];

  constructor(matchId: string, roomId: string, ruleset: Partial<RulesetConfig> = {}) {
    this.state = {
      matchId,
      roomId,
      ruleset: { ...DEFAULT_RULESET, ...ruleset },
      players: {},
      seatMap: {} as Record<SeatIndex, PlayerId>,
      teamAHandsWon: 0,
      teamBHandsWon: 0,
      handsToWin: Math.ceil((ruleset.matchFormat ?? DEFAULT_RULESET.matchFormat) / 2),
      currentHand: null,
      handHistory: [],
      phase: 'WAITING',
      winner: null,
    };
  }

  // ─── Seat & Team Assignment ──────────────────────────────────────────────────

  addPlayer(playerId: PlayerId, displayName: string, isBot = false): SeatIndex | null {
    const taken = Object.values(this.state.seatMap) as PlayerId[];
    if (taken.length >= 4) return null;

    const seat = [0, 1, 2, 3].find(
      s => this.state.seatMap[s as SeatIndex] === undefined,
    ) as SeatIndex;

    const team: TeamId = seat === 0 || seat === 2 ? 'A' : 'B';

    this.state.players[playerId] = {
      id: playerId, displayName, isBot,
      isConnected: true, seat, team,
    };
    this.state.seatMap[seat] = playerId;
    return seat;
  }

  removePlayer(playerId: PlayerId): void {
    const info = this.state.players[playerId];
    if (!info) return;
    delete this.state.seatMap[info.seat];
    delete this.state.players[playerId];
  }

  get playerCount(): number {
    return Object.keys(this.state.players).length;
  }

  isReadyToStart(): boolean {
    return this.playerCount === 4;
  }

  // ─── Hand Lifecycle ──────────────────────────────────────────────────────────

  startMatch(): void {
    if (!this.isReadyToStart()) throw new Error('Need 4 players to start');
    this.state.phase = 'DEALING_INITIAL';
    this.startHand(0);
  }

  startHand(handNumber: number): void {
    const dealerSeat = this.getDealerSeat(handNumber);
    const callerSeat = this.getCallerSeat(dealerSeat);
    const callerId = this.state.seatMap[callerSeat];

    this.deck = shuffleDeck(createDeck());
    const hands: Record<PlayerId, Card[]> = {};

    // Deal 5 cards to each player
    const seats = this.seatOrder(dealerSeat, false); // start from dealer's next
    for (const seat of seats) {
      const pid = this.state.seatMap[seat];
      hands[pid] = this.deck.splice(0, 5);
    }

    this.state.currentHand = {
      handNumber,
      dealerSeat,
      callerSeat,
      trumpSuit: null,
      trumpCallerId: callerId,
      leadSeat: callerSeat,
      currentTurnSeat: callerSeat,
      phase: 'TRUMP_SELECTION',
      hands,
      currentTrick: { cards: [], ledSuit: null, winnerId: null },
      completedTricksThisHand: 0,
      centerPile: { trickCount: 0, lastClaimedByTeam: null },
      lastTrickWinnerId: null,
      teamAClaimedTricks: 0,
      teamBClaimedTricks: 0,
    };
    this.state.phase = 'TRUMP_SELECTION';
  }

  selectTrump(playerId: PlayerId, suit: Suit): void {
    const hand = this.requireHand();
    if (hand.trumpCallerId !== playerId) throw new Error('Not the trump caller');
    if (hand.phase !== 'TRUMP_SELECTION') throw new Error('Not in trump selection phase');

    hand.trumpSuit = suit;
    hand.phase = 'DEALING_REMAINING';

    // Deal remaining 8 cards to each player
    const seats = this.seatOrder(hand.dealerSeat, false);
    for (const seat of seats) {
      const pid = this.state.seatMap[seat];
      hand.hands[pid].push(...this.deck.splice(0, 8));
    }

    hand.phase = 'HAND_IN_PROGRESS';
    hand.currentTurnSeat = hand.callerSeat; // trump caller leads first trick
    this.state.phase = 'HAND_IN_PROGRESS';
  }

  // ─── Trick Play ──────────────────────────────────────────────────────────────

  getLegalCards(playerId: PlayerId): Card[] {
    const hand = this.requireHand();
    const playerHand = hand.hands[playerId];
    if (!playerHand) return [];

    const trick = hand.currentTrick;
    if (trick.cards.length === 0 || trick.ledSuit === null) {
      return playerHand; // leading — any card is legal
    }

    const ledSuitCards = playerHand.filter(c => c.suit === trick.ledSuit);
    return ledSuitCards.length > 0 ? ledSuitCards : playerHand;
  }

  playCard(playerId: PlayerId, cardId: string): {
    trickComplete: boolean;
    doubleSarClaimed: boolean;
    claimedByTeam: TeamId | null;
    centerPileTrickCount: number;
    handComplete: boolean;
    handWinner: TeamId | null;
    matchComplete: boolean;
    matchWinner: TeamId | null;
  } {
    const hand = this.requireHand();
    if (hand.phase !== 'HAND_IN_PROGRESS') throw new Error('Hand not in progress');

    const currentPlayerId = this.state.seatMap[hand.currentTurnSeat];
    if (currentPlayerId !== playerId) throw new Error('Not your turn');

    if (!this.validateMove(playerId, cardId)) throw new Error('Illegal card play');

    const playerHand = hand.hands[playerId];
    const cardIdx = playerHand.findIndex(c => c.id === cardId);
    const card = playerHand.splice(cardIdx, 1)[0];

    if (hand.currentTrick.cards.length === 0) {
      hand.currentTrick.ledSuit = card.suit;
    }

    hand.currentTrick.cards.push({ playerId, card });

    let result = {
      trickComplete: false,
      doubleSarClaimed: false,
      claimedByTeam: null as TeamId | null,
      centerPileTrickCount: hand.centerPile.trickCount,
      handComplete: false,
      handWinner: null as TeamId | null,
      matchComplete: false,
      matchWinner: null as TeamId | null,
    };

    if (hand.currentTrick.cards.length === 4) {
      result = { ...result, ...this.evaluateTrick() };
    } else {
      hand.currentTurnSeat = this.nextSeat(hand.currentTurnSeat);
    }

    return result;
  }

  validateMove(playerId: PlayerId, cardId: string): boolean {
    const legal = this.getLegalCards(playerId);
    return legal.some(c => c.id === cardId);
  }

  private evaluateTrick(): {
    trickComplete: boolean;
    doubleSarClaimed: boolean;
    claimedByTeam: TeamId | null;
    centerPileTrickCount: number;
    handComplete: boolean;
    handWinner: TeamId | null;
    matchComplete: boolean;
    matchWinner: TeamId | null;
  } {
    const hand = this.requireHand();
    const trick = hand.currentTrick;

    const winnerId = this.findTrickWinner(trick);
    trick.winnerId = winnerId;
    hand.completedTricksThisHand++;

    // ── Double Sar pile logic ──────────────────────────────────────────────
    hand.centerPile.trickCount++;

    let doubleSarClaimed = false;
    let claimedByTeam: TeamId | null = null;

    const isLastTrick = hand.completedTricksThisHand === 13;

    if (isLastTrick) {
      // Final trick: winner claims everything remaining
      claimedByTeam = this.state.players[winnerId].team;
      this.creditTeam(claimedByTeam, hand.centerPile.trickCount, hand);
      hand.centerPile.trickCount = 0;
      doubleSarClaimed = true; // reuse flag to trigger UI celebration
    } else if (hand.lastTrickWinnerId === winnerId) {
      // Same player won consecutive tricks — Double Sar!
      claimedByTeam = this.state.players[winnerId].team;
      this.creditTeam(claimedByTeam, hand.centerPile.trickCount, hand);
      hand.centerPile.trickCount = 0;
      doubleSarClaimed = true;
    }

    hand.lastTrickWinnerId = winnerId;

    // Prepare for next trick
    hand.currentTrick = { cards: [], ledSuit: null, winnerId: null };
    const winnerSeat = this.state.players[winnerId].seat;
    hand.currentTurnSeat = winnerSeat;
    hand.leadSeat = winnerSeat;

    const centerPileTrickCount = hand.centerPile.trickCount;

    let handComplete = false;
    let handWinner: TeamId | null = null;
    let matchComplete = false;
    let matchWinner: TeamId | null = null;

    if (hand.completedTricksThisHand === 13) {
      const result = this.checkHandWinner();
      handComplete = true;
      handWinner = result.winner;
      const matchResult = this.updateMatchScore(result.winner);
      matchComplete = matchResult.complete;
      matchWinner = matchResult.winner;
    }

    return {
      trickComplete: true,
      doubleSarClaimed,
      claimedByTeam,
      centerPileTrickCount,
      handComplete,
      handWinner,
      matchComplete,
      matchWinner,
    };
  }

  private findTrickWinner(trick: Trick): PlayerId {
    const ledSuit = trick.ledSuit!;
    const trump = this.state.currentHand!.trumpSuit;

    let best = trick.cards[0];
    for (let i = 1; i < trick.cards.length; i++) {
      const cmp = compareTrickCards(trick.cards[i].card, best.card, ledSuit, trump);
      if (cmp > 0) best = trick.cards[i];
    }
    return best.playerId;
  }

  private creditTeam(team: TeamId, count: number, hand: HandState): void {
    if (team === 'A') hand.teamAClaimedTricks += count;
    else hand.teamBClaimedTricks += count;
  }

  private checkHandWinner(): { winner: TeamId } {
    const hand = this.requireHand();
    const winner: TeamId = hand.teamAClaimedTricks >= 7 ? 'A' : 'B';

    const completed: CompletedHand = {
      handNumber: hand.handNumber,
      teamAClaimedTricks: hand.teamAClaimedTricks,
      teamBClaimedTricks: hand.teamBClaimedTricks,
      winner,
      trumpSuit: hand.trumpSuit,
    };
    this.state.handHistory.push(completed);
    return { winner };
  }

  private updateMatchScore(winner: TeamId): { complete: boolean; winner: TeamId | null } {
    if (winner === 'A') this.state.teamAHandsWon++;
    else this.state.teamBHandsWon++;

    const needed = this.state.handsToWin;
    if (this.state.teamAHandsWon >= needed) {
      this.state.winner = 'A';
      this.state.phase = 'MATCH_COMPLETED';
      return { complete: true, winner: 'A' };
    }
    if (this.state.teamBHandsWon >= needed) {
      this.state.winner = 'B';
      this.state.phase = 'MATCH_COMPLETED';
      return { complete: true, winner: 'B' };
    }
    return { complete: false, winner: null };
  }

  startNextHand(): void {
    if (this.state.phase === 'MATCH_COMPLETED') return;
    const nextHandNumber = (this.state.currentHand?.handNumber ?? -1) + 1;
    this.startHand(nextHandNumber);
  }

  // ─── Seat / Turn Utilities ───────────────────────────────────────────────────

  private seatOrder(startAfterSeat: SeatIndex, includeStart = false): SeatIndex[] {
    const dir = this.state.ruleset.tableDirection === 'clockwise' ? 1 : -1;
    const order: SeatIndex[] = [];
    let s = includeStart ? startAfterSeat : (((startAfterSeat + dir) % 4 + 4) % 4) as SeatIndex;
    for (let i = 0; i < 4; i++) {
      order.push(s);
      s = (((s + dir) % 4 + 4) % 4) as SeatIndex;
    }
    return order;
  }

  private nextSeat(seat: SeatIndex): SeatIndex {
    const dir = this.state.ruleset.tableDirection === 'clockwise' ? 1 : -1;
    return (((seat + dir) % 4 + 4) % 4) as SeatIndex;
  }

  private getDealerSeat(handNumber: number): SeatIndex {
    // Classic rotation: dealer advances by 1 each hand
    return (handNumber % 4) as SeatIndex;
  }

  private getCallerSeat(dealerSeat: SeatIndex): SeatIndex {
    const { callerRotation, tableDirection } = this.state.ruleset;
    const dir = tableDirection === 'clockwise' ? 1 : -1;
    switch (callerRotation) {
      case 'classic':
      case 'dealer-left':
        return (((dealerSeat + dir) % 4 + 4) % 4) as SeatIndex;
      case 'dealer-right':
        return (((dealerSeat - dir + 4) % 4) % 4) as SeatIndex;
      default:
        return (((dealerSeat + dir) % 4 + 4) % 4) as SeatIndex;
    }
  }

  // ─── Disconnection / Bot ─────────────────────────────────────────────────────

  handleDisconnect(playerId: PlayerId): void {
    const info = this.state.players[playerId];
    if (info) info.isConnected = false;
  }

  handleReconnect(playerId: PlayerId): void {
    const info = this.state.players[playerId];
    if (info) info.isConnected = true;
  }

  activateBot(playerId: PlayerId): void {
    const info = this.state.players[playerId];
    if (info) {
      info.isBot = true;
      info.isConnected = true;
    }
  }

  // ─── State Serialization ─────────────────────────────────────────────────────

  serializeStateForPlayer(playerId: PlayerId): PlayerGameView {
    const { state } = this;
    const hand = state.currentHand;

    const players: PlayerPublicInfo[] = Object.values(state.players).map(p => ({
      id: p.id,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      isBot: p.isBot,
      isConnected: p.isConnected,
      seat: p.seat,
      team: p.team,
      cardCount: hand ? hand.hands[p.id]?.length ?? 0 : 0,
    }));

    const myHand = hand?.hands[playerId] ?? [];
    const legalCardIds =
      hand?.phase === 'HAND_IN_PROGRESS' &&
      state.seatMap[hand.currentTurnSeat] === playerId
        ? this.getLegalCards(playerId).map(c => c.id)
        : [];

    return {
      matchId: state.matchId,
      myPlayerId: playerId,
      myHand,
      players,
      seatMap: state.seatMap,
      phase: state.phase,
      trumpSuit: hand?.trumpSuit ?? null,
      trumpCallerId: hand?.trumpCallerId ?? null,
      currentTurnSeat: hand?.currentTurnSeat ?? null,
      callerSeat: hand?.callerSeat ?? null,
      dealerSeat: hand?.dealerSeat ?? null,
      currentTrick: hand?.currentTrick.cards ?? [],
      centerPileTrickCount: hand?.centerPile.trickCount ?? 0,
      lastTrickWinnerId: hand?.lastTrickWinnerId ?? null,
      teamAClaimedTricks: hand?.teamAClaimedTricks ?? 0,
      teamBClaimedTricks: hand?.teamBClaimedTricks ?? 0,
      teamAHandsWon: state.teamAHandsWon,
      teamBHandsWon: state.teamBHandsWon,
      legalCardIds,
      handNumber: hand?.handNumber ?? 0,
      completedTricksThisHand: hand?.completedTricksThisHand ?? 0,
    };
  }

  serializePublicState(): Omit<PlayerGameView, 'myHand' | 'legalCardIds' | 'myPlayerId'> {
    const { state } = this;
    const hand = state.currentHand;

    const players: PlayerPublicInfo[] = Object.values(state.players).map(p => ({
      id: p.id, displayName: p.displayName, avatarUrl: p.avatarUrl,
      isBot: p.isBot, isConnected: p.isConnected, seat: p.seat,
      team: p.team, cardCount: hand ? hand.hands[p.id]?.length ?? 0 : 0,
    }));

    return {
      matchId: state.matchId,
      players,
      seatMap: state.seatMap,
      phase: state.phase,
      trumpSuit: hand?.trumpSuit ?? null,
      trumpCallerId: hand?.trumpCallerId ?? null,
      currentTurnSeat: hand?.currentTurnSeat ?? null,
      callerSeat: hand?.callerSeat ?? null,
      dealerSeat: hand?.dealerSeat ?? null,
      currentTrick: hand?.currentTrick.cards ?? [],
      centerPileTrickCount: hand?.centerPile.trickCount ?? 0,
      lastTrickWinnerId: hand?.lastTrickWinnerId ?? null,
      teamAClaimedTricks: hand?.teamAClaimedTricks ?? 0,
      teamBClaimedTricks: hand?.teamBClaimedTricks ?? 0,
      teamAHandsWon: state.teamAHandsWon,
      teamBHandsWon: state.teamBHandsWon,
      handNumber: hand?.handNumber ?? 0,
      completedTricksThisHand: hand?.completedTricksThisHand ?? 0,
    };
  }

  private requireHand(): HandState {
    if (!this.state.currentHand) throw new Error('No active hand');
    return this.state.currentHand;
  }
}
