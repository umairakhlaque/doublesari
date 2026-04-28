import React from 'react';
import { Suit, SUIT_SYMBOLS, SUIT_COLORS, SUIT_LABELS } from '../types';
import { getSocket } from '../socket/client';

interface TrumpSelectorProps {
  isMyTurn: boolean;
  myHand: { suit: Suit; rank: string }[];
}

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export const TrumpSelector: React.FC<TrumpSelectorProps> = ({ isMyTurn, myHand }) => {
  const suitCounts = SUITS.reduce<Record<Suit, number>>((acc, s) => {
    acc[s] = myHand.filter(c => c.suit === s).length;
    return acc;
  }, { spades: 0, hearts: 0, diamonds: 0, clubs: 0 });

  const selectTrump = (suit: Suit) => {
    getSocket().emit('select_trump', { suit });
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20 rounded-2xl">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 text-center shadow-2xl max-w-xs w-full mx-4">
        <h2 className="text-yellow-400 font-bold text-lg mb-1">Choose Trump / Rang</h2>
        <p className="text-gray-400 text-xs mb-4">
          {isMyTurn ? 'Select the trump suit for this hand' : 'Waiting for trump caller…'}
        </p>

        <div className="grid grid-cols-2 gap-3">
          {SUITS.map(suit => (
            <button
              key={suit}
              className={`
                flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all
                ${isMyTurn
                  ? 'border-gray-600 hover:border-gray-400 hover:bg-gray-800 cursor-pointer active:scale-95'
                  : 'border-gray-700 opacity-50 cursor-not-allowed'}
              `}
              style={{ color: SUIT_COLORS[suit] }}
              onClick={isMyTurn ? () => selectTrump(suit) : undefined}
              disabled={!isMyTurn}
              aria-label={`Select ${SUIT_LABELS[suit]} as trump`}
            >
              <span className="text-3xl">{SUIT_SYMBOLS[suit]}</span>
              <span className="text-xs font-semibold">{SUIT_LABELS[suit]}</span>
              <span className="text-xs text-gray-500">{suitCounts[suit]} cards</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
