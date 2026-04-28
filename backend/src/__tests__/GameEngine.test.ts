import { GameEngine } from '../game/GameEngine';
import { createDeck, shuffleDeck } from '../utils/deck';

// ─── Deck Tests ──────────────────────────────────────────────────────────────

describe('Deck', () => {
  test('has exactly 52 unique cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    const ids = new Set(deck.map(c => c.id));
    expect(ids.size).toBe(52);
  });

  test('shuffle does not duplicate or drop cards', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled).toHaveLength(52);
    const ids = new Set(shuffled.map(c => c.id));
    expect(ids.size).toBe(52);
  });

  test('shuffle produces different order (with high probability)', () => {
    const deck = createDeck();
    const s1 = shuffleDeck(deck);
    const s2 = shuffleDeck(deck);
    const sameOrder = s1.every((c, i) => c.id === s2[i].id);
    expect(sameOrder).toBe(false);
  });
});

// ─── Seat / Team Assignment ──────────────────────────────────────────────────

function setupFourPlayerEngine(): GameEngine {
  const engine = new GameEngine('match1', 'room1');
  engine.addPlayer('p0', 'Alice');
  engine.addPlayer('p1', 'Bob');
  engine.addPlayer('p2', 'Carol');
  engine.addPlayer('p3', 'Dave');
  return engine;
}

describe('Seat assignment', () => {
  test('assigns 4 players to seats 0-3', () => {
    const engine = setupFourPlayerEngine();
    const seats = Object.values(engine.state.players).map(p => p.seat);
    seats.sort();
    expect(seats).toEqual([0, 1, 2, 3]);
  });

  test('seats 0 and 2 are team A; seats 1 and 3 are team B', () => {
    const engine = setupFourPlayerEngine();
    for (const p of Object.values(engine.state.players)) {
      if (p.seat === 0 || p.seat === 2) expect(p.team).toBe('A');
      else expect(p.team).toBe('B');
    }
  });

  test('cannot add 5th player', () => {
    const engine = setupFourPlayerEngine();
    const seat = engine.addPlayer('p5', 'Extra');
    expect(seat).toBeNull();
  });
});

// ─── Deal Tests ───────────────────────────────────────────────────────────────

describe('Dealing', () => {
  test('deals 5 cards to each player initially', () => {
    const engine = setupFourPlayerEngine();
    engine.startMatch();
    const hand = engine.state.currentHand!;
    for (const pid of Object.keys(engine.state.players)) {
      expect(hand.hands[pid]).toHaveLength(5);
    }
  });

  test('deals 13 cards total after trump selection', () => {
    const engine = setupFourPlayerEngine();
    engine.startMatch();
    const hand = engine.state.currentHand!;
    const callerId = hand.trumpCallerId!;
    engine.selectTrump(callerId, 'spades');
    for (const pid of Object.keys(engine.state.players)) {
      expect(hand.hands[pid]).toHaveLength(13);
    }
  });
});

// ─── Trump Selection ──────────────────────────────────────────────────────────

describe('Trump selection', () => {
  test('only trump caller can select trump', () => {
    const engine = setupFourPlayerEngine();
    engine.startMatch();
    const hand = engine.state.currentHand!;
    const notCaller = Object.keys(engine.state.players).find(
      pid => pid !== hand.trumpCallerId,
    )!;
    expect(() => engine.selectTrump(notCaller, 'hearts')).toThrow();
  });

  test('trump is set after selection', () => {
    const engine = setupFourPlayerEngine();
    engine.startMatch();
    const hand = engine.state.currentHand!;
    engine.selectTrump(hand.trumpCallerId!, 'diamonds');
    expect(hand.trumpSuit).toBe('diamonds');
  });
});

// ─── Must-Follow-Suit Validation ─────────────────────────────────────────────

describe('Legal card validation', () => {
  function setupHandInProgress(): { engine: GameEngine; callerId: string } {
    const engine = setupFourPlayerEngine();
    engine.startMatch();
    const hand = engine.state.currentHand!;
    engine.selectTrump(hand.trumpCallerId!, 'spades');
    return { engine, callerId: hand.trumpCallerId! };
  }

  test('all cards are legal when leading', () => {
    const { engine, callerId } = setupHandInProgress();
    const hand = engine.state.currentHand!;
    const currentPlayer = engine.state.seatMap[hand.currentTurnSeat];
    const legal = engine.getLegalCards(currentPlayer);
    expect(legal).toHaveLength(13);
  });

  test('must follow suit when possible', () => {
    const { engine } = setupHandInProgress();
    const hand = engine.state.currentHand!;

    // Lead a card to set the led suit
    const leaderId = engine.state.seatMap[hand.currentTurnSeat];
    const leaderHand = hand.hands[leaderId];
    const ledCard = leaderHand[0];
    engine.playCard(leaderId, ledCard.id);

    // Next player must follow suit if they have it
    const nextId = engine.state.seatMap[hand.currentTurnSeat];
    const nextHand = hand.hands[nextId];
    const hasLedSuit = nextHand.some(c => c.suit === ledCard.suit);
    const legal = engine.getLegalCards(nextId);

    if (hasLedSuit) {
      expect(legal.every(c => c.suit === ledCard.suit)).toBe(true);
    } else {
      expect(legal).toHaveLength(nextHand.length); // can play anything
    }
  });
});

