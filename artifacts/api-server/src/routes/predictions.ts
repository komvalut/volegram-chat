import { Router } from "express";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

const router = Router();

function auth(req: any, res: any, next: any) {
  if (!(req.session as any).userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

async function getPredictionCommission(): Promise<number> {
  const r = await db.execute(sql`SELECT value FROM vbc_settings WHERE key = 'prediction_commission' LIMIT 1`);
  return parseFloat((r.rows[0] as any)?.value ?? "0.05");
}

// GET /api/predictions — open predictions
router.get("/", auth, async (_req, res) => {
  const r = await db.execute(sql`
    SELECT p.*, u.username AS creator_username,
           (SELECT COUNT(*) FROM p2p_prediction_bets b WHERE b.prediction_id = p.id) AS bet_count
    FROM p2p_predictions p
    JOIN chat_users u ON u.id = p.creator_id
    ORDER BY p.created_at DESC
    LIMIT 100
  `);
  res.json({ predictions: r.rows });
});

// GET /api/predictions/:id — single prediction with bets
router.get("/:id", auth, async (req, res) => {
  const id = parseInt(req.params.id);
  const pr = await db.execute(sql`SELECT p.*, u.username AS creator_username FROM p2p_predictions p JOIN chat_users u ON u.id = p.creator_id WHERE p.id = ${id} LIMIT 1`);
  if (!pr.rows[0]) return res.status(404).json({ error: "Not found" });
  const bets = await db.execute(sql`
    SELECT b.*, u.username FROM p2p_prediction_bets b JOIN chat_users u ON u.id = b.user_id WHERE b.prediction_id = ${id} ORDER BY b.created_at DESC
  `);
  res.json({ prediction: pr.rows[0], bets: bets.rows });
});

// POST /api/predictions — create
router.post("/", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const { title, description, options, close_at } = req.body;
  if (!title || !options || !Array.isArray(options) || options.length < 2)
    return res.status(400).json({ error: "title and at least 2 options required" });
  const commission = await getPredictionCommission();
  const r = await db.execute(sql`
    INSERT INTO p2p_predictions (creator_id, title, description, options, pool_sats, status, close_at, commission_rate, created_at)
    VALUES (${userId}, ${title}, ${description ?? null}, ${JSON.stringify(options)}::jsonb, 0, 'open', ${close_at ?? null}, ${commission}, NOW())
    RETURNING *
  `);
  res.json({ ok: true, prediction: r.rows[0] });
});

// POST /api/predictions/:id/bet — place a bet
router.post("/:id/bet", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const id = parseInt(req.params.id);
  const { option_idx, amount_sats } = req.body;
  if (option_idx === undefined || !amount_sats || amount_sats < 1)
    return res.status(400).json({ error: "option_idx and amount_sats required" });

  const pr = await db.execute(sql`SELECT * FROM p2p_predictions WHERE id = ${id} AND status = 'open' LIMIT 1`);
  const pred = pr.rows[0] as any;
  if (!pred) return res.status(404).json({ error: "Prediction not found or not open" });

  const options = Array.isArray(pred.options) ? pred.options : JSON.parse(pred.options);
  if (option_idx < 0 || option_idx >= options.length)
    return res.status(400).json({ error: "Invalid option" });

  if (pred.close_at && new Date(pred.close_at) < new Date())
    return res.status(400).json({ error: "Prediction is closed" });

  const ur = await db.execute(sql`SELECT sats_balance FROM chat_users WHERE id = ${userId} LIMIT 1`);
  const u = ur.rows[0] as any;
  if (!u || u.sats_balance < amount_sats)
    return res.status(400).json({ error: `Insufficient balance. Need ${amount_sats.toLocaleString()} sats.` });

  // Check if already bet on different option
  const existing = await db.execute(sql`SELECT * FROM p2p_prediction_bets WHERE prediction_id = ${id} AND user_id = ${userId} LIMIT 1`);
  if (existing.rows.length > 0 && (existing.rows[0] as any).option_idx !== option_idx)
    return res.status(400).json({ error: "You already bet on a different option" });

  await db.execute(sql`UPDATE chat_users SET sats_balance = sats_balance - ${amount_sats} WHERE id = ${userId}`);
  await db.execute(sql`UPDATE p2p_predictions SET pool_sats = pool_sats + ${amount_sats} WHERE id = ${id}`);

  const br = await db.execute(sql`
    INSERT INTO p2p_prediction_bets (prediction_id, user_id, option_idx, amount_sats, created_at)
    VALUES (${id}, ${userId}, ${option_idx}, ${amount_sats}, NOW())
    ON CONFLICT DO NOTHING
    RETURNING *
  `);

  // If already bet on same option, just add to existing
  if (br.rows.length === 0) {
    await db.execute(sql`
      UPDATE p2p_prediction_bets SET amount_sats = amount_sats + ${amount_sats}
      WHERE prediction_id = ${id} AND user_id = ${userId}
    `);
  }

  res.json({ ok: true, message: `Bet placed: ⚡${amount_sats.toLocaleString()} sats on "${options[option_idx]}"` });
});

