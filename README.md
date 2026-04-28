# Double Sar — Premium Online Multiplayer Card Game

A real-time, server-authoritative implementation of **Double Sar / Rang / Court Piece** — the classic South Asian trick-taking partnership card game.

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Install & Run (Development)

```bash
# Install all dependencies
npm run install:all

# Terminal 1 — Backend (port 3001)
npm run dev:backend

# Terminal 2 — Frontend (port 5173)
npm run dev:frontend
```

Open `http://localhost:5173` in your browser.

### Running Tests

```bash
npm test
```

---

## Project Structure

```
doublesari/
├── backend/
│   └── src/
│       ├── server.ts           Express + Socket.io server
│       ├── socket.ts           All socket event handlers
│       ├── game/
│       │   ├── GameEngine.ts   Core game logic (authoritative)
│       │   ├── BotEngine.ts    AI bot player
│       │   ├── RulesetConfig.ts  Pre-built rulesets
│       │   └── types.ts        Shared game types
│       ├── routes/
│       │   ├── auth.ts         Profile REST API
│       │   └── profile.ts      Leaderboard API
│       ├── db/
│       │   └── schema.ts       In-memory data store (MVP)
│       └── utils/
│           ├── deck.ts         Deck creation & shuffle
│           └── antiCheat.ts    Anti-cheat event logging
└── frontend/
    └── src/
        ├── App.tsx             Root component
        ├── types.ts            Frontend types
        ├── socket/client.ts    Socket.io client
        ├── store/gameStore.ts  Zustand state management
        ├── hooks/
        │   └── useSocketEvents.ts  Socket event wiring
        └── components/
            ├── Lobby.tsx        Room creation & joining
            ├── GameTable.tsx    Main game table view
            ├── Card.tsx         Card component
            ├── PlayerSeat.tsx   Player avatar + trick card
            ├── CenterPile.tsx   Double Sar center pile display
            ├── TrumpSelector.tsx  Trump suit selection UI
            ├── ScoreBoard.tsx   Scores & trump indicator
            ├── ChatBox.tsx      In-game chat
            ├── EmoteWheel.tsx   Preset emotes
            └── PostGameSummary.tsx  Hand/match results
```

---

## The Double Sar Center Pile Rule

The core mechanic that defines this game:

1. Every completed trick goes into a **face-down center pile**.
2. A team only **claims** the pile when the **same individual player** wins **two consecutive tricks**.
3. The **final trick** winner always claims any remaining unclaimed pile.
4. Teams score based on **claimed tricks**, not just won tricks.
5. 7+ claimed tricks = win the hand.

The `GameEngine` tracks this via:
- `lastTrickWinnerId` — who won the previous trick
- `centerPile.trickCount` — tricks currently in the unclaimed pile
- `teamAClaimedTricks` / `teamBClaimedTricks` — officially scored tricks

---

## Game Modes (Phase 1)

| Mode | Chat | Undo | Timer | Anti-cheat |
|------|------|------|-------|-----------|
| Classic | Table only | No | 30s | Basic |
| Casual | Team + Table | Yes | 60s | Relaxed |
| Ranked | Preset emotes | No | 20s | Strict |

---

## Socket Events

### Client → Server
| Event | Payload |
|-------|---------|
| `create_room` | `{ mode?, ruleset? }` |
| `join_room` | `{ code: string }` |
| `quick_match` | — |
| `select_trump` | `{ suit: Suit }` |
| `play_card` | `{ cardId: string }` |
| `send_chat` | `{ text, channel }` |
| `send_emote` | `{ emoteId }` |
| `reconnect_match` | `{ roomId, playerId }` |

### Server → Client
| Event | Description |
|-------|-------------|
| `connected` | Player identity assigned |
| `room_created` | Room created with code |
| `room_joined` | Seat and team assigned |
| `game_state_sync` | Full per-player game state |
| `trump_selected` | Trump suit announced |
| `card_played` | Card played by a player |
| `trick_completed` | Trick resolved |
| `double_sar_claimed` | Team claimed center pile |
| `hand_completed` | Hand winner announced |
| `match_completed` | Match winner announced |
| `chat_message` | Incoming chat |
| `emote_received` | Incoming emote |
| `player_disconnected` | Player left |
| `bot_activated` | Bot took over seat |
| `player_reconnected` | Player returned |
| `error_message` | Error notification |

---

## Environment Variables

### Backend (`backend/.env`)
```
PORT=3001
CLIENT_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)
```
VITE_SERVER_URL=http://localhost:3001
```

---

## Architecture Decisions

- **Server-authoritative**: The `GameEngine` owns all game state. Clients only receive what they're allowed to see (own hand only, never opponents' cards).
- **Per-player serialization**: `serializeStateForPlayer(playerId)` sends each player only their own `myHand`. The server never broadcasts full hand state.
- **In-memory for MVP**: All state is in-memory. Phase 5 will swap `db/schema.ts` for PostgreSQL via Prisma.
- **Bot fill**: Bots auto-fill empty seats so solo players can practice immediately.
- **Reconnection**: Players can rejoin with their `roomId + playerId`. Bot takeover activates after 15s.

---

## Roadmap

| Phase | Features |
|-------|---------|
| ✅ Phase 1 | Core MVP — full game playable |
| Phase 2 | Registered accounts, friend rooms, spectators, leaderboards |
| Phase 3 | Ranked mode, full anti-cheat, match history |
| Phase 4 | Animations (Framer Motion), sounds, card themes, avatars |
| Phase 5 | PostgreSQL, Redis, monitoring, deployment, admin tools |

---

## Deployment Notes

- Backend: Deploy to Railway, Render, or any Node.js host. Set `CLIENT_URL` to your frontend URL.
- Frontend: Deploy to Vercel or Netlify. Set `VITE_SERVER_URL` to your backend URL.
- For scaling: add Redis adapter for Socket.io (`@socket.io/redis-adapter`) and PostgreSQL via Prisma.
