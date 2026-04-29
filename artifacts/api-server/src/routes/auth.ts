import { Router } from "express";
import { db } from "../db/index.js";
import { chatUsersTable, chatRewardsTable, chatMembersTable, chatMessagesTable } from "../db/schema.js";
import { eq, or } from "drizzle-orm";

const router = Router();

router.post("/login", async (req, res) => {
  const { identifier } = req.body;
  if (!identifier || typeof identifier !== "string" || !identifier.includes("@"))
    return res.status(400).json({ error: "Valid identifier required" });

  const iden = identifier.trim().toLowerCase();
  let [user] = await db.select().from(chatUsersTable)
    .where(or(
      eq(chatUsersTable.email, iden),
      eq(chatUsersTable.lightningAddress, iden)
    )).limit(1);

  if (user?.isBlocked) return res.status(403).json({ error: "Account suspended" });

  const isNew = !user;
  if (!user) {
    const rawLocal = iden.split("@")[0];
    const cleaned  = rawLocal.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
    const base     = cleaned.length >= 2 ? cleaned : "user";
    const suffix   = Math.floor(Math.random() * 9000 + 1000);
    const username = base + suffix;
    const seed     = Math.random().toString(36).slice(2, 10);

    [user] = await db.insert(chatUsersTable).values({
      email: iden,
      lightningAddress: iden,
      username, avatarSeed: seed, satsBalance: 1000,
    }).returning();

    await db.insert(chatRewardsTable).values({ userId: user.id, action: "welcome_bonus", sats: 1000 });
  }

  (req.session as any).userId = user.id;
  res.json({ user, isNew });
});

router.get("/me", async (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ error: "Not logged in" });
  const [user] = await db.select().from(chatUsersTable)
    .where(eq(chatUsersTable.id, userId)).limit(1);
  if (!user) return res.status(401).json({ error: "Not found" });
  if (user.isBlocked) { req.session.destroy(() => {}); return res.status(403).json({ error: "Account suspended" }); }
  res.json({ user });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// Self-destruct — deletes ALL user data permanently
router.delete("/account", async (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ error: "Not logged in" });

  // Delete messages, memberships, rewards, then user
  await db.delete(chatMessagesTable).where(eq(chatMessagesTable.senderId, userId));
  await db.delete(chatMembersTable).where(eq(chatMembersTable.userId, userId));
  await db.delete(chatRewardsTable).where(eq(chatRewardsTable.userId, userId));
  await db.delete(chatUsersTable).where(eq(chatUsersTable.id, userId));

  req.session.destroy(() => res.json({ ok: true, message: "Account deleted" }));
});

export default router;
