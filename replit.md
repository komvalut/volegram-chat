# Volegram Bitcoin Chat (VBC) — Replit Setup

A self-contained port of `komvalut/volegram-chat` running on Replit as two artifacts in a pnpm monorepo.

## Architecture

- **`artifacts/api-server`** — Express + ws + Drizzle backend (port 8080)
  - Mounted paths: `/api`, `/uploads`, `/ws`
  - Auto-runs `CREATE TABLE IF NOT EXISTS` migrations on startup against the Replit Postgres database (`DATABASE_URL`)
  - Sessions via `express-session` (`SESSION_SECRET`)
  - Lightning invoice creation via Speed (SBP) — gracefully no-ops when `SBP_API_KEY` is not set
  - Routes: `auth`, `messages`, `admin`, `profile` (incl. `/api/profile/admin`), `swap`, `trades`
  - Dev script: `tsx watch src/index.ts`

- **`artifacts/volegram`** — React 18 + Vite 5 + Tailwind v4 frontend (root `/`)
  - Single-domain: client uses relative `/api/...` and `wss://${host}/ws`, no CORS / proxy layer needed
  - Routes: `/login`, `/chat`, `/profile`, `/admin` (react-router-dom v6)

## Design changes applied to the upstream repo

- OLED-white theme: white background, black text, black cards (replaces the dark-mode default)
- All tiny `text-[8/9/10/11px]` classes upgraded to `text-xs` / `text-sm` for readability
- Removed `ThemeProvider` / `ThemeToggle` (single fixed theme)
- New action cards above chat: **Buy**, **Sell**, **Swap**, **Contact Admin**
  - Buy/Sell open `TradeModal` with the new `defaultDir` prop preset
  - Swap opens `SwapPanel`
  - Contact Admin fetches `/api/profile/admin` and opens a DM room with that user

## Environment

| Var               | Required | Notes                                              |
|-------------------|----------|----------------------------------------------------|
| `DATABASE_URL`    | yes      | Replit Postgres (auto-provisioned)                 |
| `SESSION_SECRET`  | yes      | Used by `express-session`                          |
| `SBP_API_KEY`     | no       | Speed Lightning. Without it, invoice ops no-op     |
| `MICROSWAP_API_URL` | no     | Defaults to `https://sonero-p2p.onrender.com`      |

## Running locally on Replit

Both workflows are auto-managed by the artifact system:

- `artifacts/api-server: API Server` → `pnpm --filter @workspace/api-server run dev`
- `artifacts/volegram: web` → `pnpm --filter @workspace/volegram run dev`

The preview pane proxies `/` → volegram and `/api`, `/uploads`, `/ws` → api-server.
