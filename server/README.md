# BBK multiplayer room server (phase 1)

This service supports **Create Room / Join Room / Ready** with two WebSocket clients.
It does not yet run the card battle or modify the live GitHub Pages game.

## Render deployment
- New > Web Service > connect `Meltdownaanie/BBK-card-game`
- Branch: `main`
- Root Directory: `server`
- Runtime: `Node`
- Build Command: `npm install`
- Start Command: `npm start`
- Instance: Free (if available)

Open `https://YOUR-SERVICE.onrender.com/health` to verify server status.
WebSocket URL: `wss://YOUR-SERVICE.onrender.com`

Messages:
- `{"type":"create_room"}`
- `{"type":"join_room","code":"ABC123"}`
- `{"type":"ready","ready":true}`
- `{"type":"leave_room"}`

Important: room state is in memory; redeploys, restarts, and free-instance sleep lose active rooms.
The authoritative turn-based card game and browser UI need to be connected in phase 2.
