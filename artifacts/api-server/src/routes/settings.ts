import { Router } from "express";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

const router = Router();

async function isAdmin(userId: number) {
  const [u] = (await db.execute(sql`SELECT is_admin FROM chat_users WHERE id = ${userId}`)).rows as any[];
  return !!u?.is_admin;
}
function adminGuard(req: any, res: any, next: any) {
  const id = (req.session as any).userId;
  if (!id) return res.status(401).json({ error: "Unauthorized" });
  isAdmin(id).then(ok => ok ? next() : res.status(403).json({ error: "Admin only" }));
}

/* PUBLIC: get a few settings clients can see (commission rate, IBAN for bank transfer, market toggle) */
router.get("/public", async (_req, res) => {
  const r = await db.execute(sql`SELECT key, value FROM vbc_settings WHERE key IN ('commission_rate','bank_iban','bank_holder','bank_name','bank_swift','support_message','market_enabled','credits_commission','prediction_commission','swap_commission')`);
  const out: Record<string,string> = {};
  for (const row of r.rows as any[]) out[row.key] = row.value;
  res.json({
    commissionRate:        parseFloat(out.commission_rate ?? "0.02"),
    creditsCommission:     parseFloat(out.credits_commission ?? "0.10"),
    predictionCommission:  parseFloat(out.prediction_commission ?? "0.05"),
    swapCommission:        parseFloat(out.swap_commission ?? "0.01"),
    bank: {
      iban:   out.bank_iban   ?? "",
      holder: out.bank_holder ?? "",
      name:   out.bank_name   ?? "",
      swift:  out.bank_swift  ?? "",
    },
    supportMessage: out.support_message ?? "",
    marketEnabled:  out.market_enabled !== "false",
    iban: out.bank_iban ?? "",
  });
});

/* ADMIN: list all settings */
router.get("/", adminGuard, async (_req, res) => {
  const r = await db.execute(sql`SELECT key, value, updated_at FROM vbc_settings ORDER BY key`);
  res.json({ settings: r.rows });
});

/* ADMIN: upsert a setting */
router.post("/", adminGuard, async (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: "Key required" });
  await db.execute(sql`
    INSERT INTO vbc_settings (key, value, updated_at)
    VALUES (${key}, ${String(value ?? "")}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `);
  res.json({ ok: true });
});

/* ADMIN: bulk update users (block/unblock, promote, balance adjust) */
router.post("/users/:id/block",   adminGuard, async (req, res) => {
  await db.execute(sql`UPDATE chat_users SET is_blocked = TRUE  WHERE id = ${parseInt(req.params.id)}`);
  res.json({ ok: true });
});
router.post("/users/:id/unblock", adminGuard, async (req, res) => {
  await db.execute(sql`UPDATE chat_users SET is_blocked = FALSE WHERE id = ${parseInt(req.params.id)}`);
  res.json({ ok: true });
});
router.post("/users/:id/promote", adminGuard, async (req, res) => {
  await db.execute(sql`UPDATE chat_users SET is_admin = TRUE  WHERE id = ${parseInt(req.params.id)}`);
  res.json({ ok: true });
});
router.post("/users/:id/demote",  adminGuard, async (req, res) => {
  await db.execute(sql`UPDATE chat_users SET is_admin = FALSE WHERE id = ${parseInt(req.params.id)}`);
  res.json({ ok: true });
});
router.post("/users/:id/balance", adminGuard, async (req, res) => {
  const delta = parseInt(req.body.delta ?? "0");
  await db.execute(sql`UPDATE chat_users SET sats_balance = sats_balance + ${delta} WHERE id = ${parseInt(req.params.id)}`);
  res.json({ ok: true });
});
router.delete("/users/:id",       adminGuard, async (req, res) => {
  const uid = parseInt(req.params.id);
  await db.execute(sql`DELETE FROM chat_messages WHERE sender_id = ${uid}`);
  await db.execute(sql`DELETE FROM chat_members  WHERE user_id   = ${uid}`);
  await db.execute(sql`DELETE FROM chat_rewards  WHERE user_id   = ${uid}`);
  await db.execute(sql`DELETE FROM chat_users    WHERE id        = ${uid}`);
  res.json({ ok: true });
});
router.get("/users", adminGuard, async (_req, res) => {
  const r = await db.execute(sql`SELECT id, username, lightning_address, email, sats_balance, is_admin, is_blocked, created_at FROM chat_users ORDER BY created_at DESC LIMIT 500`);
  res.json({ users: r.rows });
});

export default router;
