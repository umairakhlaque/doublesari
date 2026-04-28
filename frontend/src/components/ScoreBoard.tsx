import React from 'react';
import { useGameStore } from '../store/gameStore';

export const ScoreBoard: React.FC = () => {
  const { gameView } = useGameStore();
  if (!gameView) return null;

  const {
    teamAHandsWon, teamBHandsWon,
    teamAClaimedTricks, teamBClaimedTricks,
    trumpSuit, completedTricksThisHand, handNumber,
  } = gameView;

  const handsToWin = 3; // best of 5 default

  return (
    <div className="flex flex-col gap-1 text-xs font-semibold select-none">
      {/* Match score */}
      <div className="flex items-center gap-2 bg-gray-900/80 border border-gray-700 rounded-xl px-3 py-2">
        <div className="flex flex-col items-center">
          <span className="text-blue-400">Team A</span>
          <span className="text-xl text-white">{teamAHandsWon}</span>
        </div>
        <div className="flex flex-col items-center text-gray-500 text-[10px]">
          <span>Best of 5</span>
          <span className="text-gray-600">Hand {handNumber + 1}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-rose-400">Team B</span>
          <span className="text-xl text-white">{teamBHandsWon}</span>
        </div>
      </div>

      {/* Trick score */}
      <div className="flex items-center gap-2 bg-gray-900/80 border border-gray-700 rounded-xl px-3 py-1">
        <span className="text-blue-300 w-6 text-center">{teamAClaimedTricks}</span>
        <span className="text-gray-500 text-[10px] flex-1 text-center">
          Tricks ({completedTricksThisHand}/13)
        </span>
        <span className="text-rose-300 w-6 text-center">{teamBClaimedTricks}</span>
      </div>

      {/* Trump indicator */}
      {trumpSuit && (
        <div className="flex items-center justify-center gap-1 bg-purple-900/40 border border-purple-700 rounded-xl px-3 py-1">
          <span className="text-purple-300">Trump:</span>
          <span
            className="text-lg"
            style={{ color: trumpSuit === 'hearts' || trumpSuit === 'diamonds' ? '#f87171' : '#e2e8f0' }}
          >
            {trumpSuit === 'spades' ? '♠' : trumpSuit === 'hearts' ? '♥' : trumpSuit === 'diamonds' ? '♦' : '♣'}
          </span>
          <span className="text-purple-200 capitalize">{trumpSuit}</span>
        </div>
      )}
    </div>
  );
};
