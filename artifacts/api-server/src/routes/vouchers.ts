import { Router } from "express";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname2 = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname2, "..", "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `vv-proof-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

const router = Router();

function auth(req: any, res: any, next: any) {
  if (!(req.session as any).userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}
async function isAdmin(userId: number) {
  const [u] = (await db.execute(sql`SELECT is_admin FROM chat_users WHERE id = ${userId}`)).rows as any[];
  return !!u?.is_admin;
}
function adminGuard(req: any, res: any, next: any) {
  isAdmin((req.session as any).userId).then(ok => ok ? next() : res.status(403).json({ error: "Admin only" }));
}

function genCode() {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `VV-${part()}-${part()}-${part()}`;
}
// Add small random 2-decimal jitter so amounts never look round
function jitterAmount(base: number, currency: string): number {
  if (currency === "SATS") {
    // For sats, add 1-99 sats jitter
    return Math.floor(base) + Math.floor(Math.random() * 99) + 1;
  }
  // fiat: ensure 2 decimals never end in .00
  const cents = Math.floor(Math.random() * 99) + 1;
  return Math.floor(base) + cents / 100;
}

// Get current commission rate (default 2%)
async function getCommission() {
  const r = await db.execute(sql`SELECT value FROM vbc_settings WHERE key = 'commission_rate' LIMIT 1`);
  const v = (r.rows[0] as any)?.value;
  return v ? parseFloat(v) : 0.02;
}

/* ─────────── Public: list available currencies ─────────── */
router.get("/currencies", async (_req, res) => {
  res.json({
    currencies: [
      { code: "SATS", symbol: "⚡", name: "Bitcoin Sats" },
      { code: "EUR",  symbol: "€",  name: "Euro" },
      { code: "USD",  symbol: "$",  name: "US Dollar" },
      { code: "GBP",  symbol: "£",  name: "British Pound" },
      { code: "BAM",  symbol: "KM", name: "Bosnian Mark" },
      { code: "RSD",  symbol: "дин", name: "Serbian Dinar" },
      { code: "HRK",  symbol: "kn", name: "Croatian Kuna" },
      { code: "CHF",  symbol: "Fr", name: "Swiss Franc" },
    ],
    paymentMethods: [
      { code: "lightning", name: "Lightning / Bitcoin (instant)", instant: true },
      { code: "bank",      name: "Bank Transfer — IBAN (admin confirms)", instant: false },
    ],
  });
});

/* ─────────── Create voucher (buy) ─────────── */
router.post("/", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const { amount, currency = "SATS", paymentMethod = "lightning", recipientUsername, message } = req.body;

  if (!amount || amount <= 0) return res.status(400).json({ error: "Amount required" });
  const cur = String(currency).toUpperCase();
  if (!["SATS","EUR","USD","GBP","BAM","RSD","HRK","CHF"].includes(cur))
    return res.status(400).json({ error: "Invalid currency" });

  // Apply jitter so the amount is never round
  const jittered = jitterAmount(parseFloat(amount), cur);
  const commission = await getCommission();
  const code = genCode();

  // Determine owner — if recipientUsername given, voucher is gifted; else owner is creator
  let ownerId: number = userId;
  if (recipientUsername) {
    const r = await db.execute(sql`SELECT id FROM chat_users WHERE username = ${recipientUsername} LIMIT 1`);
    const u = r.rows[0] as any;
    if (!u) return res.status(404).json({ error: "Recipient not found" });
    ownerId = u.id;
  }

  const status = paymentMethod === "lightning" ? "active" : "pending"; // lightning = instant; bank = wait admin
  const result = await db.execute(sql`
    INSERT INTO vbc_vouchers (code, amount, currency, payment_method, status, creator_id, owner_id, commission_rate, message, created_at)
    VALUES (${code}, ${jittered}, ${cur}, ${paymentMethod}, ${status}, ${userId}, ${ownerId}, ${commission}, ${message ?? null}, NOW())
    RETURNING *
  `);
  const voucher = result.rows[0];

  res.json({ voucher, amountActual: jittered, currency: cur, commissionRate: commission });
});

/* ─────────── List MY vouchers (created or owned) ─────────── */
router.get("/", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const r = await db.execute(sql`
    SELECT v.*,
      c.username AS creator_username,
      o.username AS owner_username
    FROM vbc_vouchers v
    LEFT JOIN chat_users c ON c.id = v.creator_id
    LEFT JOIN chat_users o ON o.id = v.owner_id
    WHERE v.creator_id = ${userId} OR v.owner_id = ${userId}
    ORDER BY v.created_at DESC
    LIMIT 200
  `);
  res.json({ vouchers: r.rows });
});

