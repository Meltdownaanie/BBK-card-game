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

## Accounts and ranked play (optional)
Set these environment variables on the Render service. Without them the server still works for guests and friend rooms.

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Project URL, e.g. `https://xxxx.supabase.co` (enables sign-in) |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` key, used to verify players' tokens |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` key (enables ranked + saving results). Server only, never put it in the repo or a web page |
| `ALLOWED_ORIGINS` | Optional, comma-separated site origins allowed to connect, e.g. `https://you.github.io` |
| `RECONNECT_MS` | Optional, seconds-in-ms a signed-in player's seat is held after a disconnect (default 60000) |
| `RECORD_RETRY_MS` | Optional, first retry delay when saving a result fails (default 2000, doubles each try) |

More client messages: `auth` (`{"type":"auth","token":"<user JWT>"}` or `token:null` for guest), `ranked_queue`, `ranked_cancel`, `random_queue`, `random_cancel`.

`ranked_queue` requires `profiles.tutorial_step >= 5` (otherwise `error` with `code:'tutorial_required'`). `random_queue` is an unranked quick match open to guests.
Server messages: `auth_ok`, `auth_error`, `queued`, `queue_left`, `match_found`, `rating_update`, `opponent_disconnected`, `opponent_back`.
`/health` also reports `accounts`, `ranked`, `queue` and `casual`. Database setup is in `supabase/schema.sql`.

Important: room state is in memory; redeploys, restarts, and free-instance sleep lose active rooms.
Free instances sleep after a period without traffic, so the first connection can take up to a minute;
the client pings `/health` and retries automatically.

## Rank tiers
New players are **Unranked** for their first 5 ranked games: wins add points, losses never subtract (rating starts at 1000). From game 6 normal Elo applies, including losses. Tiers by rating: **C-troop** < 1200, **B-Player** 1200–1499, **Alpha-Wolf** 1500–1799, **SSS** 1800+. Only placed players appear on the leaderboard. Constants live in `record_match()` (`placement`) and `bbk-account.js` (`TIERS`, `PLACEMENT`).
