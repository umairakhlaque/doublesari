import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getSocket } from '../socket/client';

export const Lobby: React.FC = () => {
  const { myDisplayName, isConnected, roomCode } = useGameStore();
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState<'classic' | 'casual'>('classic');
  const [error, setError] = useState('');

  const createRoom = () => {
    getSocket().emit('create_room', { mode });
  };

  const joinRoom = () => {
    const code = joinCode.trim();
    if (code.length !== 4 || !/^\d+$/.test(code)) {
      setError('Enter a valid 4-digit room code');
      return;
    }
    setError('');
    getSocket().emit('join_room', { code });
  };

  const quickMatch = () => {
    getSocket().emit('quick_match');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-yellow-400 tracking-wide mb-1">
          Double Sar
        </h1>
        <p className="text-gray-400 text-sm">Premium Online Card Game</p>
        <div
          className={`mt-2 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
            isConnected ? 'bg-green-900/40 text-green-400 border border-green-700' : 'bg-red-900/40 text-red-400 border border-red-700'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          {isConnected ? `Connected as ${myDisplayName}` : 'Connecting…'}
        </div>
      </div>

      {/* Main card */}
      <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl">
        {/* Quick match */}
        <button
          className="w-full bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-black py-4 rounded-xl text-lg transition-all active:scale-95 mb-4 shadow-lg shadow-yellow-500/20"
          onClick={quickMatch}
          disabled={!isConnected}
        >
          ⚡ Quick Match
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-700" />
          <span className="text-gray-500 text-xs">or</span>
          <div className="flex-1 h-px bg-gray-700" />
        </div>

        {/* Create room */}
        <div className="mb-4">
          <label className="text-gray-400 text-xs mb-1 block">Game Mode</label>
          <div className="flex gap-2 mb-3">
            {(['classic', 'casual'] as const).map(m => (
              <button
                key={m}
                className={`flex-1 py-2 rounded-xl border text-sm font-semibold capitalize transition-all
                  ${mode === m ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400' : 'border-gray-600 text-gray-400 hover:border-gray-400'}`}
                onClick={() => setMode(m)}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            className="w-full bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors"
            onClick={createRoom}
            disabled={!isConnected}
          >
            Create Private Room
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-700" />
          <span className="text-gray-500 text-xs">join with code</span>
          <div className="flex-1 h-px bg-gray-700" />
        </div>

        {/* Join room */}
        <div className="flex gap-2">
          <input
            className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-lg font-bold tracking-widest text-center placeholder-gray-600 outline-none focus:border-yellow-500 transition-colors"
            placeholder="1234"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            onKeyDown={e => e.key === 'Enter' && joinRoom()}
            maxLength={4}
            inputMode="numeric"
            aria-label="Room code"
          />
          <button
            className="bg-green-700 hover:bg-green-600 text-white font-bold px-4 rounded-xl transition-colors"
            onClick={joinRoom}
            disabled={!isConnected}
            aria-label="Join room"
          >
            Join
          </button>
        </div>
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </div>

      {/* Room code display (after creating) */}
      {roomCode && (
        <div className="mt-4 w-full max-w-md bg-gray-900/60 border border-green-700 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-xs mb-1">Your room code — share with friends</p>
          <p className="text-4xl font-black text-green-400 tracking-widest">{roomCode}</p>
          <p className="text-gray-500 text-xs mt-1">Waiting for players to join…</p>
        </div>
      )}

      {/* Feature highlights */}
      <div className="mt-8 grid grid-cols-3 gap-3 w-full max-w-md">
        {[
          { icon: '🃏', label: 'Classic Double Sar' },
          { icon: '⚡', label: 'Real-time Multiplayer' },
          { icon: '🤖', label: 'Smart Bot Fill' },
        ].map(f => (
          <div key={f.label} className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 text-center">
            <div className="text-2xl mb-1">{f.icon}</div>
            <div className="text-gray-400 text-[10px]">{f.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
