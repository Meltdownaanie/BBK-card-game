# BBK multiplayer server

Authoritative 1v1 WebSocket server for the BBK card game. The server keeps every deck and hand;
clients only receive their own cards plus the opponent's revealed cards.

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
The browser client (`online.html`) expects the service name `bbk-game-server`
(`SERVER_HOST` near the end of that file) - change it there if your service is named differently.

## Joining a room
Simple flow used by `online.html`:
- Player 1 sends `create_room`; the server replies with a `lobby` message holding a 4-digit code.
- Player 2 sends `join_room` with that code (or opens `online.html?room=CODE`, which joins automatically).

Messages (client to server):
- `{"type":"create_room"}`
- `{"type":"join_room","code":"4821"}`
- `{"type":"ready","ready":true}`
- `{"type":"leave_room"}`
- In a match: `place`, `return`, `swap`, `lock`, `discard`, `forfeit`
- Legacy: `{"type":"enter_room","code":"007"}` (3 digits, first arrival creates, second joins) is still accepted.

Important: room state is in memory; redeploys, restarts, and free-instance sleep lose active rooms.
Free instances sleep after a period without traffic, so the first connection can take up to a minute;
the client pings `/health` and retries automatically.
