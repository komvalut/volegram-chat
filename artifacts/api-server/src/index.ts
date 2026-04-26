import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cors from "cors";
import { createServer } from "http";
import { setupWS } from "./lib/ws.js";
import { db } from "./db/index.js";
import { sql } from "drizzle-orm";
import authRoutes    from "./routes/auth.js";
import messageRoutes from "./routes/messages.js";
import adminRoutes   from "./routes/admin.js";
import profileRoutes from "./routes/profile.js";
import swapRoutes    from "./routes/swap.js";
import tradeRoutes   from "./routes/trades.js";
import voucherRoutes  from "./routes/vouchers.js";
import ratesRoutes    from "./routes/rates.js";
import otpRoutes      from "./routes/otp.js";
import settingsRoutes from "./routes/settings.js";
import marketRoutes   from "./routes/market.js";
import esimRoutes     from "./routes/esim.js";
import aiRoutes       from "./routes/ai.js";
import walletRoutes     from "./routes/wallet.js";
import p2pvoucherRoutes from "./routes/p2pvouchers.js";
import adsRoutes        from "./routes/ads.js";
import depositRoutes    from "./routes/deposit.js";
import referralRoutes   from "./routes/referral.js";
import otpMgmtRoutes    from "./routes/otp-mgmt.js";
import creditsRoutes     from "./routes/credits.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = parseInt(process.env.PORT ?? "4000");

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:4173",
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (
      ALLOWED_ORIGINS.includes(origin) ||
      origin.endsWith(".onrender.com") ||
      origin.endsWith(".replit.app") ||
      origin.endsWith(".replit.dev") ||
      origin.endsWith(".layerz.com")
    ) return cb(null, true);
    return cb(null, true);
  },
  credentials: true,
}));
app.use(express.json());
const PgSession = connectPgSimple(session);
app.use(session({
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: "vbc_sessions",
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 15,
  }),
  secret: process.env.SESSION_SECRET ?? "vbc-dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure:   false,
    sameSite: "lax",
    maxAge:   30 * 24 * 60 * 60 * 1000,
  },
}));

app.use("/uploads",      express.static(path.join(__dirname, "..", "uploads")));
app.use("/api/auth",     authRoutes);
app.use("/api/auth/otp", otpRoutes);
app.use("/api/admin",    adminRoutes);
app.use("/api/profile",  profileRoutes);
app.use("/api/swap",     swapRoutes);
app.use("/api/trades",   tradeRoutes);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/rates",    ratesRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/market",   marketRoutes);
app.use("/api/esim",     esimRoutes);
app.use("/api/ai",       aiRoutes);
app.use("/api/wallet",       walletRoutes);
app.use("/api/p2pvouchers", p2pvoucherRoutes);
app.use("/api/ads",         adsRoutes);
app.use("/api/deposit",     depositRoutes);
app.use("/api/referral",    referralRoutes);
app.use("/api/otp-mgmt",    otpMgmtRoutes);
app.use("/api/credits",     creditsRoutes);
app.use("/api",             messageRoutes);
app.get("/health", (_req, res) => res.json({ ok: true, app: "VBC" }));

// ── In production: serve built frontend; in dev: proxy to Vite ──
if (process.env.NODE_ENV === "production") {
  // Try multiple paths to find the built frontend
  const candidates = [
    path.resolve(process.cwd(), "artifacts", "volegram", "dist", "public"),
    path.resolve(__dirname, "..", "..", "..", "artifacts", "volegram", "dist", "public"),
    path.resolve(__dirname, "..", "..", "volegram", "dist", "public"),
  ];
  const frontendDist = candidates.find(p => fs.existsSync(p));
  console.log("[VBC] Checked frontend paths:", candidates);
  if (frontendDist) {
    app.use(express.static(frontendDist));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });
    console.log("[VBC] Serving frontend from", frontendDist);
  } else {
    console.warn("[VBC] Frontend dist not found. cwd:", process.cwd(), "__dirname:", __dirname);
    app.get("*", (_req, res) => res.status(503).send("Frontend not built. Run: pnpm --filter @workspace/volegram run build"));
  }
} else {
  // Dev: proxy all non-API requests to the Vite dev server
  const { createProxyMiddleware } = await import("http-proxy-middleware");
  const VITE_PORT = process.env.VITE_PORT ?? "21394";
  const viteProxy = createProxyMiddleware({
    target: `http://localhost:${VITE_PORT}`,
    changeOrigin: true,
    ws: false,
  });
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) return next();
    return viteProxy(req, res, next);
  });
  console.log(`[VBC] Dev mode — proxying frontend to Vite at :${VITE_PORT}`);
}

