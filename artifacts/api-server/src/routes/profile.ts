import { Router } from "express";
import { db } from "../db/index.js";
import { chatUsersTable, chatReportsTable } from "../db/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

function auth(req: any, res: any, next: any) {
  if (!(req.session as any).userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// Public admin lookup — returns the first admin user (for "Contact Admin" button)
router.get("/admin", async (_req, res) => {
  const [admin] = await db.select({
    id: chatUsersTable.id,
    username: chatUsersTable.username,
  }).from(chatUsersTable).where(eq(chatUsersTable.isAdmin, true)).limit(1);
  if (!admin) return res.status(404).json({ error: "No admin available" });
  res.json(admin);
});

router.get("/:username", async (req, res) => {
  const [user] = await db.select({
    id: chatUsersTable.id,
    username: chatUsersTable.username,
    avatarUrl: chatUsersTable.avatarUrl,
    avatarSeed: chatUsersTable.avatarSeed,
    bio: chatUsersTable.bio,
    lightningAddress: chatUsersTable.lightningAddress,
    createdAt: chatUsersTable.createdAt,
    isBlocked: chatUsersTable.isBlocked,
  }).from(chatUsersTable).where(eq(chatUsersTable.username, req.params.username)).limit(1);

  if (!user) return res.status(404).json({ error: "Not found" });
  if (user.isBlocked) return res.status(403).json({ error: "User blocked" });
  res.json(user);
});

router.put("/me/update", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const { bio, email, phone, avatarUrl, username, lightningAddress } = req.body;

  if (username) {
    const [existing] = await db.select().from(chatUsersTable)
      .where(eq(chatUsersTable.username, username)).limit(1);
    if (existing && existing.id !== userId) {
      return res.status(409).json({ error: "Username taken" });
    }
  }

  if (lightningAddress) {
    const [existing] = await db.select().from(chatUsersTable)
      .where(eq(chatUsersTable.lightningAddress, lightningAddress)).limit(1);
    if (existing && existing.id !== userId) {
      return res.status(409).json({ error: "Lightning address already in use" });
    }
  }

  const update: Record<string, any> = {};
  if (bio              !== undefined) update.bio              = bio;
  if (email            !== undefined) update.email            = email;
  if (phone            !== undefined) update.phone            = phone;
  if (avatarUrl        !== undefined) update.avatarUrl        = avatarUrl;
  if (username         !== undefined) update.username         = username;
  if (lightningAddress !== undefined) update.lightningAddress = lightningAddress;

  const [updated] = await db.update(chatUsersTable).set(update)
    .where(eq(chatUsersTable.id, userId)).returning();
  res.json({ user: updated });
});

router.post("/report", auth, async (req, res) => {
  const reporterId = (req.session as any).userId;
  const { targetId, reason } = req.body;
  if (!targetId || !reason) return res.status(400).json({ error: "Missing fields" });
  const [report] = await db.insert(chatReportsTable).values({ reporterId, targetId, reason }).returning();
  res.json({ report });
});

export default router;
