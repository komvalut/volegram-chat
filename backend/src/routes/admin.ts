import { Router } from "express";
import { db } from "../db/index.js";
import { chatUsersTable, chatReportsTable, vbcTradesTable } from "../db/schema.js";
import { eq, desc, sum, count, and } from "drizzle-orm";

const router = Router();

async function adminAuth(req: any, res: any, next: any) {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const [u] = await db.select().from(chatUsersTable).where(eq(chatUsersTable.id, userId)).limit(1);
    if (!u?.isAdmin) return res.status(403).json({ error: "Forbidden" });
    next();
  } catch {
    res.status(500).json({ error: "Server error" });
  }
}

router.get("/users", adminAuth, async (_req, res) => {
  const users = await db.select().from(chatUsersTable).orderBy(desc(chatUsersTable.createdAt));
  res.json(users);
});

router.post("/block/:userId", adminAuth, async (req, res) => {
  await db.update(chatUsersTable)
    .set({ isBlocked: true })
    .where(eq(chatUsersTable.id, parseInt(req.params.userId)));
  res.json({ ok: true });
});

router.post("/unblock/:userId", adminAuth, async (req, res) => {
  await db.update(chatUsersTable)
    .set({ isBlocked: false })
    .where(eq(chatUsersTable.id, parseInt(req.params.userId)));
  res.json({ ok: true });
});

router.post("/delete-message/:msgId", adminAuth, async (req, res) => {
  const { chatMessagesTable } = await import("../db/schema.js");
  await db.update(chatMessagesTable)
    .set({ isDeleted: true })
    .where(eq(chatMessagesTable.id, parseInt(req.params.msgId)));
  res.json({ ok: true });
});

router.get("/reports", adminAuth, async (_req, res) => {
  const reports = await db.select().from(chatReportsTable)
    .orderBy(desc(chatReportsTable.createdAt));
  res.json(reports);
});

router.post("/reports/:id/resolve", adminAuth, async (req, res) => {
  await db.update(chatReportsTable)
    .set({ resolved: true })
    .where(eq(chatReportsTable.id, parseInt(req.params.id)));
  res.json({ ok: true });
});

// Revenue stats
router.get("/revenue", adminAuth, async (_req, res) => {
  const trades = await db.select().from(vbcTradesTable)
    .orderBy(desc(vbcTradesTable.createdAt));

  const completed  = trades.filter(t => t.status === "released");
  const totalFee   = completed.reduce((s, t) => s + (t.feeSats ?? 0), 0);
  const totalVol   = completed.reduce((s, t) => s + t.sats, 0);
  const pending    = trades.filter(t => !["released","disputed","refunded"].includes(t.status));
  const disputed   = trades.filter(t => t.status === "disputed");
  const lightningC = completed.filter(t => t.tradeType === "lightning").length;
  const fiatC      = completed.filter(t => t.tradeType === "fiat").length;

  res.json({
    totalFeeSats:      totalFee,
    totalVolumeSats:   totalVol,
    completedTrades:   completed.length,
    pendingTrades:     pending.length,
    disputedTrades:    disputed.length,
    lightningTrades:   lightningC,
    fiatTrades:        fiatC,
    recentTrades:      trades.slice(0, 20),
  });
});

// Admin: manually resolve a disputed trade
router.post("/trades/:id/resolve-dispute", adminAuth, async (req, res) => {
  const { winner } = req.body; // "buyer" | "seller"
  const tradeId = parseInt(req.params.id);
  const [trade] = await db.select().from(vbcTradesTable)
    .where(eq(vbcTradesTable.id, tradeId)).limit(1);
  if (!trade) return res.status(404).json({ error: "Not found" });

  const status = winner === "buyer" ? "refunded" : "released";
  await db.update(vbcTradesTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(vbcTradesTable.id, tradeId));
  res.json({ ok: true, status });
});

export default router;
