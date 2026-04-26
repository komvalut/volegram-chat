# Volegram Bitcoin Chat (VBC)

Zen-style Bitcoin chat with built-in Volegram Vouchers (VV), OTP login, multi-currency
BTC rates, and an admin panel. Built as a pnpm monorepo with two artifacts:

- `artifacts/api-server` — Express + ws + Drizzle (PostgreSQL), port `8080`
- `artifacts/volegram` — React 18 + Vite 5 + Tailwind v4 web client

## Run locally

```bash
pnpm install
pnpm dev
```

## Required env vars

- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — server session secret

## Optional env vars

- `SBP_API_KEY` — Serbian instant-payment integration
- `TELEGRAM_BOT_TOKEN` — Telegram notification bot
- `GITHUB_TOKEN` — used for repo automation

## What ships in this version

- **Volegram Vouchers (VV)** — issue / redeem / transfer vouchers in
  SATS, EUR, USD, GBP, BAM, RSD, HRK, CHF
- **OTP login** — passwordless one-time-code sign-in (dev-inline mode)
- **Admin panel** — users, vouchers, settings (commission %, IBAN), reports
- **Live BTC rates** — CoinGecko primary, blockchain.info fallback
- **Modern zen-style chat UI** with WebSocket realtime updates

## Repository status

This Replit snapshot currently lives on the `replit-deploy-2026-04` branch
(commit `951fcfd`). The `main` branch holds unrelated upstream history and
will be reconciled with the snapshot in a follow-up pull request.
