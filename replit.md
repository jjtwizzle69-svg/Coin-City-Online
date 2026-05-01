# CoinCity Casino

Fake-coin web casino with 6 games, social features, daily quests, weekly lottery, and an avatar customizer.

## Architecture

- **Frontend**: `artifacts/relationships` — React + Vite + Tailwind + shadcn/ui (dark theme via `<body class="dark">`), wouter for routing. Auth = Bearer token in `localStorage["casino:token"]`.
- **Backend**: `artifacts/api-server` — Express + Drizzle (Postgres). Mounted on `/api`.
- **Shared DB schema**: `lib/db` — single Postgres database used by Drizzle.
- The frontend talks to the backend through the workspace proxy (relative `/api` URLs).

## Backend layout

- `src/lib/auth.ts` — sessions, password hashing (scrypt), `requireAuth` / `requireAdmin`.
- `src/lib/catalog.ts` — items, tags, daily/career quests, profanity filter, daily wheel rewards. **Item / tag IDs must match `artifacts/relationships/src/lib/catalog.ts`.**
- `src/lib/games.ts` — pure game engines (coinflip, dice, plinko, mines, blackjack, free throw) with luck-charge support.
- `src/lib/quests.ts` — daily/career quest progress tracking + claim logic.
- `src/lib/seed.ts` — seeds the admin "noah" account on startup.
- `src/lib/userPublic.ts` — `toPublicUser()` shape returned to clients.
- `src/routes/*` — `auth`, `games`, `profile` (catalog/equip/shop/wheel/display-name), `social` (friends/trades/broadcasts/users/leaderboard), `quests`, `lottery`, `admin`. Wired in `routes/index.ts`.

## Frontend layout

- `src/lib/api.ts` — fetch wrapper, token stored in `localStorage["casino:token"]`.
- `src/lib/auth-context.tsx` / `src/lib/catalog-context.tsx` — globals.
- `src/lib/catalog.ts` — visual SVG defs (skin/hair/shirt/pants/face) keyed by IDs that mirror the backend.
- `src/components/Avatar.tsx` — composes the SVG avatar from equipped items.
- `src/components/TagBadge.tsx` — animated rainbow style for the `millionaire` tag (uses `@keyframes tagRainbow` in `index.css`).
- `src/components/BroadcastBanner.tsx` — polls `/api/broadcasts` every 1.5s; each message fades over the last second of its 5s lifetime.
- `src/pages/*` — `auth`, `casino` (lobby + leaderboard + recent), 6 games under `games/`, `profile` (avatar customizer + tag picker + daily wheel + stats + display-name), `friends` (search/incoming/outgoing/trades + `TradeDialog`), `quests`, `lottery`, `admin`, `user-detail`.

## Key product rules

- New users start with **1,500 coins** and the `noob` tag.
- **Lottery**: 7-day rounds. Buying entries grants `2x luck for the next 10 games`. Payouts are 80% / 9% / 9% / 2% — the 2% always goes to Noah.
- **Daily wheel**: 22-hour cooldown.
- **Admin "noah"** (password `gobigorange811`, displayName "Noah") is seeded with 1,000,000 coins, every item, every tag, the gold `developer` tag, can gift coins for free, set anyone's coins, and broadcast a 5-second fading banner to everyone.
- Username is 5–24 chars `a-zA-Z0-9_`; displayName is 2–15 chars; passwords are 8+ chars with a letter and a digit. Both are profanity-filtered.

## Workflow

- `pnpm run typecheck` — full workspace typecheck (libs first, then leaf packages).
- The two relevant workflows are `artifacts/api-server: API Server` and `artifacts/relationships: web`. The DB is auto-pushed and Noah is seeded when the API server starts.
