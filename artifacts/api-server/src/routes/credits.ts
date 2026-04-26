import { Router } from "express";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

const router = Router();

function auth(req: any, res: any, next: any) {
  if (!(req.session as any).userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

async function getCreditsCommission(): Promise<number> {
  const r = await db.execute(sql`SELECT value FROM vbc_settings WHERE key = 'credits_commission' LIMIT 1`);
  return parseFloat((r.rows[0] as any)?.value ?? "0.10");
}

// GET /api/credits — open listings
router.get("/", auth, async (_req, res) => {
  const r = await db.execute(sql`
    SELECT c.*, u.username AS poster_username
    FROM p2p_credits c
    JOIN chat_users u ON u.id = c.user_id
    WHERE c.status = 'open'
    ORDER BY c.created_at DESC
    LIMIT 100
  `);
  res.json({ credits: r.rows });
});

// GET /api/credits/mine — my listings
router.get("/mine", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const r = await db.execute(sql`
    SELECT c.*, u.username AS poster_username,
           b.username AS borrower_username
    FROM p2p_credits c
    JOIN chat_users u ON u.id = c.user_id
    LEFT JOIN chat_users b ON b.id = c.borrower_id
    WHERE c.user_id = ${userId} OR c.borrower_id = ${userId}
    ORDER BY c.created_at DESC
    LIMIT 100
  `);
  res.json({ credits: r.rows });
});

// POST /api/credits — create listing (offer to lend OR request to borrow)
router.post("/", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const { type, amount_sats, interest_pct, duration_days, description } = req.body;

  if (!type || !["offer", "request"].includes(type))
    return res.status(400).json({ error: "type must be 'offer' or 'request'" });
  if (!amount_sats || amount_sats < 1)
    return res.status(400).json({ error: "amount_sats required" });

  if (type === "offer") {
    const ur = await db.execute(sql`SELECT sats_balance FROM chat_users WHERE id = ${userId} LIMIT 1`);
    const user = ur.rows[0] as any;
    if (!user || user.sats_balance < amount_sats)
      return res.status(400).json({ error: `Insufficient balance. Need ${amount_sats.toLocaleString()} sats.` });
    await db.execute(sql`UPDATE chat_users SET sats_balance = sats_balance - ${amount_sats} WHERE id = ${userId}`);
  }

  const r = await db.execute(sql`
    INSERT INTO p2p_credits (user_id, type, amount_sats, interest_pct, duration_days, description, status, created_at)
    VALUES (${userId}, ${type}, ${amount_sats}, ${interest_pct ?? 0}, ${duration_days ?? 7}, ${description ?? null}, 'open', NOW())
    RETURNING *
  `);
  res.json({ ok: true, credit: r.rows[0] });
});

// POST /api/credits/:id/take — borrower takes a loan offer
router.post("/:id/take", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const id = parseInt(req.params.id);

  const cr = await db.execute(sql`SELECT * FROM p2p_credits WHERE id = ${id} AND status = 'open' LIMIT 1`);
  const credit = cr.rows[0] as any;
  if (!credit) return res.status(404).json({ error: "Listing not found or already taken" });
  if (credit.user_id === userId) return res.status(400).json({ error: "Cannot take your own listing" });

  if (credit.type === "offer") {
    // Lender already locked sats — send to borrower
    await db.execute(sql`UPDATE chat_users SET sats_balance = sats_balance + ${credit.amount_sats} WHERE id = ${userId}`);
    const dueAt = new Date(Date.now() + credit.duration_days * 86400000).toISOString();
    await db.execute(sql`
      UPDATE p2p_credits SET status = 'active', borrower_id = ${userId}, due_at = ${dueAt} WHERE id = ${id}
    `);
    res.json({ ok: true, message: `You received ⚡${credit.amount_sats} sats. Repay within ${credit.duration_days} days.` });
  } else {
    // Request — funder sends sats to requester
    const ur = await db.execute(sql`SELECT sats_balance FROM chat_users WHERE id = ${userId} LIMIT 1`);
    const funder = ur.rows[0] as any;
    if (!funder || funder.sats_balance < credit.amount_sats)
      return res.status(400).json({ error: `Insufficient balance. Need ${credit.amount_sats} sats.` });
    await db.execute(sql`UPDATE chat_users SET sats_balance = sats_balance - ${credit.amount_sats} WHERE id = ${userId}`);
    await db.execute(sql`UPDATE chat_users SET sats_balance = sats_balance + ${credit.amount_sats} WHERE id = ${credit.user_id}`);
    const dueAt = new Date(Date.now() + credit.duration_days * 86400000).toISOString();
    await db.execute(sql`
      UPDATE p2p_credits SET status = 'active', borrower_id = ${credit.user_id}, due_at = ${dueAt} WHERE id = ${id}
    `);
    res.json({ ok: true, message: `Funded! @${(await db.execute(sql`SELECT username FROM chat_users WHERE id = ${credit.user_id} LIMIT 1`)).rows[0]?.username} received the sats.` });
  }
});

