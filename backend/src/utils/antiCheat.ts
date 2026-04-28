import { PlayerId } from '../game/types';

export interface AntiCheatEvent {
  id: string;
  timestamp: number;
  roomId: string;
  matchId: string;
  playerId: PlayerId;
  type: AntiCheatEventType;
  detail: string;
  severity: 'low' | 'medium' | 'high';
}

export type AntiCheatEventType =
  | 'illegal_move_attempt'
  | 'chat_card_reference'     // ranked: text containing suit/rank
  | 'rapid_emote_signal'
  | 'frequent_disconnect'
  | 'suspicious_partnership'
  | 'out_of_turn_action';

// In-memory store for MVP — swap for DB in Phase 3
const events: AntiCheatEvent[] = [];

export function logAntiCheatEvent(
  roomId: string,
  matchId: string,
  playerId: PlayerId,
  type: AntiCheatEventType,
  detail: string,
  severity: AntiCheatEvent['severity'] = 'low',
): AntiCheatEvent {
  const ev: AntiCheatEvent = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    roomId,
    matchId,
    playerId,
    type,
    detail,
    severity,
  };
  events.push(ev);
  if (events.length > 10000) events.splice(0, 1000); // rolling window
  return ev;
}

export function getEventsForPlayer(playerId: PlayerId): AntiCheatEvent[] {
  return events.filter(e => e.playerId === playerId);
}

// Basic ranked chat filter — flags messages containing card-related terms
const CARD_TERMS = /\b(ace|king|queen|jack|spade|heart|diamond|club|trump|rang|rung)\b/i;

export function rankChatViolation(text: string): boolean {
  return CARD_TERMS.test(text);
}
