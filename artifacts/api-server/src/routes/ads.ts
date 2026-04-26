import { Router } from "express";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

const router = Router();

function auth(req: any, res: any, next: any) {
  if (!(req.session as any).userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}
async function isAdmin(userId: number) {
  const r = (await db.execute(sql`SELECT is_admin FROM chat_users WHERE id = ${userId} LIMIT 1`)).rows[0] as any;
  return !!r?.is_admin;
}
function adminGuard(req: any, res: any, next: any) {
  isAdmin((req.session as any).userId).then(ok => ok ? next() : res.status(403).json({ error: "Admin only" }));
}

// GET /api/ads — active approved ads for public display
router.get("/", async (_req, res) => {
  const r = await db.execute(sql`
    SELECT a.*, u.username AS poster_username
    FROM vbc_ads a
    JOIN chat_users u ON u.id = a.user_id
    WHERE a.status = 'active' AND a.expires_at > NOW()
    ORDER BY a.created_at DESC
    LIMIT 50
  `);
  res.json({ ads: r.rows });
});

// POST /api/ads — create an ad (auth, deducts sats)
router.post("/", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const { title, description, contact, link, image_url, duration_days } = req.body;
  if (!title?.trim() || !description?.trim()) {
    return res.status(400).json({ error: "Title and description required" });
  }
  const days = parseInt(duration_days) || 7;

  // Get price from settings
  const setting = (await db.execute(sql`
    SELECT value FROM vbc_settings WHERE key = 'ads_price_sats_per_day' LIMIT 1
  `)).rows[0] as any;
  const pricePerDay = parseInt(setting?.value ?? "1000");
  const totalSats = pricePerDay * days;

  // Check balance
  const uRow = (await db.execute(sql`SELECT sats_balance FROM chat_users WHERE id = ${userId} LIMIT 1`)).rows[0] as any;
  if (!uRow || uRow.sats_balance < totalSats) {
    return res.status(400).json({ error: `Insufficient balance. Need ${totalSats.toLocaleString()} sats for ${days} days.` });
  }

  await db.execute(sql`UPDATE chat_users SET sats_balance = sats_balance - ${totalSats} WHERE id = ${userId}`);
  const r = await db.execute(sql`
    INSERT INTO vbc_ads (user_id, title, description, contact, link, image_url, status, paid_sats, duration_days, created_at, expires_at)
    VALUES (${userId}, ${title.trim()}, ${description.trim()}, ${contact ?? null}, ${link ?? null}, ${image_url ?? null},
            'pending', ${totalSats}, ${days}, NOW(), NOW() + INTERVAL '${sql.raw(String(days))} days')
    RETURNING *
  `);
  res.json({ ok: true, ad: r.rows[0], message: "Ad submitted for admin review. Goes live after approval." });
});

// GET /api/ads/mine — my ads
router.get("/mine", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const r = await db.execute(sql`
    SELECT * FROM vbc_ads WHERE user_id = ${userId} ORDER BY created_at DESC
  `);
  res.json({ ads: r.rows });
});

// GET /api/ads/pricing — price settings
router.get("/pricing", async (_req, res) => {
  const r = await db.execute(sql`
    SELECT value FROM vbc_settings WHERE key = 'ads_price_sats_per_day' LIMIT 1
  `);
  const pricePerDay = parseInt((r.rows[0] as any)?.value ?? "1000");
  res.json({ price_per_day: pricePerDay });
});

// ── ADMIN ─────────────────────────────────────────────────────────
router.get("/admin/all", adminGuard, async (_req, res) => {
  const r = await db.execute(sql`
    SELECT a.*, u.username AS poster_username
    FROM vbc_ads a JOIN chat_users u ON u.id = a.user_id
    ORDER BY a.created_at DESC LIMIT 500
  `);
  res.json({ ads: r.rows });
});

router.put("/admin/:id", adminGuard, async (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  if (!["pending","active","rejected","expired"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  await db.execute(sql`UPDATE vbc_ads SET status = ${status} WHERE id = ${id}`);
  res.json({ ok: true });
});

router.delete("/admin/:id", adminGuard, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.execute(sql`DELETE FROM vbc_ads WHERE id = ${id}`);
  res.json({ ok: true });
});

// Update ads price
router.put("/admin/settings/price", adminGuard, async (req, res) => {
  const { price_per_day } = req.body;
  const p = parseInt(price_per_day);
  if (!p || p < 1) return res.status(400).json({ error: "Invalid price" });
  await db.execute(sql`
    INSERT INTO vbc_settings (key, value, updated_at) VALUES ('ads_price_sats_per_day', ${String(p)}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `);
  res.json({ ok: true, price_per_day: p });
});

export default router;
