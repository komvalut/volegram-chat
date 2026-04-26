import { Router } from "express";
import { db } from "../db/index.js";
import { chatUsersTable, chatReportsTable } from "../db/schema.js";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

function auth(req: any, res: any, next: any) {
  if (!(req.session as any).userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// ─────────── Static / non-param routes (must come BEFORE /:username) ───────────

// Public admin lookup
router.get("/admin", async (_req, res) => {
  const [admin] = await db.select({ id: chatUsersTable.id, username: chatUsersTable.username })
    .from(chatUsersTable).where(eq(chatUsersTable.isAdmin, true)).limit(1);
  if (!admin) return res.status(404).json({ error: "No admin available" });
  res.json(admin);
});

// Search users by username (authenticated, filters blocks)
router.get("/search", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const q = ((req.query.q as string) ?? "").trim().replace(/^@/, "");
  if (q.length < 2) return res.json([]);

  const blocksR = await db.execute(sql`
    SELECT blocked_id AS other_id FROM vbc_blocks WHERE blocker_id = ${userId}
    UNION
    SELECT blocker_id AS other_id FROM vbc_blocks WHERE blocked_id = ${userId}
  `);
  const blockedIds: number[] = blocksR.rows.map((r: any) => r.other_id);

  const rows = await db.execute(sql`
    SELECT id, username, avatar_url, avatar_seed, lightning_address
    FROM chat_users
    WHERE id != ${userId}
      AND is_blocked = false
      AND LOWER(username) LIKE ${"%" + q.toLowerCase() + "%"}
      ${blockedIds.length ? sql`AND id NOT IN (${sql.raw(blockedIds.join(","))})` : sql``}
    ORDER BY username
    LIMIT 10
  `);
  res.json(rows.rows);
});

// Get my blocked user IDs
router.get("/my/blocks", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const rows = await db.execute(sql`
    SELECT blocked_id FROM vbc_blocks WHERE blocker_id = ${userId}
  `);
  res.json({ blockedIds: rows.rows.map((r: any) => r.blocked_id) });
});

// Update own profile
router.put("/me/update", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const { bio, email, phone, avatarUrl, username, lightningAddress } = req.body;

  if (username !== undefined) {
    if (username.trim().length < 3) return res.status(400).json({ error: "Username must be at least 3 characters" });
    const [existing] = await db.select().from(chatUsersTable)
      .where(eq(chatUsersTable.username, username)).limit(1);
    if (existing && existing.id !== userId) return res.status(409).json({ error: "Username taken" });
  }

  if (lightningAddress) {
    const [existing] = await db.select().from(chatUsersTable)
      .where(eq(chatUsersTable.lightningAddress, lightningAddress)).limit(1);
    if (existing && existing.id !== userId) return res.status(409).json({ error: "Lightning address already in use" });
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

// Block a user
router.post("/block/:targetId", auth, async (req, res) => {
  const userId   = (req.session as any).userId;
  const targetId = parseInt(req.params.targetId);
  if (!targetId || targetId === userId) return res.status(400).json({ error: "Invalid target" });

  await db.execute(sql`
    INSERT INTO vbc_blocks (blocker_id, blocked_id)
    VALUES (${userId}, ${targetId})
    ON CONFLICT DO NOTHING
  `);
  res.json({ ok: true, blocked: true });
});

// Unblock a user
router.delete("/block/:targetId", auth, async (req, res) => {
  const userId   = (req.session as any).userId;
  const targetId = parseInt(req.params.targetId);
  await db.execute(sql`
    DELETE FROM vbc_blocks WHERE blocker_id = ${userId} AND blocked_id = ${targetId}
  `);
  res.json({ ok: true, blocked: false });
});

// Report a user
router.post("/report", auth, async (req, res) => {
  const reporterId = (req.session as any).userId;
  const { targetId, reason } = req.body;
  if (!targetId || !reason) return res.status(400).json({ error: "Missing fields" });
  const [report] = await db.insert(chatReportsTable).values({ reporterId, targetId, reason }).returning();
  res.json({ report });
});

// ─────────── Parameterized route LAST ───────────

// View public profile by username
router.get("/:username", async (req, res) => {
  const sessionUserId = (req.session as any)?.userId;
  const [user] = await db.select({
    id:              chatUsersTable.id,
    username:        chatUsersTable.username,
    avatarUrl:       chatUsersTable.avatarUrl,
    avatarSeed:      chatUsersTable.avatarSeed,
    bio:             chatUsersTable.bio,
    lightningAddress: chatUsersTable.lightningAddress,
    createdAt:       chatUsersTable.createdAt,
    isBlocked:       chatUsersTable.isBlocked,
    email:           chatUsersTable.email,
    phone:           chatUsersTable.phone,
  }).from(chatUsersTable).where(eq(chatUsersTable.username, req.params.username)).limit(1);

  if (!user) return res.status(404).json({ error: "Not found" });
  if (user.isBlocked) return res.status(403).json({ error: "Account suspended" });

  let isBlockedByMe = false;
  let hasBlockedMe  = false;
  if (sessionUserId && sessionUserId !== user.id) {
    const blk1 = await db.execute(sql`
      SELECT 1 FROM vbc_blocks WHERE blocker_id = ${sessionUserId} AND blocked_id = ${user.id} LIMIT 1
    `);
    isBlockedByMe = blk1.rows.length > 0;
    const blk2 = await db.execute(sql`
      SELECT 1 FROM vbc_blocks WHERE blocker_id = ${user.id} AND blocked_id = ${sessionUserId} LIMIT 1
    `);
    hasBlockedMe = blk2.rows.length > 0;
  }

  const isMe = sessionUserId === user.id;
  res.json({
    ...user,
    email: isMe ? user.email : undefined,
    phone: isMe ? user.phone : undefined,
    isBlockedByMe,
    hasBlockedMe,
  });
});

export default router;
