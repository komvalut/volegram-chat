import { Router } from "express";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

const router = Router();

function auth(req: any, res: any, next: any) {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// Resolve recipient: accepts lightning_address, @username, or username
async function resolveRecipient(identifier: string) {
  const clean = identifier.trim();

  // Username format: starts with @ or has no @ at all (and not email-like)
  if (!clean.includes("@") || clean.startsWith("@")) {
    const username = clean.replace(/^@/, "");
    const r = await db.execute(sql`
      SELECT * FROM chat_users WHERE LOWER(username) = LOWER(${username}) LIMIT 1
    `);
    return (r.rows[0] as any) ?? null;
  }

  // Lightning address format: user@domain.tld
  const r = await db.execute(sql`
    SELECT * FROM chat_users WHERE LOWER(lightning_address) = LOWER(${clean}) LIMIT 1
  `);
  return (r.rows[0] as any) ?? null;
}

// POST /api/wallet/send — internal transfer; recipient can be username or Lightning address
router.post("/send", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const { address, amount_sats } = req.body;

  if (!address || !amount_sats || amount_sats <= 0) {
    return res.status(400).json({ error: "Recipient and amount required" });
  }

  const senderR = await db.execute(sql`SELECT * FROM chat_users WHERE id = ${userId} LIMIT 1`);
  const sender = senderR.rows[0] as any;
  if (!sender) return res.status(404).json({ error: "Sender not found" });
  if (sender.sats_balance < amount_sats) {
    return res.status(400).json({ error: `Insufficient balance — you have ${sender.sats_balance} sats` });
  }

  const recipient = await resolveRecipient(address);

  if (!recipient) {
    const isLnAddress = address.includes("@") && !address.startsWith("@");
    return res.status(404).json({
      error: isLnAddress
        ? "Recipient not found. Only internal VBC users can receive sats. Make sure they have a Volegram account."
        : `User @${address.replace(/^@/, "")} not found on Volegram.`,
    });
  }

  if (recipient.id === userId) {
    return res.status(400).json({ error: "Cannot send to yourself" });
  }

  // Check if either user has blocked the other
  const blockR = await db.execute(sql`
    SELECT 1 FROM vbc_blocks
    WHERE (blocker_id = ${userId} AND blocked_id = ${recipient.id})
       OR (blocker_id = ${recipient.id} AND blocked_id = ${userId})
    LIMIT 1
  `);
  if (blockR.rows.length > 0) {
    return res.status(403).json({ error: "Cannot send sats to this user" });
  }

  // Atomic transfer
  await db.execute(sql`
    UPDATE chat_users SET sats_balance = sats_balance - ${amount_sats} WHERE id = ${userId}
  `);
  await db.execute(sql`
    UPDATE chat_users SET sats_balance = sats_balance + ${amount_sats} WHERE id = ${recipient.id}
  `);

  res.json({
    ok: true,
    sent_sats: amount_sats,
    to: recipient.username,
    to_lightning: recipient.lightning_address,
  });
});

// GET /api/wallet/balance
router.get("/balance", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const r = await db.execute(sql`SELECT sats_balance FROM chat_users WHERE id = ${userId} LIMIT 1`);
  const u = r.rows[0] as any;
  res.json({ sats_balance: u?.sats_balance ?? 0 });
});

// GET /api/wallet/history — recent sends/receives
router.get("/history", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  // We'll return deposit history for now (full tx history requires a tx log table)
  const r = await db.execute(sql`
    SELECT d.id, d.amount_sats, d.status, d.created_at, d.completed_at
    FROM vbc_deposits d
    WHERE d.user_id = ${userId}
    ORDER BY d.created_at DESC
    LIMIT 20
  `);
  res.json({ deposits: r.rows });
});

export default router;
