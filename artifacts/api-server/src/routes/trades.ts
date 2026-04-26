import { Router } from "express";
import multer from "multer";
import path from "path";
import { db } from "../db/index.js";
import { vbcTradesTable, chatUsersTable } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { createInvoice, checkInvoice } from "../lib/lightning.js";
import { notifyUser } from "../lib/ws.js";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename:    (_req, file, cb) => cb(null, `proof-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

const router = Router();

function auth(req: any, res: any, next: any) {
  if (!(req.session as any).userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

async function withParties(trade: any) {
  const [buyer]  = await db.select().from(chatUsersTable).where(eq(chatUsersTable.id, trade.buyerId)).limit(1);
  const [seller] = await db.select().from(chatUsersTable).where(eq(chatUsersTable.id, trade.sellerId)).limit(1);
  return { ...trade, buyer, seller };
}

async function broadcast(trade: any) {
  const full = await withParties(trade);
  notifyUser(trade.buyerId,  { type: "trade_update", trade: full });
  notifyUser(trade.sellerId, { type: "trade_update", trade: full });
  return full;
}

// POST /api/trades — create trade
router.post("/", auth, async (req, res) => {
  const buyerId = (req.session as any).userId;
  const { roomId, sellerUsername, sats, asset, assetAmount, tradeType } = req.body;

  if (!sats || !asset || !assetAmount || !roomId)
    return res.status(400).json({ error: "Missing fields" });

  const [seller] = await db.select().from(chatUsersTable)
    .where(eq(chatUsersTable.username, sellerUsername)).limit(1);
  if (!seller) return res.status(404).json({ error: "Seller not found" });
  if (seller.id === buyerId) return res.status(400).json({ error: "Cannot trade with yourself" });

  const type    = tradeType === "fiat" ? "fiat" : "lightning";
  const feeRate = parseFloat(process.env.TRADE_FEE_RATE ?? "0.01");
  const feeSats = Math.ceil(sats * feeRate);

  // For lightning trades: buyer pays full sats (escrow), seller receives sats - fee
  let invoice: { pr: string; checkoutId: string } | null = null;
  if (type === "lightning") {
    try {
      invoice = await createInvoice(sats, `VBC Escrow: ${assetAmount} ${asset}`);
    } catch (e: any) {
      // SBP_API_KEY not configured — trade created without invoice (fiat-style flow)
      console.warn("[VBC] Lightning invoice failed (SBP_API_KEY missing?):", e.message);
    }
  }

  const [trade] = await db.insert(vbcTradesTable).values({
    roomId,
    buyerId,
    sellerId:      seller.id,
    sats,
    asset:         asset.toUpperCase(),
    assetAmount,
    invoicePr:     invoice?.pr,
    sbpCheckoutId: invoice?.checkoutId,
    tradeType:     type,
    feeSats,
    feeRate:       feeRate.toString(),
    status:        "pending",
  }).returning();

  const full = await broadcast(trade);
  res.json({ trade: full, invoice });
});

// GET /api/trades/:id
router.get("/:id", auth, async (req, res) => {
  const userId  = (req.session as any).userId;
  const tradeId = parseInt(req.params.id);
  const [trade] = await db.select().from(vbcTradesTable)
    .where(eq(vbcTradesTable.id, tradeId)).limit(1);
  if (!trade) return res.status(404).json({ error: "Not found" });
  if (trade.buyerId !== userId && trade.sellerId !== userId)
    return res.status(403).json({ error: "Forbidden" });
  res.json(await withParties(trade));
});

// POST /api/trades/:id/check-payment — poll Lightning payment
router.post("/:id/check-payment", auth, async (req, res) => {
  const userId  = (req.session as any).userId;
  const tradeId = parseInt(req.params.id);
  const [trade] = await db.select().from(vbcTradesTable)
    .where(and(eq(vbcTradesTable.id, tradeId), eq(vbcTradesTable.buyerId, userId))).limit(1);
  if (!trade) return res.status(404).json({ error: "Not found" });
  if (trade.status !== "pending") return res.json({ trade: await withParties(trade), alreadyFunded: true });

  const paid = trade.sbpCheckoutId ? await checkInvoice(trade.sbpCheckoutId) : false;
  if (paid) {
    const [updated] = await db.update(vbcTradesTable)
      .set({ status: "funded", updatedAt: new Date() })
      .where(eq(vbcTradesTable.id, tradeId)).returning();
    return res.json({ trade: await broadcast(updated), paid: true });
  }
  res.json({ trade: await withParties(trade), paid: false });
});

// POST /api/trades/:id/address — buyer sets receiving crypto address
router.post("/:id/address", auth, async (req, res) => {
  const buyerId = (req.session as any).userId;
  const { buyerAddress } = req.body;
  const tradeId = parseInt(req.params.id);
  const [trade] = await db.select().from(vbcTradesTable)
    .where(and(eq(vbcTradesTable.id, tradeId), eq(vbcTradesTable.buyerId, buyerId))).limit(1);
  if (!trade) return res.status(404).json({ error: "Not found" });
  const [updated] = await db.update(vbcTradesTable)
    .set({ buyerAddress, status: "address_shared", updatedAt: new Date() })
    .where(eq(vbcTradesTable.id, tradeId)).returning();
  res.json({ trade: await broadcast(updated) });
});

// POST /api/trades/:id/proof — buyer uploads Revolut/fiat payment screenshot
router.post("/:id/proof", auth, upload.single("proof"), async (req: any, res) => {
  const buyerId = (req.session as any).userId;
  const tradeId = parseInt(req.params.id);

  const [trade] = await db.select().from(vbcTradesTable)
    .where(and(eq(vbcTradesTable.id, tradeId), eq(vbcTradesTable.buyerId, buyerId))).limit(1);
  if (!trade) return res.status(404).json({ error: "Not found" });
  if (!req.file)  return res.status(400).json({ error: "No file uploaded" });

  const proofUrl = `/uploads/${req.file.filename}`;
  const [updated] = await db.update(vbcTradesTable)
    .set({ paymentProofUrl: proofUrl, status: "proof_submitted", updatedAt: new Date() })
    .where(eq(vbcTradesTable.id, tradeId)).returning();

  res.json({ trade: await broadcast(updated) });
});

// POST /api/trades/:id/confirm — buyer confirms received crypto (lightning) OR seller confirms received fiat (fiat trade)
router.post("/:id/confirm", auth, async (req, res) => {
  const userId  = (req.session as any).userId;
  const tradeId = parseInt(req.params.id);
  const [trade] = await db.select().from(vbcTradesTable)
    .where(eq(vbcTradesTable.id, tradeId)).limit(1);
  if (!trade) return res.status(404).json({ error: "Not found" });

  // Fiat trade: SELLER confirms they received fiat → releases sats to buyer's Lightning
  if (trade.tradeType === "fiat") {
    if (trade.sellerId !== userId) return res.status(403).json({ error: "Only seller confirms fiat receipt" });
    if (trade.status !== "proof_submitted") return res.status(400).json({ error: "No proof submitted yet" });
    const [updated] = await db.update(vbcTradesTable)
      .set({ status: "released", updatedAt: new Date() })
      .where(eq(vbcTradesTable.id, tradeId)).returning();
    return res.json({ trade: await broadcast(updated) });
  }

  // Lightning trade: BUYER confirms they received crypto
  if (trade.buyerId !== userId) return res.status(403).json({ error: "Only buyer confirms" });
  if (trade.status !== "address_shared") return res.status(400).json({ error: "Wrong state" });
  const [updated] = await db.update(vbcTradesTable)
    .set({ status: "released", updatedAt: new Date() })
    .where(eq(vbcTradesTable.id, tradeId)).returning();
  res.json({ trade: await broadcast(updated) });
});

// POST /api/trades/:id/dispute
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
  res.json({ trade: await broadcast(updated) });
});

export default router;
