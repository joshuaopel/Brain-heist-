# 🧠 Brain Heist

A chaotic multiplayer party game for Discord Activities. Two teams race to evolve their giant AI Brain by delivering Creative Artifacts — or steal the enemy Brain and drag it to your base.

## Quick Start (Local Dev)

### Prerequisites
- Node.js 18+
- npm 8+

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example client/.env
cp .env.example server/.env
# Edit client/.env — set VITE_DISCORD_CLIENT_ID (optional for local dev)
# Edit server/.env — set DISCORD_CLIENT_SECRET if using Discord auth
```

### 3. Start dev servers
```bash
npm run dev
```
- Client: http://localhost:3000
- Server: http://localhost:2567
- Colyseus monitor: http://localhost:2567/colyseus

## How to Play

| Key | Action |
|-----|--------|
| WASD / Arrow Keys | Move |
| SPACE | Interact (pick up artifacts, deposit to brain, grab enemy brain) |
| E | Drop carried artifacts |

### Rules
1. **Pick up Creative Artifacts** scattered across the arena (sketches, code snippets, coffee, sticky notes, render files, memes, bug reports)
2. **Carry them to your team's Brain** and press SPACE to deposit
3. **Your Brain evolves** as it absorbs ideas — unlocking new abilities and growing larger
4. **Win by:** reaching Brain Level 5 (Singularity) OR capturing the enemy Brain in your base for 30 seconds
5. **Steal the enemy Brain** by grabbing it and dragging it to your base

### Brain Evolution
| Level | Name | Ideas | Quote |
|-------|------|-------|-------|
| 1 | Newborn | 0 | "Hello." |
| 2 | Awakening | 10 | "I have discovered cheese." |
| 3 | Enlightened | 25 | "I require additional memes." |
| 4 | Ascendant | 50 | "The pigeons are watching." |
| 5 | Singularity | 100 | "Ascension complete." ✨ |

## Architecture

```
brain-heist/
├── client/          # React + Phaser 3 + Discord SDK (Vite)
│   └── src/
│       ├── components/   # React UI (Lobby, HUD, Victory)
│       ├── discord/      # Discord Embedded App SDK integration
│       └── game/
│           ├── scenes/   # Phaser scenes (ArenaScene)
│           └── GameManager.ts  # Colyseus connection + Phaser lifecycle
├── server/          # Colyseus authoritative server (Node.js)
│   └── src/
│       ├── rooms/    # BrainHeistRoom — game loop & physics
│       └── schema/   # Colyseus state schemas
└── shared/          # Types & constants used by both client and server
```

### Tech Stack
- **Frontend:** React 18, TypeScript, Phaser 3, Vite
- **Backend:** Node.js, Colyseus 0.15, Express
- **Multiplayer:** Colyseus (authoritative server, delta state sync)
- **Discord:** `@discord/embedded-app-sdk`

## Discord Activity Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new Application → enable **Activities** (Embedded App)
3. Copy the **Client ID** → set `VITE_DISCORD_CLIENT_ID` in `client/.env`
4. Copy the **Client Secret** → set `DISCORD_CLIENT_SECRET` in `server/.env`
5. Add URL mapping: `/` → `http://localhost:3000`
6. Add OAuth2 redirect: `https://discord.com/api/oauth2/authorize`
7. Use the Discord desktop app → open an Activity URL proxy tunnel via [cloudflared](https://github.com/cloudflare/cloudflared)

## Deployment

### Server (e.g. Railway, Render, Fly.io)
```bash
cd server
npm run build
npm start
```
Set `PORT` env var. Colyseus handles WebSocket upgrades automatically.

### Client (e.g. Netlify, Vercel, Cloudflare Pages)
```bash
cd client
npm run build
# Deploy dist/ folder
```
Set `VITE_SERVER_URL=wss://your-server.example.com` before building.

### Discord Activity Proxy
Configure your Discord Activity URL mappings to point to your deployed client URL.
