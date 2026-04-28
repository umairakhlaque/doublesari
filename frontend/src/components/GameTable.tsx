import React, { useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { getSocket } from '../socket/client';
import { getSeatPosition, SeatIndex, TrickCard } from '../types';
import { CardComponent } from './Card';
import { PlayerSeat } from './PlayerSeat';
import { CenterPile } from './CenterPile';
import { TrumpSelector } from './TrumpSelector';
import { ScoreBoard } from './ScoreBoard';
import { ChatBox } from './ChatBox';
import { EmoteWheel } from './EmoteWheel';
import { PostGameSummary } from './PostGameSummary';

export const GameTable: React.FC = () => {
  const {
    gameView, mySeat, myPlayerId, myTeam,
    selectedCardId, selectCard, notifications, dismissNotification,
  } = useGameStore();

  const handleCardClick = useCallback((cardId: string) => {
    if (!gameView) return;
    const isMyTurn = gameView.seatMap[gameView.currentTurnSeat!] === myPlayerId;
    if (!isMyTurn) return;

    if (selectedCardId === cardId) {
      // Second tap = play
      getSocket().emit('play_card', { cardId });
      selectCard(null);
    } else {
      selectCard(cardId);
    }
  }, [gameView, myPlayerId, selectedCardId, selectCard]);

  if (!gameView) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Connecting to game…</div>
      </div>
    );
  }

  const {
    players, seatMap, phase, trumpSuit, trumpCallerId,
    currentTurnSeat, callerSeat, dealerSeat,
    currentTrick, legalCardIds, myHand,
  } = gameView;

  const myActualSeat = mySeat ?? (0 as SeatIndex);
  const isMyTurn = seatMap[currentTurnSeat!] === myPlayerId;
  const showTrumpSelector = phase === 'TRUMP_SELECTION';
  const isMyTrumpTurn = showTrumpSelector && trumpCallerId === myPlayerId;

  // Map trick cards by playerId for quick lookup
  const trickCardMap = new Map<string, TrickCard>();
  for (const tc of currentTrick) trickCardMap.set(tc.playerId, tc);

  // Seats in display order: [bottom=me, right, top, left]
  const seats = ([0, 1, 2, 3] as SeatIndex[]);

  return (
    <div className="relative flex flex-col h-full min-h-screen bg-gray-950 overflow-hidden">
      {/* Notifications */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-1 items-center pointer-events-none">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`
              px-4 py-2 rounded-full text-sm font-semibold shadow-lg border
              ${n.type === 'double_sar'
                ? 'bg-yellow-900/90 border-yellow-500 text-yellow-200'
                : n.type === 'trick_win' && n.teamId === myTeam
                ? 'bg-blue-900/90 border-blue-400 text-blue-200'
                : n.type === 'trick_win'
                ? 'bg-rose-900/90 border-rose-400 text-rose-200'
                : 'bg-gray-900/90 border-gray-600 text-gray-200'}
            `}
          >
            {n.message}
          </div>
        ))}
      </div>

      {/* Table area */}
      <div className="flex-1 flex flex-col relative">
        {/* Top player */}
        {(() => {
          const topSeat = (((myActualSeat + 2) % 4) as SeatIndex);
          const pid = seatMap[topSeat];
          const player = players.find(p => p.id === pid) ?? null;
          return (
            <div className="flex justify-center pt-4">
              <PlayerSeat
                player={player}
                position="top"
                isCurrentTurn={currentTurnSeat === topSeat}
                isDealer={dealerSeat === topSeat}
                isCaller={callerSeat === topSeat}
                trickCard={pid ? trickCardMap.get(pid) : undefined}
                isMyTeam={player?.team === myTeam}
              />
            </div>
          );
        })()}

        {/* Middle row: left, center, right */}
        <div className="flex-1 flex items-center justify-between px-4">
          {/* Left player */}
          {(() => {
            const leftSeat = (((myActualSeat + 3) % 4) as SeatIndex);
            const pid = seatMap[leftSeat];
            const player = players.find(p => p.id === pid) ?? null;
            return (
              <PlayerSeat
                player={player}
                position="left"
                isCurrentTurn={currentTurnSeat === leftSeat}
                isDealer={dealerSeat === leftSeat}
                isCaller={callerSeat === leftSeat}
                trickCard={pid ? trickCardMap.get(pid) : undefined}
                isMyTeam={player?.team === myTeam}
              />
            );
          })()}

          {/* Center: pile + score */}
          <div className="flex flex-col items-center gap-4">
            <ScoreBoard />
            <CenterPile />
          </div>

          {/* Right player */}
          {(() => {
            const rightSeat = (((myActualSeat + 1) % 4) as SeatIndex);
            const pid = seatMap[rightSeat];
            const player = players.find(p => p.id === pid) ?? null;
            return (
              <PlayerSeat
                player={player}
                position="right"
                isCurrentTurn={currentTurnSeat === rightSeat}
                isDealer={dealerSeat === rightSeat}
                isCaller={callerSeat === rightSeat}
                trickCard={pid ? trickCardMap.get(pid) : undefined}
                isMyTeam={player?.team === myTeam}
              />
            );
          })()}
        </div>

        {/* Bottom player (me) — trickcard in center area already shown above */}
        <div className="flex justify-center pb-2">
          {(() => {
            const pid = seatMap[myActualSeat];
            const player = players.find(p => p.id === pid) ?? null;
            return (
              <PlayerSeat
                player={player}
                position="bottom"
                isCurrentTurn={currentTurnSeat === myActualSeat}
                isDealer={dealerSeat === myActualSeat}
                isCaller={callerSeat === myActualSeat}
                trickCard={pid ? trickCardMap.get(pid) : undefined}
                isMyTeam={true}
              />
            );
          })()}
        </div>

        {/* Trump selector overlay */}
        {showTrumpSelector && (
          <TrumpSelector isMyTurn={isMyTrumpTurn} myHand={myHand} />
        )}
      </div>

      {/* My hand */}
      <div className="bg-gray-900/80 border-t border-gray-800 p-3">
        {isMyTurn && phase === 'HAND_IN_PROGRESS' && (
          <p className="text-center text-yellow-400 text-xs mb-2 font-semibold">
            Your turn — {selectedCardId ? 'Tap selected card again to play' : 'Select a card'}
          </p>
        )}

        <div className="flex justify-center gap-1 flex-wrap">
          {myHand.map(card => (
            <CardComponent
              key={card.id}
              card={card}
              isLegal={phase === 'HAND_IN_PROGRESS' ? legalCardIds.includes(card.id) : true}
              isSelected={selectedCardId === card.id}
              size="md"
              onClick={() => handleCardClick(card.id)}
              disabled={!isMyTurn || phase !== 'HAND_IN_PROGRESS'}
            />
          ))}
          {myHand.length === 0 && phase !== 'WAITING' && (
            <span className="text-gray-600 text-xs">No cards in hand</span>
          )}
        </div>

        {/* Chat and emotes row */}
        <div className="flex items-start gap-4 mt-2 px-1">
          <ChatBox teamChatEnabled={!gameView?.phase?.includes('COMPLETED')} />
          <EmoteWheel />
        </div>
      </div>

      {/* Post game overlays */}
      <PostGameSummary />
    </div>
  );
};
