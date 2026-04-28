import { Card, Rank, Suit, RANK_VALUES } from '../game/types';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${rank}_${suit}`, suit, rank, value: RANK_VALUES[rank] });
    }
  }
  return deck;
}

// Fisher-Yates shuffle
export function shuffleDeck(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export function compareTrickCards(
  a: Card,
  b: Card,
  ledSuit: Suit,
  trumpSuit: Suit | null,
): number {
  const aIsTrump = trumpSuit !== null && a.suit === trumpSuit;
  const bIsTrump = trumpSuit !== null && b.suit === trumpSuit;
  const aIsLed = a.suit === ledSuit;
  const bIsLed = b.suit === ledSuit;

  if (aIsTrump && bIsTrump) return a.value - b.value;
  if (aIsTrump) return 1;
  if (bIsTrump) return -1;
  if (aIsLed && bIsLed) return a.value - b.value;
  if (aIsLed) return 1;
  if (bIsLed) return -1;
  return 0; // neither relevant — neither wins
}
