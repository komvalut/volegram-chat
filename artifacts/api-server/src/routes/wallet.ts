import { Router } from "express";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

const router = Router();

function auth(req: any, res: any, next: any) {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// POST /api/wallet/send — internal transfer to another VBC user by Lightning address
router.post("/send", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const { address, amount_sats } = req.body;

  if (!address || !amount_sats || amount_sats <= 0) {
    return res.status(400).json({ error: "address and amount_sats required" });
  }
  if (amount_sats < 1) {
    return res.status(400).json({ error: "Minimum send is 1 sat" });
  }

  const senderR = await db.execute(sql`SELECT * FROM chat_users WHERE id = ${userId} LIMIT 1`);
  const sender = senderR.rows[0] as any;
  if (!sender) return res.status(404).json({ error: "Sender not found" });
  if (sender.sats_balance < amount_sats) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  const recipientR = await db.execute(sql`
    SELECT * FROM chat_users WHERE LOWER(lightning_address) = LOWER(${address}) LIMIT 1
  `);
  const recipient = recipientR.rows[0] as any;

  if (!recipient) {
    return res.status(404).json({
      error: "Recipient not found in VBC. External Lightning sends will be available soon.",
    });
  }

  if (recipient.id === userId) {
    return res.status(400).json({ error: "Cannot send to yourself" });
  }

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

export default router;