// POST /api/predictions/:id/settle — admin settles
router.post("/:id/settle", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const id = parseInt(req.params.id);
  const { result_option_idx } = req.body;

  const isAdmin = (await db.execute(sql`SELECT is_admin FROM chat_users WHERE id = ${userId} LIMIT 1`)).rows[0] as any;

  const pr = await db.execute(sql`SELECT * FROM p2p_predictions WHERE id = ${id} LIMIT 1`);
  const pred = pr.rows[0] as any;
  if (!pred) return res.status(404).json({ error: "Not found" });

  // Creator or admin can settle
  if (pred.creator_id !== userId && !isAdmin?.is_admin)
    return res.status(403).json({ error: "Only creator or admin can settle" });

  if (pred.status !== 'open' && pred.status !== 'closed')
    return res.status(400).json({ error: "Already settled" });

  const options = Array.isArray(pred.options) ? pred.options : JSON.parse(pred.options);
  if (result_option_idx < 0 || result_option_idx >= options.length)
    return res.status(400).json({ error: "Invalid winning option" });

  const bets = await db.execute(sql`SELECT * FROM p2p_prediction_bets WHERE prediction_id = ${id}`);
  const allBets = bets.rows as any[];
  const winnerBets = allBets.filter(b => b.option_idx === result_option_idx);
  const totalPool = parseInt(pred.pool_sats);
  const commission = parseFloat(pred.commission_rate);
  const adminCut = Math.floor(totalPool * commission);
  const prizePool = totalPool - adminCut;

  // Credit admin commission
  if (adminCut > 0) {
    await db.execute(sql`UPDATE chat_users SET sats_balance = sats_balance + ${adminCut} WHERE id = ${pred.creator_id === userId ? userId : userId}`);
    // Actually put to the admin's balance
    await db.execute(sql`UPDATE chat_users SET sats_balance = sats_balance + ${adminCut} WHERE is_admin = true LIMIT 1`);
  }

  // Distribute prize pool proportionally to winners
  const winnerTotal = winnerBets.reduce((sum, b) => sum + parseInt(b.amount_sats), 0);
  for (const bet of winnerBets) {
    const share = winnerTotal > 0 ? Math.floor((parseInt(bet.amount_sats) / winnerTotal) * prizePool) : 0;
    if (share > 0) {
      await db.execute(sql`UPDATE chat_users SET sats_balance = sats_balance + ${share} WHERE id = ${bet.user_id}`);
      await db.execute(sql`UPDATE p2p_prediction_bets SET payout_sats = ${share} WHERE id = ${bet.id}`);
    }
  }

  // If no winners, return pool to all bettors
  if (winnerBets.length === 0) {
    for (const bet of allBets) {
      await db.execute(sql`UPDATE chat_users SET sats_balance = sats_balance + ${bet.amount_sats} WHERE id = ${bet.user_id}`);
    }
  }

  await db.execute(sql`UPDATE p2p_predictions SET status = 'settled', result_option_idx = ${result_option_idx} WHERE id = ${id}`);

  res.json({
    ok: true,
    result: options[result_option_idx],
    winners: winnerBets.length,
    prizePool,
    adminCut,
  });
});

// POST /api/predictions/:id/close — close betting
router.post("/:id/close", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const id = parseInt(req.params.id);
  const pr = await db.execute(sql`SELECT * FROM p2p_predictions WHERE id = ${id} LIMIT 1`);
  const pred = pr.rows[0] as any;
  if (!pred) return res.status(404).json({ error: "Not found" });
  const isAdmin = (await db.execute(sql`SELECT is_admin FROM chat_users WHERE id = ${userId} LIMIT 1`)).rows[0] as any;
  if (pred.creator_id !== userId && !isAdmin?.is_admin) return res.status(403).json({ error: "Forbidden" });
  await db.execute(sql`UPDATE p2p_predictions SET status = 'closed' WHERE id = ${id}`);
  res.json({ ok: true });
});

// GET /api/predictions/my-bets — user's bets
router.get("/user/my-bets", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const r = await db.execute(sql`
    SELECT b.*, p.title, p.options, p.status, p.result_option_idx
    FROM p2p_prediction_bets b
    JOIN p2p_predictions p ON p.id = b.prediction_id
    WHERE b.user_id = ${userId}
    ORDER BY b.created_at DESC
    LIMIT 100
  `);
  res.json({ bets: r.rows });
});

export default router;