/* ─────────── Send/gift voucher to user ─────────── */
router.post("/:id/send", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const id = parseInt(req.params.id);
  const { recipientUsername, message } = req.body;

  if (!recipientUsername) return res.status(400).json({ error: "Recipient required" });

  const vRow = (await db.execute(sql`SELECT * FROM vbc_vouchers WHERE id = ${id} LIMIT 1`)).rows[0] as any;
  if (!vRow) return res.status(404).json({ error: "Voucher not found" });
  if (vRow.owner_id !== userId) return res.status(403).json({ error: "Not your voucher" });
  if (vRow.status !== "active") return res.status(400).json({ error: "Voucher not active" });

  const target = (await db.execute(sql`SELECT id FROM chat_users WHERE username = ${recipientUsername} LIMIT 1`)).rows[0] as any;
  if (!target) return res.status(404).json({ error: "Recipient not found" });

  await db.execute(sql`
    UPDATE vbc_vouchers SET owner_id = ${target.id} WHERE id = ${id}
  `);
  await db.execute(sql`
    INSERT INTO vbc_voucher_transfers (voucher_id, from_user_id, to_user_id, message, sent_at)
    VALUES (${id}, ${userId}, ${target.id}, ${message ?? null}, NOW())
  `);
  res.json({ ok: true });
});

/* ─────────── Redeem voucher by code ─────────── */
router.post("/redeem", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Code required" });

  const vRow = (await db.execute(sql`SELECT * FROM vbc_vouchers WHERE code = ${code} LIMIT 1`)).rows[0] as any;
  if (!vRow) return res.status(404).json({ error: "Invalid code" });
  if (vRow.status !== "active") return res.status(400).json({ error: "Voucher not active or already redeemed" });

  // Convert to sats balance
  let satsToAdd = 0;
  if (vRow.currency === "SATS") {
    satsToAdd = Math.floor(parseFloat(vRow.amount));
  } else {
    // Need rate
    const rate = await getRate("BTC", vRow.currency);
    if (!rate) return res.status(503).json({ error: "Rate unavailable" });
    satsToAdd = Math.floor((parseFloat(vRow.amount) / rate) * 100_000_000);
  }
  // Apply commission
  const fee = Math.floor(satsToAdd * parseFloat(vRow.commission_rate));
  const net = satsToAdd - fee;

  await db.execute(sql`
    UPDATE chat_users SET sats_balance = sats_balance + ${net} WHERE id = ${userId}
  `);
  await db.execute(sql`
    UPDATE vbc_vouchers SET status = 'redeemed', owner_id = ${userId}, redeemed_at = NOW() WHERE id = ${vRow.id}
  `);
  res.json({ ok: true, satsCredited: net, commissionSats: fee });
});

/* ─────────── ADMIN: confirm bank-transfer payment ─────────── */
router.post("/:id/confirm-payment", adminGuard, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.execute(sql`UPDATE vbc_vouchers SET status = 'active' WHERE id = ${id} AND status = 'pending'`);
  res.json({ ok: true });
});

/* ─────────── ADMIN: list ALL vouchers ─────────── */
router.get("/admin/all", adminGuard, async (_req, res) => {
  const r = await db.execute(sql`
    SELECT v.*,
      c.username AS creator_username,
      o.username AS owner_username
    FROM vbc_vouchers v
    LEFT JOIN chat_users c ON c.id = v.creator_id
    LEFT JOIN chat_users o ON o.id = v.owner_id
    ORDER BY v.created_at DESC
    LIMIT 500
  `);
  res.json({ vouchers: r.rows });
});

/* ─────────── ADMIN: void / cancel voucher ─────────── */
router.delete("/:id", adminGuard, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.execute(sql`UPDATE vbc_vouchers SET status = 'voided' WHERE id = ${id}`);
  res.json({ ok: true });
});

/* ─────────── User: upload bank-transfer payment proof ─────────── */
router.post("/:id/proof", auth, upload.single("proof"), async (req: any, res) => {
  const userId = (req.session as any).userId;
  const id = parseInt(req.params.id);

  const vRow = (await db.execute(sql`SELECT * FROM vbc_vouchers WHERE id = ${id} LIMIT 1`)).rows[0] as any;
  if (!vRow) return res.status(404).json({ error: "Voucher not found" });
  if (vRow.creator_id !== userId) return res.status(403).json({ error: "Not your voucher" });
  if (vRow.payment_method !== "bank") return res.status(400).json({ error: "Proof only needed for bank transfers" });
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const proofUrl = `/uploads/${req.file.filename}`;
  await db.execute(sql`UPDATE vbc_vouchers SET proof_url = ${proofUrl} WHERE id = ${id}`);
  res.json({ ok: true, proofUrl });
});

// Helper fetch rate (BTC -> currency) used in redeem (also exposed via /api/rates)
async function getRate(_from: string, to: string): Promise<number|null> {
  if (to === "BTC" || to === "SATS") return 1;
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${to.toLowerCase()}`);
    const j = await r.json();
    return j?.bitcoin?.[to.toLowerCase()] ?? null;
  } catch {
    return null;
  }
}

export default router;
