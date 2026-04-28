import React from 'react';
import { useGameStore } from '../store/gameStore';
import { getSocket } from '../socket/client';

export const PostGameSummary: React.FC = () => {
  const { matchResult, handResult, showHandResult, myTeam, gameView, reset } = useGameStore();

  // Hand result overlay (brief)
  if (showHandResult && handResult) {
    const won = handResult.winner === myTeam;
    return (
      <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
        <div
          className={`
            px-8 py-4 rounded-2xl border-2 text-center shadow-2xl
            ${won ? 'bg-blue-900/90 border-blue-400' : 'bg-rose-900/90 border-rose-400'}
          `}
        >
          <div className="text-3xl mb-1">{won ? '🎉' : '😤'}</div>
          <div className={`text-xl font-bold ${won ? 'text-blue-200' : 'text-rose-200'}`}>
            {won ? 'Hand Won!' : 'Hand Lost'}
          </div>
          <div className="text-sm text-gray-300 mt-1">
            Team A: {handResult.teamAClaimedTricks} tricks •
            Team B: {handResult.teamBClaimedTricks} tricks
          </div>
        </div>
      </div>
    );
  }

  // Match complete screen
  if (matchResult) {
    const won = matchResult.winner === myTeam;
    return (
      <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/80">
        <div className="bg-gray-900 border-2 border-yellow-500 rounded-2xl p-8 text-center max-w-sm w-full mx-4 shadow-2xl">
          <div className="text-5xl mb-3">{won ? '🏆' : '🤝'}</div>
          <h2 className={`text-2xl font-bold mb-1 ${won ? 'text-yellow-400' : 'text-gray-300'}`}>
            {won ? 'Victory!' : 'Defeated'}
          </h2>
          <p className="text-gray-400 mb-4">
            Team {matchResult.winner} wins the match
          </p>

          <div className="flex justify-center gap-8 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">{matchResult.teamAHandsWon}</div>
              <div className="text-xs text-gray-500">Team A</div>
            </div>
            <div className="text-gray-600 text-xl self-center">:</div>
            <div className="text-center">
              <div className="text-3xl font-bold text-rose-400">{matchResult.teamBHandsWon}</div>
              <div className="text-xs text-gray-500">Team B</div>
            </div>
          </div>

          {gameView && (
            <div className="text-xs text-gray-600 mb-6">
              {gameView.handHistory?.length ?? 0} hands played
            </div>
          )}

          <div className="flex gap-3">
            <button
              className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-4 rounded-xl transition-colors"
              onClick={() => getSocket().emit('quick_match')}
            >
              Play Again
            </button>
            <button
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold py-2 px-4 rounded-xl transition-colors"
              onClick={reset}
            >
              Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
