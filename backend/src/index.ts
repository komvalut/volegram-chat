import express from "express";
import session from "express-session";
import cors from "cors";
import { createServer } from "http";
import { setupWS } from "./lib/ws.js";
import { db } from "./db/index.js";
import { chatUsersTable, chatRoomsTable, chatMembersTable, chatMessagesTable, chatRewardsTable } from "./db/schema.js";
import { sql } from "drizzle-orm";
import authRoutes from "./routes/auth.js";
import messageRoutes from "./routes/messages.js";
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
  secret: process.env.SESSION_SECRET ?? "volegram-dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === "production", maxAge: 30 * 24 * 60 * 60 * 1000 },
}));

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use("/api/auth", authRoutes);
app.use("/api", messageRoutes);

app.get("/health", (_req, res) => res.json({ ok: true }));

async function migrate() {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE IF NOT EXISTS msg_type AS ENUM ('text','image','lightning','voice');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE IF NOT EXISTS room_type AS ENUM ('dm','group');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS chat_users (
      id               SERIAL PRIMARY KEY,
      lightning_address VARCHAR(200) UNIQUE NOT NULL,
      username         VARCHAR(80)  UNIQUE NOT NULL,
      avatar_seed      VARCHAR(40)  NOT NULL,
      sats_balance     INTEGER      NOT NULL DEFAULT 0,
      created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS chat_rooms (
      id         SERIAL PRIMARY KEY,
      type       room_type   NOT NULL DEFAULT 'dm',
      name       VARCHAR(100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS chat_members (
      room_id    INTEGER NOT NULL REFERENCES chat_rooms(id),
      user_id    INTEGER NOT NULL REFERENCES chat_users(id),
      joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS chat_rewards (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER     NOT NULL REFERENCES chat_users(id),
      action     VARCHAR(60) NOT NULL,
      sats       INTEGER     NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("DB ready");
}

const server = createServer(app);
setupWS(server);

migrate().then(() => {
  server.listen(PORT, () => console.log(`VOLEGRAM backend → port ${PORT}`));
});
