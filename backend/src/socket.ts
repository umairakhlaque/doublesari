import { Server as SocketServer, Socket } from 'socket.io';
import { v4 as uuid } from 'uuid';
import { GameEngine } from './game/GameEngine';
import { BotEngine } from './game/BotEngine';
import { buildRuleset } from './game/RulesetConfig';
import { Suit, RulesetConfig } from './game/types';
import {
  users, rooms, createGuestUser, generateRoomCode,
  RoomRecord,
} from './db/schema';
import { logAntiCheatEvent, rankChatViolation } from './utils/antiCheat';

interface RoomSession {
  room: RoomRecord;
  engine: GameEngine;
  bot: BotEngine;
  playerSocketMap: Map<string, string>; // playerId → socketId
  socketPlayerMap: Map<string, string>; // socketId → playerId
  disconnectTimers: Map<string, ReturnType<typeof setTimeout>>;
}

// roomId → session
const sessions = new Map<string, RoomSession>();

const BOT_TAKEOVER_MS = 15_000;
const BOT_DELAY_MS = 1_200; // simulate thinking

export function registerSocketHandlers(io: SocketServer): void {
  io.on('connection', (socket: Socket) => {
    const user = createGuestUser(socket.id);

    socket.emit('connected', { playerId: socket.id, displayName: user.displayName });

    // ── Create Room ────────────────────────────────────────────────────────────
    socket.on('create_room', (data: { mode?: string; ruleset?: Partial<RulesetConfig> }) => {
      const roomId = uuid();
      const code = generateRoomCode();
      const ruleset = buildRuleset(data.ruleset ?? {});
      const engine = new GameEngine(uuid(), roomId, ruleset);
      const bot = new BotEngine(engine);

      const room: RoomRecord = {
        id: roomId, code,
        hostId: socket.id,
        mode: (data.mode as RoomRecord['mode']) ?? 'classic',
        state: 'WAITING',
        createdAt: Date.now(),
      };
      rooms.set(roomId, room);

      const session: RoomSession = {
        room, engine, bot,
        playerSocketMap: new Map(),
        socketPlayerMap: new Map(),
        disconnectTimers: new Map(),
      };
      sessions.set(roomId, session);

      joinRoom(socket, session, user.displayName);

      socket.emit('room_created', { roomId, code, ruleset });
    });

    // ── Join by Room Code ──────────────────────────────────────────────────────
    socket.on('join_room', (data: { code: string }) => {
      const session = [...sessions.values()].find(s => s.room.code === data.code);
      if (!session) {
        socket.emit('error_message', { message: 'Room not found' });
        return;
      }
      if (session.room.state !== 'WAITING' && !isReconnect(socket.id, session)) {
        socket.emit('error_message', { message: 'Game already in progress' });
        return;
      }
      joinRoom(socket, session, user.displayName);
    });

    // ── Quick Match (bot fill) ─────────────────────────────────────────────────
    socket.on('quick_match', () => {
      // Find waiting room or create new one
      let session = [...sessions.values()].find(
        s => s.room.state === 'WAITING' && s.engine.playerCount < 4,
      );
      if (!session) {
        const roomId = uuid();
        const code = generateRoomCode();
        const engine = new GameEngine(uuid(), roomId);
        const bot = new BotEngine(engine);
        const room: RoomRecord = {
          id: roomId, code, hostId: socket.id,
          mode: 'classic', state: 'WAITING', createdAt: Date.now(),
        };
        rooms.set(roomId, room);
        session = {
          room, engine, bot,
          playerSocketMap: new Map(),
          socketPlayerMap: new Map(),
          disconnectTimers: new Map(),
        };
        sessions.set(roomId, session);
      }
      joinRoom(socket, session, user.displayName);
    });

    // ── Select Trump ──────────────────────────────────────────────────────────
    socket.on('select_trump', (data: { suit: Suit }) => {
      const session = getPlayerSession(socket.id);
      if (!session) return;
      const { engine, room } = session;
      const playerId = session.socketPlayerMap.get(socket.id)!;

      try {
        engine.selectTrump(playerId, data.suit);
        broadcastToRoom(io, session, 'trump_selected', {
          suit: data.suit, callerId: playerId,
        });
        broadcastGameState(io, session);
        scheduleBotTurn(io, session);
      } catch (e: any) {
        socket.emit('error_message', { message: e.message });
      }
    });

    // ── Play Card ─────────────────────────────────────────────────────────────
    socket.on('play_card', (data: { cardId: string }) => {
      const session = getPlayerSession(socket.id);
      if (!session) return;
      const { engine, room } = session;
      const playerId = session.socketPlayerMap.get(socket.id)!;

      try {
        const result = engine.playCard(playerId, data.cardId);
        broadcastToRoom(io, session, 'card_played', {
          playerId, cardId: data.cardId,
          seat: engine.state.players[playerId].seat,
        });

        if (result.trickComplete) {
          const hand = engine.state.currentHand!;
          broadcastToRoom(io, session, 'trick_completed', {
            winnerId: hand.lastTrickWinnerId,
            winnerTeam: engine.state.players[hand.lastTrickWinnerId!]?.team,
            centerPileTrickCount: result.centerPileTrickCount,
          });

          if (result.doubleSarClaimed) {
            broadcastToRoom(io, session, 'double_sar_claimed', {
              claimedByTeam: result.claimedByTeam,
              tricksClaimed: hand.teamAClaimedTricks + hand.teamBClaimedTricks,
            });
          } else {
            broadcastToRoom(io, session, 'center_pile_updated', {
              trickCount: result.centerPileTrickCount,
            });
          }

          if (result.handComplete) {
            broadcastToRoom(io, session, 'hand_completed', {
              winner: result.handWinner,
              teamAClaimedTricks: hand.teamAClaimedTricks,
              teamBClaimedTricks: hand.teamBClaimedTricks,
              teamAHandsWon: engine.state.teamAHandsWon,
              teamBHandsWon: engine.state.teamBHandsWon,
            });

            if (result.matchComplete) {
              broadcastToRoom(io, session, 'match_completed', {
                winner: result.matchWinner,
                teamAHandsWon: engine.state.teamAHandsWon,
                teamBHandsWon: engine.state.teamBHandsWon,
                handHistory: engine.state.handHistory,
              });
              session.room.state = 'COMPLETED';
            } else {
              // Auto-start next hand after brief delay
              setTimeout(() => {
                engine.startNextHand();
                broadcastToRoom(io, session!, 'match_started', {});
                broadcastGameState(io, session!);
                scheduleBotTurn(io, session!);
              }, 3000);
            }
          }
        }

        broadcastGameState(io, session);
        if (!result.handComplete) scheduleBotTurn(io, session);
      } catch (e: any) {
        logAntiCheatEvent(
          room.id, engine.state.matchId, playerId,
          'illegal_move_attempt', e.message, 'medium',
        );
        socket.emit('error_message', { message: e.message });
      }
    });

    // ── Chat ──────────────────────────────────────────────────────────────────
    socket.on('send_chat', (data: { text: string; channel: 'team' | 'table' }) => {
      const session = getPlayerSession(socket.id);
      if (!session) return;
      const { engine, room } = session;
      const playerId = session.socketPlayerMap.get(socket.id)!;
      const player = engine.state.players[playerId];

      if (engine.state.ruleset.rankedMode && data.channel === 'team') {
        socket.emit('error_message', { message: 'Team chat disabled in ranked mode' });
        return;
      }

      if (engine.state.ruleset.rankedMode && rankChatViolation(data.text)) {
        logAntiCheatEvent(
          room.id, engine.state.matchId, playerId,
          'chat_card_reference', data.text, 'high',
        );
        socket.emit('error_message', { message: 'Message blocked: ranked chat rules' });
        return;
      }

      const msg = {
        id: uuid(),
        senderId: playerId,
        senderName: player.displayName,
        text: data.text.slice(0, 200),
        channel: data.channel,
        timestamp: Date.now(),
      };

      if (data.channel === 'team') {
        // Send only to team members
        const teammates = Object.values(engine.state.players)
          .filter(p => p.team === player.team)
          .map(p => session.playerSocketMap.get(p.id))
          .filter(Boolean);
        for (const sid of teammates) {
          io.to(sid!).emit('chat_message', msg);
        }
      } else {
        broadcastToRoom(io, session, 'chat_message', msg);
      }
    });

    // ── Emote ─────────────────────────────────────────────────────────────────
    socket.on('send_emote', (data: { emoteId: string }) => {
      const session = getPlayerSession(socket.id);
      if (!session) return;
      const playerId = session.socketPlayerMap.get(socket.id)!;
      broadcastToRoom(io, session, 'emote_received', {
        senderId: playerId, emoteId: data.emoteId, timestamp: Date.now(),
      });
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const session = getPlayerSession(socket.id);
      if (!session) return;
      const { engine } = session;
      const playerId = session.socketPlayerMap.get(socket.id);
      if (!playerId) return;

      engine.handleDisconnect(playerId);
      broadcastToRoom(io, session, 'player_disconnected', { playerId });
      broadcastGameState(io, session);

      // Bot takeover timer
      const timer = setTimeout(() => {
        if (!engine.state.players[playerId]?.isConnected) {
          engine.activateBot(playerId);
          broadcastToRoom(io, session, 'bot_activated', { playerId });
          scheduleBotTurn(io, session);
        }
      }, BOT_TAKEOVER_MS);
      session.disconnectTimers.set(playerId, timer);
    });

    // ── Reconnect ─────────────────────────────────────────────────────────────
    socket.on('reconnect_match', (data: { roomId: string; playerId: string }) => {
      const session = sessions.get(data.roomId);
      if (!session) {
        socket.emit('error_message', { message: 'Room not found' });
        return;
      }
      const { engine } = session;
      if (!engine.state.players[data.playerId]) {
        socket.emit('error_message', { message: 'Player not in this room' });
        return;
      }

      // Cancel bot takeover
      const t = session.disconnectTimers.get(data.playerId);
      if (t) { clearTimeout(t); session.disconnectTimers.delete(data.playerId); }

      // Remap socket
      const oldSocket = session.playerSocketMap.get(data.playerId);
      if (oldSocket) session.socketPlayerMap.delete(oldSocket);
      session.playerSocketMap.set(data.playerId, socket.id);
      session.socketPlayerMap.set(socket.id, data.playerId);
      socket.join(session.room.id);

      engine.handleReconnect(data.playerId);
      broadcastToRoom(io, session, 'player_reconnected', { playerId: data.playerId });

      // Send full state to reconnected player
      socket.emit('game_state_sync', engine.serializeStateForPlayer(data.playerId));
    });

    // ─────────────────────────────────────────────────────────────────────────
    function getPlayerSession(socketId: string): RoomSession | undefined {
      return [...sessions.values()].find(s => s.socketPlayerMap.has(socketId));
    }

    function isReconnect(socketId: string, session: RoomSession): boolean {
      return session.socketPlayerMap.has(socketId);
    }
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function joinRoom(socket: Socket, session: RoomSession, displayName: string): void {
  const { engine, room } = session;
  if (session.socketPlayerMap.has(socket.id)) return; // already in room

  const seat = engine.addPlayer(socket.id, displayName);
  if (seat === null) {
    socket.emit('error_message', { message: 'Room is full' });
    return;
  }

  session.playerSocketMap.set(socket.id, socket.id);
  session.socketPlayerMap.set(socket.id, socket.id);
  socket.join(room.id);

  const player = engine.state.players[socket.id];
  socket.emit('room_joined', {
    roomId: room.id, code: room.code, seat, team: player.team,
  });

  socket.to(room.id).emit('player_seated', {
    playerId: socket.id, displayName, seat, team: player.team,
  });

  if (engine.isReadyToStart()) {
    room.state = 'IN_PROGRESS';
    fillBotsIfNeeded(session);
    engine.startMatch();
    broadcastToRoom(socket.broadcast.to(room.id) as any, session, 'match_started', {});
    socket.emit('match_started', {});
    broadcastGameState({ to: () => ({ emit: () => {} }) } as any, session);
    // We need io ref — handled via the broadcast below
    broadcastGameStateViaSession(session);
    scheduleInitialBotTurns(session);
  }
}

function fillBotsIfNeeded(session: RoomSession): void {
  if (!session.engine.state.ruleset.botFillEnabled) return;
  while (session.engine.playerCount < 4) {
    const botId = `bot_${uuid().slice(0, 8)}`;
    const names = ['RangBot', 'SarBot', 'TrumpBot', 'CardBot'];
    const name = names[session.engine.playerCount % names.length];
    session.engine.addPlayer(botId, name, true);
    session.playerSocketMap.set(botId, botId);
    session.socketPlayerMap.set(botId, botId);
  }
}

function broadcastToRoom(
  io: any,
  session: RoomSession,
  event: string,
  data: object,
): void {
  io.to(session.room.id).emit(event, data);
}

// Broadcasts full per-player game state to each connected player
function broadcastGameStateViaSession(session: RoomSession): void {
  // Accessed via the module-level `io` reference — handled in the next fn
}

let _io: SocketServer | null = null;

export function setIO(io: SocketServer): void {
  _io = io;
}

function broadcastGameState(_io2: any, session: RoomSession): void {
  if (!_io) return;
  for (const [playerId, socketId] of session.playerSocketMap.entries()) {
    const player = session.engine.state.players[playerId];
    if (!player || player.isBot) continue;
    _io.to(socketId).emit('game_state_sync', session.engine.serializeStateForPlayer(playerId));
  }
}

function scheduleBotTurn(io: SocketServer, session: RoomSession): void {
  const { engine, bot } = session;
  const hand = engine.state.currentHand;
  if (!hand) return;

  const currentPlayerId = engine.state.seatMap[hand.currentTurnSeat];
  const player = engine.state.players[currentPlayerId];
  if (!player?.isBot) return;

  setTimeout(() => {
    try {
      if (hand.phase === 'TRUMP_SELECTION' && hand.trumpCallerId === currentPlayerId) {
        const suit = bot.decideTrump(currentPlayerId);
        engine.selectTrump(currentPlayerId, suit);
        broadcastToRoom(io, session, 'trump_selected', { suit, callerId: currentPlayerId });
        broadcastGameState(io, session);
        scheduleBotTurn(io, session);
        return;
      }

      if (hand.phase === 'HAND_IN_PROGRESS') {
        const cardId = bot.decideCard(currentPlayerId);
        if (!cardId) return;
        const result = engine.playCard(currentPlayerId, cardId);

        broadcastToRoom(io, session, 'card_played', {
          playerId: currentPlayerId, cardId,
          seat: player.seat,
        });

        if (result.trickComplete) {
          const updatedHand = engine.state.currentHand!;
          broadcastToRoom(io, session, 'trick_completed', {
            winnerId: updatedHand.lastTrickWinnerId,
            winnerTeam: engine.state.players[updatedHand.lastTrickWinnerId!]?.team,
            centerPileTrickCount: result.centerPileTrickCount,
          });

          if (result.doubleSarClaimed) {
            broadcastToRoom(io, session, 'double_sar_claimed', {
              claimedByTeam: result.claimedByTeam,
              tricksClaimed: updatedHand.teamAClaimedTricks + updatedHand.teamBClaimedTricks,
            });
          }

          if (result.handComplete) {
            broadcastToRoom(io, session, 'hand_completed', {
              winner: result.handWinner,
              teamAClaimedTricks: updatedHand.teamAClaimedTricks,
              teamBClaimedTricks: updatedHand.teamBClaimedTricks,
              teamAHandsWon: engine.state.teamAHandsWon,
              teamBHandsWon: engine.state.teamBHandsWon,
            });
            if (result.matchComplete) {
              broadcastToRoom(io, session, 'match_completed', {
                winner: result.matchWinner,
                teamAHandsWon: engine.state.teamAHandsWon,
                teamBHandsWon: engine.state.teamBHandsWon,
              });
              session.room.state = 'COMPLETED';
              return;
            } else {
              setTimeout(() => {
                engine.startNextHand();
                broadcastToRoom(io, session, 'match_started', {});
                broadcastGameState(io, session);
                scheduleBotTurn(io, session);
              }, 3000);
              broadcastGameState(io, session);
              return;
            }
          }
        }

        broadcastGameState(io, session);
        scheduleBotTurn(io, session);
      }
    } catch (e) {
      console.error('Bot error:', e);
    }
  }, BOT_DELAY_MS);
}

function scheduleInitialBotTurns(session: RoomSession): void {
  if (!_io) return;
  scheduleBotTurn(_io, session);
}
