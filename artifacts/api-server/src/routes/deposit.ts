import { Router } from "express";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { createInvoice, checkInvoice, isSbpConfigured } from "../lib/lightning.js";

const router = Router();

function auth(req: any, res: any, next: any) {
  if (!(req.session as any).userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// POST /api/deposit/lightning — create Lightning invoice for top-up
router.post("/lightning", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const { amount_sats } = req.body;
  const sats = parseInt(amount_sats);
  if (!sats || sats < 100) return res.status(400).json({ error: "Minimum deposit is 100 sats" });
  if (sats > 10_000_000) return res.status(400).json({ error: "Maximum deposit is 10,000,000 sats" });

  try {
    const { pr, checkoutId } = await createInvoice(sats, `VBC wallet top-up (user ${userId})`);

    // Store pending deposit record
    await db.execute(sql`
      INSERT INTO vbc_deposits (user_id, checkout_id, amount_sats, status, created_at, expires_at)
      VALUES (${userId}, ${checkoutId}, ${sats}, 'pending', NOW(), NOW() + INTERVAL '24 hours')
    `);

    res.json({ ok: true, pr, checkoutId, amount_sats: sats });
  } catch (e: any) {
    console.error("[Deposit] SBP error:", e.message);
    res.status(500).json({ error: "Could not create Lightning invoice. Check SBP_API_KEY." });
  }
});

// GET /api/deposit/lightning/:checkoutId/check — poll payment status
router.get("/lightning/:checkoutId/check", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const { checkoutId } = req.params;

  // Look up the deposit
  const depR = await db.execute(sql`
    SELECT * FROM vbc_deposits WHERE checkout_id = ${checkoutId} AND user_id = ${userId} LIMIT 1
  `);
  const dep = depR.rows[0] as any;
  if (!dep) return res.status(404).json({ error: "Deposit not found" });

  if (dep.status === "completed") {
    return res.json({ paid: true, amount_sats: dep.amount_sats });
  }

  // Check with SBP
  try {
    const paid = await checkInvoice(checkoutId);
    if (paid) {
      // Credit balance
      await db.execute(sql`
        UPDATE chat_users SET sats_balance = sats_balance + ${dep.amount_sats} WHERE id = ${userId}
      `);
      await db.execute(sql`
        UPDATE vbc_deposits SET status = 'completed', completed_at = NOW() WHERE checkout_id = ${checkoutId}
      `);
      const balR = await db.execute(sql`SELECT sats_balance FROM chat_users WHERE id = ${userId} LIMIT 1`);
      return res.json({ paid: true, amount_sats: dep.amount_sats, new_balance: (balR.rows[0] as any)?.sats_balance });
    }
    res.json({ paid: false });
  } catch {
    res.json({ paid: false });
  }
});

// POST /api/deposit/sbp/webhook — SBP webhook (auto-credit on payment)
router.post("/sbp/webhook", async (req, res) => {
  try {
    const { id: checkoutId, isPaid } = req.body;
    if (!isPaid || !checkoutId) return res.json({ ok: true });

    const depR = await db.execute(sql`
      SELECT * FROM vbc_deposits WHERE checkout_id = ${checkoutId} AND status = 'pending' LIMIT 1
    `);
    const dep = depR.rows[0] as any;
    if (!dep) return res.json({ ok: true });

    await db.execute(sql`
      UPDATE chat_users SET sats_balance = sats_balance + ${dep.amount_sats} WHERE id = ${dep.user_id}
    `);
    await db.execute(sql`
      UPDATE vbc_deposits SET status = 'completed', completed_at = NOW() WHERE checkout_id = ${checkoutId}
    `);
    console.log(`[Deposit] Webhook: credited ${dep.amount_sats} sats to user ${dep.user_id}`);
    res.json({ ok: true });
  } catch (e: any) {
    console.error("[Deposit] Webhook error:", e.message);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// GET /api/deposit/sbp-status — check if SBP is configured
router.get("/sbp-status", (_req, res) => {
  res.json({ configured: isSbpConfigured() });
});

// GET /api/deposit/history — user's deposit history
router.get("/history", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const r = await db.execute(sql`
    SELECT checkout_id, amount_sats, status, created_at, completed_at
    FROM vbc_deposits WHERE user_id = ${userId}
    ORDER BY created_at DESC LIMIT 20
  `);
  res.json({ deposits: r.rows });
});

export default router;
