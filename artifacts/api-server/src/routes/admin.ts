import { Router } from "express";
import { db } from "../db/index.js";
import { chatUsersTable, chatReportsTable, vbcTradesTable } from "../db/schema.js";
import { eq, desc, sum, count, and } from "drizzle-orm";

const router = Router();

function adminAuth(req: any, res: any, next: any) {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  db.select().from(chatUsersTable).where(eq(chatUsersTable.id, userId)).limit(1).then(([u]) => {
    if (!u?.isAdmin) return res.status(403).json({ error: "Forbidden" });
    next();
  });
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

router.post("/delete-message/:msgId", adminAuth, async (_req, res) => {
  const { chatMessagesTable } = await import("../db/schema.js");
  await db.update(chatMessagesTable)
    .set({ isDeleted: true })
    .where(eq(chatMessagesTable.id, parseInt(_req.params.msgId)));
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

// Admin: create OTP code for a user (by username or lightning address)
router.post("/otp/create", adminAuth, async (req, res) => {
  const { identifier, code } = req.body;
  if (!identifier) return res.status(400).json({ error: "identifier required" });
  const { db: dbRef } = await import("../db/index.js");
  const { sql: sqlRef } = await import("drizzle-orm");

  const id = identifier.trim().toLowerCase();
  const r = await dbRef.execute(sqlRef`
    SELECT * FROM chat_users
    WHERE LOWER(email) = ${id} OR LOWER(lightning_address) = ${id} OR LOWER(username) = ${id}
    LIMIT 1
  `);
  const user = r.rows[0] as any;
  if (!user) return res.status(404).json({ error: "User not found" });

  const finalCode = (code?.trim()) || Math.floor(100000 + Math.random() * 900000).toString();
  await dbRef.execute(sqlRef`
    INSERT INTO vbc_otp_codes (user_id, code, expires_at, used)
    VALUES (${user.id}, ${finalCode}, NOW() + INTERVAL '24 hours', FALSE)
  `);
  res.json({ ok: true, code: finalCode, username: user.username });
});

export default router;