// POST /api/credits/:id/repay — borrower repays
router.post("/:id/repay", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const id = parseInt(req.params.id);

  const cr = await db.execute(sql`SELECT * FROM p2p_credits WHERE id = ${id} AND status = 'active' LIMIT 1`);
  const credit = cr.rows[0] as any;
  if (!credit) return res.status(404).json({ error: "Loan not found or not active" });
  if (credit.borrower_id !== userId) return res.status(403).json({ error: "Not your loan" });

  const interest = Math.ceil(credit.amount_sats * (credit.interest_pct / 100));
  const total = credit.amount_sats + interest;

  const ur = await db.execute(sql`SELECT sats_balance FROM chat_users WHERE id = ${userId} LIMIT 1`);
  const borrower = ur.rows[0] as any;
  if (!borrower || borrower.sats_balance < total)
    return res.status(400).json({ error: `Need ${total} sats to repay (principal + ${interest} interest).` });

  // Admin takes commission from the interest only
  const commissionRate = await getCreditsCommission();
  const adminCut = Math.floor(interest * commissionRate);
  const lenderReceives = total - adminCut;

  await db.execute(sql`UPDATE chat_users SET sats_balance = sats_balance - ${total} WHERE id = ${userId}`);
  await db.execute(sql`UPDATE chat_users SET sats_balance = sats_balance + ${lenderReceives} WHERE id = ${credit.user_id}`);
  if (adminCut > 0) {
    await db.execute(sql`UPDATE chat_users SET sats_balance = sats_balance + ${adminCut} WHERE is_admin = true LIMIT 1`);
  }
  await db.execute(sql`UPDATE p2p_credits SET status = 'repaid', repaid_at = NOW() WHERE id = ${id}`);

  res.json({ ok: true, message: `Repaid ⚡${total} sats. Lender got ⚡${lenderReceives}, platform fee ⚡${adminCut}.` });
});

// DELETE /api/credits/:id — cancel open listing
router.delete("/:id", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const id = parseInt(req.params.id);

  const cr = await db.execute(sql`SELECT * FROM p2p_credits WHERE id = ${id} AND status = 'open' LIMIT 1`);
  const credit = cr.rows[0] as any;
  if (!credit) return res.status(404).json({ error: "Listing not found" });
  if (credit.user_id !== userId) return res.status(403).json({ error: "Not your listing" });

  if (credit.type === "offer") {
    await db.execute(sql`UPDATE chat_users SET sats_balance = sats_balance + ${credit.amount_sats} WHERE id = ${userId}`);
  }
  await db.execute(sql`UPDATE p2p_credits SET status = 'cancelled' WHERE id = ${id}`);
  res.json({ ok: true });
});

// POST /api/credits/topup-request — bank transfer top-up request
router.post("/topup-request", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const { amount_fiat, currency, note } = req.body;
  if (!amount_fiat || !currency) return res.status(400).json({ error: "amount_fiat and currency required" });
  const r = await db.execute(sql`
    INSERT INTO topup_requests (user_id, amount_fiat, currency, note, status, created_at)
    VALUES (${userId}, ${amount_fiat}, ${currency}, ${note ?? null}, 'pending', NOW())
    RETURNING *
  `);
  res.json({ ok: true, request: r.rows[0] });
});

// GET /api/credits/topup-requests — admin: all pending requests
router.get("/topup-requests", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const isAdmin = (await db.execute(sql`SELECT is_admin FROM chat_users WHERE id = ${userId} LIMIT 1`)).rows[0] as any;
  if (!isAdmin?.is_admin) return res.status(403).json({ error: "Admin only" });
  const r = await db.execute(sql`
    SELECT t.*, u.username, u.lightning_address
    FROM topup_requests t JOIN chat_users u ON u.id = t.user_id
    ORDER BY t.created_at DESC LIMIT 200
  `);
  res.json({ requests: r.rows });
});

// POST /api/credits/topup-requests/:id/approve — admin approves
router.post("/topup-requests/:id/approve", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const isAdmin = (await db.execute(sql`SELECT is_admin FROM chat_users WHERE id = ${userId} LIMIT 1`)).rows[0] as any;
  if (!isAdmin?.is_admin) return res.status(403).json({ error: "Admin only" });
  const { amount_sats } = req.body;
  if (!amount_sats) return res.status(400).json({ error: "amount_sats required" });
  const tr = await db.execute(sql`SELECT * FROM topup_requests WHERE id = ${parseInt(req.params.id)} LIMIT 1`);
  const topup = tr.rows[0] as any;
  if (!topup) return res.status(404).json({ error: "Request not found" });
  await db.execute(sql`UPDATE chat_users SET sats_balance = sats_balance + ${amount_sats} WHERE id = ${topup.user_id}`);
  await db.execute(sql`UPDATE topup_requests SET status = 'approved', amount_sats = ${amount_sats}, processed_at = NOW() WHERE id = ${topup.id}`);
  res.json({ ok: true });
});

export default router;
