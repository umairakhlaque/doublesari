import React from 'react';
import { Card as CardType, SUIT_SYMBOLS, SUIT_COLORS } from '../types';

interface CardProps {
  card: CardType;
  isLegal?: boolean;
  isSelected?: boolean;
  isFaceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
}

const SIZE_CLASSES = {
  sm: 'w-10 h-14 text-xs',
  md: 'w-14 h-20 text-sm',
  lg: 'w-16 h-24 text-base',
};

export const CardComponent: React.FC<CardProps> = ({
  card,
  isLegal = true,
  isSelected = false,
  isFaceDown = false,
  size = 'md',
  onClick,
  disabled = false,
}) => {
  const sizeClass = SIZE_CLASSES[size];
  const color = SUIT_COLORS[card.suit];
  const symbol = SUIT_SYMBOLS[card.suit];

  if (isFaceDown) {
    return (
      <div
        className={`${sizeClass} rounded-lg border-2 border-gray-600 bg-gradient-to-br from-indigo-800 to-indigo-950 flex items-center justify-center select-none`}
        role="img"
        aria-label="Face-down card"
      >
        <span className="text-indigo-400 text-lg">✦</span>
      </div>
    );
  }

  return (
    <button
      className={`
        ${sizeClass} rounded-lg border-2 flex flex-col items-center justify-between p-1
        font-bold select-none transition-all duration-150
        ${isSelected
          ? 'border-yellow-400 bg-gray-800 -translate-y-3 shadow-lg shadow-yellow-500/30'
          : 'bg-gray-900 border-gray-600'}
        ${!isLegal || disabled
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:border-gray-400 hover:bg-gray-800 cursor-pointer active:scale-95'}
      `}
      style={{ color }}
      onClick={isLegal && !disabled ? onClick : undefined}
      disabled={!isLegal || disabled}
      aria-label={`${card.rank} of ${card.suit}`}
      aria-pressed={isSelected}
    >
      <span className="self-start leading-none">{card.rank}</span>
      <span className="text-lg leading-none">{symbol}</span>
      <span className="self-end leading-none rotate-180">{card.rank}</span>
    </button>
  );
};

export const FaceDownCard: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClass = SIZE_CLASSES[size];
  return (
    <div
      className={`${sizeClass} rounded-lg border-2 border-indigo-700 bg-gradient-to-br from-indigo-800 to-indigo-950 flex items-center justify-center`}
      role="img"
      aria-label="Face-down card"
    >
      <span className="text-indigo-400">✦</span>
    </div>
  );
};
