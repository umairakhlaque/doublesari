/**
 * BotEngine — Beginner-level AI for MVP.
 * Plays a legal random card. Intermediate/Advanced AI is Phase 2.
 */

import { GameEngine } from './GameEngine';
import { PlayerId, Suit } from './types';

export class BotEngine {
  constructor(private engine: GameEngine) {}

  // Returns the card ID the bot wants to play, or null if not its turn.
  decideTrump(botPlayerId: PlayerId): Suit {
    const hand = this.engine.state.currentHand;
    if (!hand) throw new Error('No active hand');
    const cards = hand.hands[botPlayerId] ?? [];

    // Count suits, pick most common
    const suitCounts: Record<string, number> = {};
    for (const c of cards) {
      suitCounts[c.suit] = (suitCounts[c.suit] ?? 0) + 1;
    }
    const best = Object.entries(suitCounts).sort((a, b) => b[1] - a[1])[0];
    return (best ? best[0] : 'spades') as Suit;
  }

  decideCard(botPlayerId: PlayerId): string | null {
    const legalCards = this.engine.getLegalCards(botPlayerId);
    if (legalCards.length === 0) return null;
    const pick = legalCards[Math.floor(Math.random() * legalCards.length)];
    return pick.id;
  }
}
