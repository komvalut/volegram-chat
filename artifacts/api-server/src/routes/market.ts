import { Router } from "express";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { notifyUser } from "../lib/ws.js";

const router = Router();

function auth(req: any, res: any, next: any) {
  if (!(req.session as any).userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// GET /api/market/listings
router.get("/listings", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT l.*, u.username AS seller_username, u.avatar_seed AS seller_avatar_seed,
             u.is_admin AS seller_verified
      FROM vbc_listings l
      JOIN chat_users u ON u.id = l.seller_id
      WHERE l.status = 'active'
      ORDER BY l.created_at DESC
      LIMIT 100
    `);
    res.json({ listings: rows.rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/market/listings — create listing
router.post("/listings", auth, async (req, res) => {
  const sellerId = (req.session as any).userId;
  const { title, description, priceSats, currency, paymentMethod, asset, assetAmount, receivingAddress, listingType } = req.body;
  if (!title || !priceSats || priceSats < 1)
    return res.status(400).json({ error: "title and priceSats required" });
  if (!receivingAddress || !String(receivingAddress).trim())
    return res.status(400).json({ error: "receiving_address is required" });
  try {
    const rows = await db.execute(sql`
      INSERT INTO vbc_listings
        (seller_id, title, description, price_sats, currency, payment_method, asset, asset_amount, receiving_address, listing_type)
      VALUES
        (${sellerId}, ${title}, ${description ?? ""}, ${priceSats},
         ${currency ?? "BTC"}, ${paymentMethod ?? "Lightning"},
         ${asset ?? "BTC"}, ${assetAmount ?? null}, ${receivingAddress ?? ""},
         ${listingType === "buy" ? "buy" : "sell"})
      RETURNING *
    `);
    res.json({ listing: rows.rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/market/listings/:id
router.delete("/listings/:id", auth, async (req, res) => {
  const sellerId = (req.session as any).userId;
  await db.execute(sql`
    UPDATE vbc_listings SET status = 'cancelled'
    WHERE id = ${parseInt(req.params.id)} AND seller_id = ${sellerId}
  `);
  res.json({ ok: true });
});

// POST /api/market/listings/:id/contact → open DM with seller
router.post("/listings/:id/contact", auth, async (req, res) => {
  const buyerId = (req.session as any).userId;
  const listingId = parseInt(req.params.id);
  try {
    const [listing] = (await db.execute(sql`SELECT * FROM vbc_listings WHERE id = ${listingId}`)).rows;
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    const sellerId = (listing as any).seller_id;
    if (sellerId === buyerId) return res.status(400).json({ error: "Cannot contact yourself" });

    const roomId = await findOrCreateDM(buyerId, sellerId);
    const intro = `Zanima me tvoj oglas: "${(listing as any).title}" — ⚡${Number((listing as any).price_sats).toLocaleString()} sats`;
    const [msg] = (await db.execute(sql`
      INSERT INTO chat_messages (room_id, sender_id, type, content)
      VALUES (${roomId}, ${buyerId}, 'text', ${intro}) RETURNING *
    `)).rows;
    const [buyer] = (await db.execute(sql`SELECT * FROM chat_users WHERE id = ${buyerId}`)).rows;
    notifyUser(sellerId, { type: "message", message: { ...(msg as any), sender: buyer } });

    const [room] = (await db.execute(sql`
      SELECT r.*, u.username AS other_username FROM chat_rooms r
      JOIN chat_members m ON m.room_id = r.id AND m.user_id != ${buyerId}
      JOIN chat_users u ON u.id = m.user_id
      WHERE r.id = ${roomId} LIMIT 1
    `)).rows;
    res.json({ room });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/market/listings/:id/buy → mark as paid + open DM
router.post("/listings/:id/buy", auth, async (req, res) => {
  const buyerId = (req.session as any).userId;
  const listingId = parseInt(req.params.id);
  try {
    const [listing] = (await db.execute(sql`
      SELECT l.*, u.username AS seller_username
      FROM vbc_listings l JOIN chat_users u ON u.id = l.seller_id
      WHERE l.id = ${listingId}
    `)).rows;
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    const sellerId = (listing as any).seller_id;
    if (sellerId === buyerId) return res.status(400).json({ error: "Cannot buy your own listing" });

    const roomId = await findOrCreateDM(buyerId, sellerId);

    const [buyer] = (await db.execute(sql`SELECT * FROM chat_users WHERE id = ${buyerId}`)).rows;
    const paidMsg = `✅ Označio/la sam da sam platio/la za oglas: "${(listing as any).title}" — ⚡${Number((listing as any).price_sats).toLocaleString()} sats. Molim potvrdi primitak!`;
    const [msg] = (await db.execute(sql`
      INSERT INTO chat_messages (room_id, sender_id, type, content)
      VALUES (${roomId}, ${buyerId}, 'text', ${paidMsg}) RETURNING *
    `)).rows;
    notifyUser(sellerId, { type: "message", message: { ...(msg as any), sender: buyer } });

    const [room] = (await db.execute(sql`
      SELECT r.*, u.username AS other_username FROM chat_rooms r
      JOIN chat_members m ON m.room_id = r.id AND m.user_id != ${buyerId}
      JOIN chat_users u ON u.id = m.user_id
      WHERE r.id = ${roomId} LIMIT 1
    `)).rows;
    res.json({ room, ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

async function findOrCreateDM(userA: number, userB: number): Promise<number> {
  const existing = (await db.execute(sql`
    SELECT r.id FROM chat_rooms r
    JOIN chat_members ma ON ma.room_id = r.id AND ma.user_id = ${userA}
    JOIN chat_members mb ON mb.room_id = r.id AND mb.user_id = ${userB}
    WHERE r.type = 'dm' LIMIT 1
  `)).rows[0];
  if (existing) return (existing as any).id;
  const [room] = (await db.execute(sql`INSERT INTO chat_rooms (type) VALUES ('dm') RETURNING id`)).rows;
  const roomId = (room as any).id;
  await db.execute(sql`INSERT INTO chat_members (room_id, user_id) VALUES (${roomId}, ${userA}), (${roomId}, ${userB})`);
  return roomId;
}

export default router;
