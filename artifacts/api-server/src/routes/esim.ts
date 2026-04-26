import { Router } from "express";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { chatUsersTable } from "../db/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

function auth(req: any, res: any, next: any) {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

async function adminAuth(req: any, res: any, next: any) {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const [u] = await db.select().from(chatUsersTable).where(eq(chatUsersTable.id, userId)).limit(1);
  if (!u?.isAdmin) return res.status(403).json({ error: "Forbidden" });
  next();
}

// GET /api/esim — list active eSIM plans (public)
router.get("/", async (_req, res) => {
  const r = await db.execute(sql`
    SELECT id, name, description, country, data_gb, validity_days, price_sats
    FROM esim_listings WHERE active = TRUE ORDER BY price_sats ASC
  `);
  res.json({ listings: r.rows });
});

// GET /api/esim/orders — my orders
router.get("/orders", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const r = await db.execute(sql`
    SELECT o.*, l.name, l.phone_number, l.country, l.data_gb, l.validity_days
    FROM esim_orders o
    JOIN esim_listings l ON l.id = o.listing_id
    WHERE o.user_id = ${userId}
    ORDER BY o.created_at DESC
  `);
  res.json({ orders: r.rows });
});

// POST /api/esim/buy/:id
router.post("/buy/:id", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const listingId = parseInt(req.params.id);

  const lr = await db.execute(sql`SELECT * FROM esim_listings WHERE id = ${listingId} AND active = TRUE LIMIT 1`);
  const listing = lr.rows[0] as any;
  if (!listing) return res.status(404).json({ error: "eSIM plan not found" });

  const ur = await db.execute(sql`SELECT sats_balance FROM chat_users WHERE id = ${userId} LIMIT 1`);
  const user = ur.rows[0] as any;
  if (!user || user.sats_balance < listing.price_sats) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  await db.execute(sql`UPDATE chat_users SET sats_balance = sats_balance - ${listing.price_sats} WHERE id = ${userId}`);
  const or = await db.execute(sql`
    INSERT INTO esim_orders (user_id, listing_id, price_sats, status)
    VALUES (${userId}, ${listingId}, ${listing.price_sats}, 'pending')
    RETURNING *
  `);

  res.json({ ok: true, order: or.rows[0], listing });
});

// ── ADMIN routes ─────────────────────────────────────────────────────────

// GET /api/esim/admin/all — all listings
router.get("/admin/all", adminAuth, async (_req, res) => {
  const r = await db.execute(sql`SELECT * FROM esim_listings ORDER BY created_at DESC`);
  res.json({ listings: r.rows });
});

// GET /api/esim/admin/orders — all orders
router.get("/admin/orders", adminAuth, async (_req, res) => {
  const r = await db.execute(sql`
    SELECT o.*, l.name, l.phone_number, l.country, u.username
    FROM esim_orders o
    JOIN esim_listings l ON l.id = o.listing_id
    JOIN chat_users u ON u.id = o.user_id
    ORDER BY o.created_at DESC
  `);
  res.json({ orders: r.rows });
});

// POST /api/esim/admin/create
router.post("/admin/create", adminAuth, async (req, res) => {
  const { name, description, country, data_gb, validity_days, price_sats, phone_number } = req.body;
  if (!name || !price_sats) return res.status(400).json({ error: "name and price_sats required" });

  const r = await db.execute(sql`
    INSERT INTO esim_listings (name, description, country, data_gb, validity_days, price_sats, phone_number)
    VALUES (${name}, ${description ?? null}, ${country ?? null}, ${data_gb ?? null}, ${validity_days ?? null}, ${parseInt(price_sats)}, ${phone_number ?? null})
    RETURNING *
  `);
  res.json({ ok: true, listing: r.rows[0] });
});

// PUT /api/esim/admin/:id
router.put("/admin/:id", adminAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, description, country, data_gb, validity_days, price_sats, phone_number, active } = req.body;
  await db.execute(sql`
    UPDATE esim_listings SET
      name = ${name}, description = ${description ?? null},
      country = ${country ?? null}, data_gb = ${data_gb ?? null},
      validity_days = ${validity_days ?? null}, price_sats = ${parseInt(price_sats)},
      phone_number = ${phone_number ?? null}, active = ${active ?? true}
    WHERE id = ${id}
  `);
  res.json({ ok: true });
});

// DELETE /api/esim/admin/:id
router.delete("/admin/:id", adminAuth, async (req, res) => {
  await db.execute(sql`DELETE FROM esim_listings WHERE id = ${parseInt(req.params.id)}`);
  res.json({ ok: true });
});

// PUT /api/esim/admin/order/:id/status
router.put("/admin/order/:id/status", adminAuth, async (req, res) => {
  const { status } = req.body;
  await db.execute(sql`UPDATE esim_orders SET status = ${status} WHERE id = ${parseInt(req.params.id)}`);
  res.json({ ok: true });
});

export default router;
