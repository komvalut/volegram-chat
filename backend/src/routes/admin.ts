import { Router } from "express";
import { db } from "../db/index.js";
import { chatUsersTable, chatReportsTable } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

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

export default router;
