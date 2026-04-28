import React, { useState } from 'react';
import { getSocket } from '../socket/client';
import { useGameStore } from '../store/gameStore';

const EMOTES = [
  { id: 'well_played', label: 'Well played', emoji: '👏' },
  { id: 'nice', label: 'Nice', emoji: '👍' },
  { id: 'oops', label: 'Oops', emoji: '😬' },
  { id: 'good_luck', label: 'Good luck', emoji: '🍀' },
  { id: 'laugh', label: 'Haha', emoji: '😂' },
  { id: 'thinking', label: 'Thinking', emoji: '🤔' },
];

export const EmoteWheel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { emotes, gameView } = useGameStore();

  const send = (emoteId: string) => {
    getSocket().emit('send_emote', { emoteId });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        className="text-xs text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-1"
        onClick={() => setOpen(o => !o)}
        aria-label="Open emote wheel"
        aria-expanded={open}
      >
        <span>😊</span>
        <span>Emote</span>
      </button>

      {open && (
        <div className="absolute bottom-8 left-0 bg-gray-900 border border-gray-700 rounded-xl p-2 grid grid-cols-3 gap-1 shadow-xl z-30 w-36">
          {EMOTES.map(e => (
            <button
              key={e.id}
              className="flex flex-col items-center p-1 rounded-lg hover:bg-gray-700 transition-colors text-center"
              onClick={() => send(e.id)}
              title={e.label}
              aria-label={e.label}
            >
              <span className="text-xl">{e.emoji}</span>
              <span className="text-[9px] text-gray-400">{e.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Recent emotes overlay — shown above each player */}
      {emotes.slice(-3).map(ev => {
        const emote = EMOTES.find(e => e.id === ev.emoteId);
        const player = gameView?.players.find(p => p.id === ev.senderId);
        if (!emote || !player) return null;
        return (
          <div
            key={`${ev.senderId}_${ev.timestamp}`}
            className="fixed pointer-events-none text-2xl animate-bounce"
            style={{ bottom: '6rem', left: '1rem', zIndex: 50 }}
          >
            {emote.emoji}
          </div>
        );
      })}
    </div>
  );
};
