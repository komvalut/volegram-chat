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

// ── Public: list all active listings grouped by service ──────────
router.get("/", auth, async (_req, res) => {
  const r = await db.execute(sql`
    SELECT * FROM p2p_voucher_listings
    WHERE active = true AND (stock > 0 OR stock = -1)
    ORDER BY service_name, denomination_sort, id
  `);
  res.json({ listings: r.rows });
});

// ── User: buy a listing ──────────────────────────────────────────
router.post("/buy/:id", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const id = parseInt(req.params.id);

  const lRow = (await db.execute(sql`SELECT * FROM p2p_voucher_listings WHERE id = ${id} LIMIT 1`)).rows[0] as any;
  if (!lRow) return res.status(404).json({ error: "Listing not found" });
  if (!lRow.active) return res.status(400).json({ error: "This voucher is no longer available" });
  if (lRow.stock === 0) return res.status(400).json({ error: "Out of stock" });

  const uRow = (await db.execute(sql`SELECT sats_balance FROM chat_users WHERE id = ${userId} LIMIT 1`)).rows[0] as any;
  if (!uRow || uRow.sats_balance < lRow.price_sats) {
    return res.status(400).json({ error: `Insufficient balance. Need ${lRow.price_sats.toLocaleString()} sats.` });
  }

  await db.execute(sql`UPDATE chat_users SET sats_balance = sats_balance - ${lRow.price_sats} WHERE id = ${userId}`);
  if (lRow.stock > 0) {
    await db.execute(sql`UPDATE p2p_voucher_listings SET stock = stock - 1 WHERE id = ${id}`);
  }

  const orderRow = (await db.execute(sql`
    INSERT INTO p2p_voucher_orders
      (listing_id, buyer_id, price_sats, status, created_at)
    VALUES (${id}, ${userId}, ${lRow.price_sats}, 'pending', NOW())
    RETURNING *
  `)).rows[0] as any;

  res.json({ ok: true, order: orderRow, message: "Order placed! Admin will deliver your voucher code shortly." });
});

// ── User: my orders ──────────────────────────────────────────────
router.get("/orders", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const r = await db.execute(sql`
    SELECT o.*, l.service_name, l.denomination, l.icon
    FROM p2p_voucher_orders o
    JOIN p2p_voucher_listings l ON l.id = o.listing_id
    WHERE o.buyer_id = ${userId}
    ORDER BY o.created_at DESC
    LIMIT 100
  `);
  res.json({ orders: r.rows });
});

// ── ADMIN: list all listings ─────────────────────────────────────
router.get("/admin/all", adminGuard, async (_req, res) => {
  const r = await db.execute(sql`SELECT * FROM p2p_voucher_listings ORDER BY service_name, denomination_sort`);
  res.json({ listings: r.rows });
});

// ── ADMIN: list all orders ───────────────────────────────────────
router.get("/admin/orders", adminGuard, async (_req, res) => {
  const r = await db.execute(sql`
    SELECT o.*, l.service_name, l.denomination, l.icon,
           u.username AS buyer_username
    FROM p2p_voucher_orders o
    JOIN p2p_voucher_listings l ON l.id = o.listing_id
    JOIN chat_users u ON u.id = o.buyer_id
    ORDER BY o.created_at DESC
    LIMIT 500
  `);
  res.json({ orders: r.rows });
});

// ── ADMIN: create listing ────────────────────────────────────────
router.post("/admin/create", adminGuard, async (req, res) => {
  const { service, service_name, denomination, denomination_sort, price_sats, stock, icon, description } = req.body;
  if (!service || !service_name || !denomination || !price_sats) {
    return res.status(400).json({ error: "service, service_name, denomination, price_sats required" });
  }
  const r = await db.execute(sql`
    INSERT INTO p2p_voucher_listings
      (service, service_name, denomination, denomination_sort, price_sats, stock, icon, description, active, created_at)
    VALUES (${service}, ${service_name}, ${denomination}, ${denomination_sort ?? 0}, ${price_sats}, ${stock ?? -1}, ${icon ?? "🎫"}, ${description ?? null}, true, NOW())
    RETURNING *
  `);
  res.json({ listing: r.rows[0] });
});

// ── ADMIN: update listing ────────────────────────────────────────
router.put("/admin/:id", adminGuard, async (req, res) => {
  const id = parseInt(req.params.id);
  const { service_name, denomination, denomination_sort, price_sats, stock, icon, description, active } = req.body;
  await db.execute(sql`
    UPDATE p2p_voucher_listings SET
      service_name = COALESCE(${service_name ?? null}, service_name),
      denomination = COALESCE(${denomination ?? null}, denomination),
      denomination_sort = COALESCE(${denomination_sort ?? null}, denomination_sort),
      price_sats = COALESCE(${price_sats ?? null}, price_sats),
      stock = COALESCE(${stock ?? null}, stock),
      icon = COALESCE(${icon ?? null}, icon),
      description = COALESCE(${description ?? null}, description),
      active = COALESCE(${active ?? null}, active)
    WHERE id = ${id}
  `);
  res.json({ ok: true });
});

// ── ADMIN: delete listing ────────────────────────────────────────
router.delete("/admin/:id", adminGuard, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.execute(sql`DELETE FROM p2p_voucher_listings WHERE id = ${id}`);
  res.json({ ok: true });
});

// ── ADMIN: deliver order (send voucher code to buyer) ───────────
router.post("/admin/orders/:id/deliver", adminGuard, async (req, res) => {
  const id = parseInt(req.params.id);
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Voucher code required" });

  await db.execute(sql`
    UPDATE p2p_voucher_orders SET status = 'delivered', voucher_code = ${code}, delivered_at = NOW()
    WHERE id = ${id}
  `);
  res.json({ ok: true });
});

export default router;
