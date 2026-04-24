import express from "express";
import session from "express-session";
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
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = parseInt(process.env.PORT ?? "4000");

app.use(cors({
  origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET ?? "vbc-dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure:   process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge:   30 * 24 * 60 * 60 * 1000,
  },
}));

app.use("/uploads",      express.static(path.join(__dirname, "..", "uploads")));
app.use("/api/auth",     authRoutes);
app.use("/api/admin",    adminRoutes);
app.use("/api/profile",  profileRoutes);
app.use("/api/swap",     swapRoutes);
app.use("/api/trades",   tradeRoutes);
app.use("/api",          messageRoutes);
app.get("/health", (_req, res) => res.json({ ok: true, app: "VBC" }));

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
    ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS bio        TEXT;
    ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS email      VARCHAR(200);
    ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS phone      VARCHAR(40);
    ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS is_admin   BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;

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
    ALTER TABLE chat_rooms    ADD COLUMN IF NOT EXISTS is_incognito BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE chat_rooms    ADD COLUMN IF NOT EXISTS invite_code  VARCHAR(32);

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
