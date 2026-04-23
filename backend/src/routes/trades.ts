import { Router } from "express";
import { db } from "../db/index.js";
import { vbcTradesTable, chatUsersTable, chatMembersTable, chatRoomsTable } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { createInvoice, checkInvoice } from "../lib/lightning.js";
import { notifyUser } from "../lib/ws.js";

const router = Router();

function auth(req: any, res: any, next: any) {
  if (!(req.session as any).userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// Create a new trade — buyer initiates
router.post("/", auth, async (req, res) => {
  const buyerId = (req.session as any).userId;
  const { roomId, sellerUsername, sats, asset, assetAmount } = req.body;

  if (!sats || !asset || !assetAmount || !roomId) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const [seller] = await db.select().from(chatUsersTable)
    .where(eq(chatUsersTable.username, sellerUsername)).limit(1);
  if (!seller) return res.status(404).json({ error: "Seller not found" });
  if (seller.id === buyerId) return res.status(400).json({ error: "Cannot trade with yourself" });

  const [buyer] = await db.select().from(chatUsersTable)
    .where(eq(chatUsersTable.id, buyerId)).limit(1);

  // Create Lightning escrow invoice
  const invoice = await createInvoice(sats, `VBC Escrow: ${assetAmount} ${asset}`);

  const [trade] = await db.insert(vbcTradesTable).values({
    roomId,
    buyerId,
    sellerId: seller.id,
    sats,
    asset: asset.toUpperCase(),
    assetAmount,
    invoicePr:     invoice.pr,
    sbpCheckoutId: invoice.checkoutId,
    status: "pending",
  }).returning();

  // Notify both parties via WS
  const payload = { type: "trade_update", trade: { ...trade, buyer, seller } };
  notifyUser(buyerId,   payload);
  notifyUser(seller.id, payload);

  res.json({ trade: { ...trade, buyer, seller }, invoice });
});

// Get trade details
router.get("/:id", auth, async (req, res) => {
  const userId  = (req.session as any).userId;
  const tradeId = parseInt(req.params.id);

  const [trade] = await db.select().from(vbcTradesTable)
    .where(eq(vbcTradesTable.id, tradeId)).limit(1);
  if (!trade) return res.status(404).json({ error: "Not found" });
  if (trade.buyerId !== userId && trade.sellerId !== userId)
    return res.status(403).json({ error: "Forbidden" });

  const [buyer]  = await db.select().from(chatUsersTable).where(eq(chatUsersTable.id, trade.buyerId)).limit(1);
  const [seller] = await db.select().from(chatUsersTable).where(eq(chatUsersTable.id, trade.sellerId)).limit(1);

  res.json({ ...trade, buyer, seller });
});

// Poll payment status
router.post("/:id/check-payment", auth, async (req, res) => {
  const userId  = (req.session as any).userId;
  const tradeId = parseInt(req.params.id);

  const [trade] = await db.select().from(vbcTradesTable)
    .where(and(eq(vbcTradesTable.id, tradeId), eq(vbcTradesTable.buyerId, userId))).limit(1);
  if (!trade) return res.status(404).json({ error: "Not found" });
  if (trade.status !== "pending") return res.json({ trade, alreadyFunded: true });

  const paid = trade.sbpCheckoutId ? await checkInvoice(trade.sbpCheckoutId) : false;

  if (paid) {
    const [updated] = await db.update(vbcTradesTable)
      .set({ status: "funded", updatedAt: new Date() })
      .where(eq(vbcTradesTable.id, tradeId)).returning();

    const [buyer]  = await db.select().from(chatUsersTable).where(eq(chatUsersTable.id, trade.buyerId)).limit(1);
    const [seller] = await db.select().from(chatUsersTable).where(eq(chatUsersTable.id, trade.sellerId)).limit(1);
    const payload  = { type: "trade_update", trade: { ...updated, buyer, seller } };
    notifyUser(trade.buyerId,  payload);
    notifyUser(trade.sellerId, payload);

    return res.json({ trade: updated, paid: true });
  }

  res.json({ trade, paid: false });
});

// Buyer sets their crypto address
router.post("/:id/address", auth, async (req, res) => {
  const buyerId = (req.session as any).userId;
  const { buyerAddress } = req.body;
  const tradeId = parseInt(req.params.id);

  const [trade] = await db.select().from(vbcTradesTable)
    .where(and(eq(vbcTradesTable.id, tradeId), eq(vbcTradesTable.buyerId, buyerId))).limit(1);
  if (!trade) return res.status(404).json({ error: "Not found" });
  if (!["funded", "pending"].includes(trade.status))
    return res.status(400).json({ error: "Trade not in correct state" });

  const [updated] = await db.update(vbcTradesTable)
    .set({ buyerAddress, status: "address_shared", updatedAt: new Date() })
    .where(eq(vbcTradesTable.id, tradeId)).returning();

  const [buyer]  = await db.select().from(chatUsersTable).where(eq(chatUsersTable.id, trade.buyerId)).limit(1);
  const [seller] = await db.select().from(chatUsersTable).where(eq(chatUsersTable.id, trade.sellerId)).limit(1);
  const payload  = { type: "trade_update", trade: { ...updated, buyer, seller } };
  notifyUser(trade.buyerId,  payload);
  notifyUser(trade.sellerId, payload);

  res.json({ trade: { ...updated, buyer, seller } });
});

// Buyer confirms received crypto → release escrow to seller's Lightning
router.post("/:id/confirm", auth, async (req, res) => {
  const buyerId = (req.session as any).userId;
  const tradeId = parseInt(req.params.id);

  const [trade] = await db.select().from(vbcTradesTable)
    .where(and(eq(vbcTradesTable.id, tradeId), eq(vbcTradesTable.buyerId, buyerId))).limit(1);
  if (!trade) return res.status(404).json({ error: "Not found" });
  if (trade.status !== "address_shared")
    return res.status(400).json({ error: "Address not shared yet" });

  const [seller] = await db.select().from(chatUsersTable)
    .where(eq(chatUsersTable.id, trade.sellerId)).limit(1);

  // Pay seller via Lightning (SBP lnurl-pay or manual — mark as released)
  // In production: integrate SBP payout API to seller's lightningAddress
  // For now: mark as released, admin manually pays if needed
  const [updated] = await db.update(vbcTradesTable)
    .set({ status: "released", updatedAt: new Date() })
    .where(eq(vbcTradesTable.id, tradeId)).returning();

  const [buyer] = await db.select().from(chatUsersTable)
    .where(eq(chatUsersTable.id, trade.buyerId)).limit(1);
  const payload = { type: "trade_update", trade: { ...updated, buyer, seller } };
  notifyUser(trade.buyerId,  payload);
  notifyUser(trade.sellerId, payload);

  res.json({ trade: { ...updated, buyer, seller } });
});

// Open dispute
router.post("/:id/dispute", auth, async (req, res) => {
  const userId  = (req.session as any).userId;
  const tradeId = parseInt(req.params.id);

  const [trade] = await db.select().from(vbcTradesTable)
    .where(eq(vbcTradesTable.id, tradeId)).limit(1);
  if (!trade) return res.status(404).json({ error: "Not found" });
  if (trade.buyerId !== userId && trade.sellerId !== userId)
    return res.status(403).json({ error: "Forbidden" });

  const [updated] = await db.update(vbcTradesTable)
    .set({ status: "disputed", updatedAt: new Date() })
    .where(eq(vbcTradesTable.id, tradeId)).returning();

  const [buyer]  = await db.select().from(chatUsersTable).where(eq(chatUsersTable.id, trade.buyerId)).limit(1);
  const [seller] = await db.select().from(chatUsersTable).where(eq(chatUsersTable.id, trade.sellerId)).limit(1);
  const payload  = { type: "trade_update", trade: { ...updated, buyer, seller } };
  notifyUser(trade.buyerId,  payload);
  notifyUser(trade.sellerId, payload);

  res.json({ trade: { ...updated, buyer, seller } });
});

export default router;
