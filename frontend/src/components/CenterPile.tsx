import React from 'react';
import { useGameStore } from '../store/gameStore';
import { FaceDownCard } from './Card';

export const CenterPile: React.FC = () => {
  const { gameView, lastDoubleSarTeam } = useGameStore();
  const count = gameView?.centerPileTrickCount ?? 0;
  const isBigPile = count >= 4;
  const isWarning = count >= 3 && !isBigPile;

  const isClaimed = lastDoubleSarTeam !== null;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Pile visual */}
      <div className="relative flex items-center justify-center w-24 h-20">
        {count === 0 && !isClaimed && (
          <div className="w-12 h-16 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center">
            <span className="text-gray-600 text-xs">Empty</span>
          </div>
        )}

        {count > 0 && (
          <>
            {/* Stacked card effect */}
            {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  transform: `translate(${i * 2}px, ${-i * 2}px) rotate(${(i - 1) * 3}deg)`,
                  zIndex: i,
                }}
              >
                <FaceDownCard size="sm" />
              </div>
            ))}
          </>
        )}

        {isClaimed && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`text-2xl animate-bounce ${lastDoubleSarTeam === 'A' ? 'text-blue-400' : 'text-rose-400'}`}
            >
              ✦
            </div>
          </div>
        )}
      </div>

      {/* Counter label */}
      <div
        className={`
          px-3 py-1 rounded-full text-xs font-bold border transition-all duration-300
          ${isClaimed
            ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300 animate-pulse'
            : isBigPile
            ? 'bg-red-500/20 border-red-400 text-red-300 animate-pulse'
            : isWarning
            ? 'bg-orange-500/20 border-orange-400 text-orange-300'
            : 'bg-gray-800 border-gray-600 text-gray-400'}
        `}
        aria-live="polite"
        aria-label={`${count} tricks in center pile`}
      >
        {isClaimed
          ? `Double Sar! Team ${lastDoubleSarTeam}`
          : count === 0
          ? 'Center Pile'
          : isBigPile
          ? `⚠ ${count} Sar — Big pile!`
          : `${count} Sar in pile`}
      </div>
    </div>
  );
};