async function migrate() {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE msg_type AS ENUM ('text','image','lightning','voice');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE room_type AS ENUM ('dm','group');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS chat_users (
      id                SERIAL PRIMARY KEY,
      lightning_address VARCHAR(200) UNIQUE NOT NULL,
      username          VARCHAR(80)  UNIQUE NOT NULL,
      avatar_seed       VARCHAR(40)  NOT NULL,
      avatar_url        TEXT,
      bio               TEXT,
      email             VARCHAR(200),
      phone             VARCHAR(40),
      sats_balance      INTEGER      NOT NULL DEFAULT 0,
      is_admin          BOOLEAN      NOT NULL DEFAULT FALSE,
      is_blocked        BOOLEAN      NOT NULL DEFAULT FALSE,
      created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
    ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS avatar_url     TEXT;
    ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS bio            TEXT;
    ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS email          VARCHAR(200);
    ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS phone          VARCHAR(40);
    ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS is_admin       BOOLEAN      NOT NULL DEFAULT FALSE;
    ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS is_blocked     BOOLEAN      NOT NULL DEFAULT FALSE;
    ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS privacy_level  VARCHAR(20)  NOT NULL DEFAULT 'private';

    CREATE TABLE IF NOT EXISTS chat_rooms (
      id         SERIAL PRIMARY KEY,
      type       room_type   NOT NULL DEFAULT 'dm',
      name       VARCHAR(100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS chat_members (
      room_id   INTEGER NOT NULL REFERENCES chat_rooms(id),
      user_id   INTEGER NOT NULL REFERENCES chat_users(id),
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id           SERIAL PRIMARY KEY,
      room_id      INTEGER    NOT NULL REFERENCES chat_rooms(id),
      sender_id    INTEGER    NOT NULL REFERENCES chat_users(id),
      type         msg_type   NOT NULL DEFAULT 'text',
      content      TEXT,
      invoice_pr   TEXT,
      invoice_paid BOOLEAN    NOT NULL DEFAULT FALSE,
      file_url     TEXT,
      sats         INTEGER,
      is_deleted   BOOLEAN    NOT NULL DEFAULT FALSE,
      expires_at   TIMESTAMPTZ,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_deleted  BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS expires_at  TIMESTAMPTZ;
    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reply_to_id INTEGER;
    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reactions   TEXT NOT NULL DEFAULT '{}';
    ALTER TABLE chat_rooms    ADD COLUMN IF NOT EXISTS is_incognito BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE chat_rooms    ADD COLUMN IF NOT EXISTS invite_code  VARCHAR(32);

    CREATE TABLE IF NOT EXISTS message_reads (
      message_id INTEGER NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES chat_users(id)    ON DELETE CASCADE,
      read_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (message_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS vbc_trades (
      id              SERIAL PRIMARY KEY,
      room_id         INTEGER     NOT NULL REFERENCES chat_rooms(id),
      buyer_id        INTEGER     NOT NULL REFERENCES chat_users(id),
      seller_id       INTEGER     NOT NULL REFERENCES chat_users(id),
      sats            INTEGER     NOT NULL,
      asset           VARCHAR(30) NOT NULL,
      asset_amount    VARCHAR(60) NOT NULL,
      buyer_address   TEXT,
      invoice_pr      TEXT,
      sbp_checkout_id TEXT,
      status            VARCHAR(30) NOT NULL DEFAULT 'pending',
      payment_proof_url TEXT,
      trade_type        VARCHAR(20) NOT NULL DEFAULT 'lightning',
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE vbc_trades ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
    ALTER TABLE vbc_trades ADD COLUMN IF NOT EXISTS trade_type VARCHAR(20) NOT NULL DEFAULT 'lightning';
    ALTER TABLE vbc_trades ADD COLUMN IF NOT EXISTS fee_sats   INTEGER     NOT NULL DEFAULT 0;
    ALTER TABLE vbc_trades ADD COLUMN IF NOT EXISTS fee_rate   VARCHAR(10) NOT NULL DEFAULT '0.01';

    CREATE TABLE IF NOT EXISTS vbc_listings (
      id                 SERIAL PRIMARY KEY,
      seller_id          INTEGER      NOT NULL REFERENCES chat_users(id),
      title              VARCHAR(200) NOT NULL,
      description        TEXT         NOT NULL DEFAULT '',
      price_sats         INTEGER      NOT NULL,
      currency           VARCHAR(10)  NOT NULL DEFAULT 'BTC',
      payment_method     VARCHAR(100) NOT NULL DEFAULT 'Lightning',
      status             VARCHAR(20)  NOT NULL DEFAULT 'active',
      created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
    -- Add new columns to vbc_listings if they don't exist
    ALTER TABLE vbc_listings ADD COLUMN IF NOT EXISTS asset            VARCHAR(30)   NOT NULL DEFAULT 'BTC';
    ALTER TABLE vbc_listings ADD COLUMN IF NOT EXISTS asset_amount     NUMERIC(20,8);
    ALTER TABLE vbc_listings ADD COLUMN IF NOT EXISTS receiving_address TEXT         NOT NULL DEFAULT '';
    ALTER TABLE vbc_listings ADD COLUMN IF NOT EXISTS listing_type     VARCHAR(10)   NOT NULL DEFAULT 'sell';

    -- ─────────── User Blocks ───────────
    CREATE TABLE IF NOT EXISTS vbc_blocks (
      id         SERIAL PRIMARY KEY,
      blocker_id INTEGER NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
      blocked_id INTEGER NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(blocker_id, blocked_id)
    );

    CREATE TABLE IF NOT EXISTS vbc_splits (
      id                SERIAL PRIMARY KEY,
      room_id           INTEGER      NOT NULL REFERENCES chat_rooms(id),
      creator_id        INTEGER      NOT NULL REFERENCES chat_users(id),
      total_sats        INTEGER      NOT NULL,
      per_sats          INTEGER      NOT NULL,
      description       TEXT,
      participant_count INTEGER      NOT NULL DEFAULT 1,
      completed         BOOLEAN      NOT NULL DEFAULT FALSE,
      created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS vbc_split_participants (
      id              SERIAL PRIMARY KEY,
      split_id        INTEGER      NOT NULL REFERENCES vbc_splits(id),
      user_id         INTEGER      REFERENCES chat_users(id),
      username        VARCHAR(100) NOT NULL,
      invoice_pr      TEXT,
      sbp_checkout_id TEXT,
      paid            BOOLEAN      NOT NULL DEFAULT FALSE,
      created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS chat_reports (
      id          SERIAL PRIMARY KEY,
      reporter_id INTEGER     NOT NULL REFERENCES chat_users(id),
      target_id   INTEGER     NOT NULL REFERENCES chat_users(id),
      reason      TEXT        NOT NULL,
      resolved    BOOLEAN     NOT NULL DEFAULT FALSE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS chat_rewards (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER     NOT NULL REFERENCES chat_users(id),
      action     VARCHAR(60) NOT NULL,
      sats       INTEGER     NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ─────────── Volegram Vouchers ───────────
    CREATE TABLE IF NOT EXISTS vbc_vouchers (
      id              SERIAL PRIMARY KEY,
      code            VARCHAR(60)  UNIQUE NOT NULL,
      amount          NUMERIC(20,2) NOT NULL,
      currency        VARCHAR(10)  NOT NULL DEFAULT 'SATS',
      payment_method  VARCHAR(20)  NOT NULL DEFAULT 'lightning',
      status          VARCHAR(20)  NOT NULL DEFAULT 'pending',
      creator_id      INTEGER      NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
      owner_id        INTEGER      NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
      commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.02,
      message         TEXT,
      created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      redeemed_at     TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS vbc_voucher_transfers (
      id            SERIAL PRIMARY KEY,
      voucher_id    INTEGER     NOT NULL REFERENCES vbc_vouchers(id) ON DELETE CASCADE,
      from_user_id  INTEGER     NOT NULL REFERENCES chat_users(id),
      to_user_id    INTEGER     NOT NULL REFERENCES chat_users(id),
      message       TEXT,
      sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS vbc_settings (
      key         VARCHAR(60) PRIMARY KEY,
      value       TEXT,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS vbc_otp_codes (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER     NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
      code        VARCHAR(10) NOT NULL,
      used        BOOLEAN     NOT NULL DEFAULT FALSE,
      expires_at  TIMESTAMPTZ NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE vbc_vouchers ADD COLUMN IF NOT EXISTS proof_url TEXT;

    -- eSIM listings
    CREATE TABLE IF NOT EXISTS esim_listings (
      id           SERIAL PRIMARY KEY,
      name         VARCHAR(200) NOT NULL,
      description  TEXT,
      country      VARCHAR(100),
      data_gb      NUMERIC(6,2),
      validity_days INTEGER,
      price_sats   INTEGER NOT NULL,
      phone_number VARCHAR(30),
      active       BOOLEAN NOT NULL DEFAULT TRUE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- eSIM orders
    CREATE TABLE IF NOT EXISTS esim_orders (
      id           SERIAL PRIMARY KEY,
      user_id      INTEGER NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
      listing_id   INTEGER NOT NULL REFERENCES esim_listings(id),
      price_sats   INTEGER NOT NULL,
      status       VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Default commission = 2%
    INSERT INTO vbc_settings (key, value) VALUES ('commission_rate', '0.02')
      ON CONFLICT (key) DO NOTHING;
    INSERT INTO vbc_settings (key, value) VALUES ('ads_price_sats_per_day', '1000')
      ON CONFLICT (key) DO NOTHING;

    -- ─────────── Referral Codes ───────────
    CREATE TABLE IF NOT EXISTS referral_codes (
      id           SERIAL PRIMARY KEY,
      code         VARCHAR(50) NOT NULL UNIQUE,
      bonus_sats   INTEGER     NOT NULL DEFAULT 0,
      max_uses     INTEGER,
      description  TEXT,
      expires_at   TIMESTAMPTZ,
      created_by   INTEGER REFERENCES chat_users(id),
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      active       BOOLEAN NOT NULL DEFAULT true
    );
    CREATE TABLE IF NOT EXISTS referral_uses (
      id         SERIAL PRIMARY KEY,
      code_id    INTEGER NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(code_id, user_id)
    );

    -- ─────────── OTP Country Management ───────────
    CREATE TABLE IF NOT EXISTS otp_countries (
      id            SERIAL PRIMARY KEY,
      country_code  VARCHAR(5)   NOT NULL,
      country_name  VARCHAR(100) NOT NULL,
      phone_prefix  VARCHAR(10)  NOT NULL,
      price_sats    INTEGER      NOT NULL DEFAULT 0,
      phone_number  VARCHAR(30),
      notes         TEXT,
      active        BOOLEAN      NOT NULL DEFAULT true,
      sort_order    INTEGER      NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    -- ─────────── Lightning Deposits ───────────
    CREATE TABLE IF NOT EXISTS vbc_deposits (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER      NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
      checkout_id   VARCHAR(128) NOT NULL UNIQUE,
      amount_sats   INTEGER      NOT NULL,
      status        VARCHAR(20)  NOT NULL DEFAULT 'pending',
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      expires_at    TIMESTAMPTZ  NOT NULL,
      completed_at  TIMESTAMPTZ
    );

    -- ─────────── Paid Ads / Classifieds ───────────
    CREATE TABLE IF NOT EXISTS vbc_ads (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER     NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
      title         VARCHAR(100) NOT NULL,
      description   TEXT        NOT NULL,
      contact       VARCHAR(200),
      link          TEXT,
      image_url     TEXT,
      status        VARCHAR(20) NOT NULL DEFAULT 'pending',
      paid_sats     INTEGER     NOT NULL DEFAULT 0,
      duration_days INTEGER     NOT NULL DEFAULT 7,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at    TIMESTAMPTZ NOT NULL
    );

    -- ─────────── P2P Voucher Marketplace ───────────
    CREATE TABLE IF NOT EXISTS p2p_voucher_listings (
      id                SERIAL PRIMARY KEY,
      service           VARCHAR(60)  NOT NULL,
      service_name      VARCHAR(200) NOT NULL,
      denomination      VARCHAR(100) NOT NULL,
      denomination_sort INTEGER      NOT NULL DEFAULT 0,
      price_sats        INTEGER      NOT NULL,
      stock             INTEGER      NOT NULL DEFAULT -1,
      icon              VARCHAR(20)  NOT NULL DEFAULT '🎫',
      description       TEXT,
      active            BOOLEAN      NOT NULL DEFAULT TRUE,
      created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS p2p_voucher_orders (
      id            SERIAL PRIMARY KEY,
      listing_id    INTEGER     NOT NULL REFERENCES p2p_voucher_listings(id),
      buyer_id      INTEGER     NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
      price_sats    INTEGER     NOT NULL,
      status        VARCHAR(20) NOT NULL DEFAULT 'pending',
      voucher_code  TEXT,
      delivered_at  TIMESTAMPTZ,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Seed default P2P voucher listings (Serbian market focus + international)
    INSERT INTO p2p_voucher_listings (service, service_name, denomination, denomination_sort, price_sats, stock, icon, description)
    VALUES
      -- X Bon (Serbia)
      ('xbon',       'X Bon',            '200 RSD',    200,  15000, -1, '🎮', 'X Bon vaučer za igre i digitalne usluge'),
      ('xbon',       'X Bon',            '500 RSD',    500,  35000, -1, '🎮', 'X Bon vaučer za igre i digitalne usluge'),
      ('xbon',       'X Bon',            '1000 RSD',  1000,  65000, -1, '🎮', 'X Bon vaučer za igre i digitalne usluge'),
      ('xbon',       'X Bon',            '2000 RSD',  2000, 125000, -1, '🎮', 'X Bon vaučer za igre i digitalne usluge'),
      -- Mtel TV (Serbia)
      ('mteltv',     'Mtel TV',          '1 mesec',      1,  50000, -1, '📺', 'Mtel TV pretplata 1 mesec - Srbija'),
      ('mteltv',     'Mtel TV',          '3 meseca',     3, 140000, -1, '📺', 'Mtel TV pretplata 3 meseca - Srbija'),
      ('mteltv',     'Mtel TV',          '12 meseci',   12, 500000, -1, '📺', 'Mtel TV pretplata 12 meseci - Srbija'),
      -- Aircash
      ('aircash',    'Aircash',          '10 EUR',      10,  28000, -1, '💸', 'Aircash novčani vaučer'),
      ('aircash',    'Aircash',          '20 EUR',      20,  54000, -1, '💸', 'Aircash novčani vaučer'),
      ('aircash',    'Aircash',          '50 EUR',      50, 130000, -1, '💸', 'Aircash novčani vaučer'),
      ('aircash',    'Aircash',          '100 EUR',    100, 258000, -1, '💸', 'Aircash novčani vaučer'),
      -- Paysafe Card
      ('paysafe',    'Paysafe Card',     '10 EUR',      10,  29000, -1, '💳', 'Paysafe Card za online plaćanje'),
      ('paysafe',    'Paysafe Card',     '25 EUR',      25,  70000, -1, '💳', 'Paysafe Card za online plaćanje'),
      ('paysafe',    'Paysafe Card',     '50 EUR',      50, 135000, -1, '💳', 'Paysafe Card za online plaćanje'),
      ('paysafe',    'Paysafe Card',     '100 EUR',    100, 265000, -1, '💳', 'Paysafe Card za online plaćanje'),
      -- Steam
      ('steam',      'Steam',            '5 EUR',        5,  16000, -1, '🎮', 'Steam Gift Card za Steam igre'),
      ('steam',      'Steam',            '10 EUR',      10,  30000, -1, '🎮', 'Steam Gift Card za Steam igre'),
      ('steam',      'Steam',            '20 EUR',      20,  58000, -1, '🎮', 'Steam Gift Card za Steam igre'),
      ('steam',      'Steam',            '50 EUR',      50, 140000, -1, '🎮', 'Steam Gift Card za Steam igre'),
      -- Google Play
      ('google',     'Google Play',      '10 EUR',      10,  30000, -1, '▶️',  'Google Play Gift Card'),
      ('google',     'Google Play',      '25 EUR',      25,  72000, -1, '▶️',  'Google Play Gift Card'),
      ('google',     'Google Play',      '50 EUR',      50, 140000, -1, '▶️',  'Google Play Gift Card'),
      -- Apple / iTunes
      ('apple',      'Apple / iTunes',   '15 EUR',      15,  44000, -1, '🍎', 'Apple iTunes Gift Card'),
      ('apple',      'Apple / iTunes',   '25 EUR',      25,  72000, -1, '🍎', 'Apple iTunes Gift Card'),
      ('apple',      'Apple / iTunes',   '50 EUR',      50, 140000, -1, '🍎', 'Apple iTunes Gift Card'),
      -- Netflix
      ('netflix',    'Netflix',          '1 mesec',      1,  80000, -1, '🎬', 'Netflix pretplata 1 mesec'),
      ('netflix',    'Netflix',          '3 meseca',     3, 225000, -1, '🎬', 'Netflix pretplata 3 meseca'),
      -- Spotify
      ('spotify',    'Spotify',          '1 mesec',      1,  28000, -1, '🎵', 'Spotify Premium 1 mesec'),
      ('spotify',    'Spotify',          '3 meseca',     3,  78000, -1, '🎵', 'Spotify Premium 3 meseca'),
      -- Amazon
      ('amazon',     'Amazon',           '10 EUR',      10,  30000, -1, '📦', 'Amazon Gift Card'),
      ('amazon',     'Amazon',           '25 EUR',      25,  72000, -1, '📦', 'Amazon Gift Card'),
      ('amazon',     'Amazon',           '50 EUR',      50, 140000, -1, '📦', 'Amazon Gift Card'),
      -- PSN / PlayStation
      ('psn',        'PlayStation',      '10 EUR',      10,  30000, -1, '🎮', 'PlayStation Store Gift Card'),
      ('psn',        'PlayStation',      '25 EUR',      25,  72000, -1, '🎮', 'PlayStation Store Gift Card'),
      ('psn',        'PlayStation',      '50 EUR',      50, 140000, -1, '🎮', 'PlayStation Store Gift Card'),
      -- Xbox
      ('xbox',       'Xbox / MS Store',  '10 EUR',      10,  30000, -1, '🎮', 'Xbox / Microsoft Store Gift Card'),
      ('xbox',       'Xbox / MS Store',  '25 EUR',      25,  72000, -1, '🎮', 'Xbox / Microsoft Store Gift Card'),
      ('xbox',       'Xbox / MS Store',  '50 EUR',      50, 140000, -1, '🎮', 'Xbox / Microsoft Store Gift Card'),
      -- Nintendo
      ('nintendo',   'Nintendo eShop',   '15 EUR',      15,  44000, -1, '🎮', 'Nintendo eShop Gift Card'),
      ('nintendo',   'Nintendo eShop',   '25 EUR',      25,  72000, -1, '🎮', 'Nintendo eShop Gift Card'),
      ('nintendo',   'Nintendo eShop',   '50 EUR',      50, 140000, -1, '🎮', 'Nintendo eShop Gift Card'),
      -- Riot Games / LoL
      ('riot',       'Riot Points',      '650 RP',     650,  5000,  -1, '⚔️', 'League of Legends / Valorant RP'),
      ('riot',       'Riot Points',      '1380 RP',   1380,  9500,  -1, '⚔️', 'League of Legends / Valorant RP'),
      ('riot',       'Riot Points',      '3500 RP',   3500, 22000,  -1, '⚔️', 'League of Legends / Valorant RP'),
      -- Fortnite / V-Bucks
      ('fortnite',   'Fortnite V-Bucks', '1000 VBux', 1000,  9000,  -1, '🎯', 'Fortnite V-Bucks'),
      ('fortnite',   'Fortnite V-Bucks', '2800 VBux', 2800, 22000,  -1, '🎯', 'Fortnite V-Bucks'),
      -- Roblox
      ('roblox',     'Roblox',           '400 Robux',  400,  5500,  -1, '🟥', 'Roblox Robux Gift Card'),
      ('roblox',     'Roblox',           '800 Robux',  800,  9000,  -1, '🟥', 'Roblox Robux Gift Card'),
      -- PUBG
      ('pubg',       'PUBG UC',          '325 UC',     325,  5500,  -1, '🔫', 'PUBG Mobile UC'),
      ('pubg',       'PUBG UC',          '660 UC',     660,  9000,  -1, '🔫', 'PUBG Mobile UC'),
      -- Free Fire
      ('freefire',   'Free Fire',        '100 Dijam.',  100,  2000,  -1, '💎', 'Free Fire dijamanti'),
      ('freefire',   'Free Fire',        '520 Dijam.',  520,  9000,  -1, '💎', 'Free Fire dijamanti'),
      -- Disney+
      ('disney',     'Disney+',          '1 mesec',      1,  45000, -1, '🏰', 'Disney+ pretplata 1 mesec'),
      -- YouTube Premium
      ('youtube',    'YouTube Premium',  '1 mesec',      1,  30000, -1, '▶️',  'YouTube Premium 1 mesec'),
      -- Deezer
      ('deezer',     'Deezer',           '1 mesec',      1,  26000, -1, '🎵', 'Deezer Premium 1 mesec'),
      -- Wolt / Bolt Food
      ('wolt',       'Wolt',             '10 EUR',      10,  30000, -1, '🛵', 'Wolt bon za dostavu'),
      ('wolt',       'Wolt',             '20 EUR',      20,  58000, -1, '🛵', 'Wolt bon za dostavu'),
      -- Revolut / IBAN (Srbija)
      ('revolut',    'Revolut',          '20 EUR',      20,  58000, -1, '💜', 'Revolut punitev novčanika'),
      ('revolut',    'Revolut',          '50 EUR',      50, 140000, -1, '💜', 'Revolut punitev novčanika'),
      -- Booking.com
      ('booking',    'Booking.com',      '50 EUR',      50, 140000, -1, '🏨', 'Booking.com bon za rezervacije'),
      -- Shein
      ('shein',      'Shein',            '20 EUR',      20,  58000, -1, '👗', 'Shein fashion bon'),
      ('shein',      'Shein',            '50 EUR',      50, 140000, -1, '👗', 'Shein fashion bon'),
      -- Minecraft
      ('minecraft',  'Minecraft',        'Java Ed.',     1,  80000, -1, '⛏️',  'Minecraft Java Edition ključ'),
      -- Clash of Clans
      ('coc',        'Clash of Clans',   '80 Dragulj.',  80,  2500, -1, '⚔️', 'Clash of Clans dragulji')
    ON CONFLICT DO NOTHING;
  `);

  // Purge expired messages every minute
  setInterval(async () => {
    try {
      await db.execute(sql`
        UPDATE chat_messages SET is_deleted = TRUE
        WHERE expires_at IS NOT NULL AND expires_at < NOW() AND is_deleted = FALSE
      `);
    } catch {}
  }, 60_000);

  console.log("[VBC] DB ready");
}

const server = createServer(app);
setupWS(server);

migrate().then(() => {
  server.listen(PORT, () => console.log(`[VBC] Backend → port ${PORT}`));
});
