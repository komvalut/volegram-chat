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

// ─────────────── USER-TO-USER MARKETPLACE ───────────────────────

const FIAT_CURRENCIES = ["RSD","EUR","USD","GBP","CHF","BAM","HRK","RON","HUF","PLN","CZK","SEK","NOK","DKK","TRY","UAH","CAD","AUD"];

const SERVICE_ICONS: Record<string, string> = {
  xbon:"🎮", aircash:"💸", paysafe:"💳", steam:"🎮", google:"▶️", apple:"🍎",
  netflix:"🎬", spotify:"🎵", amazon:"📦", psn:"🎮", xbox:"🎮", nintendo:"🎮",
  riot:"⚔️", fortnite:"🎯", roblox:"🟥", pubg:"🔫", freefire:"💎", disney:"🏰",
  youtube:"▶️", deezer:"🎵", wolt:"🛵", revolut:"💜", booking:"🏨", shein:"👗",
  minecraft:"⛏️", coc:"⚔️", mteltv:"📺", other:"🎫"
};

// GET /user-market — all active user listings (excluding own)
router.get("/user-market", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const r = await db.execute(sql`
    SELECT l.id, l.service, l.service_name, l.denomination, l.fiat_amount, l.fiat_currency,
           l.price_sats, l.icon, l.created_at,
           u.username AS seller_username, u.avatar_url AS seller_avatar
    FROM user_voucher_listings l
    JOIN chat_users u ON u.id = l.seller_id
    WHERE l.status = 'active' AND l.seller_id != ${userId}
    ORDER BY l.created_at DESC
    LIMIT 200
  `);
  res.json({ listings: r.rows });
});

// GET /my-listings — seller's own listings
router.get("/my-listings", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const r = await db.execute(sql`
    SELECT l.*, u2.username AS buyer_username
    FROM user_voucher_listings l
    LEFT JOIN chat_users u2 ON u2.id = l.buyer_id
    WHERE l.seller_id = ${userId}
    ORDER BY l.created_at DESC
    LIMIT 100
  `);
  res.json({ listings: r.rows });
});

// POST /sell — create user listing
router.post("/sell", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const { service, service_name, denomination, fiat_amount, fiat_currency, price_sats, voucher_code, icon } = req.body;
  if (!service || !service_name || !denomination || !price_sats || !voucher_code) {
    return res.status(400).json({ error: "service, service_name, denomination, price_sats, voucher_code required" });
  }
  if (!FIAT_CURRENCIES.includes(fiat_currency ?? "RSD")) {
    return res.status(400).json({ error: "Invalid currency" });
  }
  if (price_sats < 1000) return res.status(400).json({ error: "Minimum price is 1000 sats" });
  if (voucher_code.trim().length < 3) return res.status(400).json({ error: "Voucher code too short" });

  const r = await db.execute(sql`
    INSERT INTO user_voucher_listings
      (seller_id, service, service_name, denomination, fiat_amount, fiat_currency, price_sats, icon, voucher_code, status, created_at)
    VALUES (${userId}, ${service}, ${service_name}, ${denomination},
            ${fiat_amount ?? null}, ${fiat_currency ?? "RSD"}, ${price_sats},
            ${icon ?? SERVICE_ICONS[service] ?? "🎫"}, ${voucher_code.trim()}, 'active', NOW())
    RETURNING id
  `);
  res.json({ ok: true, id: (r.rows[0] as any).id });
});

// DELETE /my-listings/:id — cancel own listing
router.delete("/my-listings/:id", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const id = parseInt(req.params.id);
  const row = (await db.execute(sql`SELECT seller_id, status FROM user_voucher_listings WHERE id = ${id} LIMIT 1`)).rows[0] as any;
  if (!row || row.seller_id !== userId) return res.status(403).json({ error: "Not your listing" });
  if (row.status === "sold") return res.status(400).json({ error: "Already sold" });
  await db.execute(sql`UPDATE user_voucher_listings SET status = 'cancelled' WHERE id = ${id}`);
  res.json({ ok: true });
});

// POST /user-market/:id/buy — buy from another user (instant: pay sats, reveal code)
router.post("/user-market/:id/buy", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const id = parseInt(req.params.id);

  const lRow = (await db.execute(sql`SELECT * FROM user_voucher_listings WHERE id = ${id} LIMIT 1`)).rows[0] as any;
  if (!lRow) return res.status(404).json({ error: "Listing not found" });
  if (lRow.status !== "active") return res.status(400).json({ error: "This voucher is no longer available" });
  if (lRow.seller_id === userId) return res.status(400).json({ error: "Cannot buy your own listing" });

  const uRow = (await db.execute(sql`SELECT sats_balance FROM chat_users WHERE id = ${userId} LIMIT 1`)).rows[0] as any;
  if (!uRow || uRow.sats_balance < lRow.price_sats) {
    return res.status(400).json({ error: `Insufficient balance. Need ${lRow.price_sats.toLocaleString()} sats.` });
  }

  // Deduct from buyer, add 97% to seller (3% platform fee)
  const sellerShare = Math.floor(lRow.price_sats * 0.97);
  await db.execute(sql`UPDATE chat_users SET sats_balance = sats_balance - ${lRow.price_sats} WHERE id = ${userId}`);
  await db.execute(sql`UPDATE chat_users SET sats_balance = sats_balance + ${sellerShare} WHERE id = ${lRow.seller_id}`);
  await db.execute(sql`
    UPDATE user_voucher_listings SET status = 'sold', buyer_id = ${userId}, sold_at = NOW()
    WHERE id = ${id}
  `);

  res.json({ ok: true, voucher_code: lRow.voucher_code, message: "Purchase successful! Here is your voucher code." });
});

export default router;
