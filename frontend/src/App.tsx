import React, { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { useSocketEvents } from './hooks/useSocketEvents';
import { Lobby } from './components/Lobby';
import { GameTable } from './components/GameTable';

const App: React.FC = () => {
  useSocketEvents();
  const { roomId } = useGameStore();

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      {roomId ? <GameTable /> : <Lobby />}
    </div>
  );
};

export default App;