// ─── Trick Winner Logic ───────────────────────────────────────────────────────

describe('Trick evaluation', () => {
  test('rejects illegal card play (out of turn)', () => {
    const engine = setupFourPlayerEngine();
    engine.startMatch();
    const hand = engine.state.currentHand!;
    engine.selectTrump(hand.trumpCallerId!, 'spades');

    const currentSeat = hand.currentTurnSeat;
    const notCurrentId = Object.keys(engine.state.players).find(
      pid => engine.state.players[pid].seat !== currentSeat,
    )!;
    const card = hand.hands[notCurrentId][0];
    expect(() => engine.playCard(notCurrentId, card.id)).toThrow('Not your turn');
  });
});

// ─── Double Sar Center Pile Logic ────────────────────────────────────────────

describe('Double Sar center pile', () => {
  function playFullHand(engine: GameEngine): void {
    const hand = engine.state.currentHand!;
    engine.selectTrump(hand.trumpCallerId!, 'spades');

    let tricks = 0;
    while (tricks < 13) {
      const h = engine.state.currentHand!;
      if (h.phase !== 'HAND_IN_PROGRESS') break;
      const playerId = engine.state.seatMap[h.currentTurnSeat];
      const legal = engine.getLegalCards(playerId);
      engine.playCard(playerId, legal[0].id);
      if (h.currentTrick.cards.length === 0 && h.completedTricksThisHand > tricks) {
        tricks = h.completedTricksThisHand;
      }
    }
  }

  test('center pile grows with each trick', () => {
    const engine = setupFourPlayerEngine();
    engine.startMatch();
    const hand = engine.state.currentHand!;
    engine.selectTrump(hand.trumpCallerId!, 'spades');

    // Play one trick
    for (let i = 0; i < 4; i++) {
      const h = engine.state.currentHand!;
      const playerId = engine.state.seatMap[h.currentTurnSeat];
      const legal = engine.getLegalCards(playerId);
      engine.playCard(playerId, legal[0].id);
    }
    // After 1 trick, center pile should be either 1 (no double-sar yet) or 0 if first double sar
    const { currentHand } = engine.state;
    // Total claimed + pile = tricks played
    const tracked =
      currentHand!.teamAClaimedTricks +
      currentHand!.teamBClaimedTricks +
      currentHand!.centerPile.trickCount;
    expect(tracked).toBe(1);
  });

  test('final trick claims remaining center pile', () => {
    const engine = setupFourPlayerEngine();
    engine.startMatch();
    playFullHand(engine);
    // After hand, center pile must be 0
    const lastHand = engine.state.handHistory[0];
    expect(lastHand.teamAClaimedTricks + lastHand.teamBClaimedTricks).toBe(13);
  });

  test('team with 7+ claimed tricks wins hand', () => {
    const engine = setupFourPlayerEngine();
    engine.startMatch();
    playFullHand(engine);
    const lastHand = engine.state.handHistory[0];
    const winner = lastHand.winner;
    const winnerTricks =
      winner === 'A' ? lastHand.teamAClaimedTricks : lastHand.teamBClaimedTricks;
    expect(winnerTricks).toBeGreaterThanOrEqual(7);
  });
});

// ─── Match Scoring ────────────────────────────────────────────────────────────

describe('Match scoring', () => {
  test('match starts with 0-0 score', () => {
    const engine = setupFourPlayerEngine();
    engine.startMatch();
    expect(engine.state.teamAHandsWon).toBe(0);
    expect(engine.state.teamBHandsWon).toBe(0);
  });

  test('handsToWin is ceil(matchFormat/2)', () => {
    const engine = new GameEngine('m', 'r', { matchFormat: 5 });
    expect(engine.state.handsToWin).toBe(3);
    const engine2 = new GameEngine('m2', 'r2', { matchFormat: 3 });
    expect(engine2.state.handsToWin).toBe(2);
  });
});
