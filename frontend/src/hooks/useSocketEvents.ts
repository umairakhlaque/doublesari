import { useEffect } from 'react';
import { getSocket } from '../socket/client';
import { useGameStore } from '../store/gameStore';
import { PlayerGameView, ChatMessage, EmoteEvent, SeatIndex } from '../types';

export function useSocketEvents(): void {
  const store = useGameStore();

  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => store.setConnected(true));
    socket.on('disconnect', () => store.setConnected(false));

    socket.on('connected', (data: { playerId: string; displayName: string }) => {
      store.setMyIdentity(data.playerId, data.displayName);
    });

    socket.on('room_created', (data: { roomId: string; code: string }) => {
      // Room info set when room_joined fires
    });

    socket.on('room_joined', (data: {
      roomId: string; code: string; seat: SeatIndex; team: 'A' | 'B';
    }) => {
      store.setRoomInfo(data.roomId, data.code, data.seat, data.team);
    });

    socket.on('game_state_sync', (view: PlayerGameView) => {
      store.updateGameView(view);
    });

    socket.on('trump_selected', (data: { suit: string; callerId: string }) => {
      store.pushNotification({
        type: 'info',
        message: `Trump is ${data.suit.toUpperCase()}`,
      });
    });

    socket.on('trick_completed', (data: {
      winnerId: string; winnerTeam: 'A' | 'B'; centerPileTrickCount: number;
    }) => {
      store.setLastTrickWinner(data.winnerId);
      store.pushNotification({
        type: 'trick_win',
        message: `Trick won • ${data.centerPileTrickCount} in pile`,
        teamId: data.winnerTeam,
      });
    });

    socket.on('double_sar_claimed', (data: {
      claimedByTeam: 'A' | 'B'; tricksClaimed: number;
    }) => {
      store.setDoubleSarClaimed(data.claimedByTeam);
      store.pushNotification({
        type: 'double_sar',
        message: `Double Sar! Team ${data.claimedByTeam} claimed the pile!`,
        teamId: data.claimedByTeam,
      });
      setTimeout(() => store.setDoubleSarClaimed(null), 3000);
    });

    socket.on('hand_completed', (data: {
      winner: 'A' | 'B';
      teamAClaimedTricks: number;
      teamBClaimedTricks: number;
      teamAHandsWon: number;
      teamBHandsWon: number;
    }) => {
      store.setHandResult({
        winner: data.winner,
        teamAClaimedTricks: data.teamAClaimedTricks,
        teamBClaimedTricks: data.teamBClaimedTricks,
      });
      store.setShowHandResult(true);
      setTimeout(() => store.setShowHandResult(false), 3500);
    });

    socket.on('match_completed', (data: {
      winner: 'A' | 'B'; teamAHandsWon: number; teamBHandsWon: number;
    }) => {
      store.setMatchResult(data);
    });

    socket.on('chat_message', (msg: ChatMessage) => {
      store.addChatMessage(msg);
    });

    socket.on('emote_received', (emote: EmoteEvent) => {
      store.addEmote(emote);
    });

    socket.on('player_disconnected', (data: { playerId: string }) => {
      store.pushNotification({ type: 'info', message: 'A player disconnected' });
    });

    socket.on('bot_activated', (data: { playerId: string }) => {
      store.pushNotification({ type: 'info', message: 'Bot took over a player seat' });
    });

    socket.on('player_reconnected', (data: { playerId: string }) => {
      store.pushNotification({ type: 'info', message: 'Player reconnected' });
    });

    socket.on('error_message', (data: { message: string }) => {
      store.pushNotification({ type: 'info', message: `Error: ${data.message}` });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connected');
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('game_state_sync');
      socket.off('trump_selected');
      socket.off('trick_completed');
      socket.off('double_sar_claimed');
      socket.off('hand_completed');
      socket.off('match_completed');
      socket.off('chat_message');
      socket.off('emote_received');
      socket.off('player_disconnected');
      socket.off('bot_activated');
      socket.off('player_reconnected');
      socket.off('error_message');
    };
  }, []);
}
