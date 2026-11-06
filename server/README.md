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
Server messages: `auth_ok`, `auth_error`, `queued`, `queue_left`, `match_found`, `rating_update`, `queue_hint`, `match_cancelled`, `opponent_disconnected`, `opponent_back`.
`/health` also reports `accounts`, `ranked`, `queue` and `casual`. Database setup is in `supabase/schema.sql`.

Important: room state is in memory; redeploys, restarts, and free-instance sleep lose active rooms.
Free instances sleep after a period without traffic, so the first connection can take up to a minute;
the client pings `/health` and retries automatically.

## Rank tiers
New players are **Unranked** for their first 5 ranked games: wins add points, losses never subtract (rating starts at 1000). From game 6 normal Elo applies, including losses. Tiers by rating: **C-troop** < 1200, **B-Player** 1200–1499, **Alpha-Wolf** 1500–1799, **SSS** 1800+. Only placed players appear on the leaderboard. Constants live in `record_match()` (`placement`) and `bbk-account.js` (`TIERS`, `PLACEMENT`).

### Ranked matchmaking
The rating window starts at ±100, widens by 50 every 10 s waited and is capped at ±300 (one tier), so a player never meets someone more than a tier away. Players still in placement are paired with placed players only after a 30 s wait (they cannot lose points, so they are not free wins); two placement players pair normally. After 60 s without a match the server sends one `queue_hint` so the client can suggest a random match or vs AI. Constants: `MM_*` in `server/index.js`.
After a ranked pair is found the server sends `match_found` (with `opponent`, `me` and `startsIn`) and starts the game `MM_INTRO_MS` later (default 3500 ms) so both players can see who they face; if one leaves during that time the other gets `match_cancelled` and nothing is recorded.

## House bots (ranked fallback)
Eight server-driven accounts (`is_bot` in `profiles`, ratings 900/1100, 1300/1400, 1550/1700, 1850/2000 = two per rank).
Run `supabase/migrations_house_bots.sql` once; the server loads them at start (needs `SUPABASE_SECRET_KEY`, see `bots` in `/health`).
- A ranked player who waited `BOT_WAIT_MS` (default 20 s) with nobody to pair with gets the free bot closest in rating. A bot plays one match at a time.
- Bots use ordinary-looking names from `server/bot-names.js`, renamed every `BOT_RENAME_HOURS` (default 12, 0 = only at startup) and never during a match. They keep a fixed rating and record (`record_match` skips their rows) and never appear on the leaderboard.
- Bots only see what a human client sees (own hand, opponent card count, revealed cards). Strength follows rating: easy below 1200, medium to 1499, hard above (`server/bot.js`).
- `BOT_THINK_SCALE` (default 1) scales their human-like thinking pauses (tests use 0.003).

## Straight combos
Fire after damage is dealt, whether or not the round was won; the client shows only the word on the board.
- **CHARGE!!!** - slots 1→2→3 hold rising consecutive numbers (6 7 8), any suits: the player draws 2 cards next round.
- **MESS UP!!!** - slots 1→2→3 hold falling consecutive numbers of one suit (8 7 6): once the opponent's two kept cards are back in hand, one random hand card goes into their deck and the deck is reshuffled.
The `combo` list in the state message carries `{kind:'charge'|'messup',owner,numbers,suits}`.
