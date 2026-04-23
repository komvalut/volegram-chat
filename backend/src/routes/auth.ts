import { Router } from "express";
import { db } from "../db/index.js";
import { chatUsersTable, chatRewardsTable, chatMembersTable, chatMessagesTable } from "../db/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/login", async (req, res) => {
  const { lightningAddress } = req.body;
  if (!lightningAddress?.includes("@"))
    return res.status(400).json({ error: "Invalid Lightning address" });

  let [user] = await db.select().from(chatUsersTable)
    .where(eq(chatUsersTable.lightningAddress, lightningAddress.trim().toLowerCase())).limit(1);

  if (user?.isBlocked) return res.status(403).json({ error: "Account suspended" });

  const isNew = !user;
  if (!user) {
    const local    = lightningAddress.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
    const username = local + Math.floor(Math.random() * 900 + 100);
    const seed     = Math.random().toString(36).slice(2, 10);

    [user] = await db.insert(chatUsersTable).values({
      lightningAddress: lightningAddress.trim().toLowerCase(),
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
