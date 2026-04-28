import React from 'react';
import { PlayerPublicInfo, TrickCard, TablePosition, SUIT_SYMBOLS } from '../types';
import { FaceDownCard } from './Card';

interface PlayerSeatProps {
  player: PlayerPublicInfo | null;
  position: TablePosition;
  isCurrentTurn: boolean;
  isDealer: boolean;
  isCaller: boolean;
  trickCard?: TrickCard;
  isMyTeam: boolean;
}

const POSITION_CLASSES: Record<TablePosition, string> = {
  bottom: 'flex-col-reverse items-center',
  top: 'flex-col items-center',
  left: 'flex-row-reverse items-center',
  right: 'flex-row items-center',
};

const TRICK_CARD_OFFSET: Record<TablePosition, string> = {
  bottom: 'mb-2',
  top: 'mt-2',
  left: 'mr-2',
  right: 'ml-2',
};

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  position,
  isCurrentTurn,
  isDealer,
  isCaller,
  trickCard,
  isMyTeam,
}) => {
  const teamColor = isMyTeam ? 'border-blue-500' : 'border-rose-500';
  const teamBg = isMyTeam ? 'bg-blue-500/10' : 'bg-rose-500/10';

  return (
    <div className={`flex ${POSITION_CLASSES[position]} gap-2`}>
      {/* Player info card */}
      <div
        className={`
          relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2
          ${isCurrentTurn ? `${teamColor} ${teamBg} shadow-lg` : 'border-gray-700 bg-gray-900/60'}
          transition-all duration-300 min-w-[80px]
        `}
      >
        {/* Turn indicator ring */}
        {isCurrentTurn && (
          <div className={`absolute -inset-1 rounded-xl border-2 ${teamColor} animate-pulse opacity-60`} />
        )}

        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full border-2 ${teamColor} bg-gray-800 flex items-center justify-center text-lg`}>
          {player ? (player.isBot ? '🤖' : player.displayName.charAt(0).toUpperCase()) : '?'}
        </div>

        {/* Name */}
        <span className="text-xs font-semibold text-gray-200 truncate max-w-[80px]">
          {player ? player.displayName : 'Waiting…'}
        </span>

        {/* Card count */}
        {player && (
          <span className="text-xs text-gray-500">{player.cardCount} cards</span>
        )}

        {/* Badges */}
        <div className="flex gap-1">
          {isDealer && (
            <span className="text-xs bg-yellow-700 text-yellow-200 px-1 rounded" title="Dealer">D</span>
          )}
          {isCaller && (
            <span className="text-xs bg-purple-700 text-purple-200 px-1 rounded" title="Trump caller">T</span>
          )}
          {player && !player.isConnected && (
            <span className="text-xs bg-red-800 text-red-200 px-1 rounded" title="Disconnected">⚡</span>
          )}
        </div>
      </div>

      {/* Trick card played by this player */}
      {trickCard && (
        <div className={`${TRICK_CARD_OFFSET[position]}`}>
          <div
            className="w-12 h-16 rounded-lg border-2 border-yellow-500/50 bg-gray-900 flex flex-col items-center justify-between p-1"
            style={{ color: trickCard.card.suit === 'hearts' || trickCard.card.suit === 'diamonds' ? '#f87171' : '#e2e8f0' }}
          >
            <span className="text-xs font-bold self-start">{trickCard.card.rank}</span>
            <span className="text-base">{SUIT_SYMBOLS[trickCard.card.suit]}</span>
            <span className="text-xs font-bold self-end rotate-180">{trickCard.card.rank}</span>
          </div>
        </div>
      )}
    </div>
  );
};
