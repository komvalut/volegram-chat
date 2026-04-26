import { Router } from "express";
import { db } from "../db/index.js";
import {
  chatMessagesTable, chatRoomsTable, chatMembersTable,
  chatUsersTable, messageReadsTable,
} from "../db/schema.js";
import { eq, inArray, sql } from "drizzle-orm";
import { createInvoice } from "../lib/lightning.js";
import { notifyUser, broadcastRoom } from "../lib/ws.js";
import multer from "multer";

const router  = Router();
const upload  = multer({ dest: "uploads/", limits: { fileSize: 20 * 1024 * 1024 } });

function auth(req: any, res: any, next: any) {
  if (!(req.session as any).userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}
function makeInviteCode() {
  return Math.random().toString(36).slice(2,10) + Math.random().toString(36).slice(2,10);
}

/* ── Rooms ───────────────────────────────── */
router.get("/rooms", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const memberships = await db.select().from(chatMembersTable).where(eq(chatMembersTable.userId, userId));
  const roomIds = memberships.map(m => m.roomId);
  if (!roomIds.length) return res.json([]);
  const rooms = await db.select().from(chatRoomsTable).where(inArray(chatRoomsTable.id, roomIds));

  // Enrich each room with: other_username (for DMs), last_message, unread_count
  const enriched = await Promise.all(rooms.map(async (room) => {
    // Last message
    const lastMsgRows = await db.execute(sql`
      SELECT content, type, created_at FROM chat_messages
      WHERE room_id = ${room.id} AND is_deleted = false
      ORDER BY created_at DESC LIMIT 1
    `);
    const lastMsg = lastMsgRows.rows[0] as any;
    const last_message = lastMsg
      ? (lastMsg.type === "text" ? lastMsg.content : lastMsg.type === "image" ? "📷 Image" : lastMsg.type === "voice" ? "🎙 Voice" : lastMsg.type === "lightning" ? "⚡ Invoice" : "Message")
      : null;
    const last_message_at = lastMsg?.created_at ?? null;

    // Unread count
    const unreadRows = await db.execute(sql`
      SELECT COUNT(*) AS cnt FROM chat_messages m
      WHERE m.room_id = ${room.id}
        AND m.sender_id != ${userId}
        AND m.is_deleted = false
        AND m.id NOT IN (
          SELECT message_id FROM message_reads WHERE user_id = ${userId}
        )
    `);
    const unread_count = parseInt((unreadRows.rows[0] as any)?.cnt ?? "0");

    // Other username (DM only)
    let other_username: string | null = null;
    let other_user_id: number | null = null;
    if (room.type === "dm") {
      const otherRows = await db.execute(sql`
        SELECT u.username, u.id FROM chat_members cm
        JOIN chat_users u ON u.id = cm.user_id
        WHERE cm.room_id = ${room.id} AND cm.user_id != ${userId}
        LIMIT 1
      `);
      const other = otherRows.rows[0] as any;
      other_username = other?.username ?? null;
      other_user_id  = other?.id ?? null;
    }

    return { ...room, last_message, last_message_at, unread_count, other_username, other_user_id };
  }));

  // Sort by most recent message
  enriched.sort((a, b) => {
    const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return tb - ta;
  });

  res.json(enriched);
});

/* ── User search ─────────────────────────── */
router.get("/users/search", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const q = (req.query.q as string ?? "").trim().replace(/^@/, "");
  if (q.length < 2) return res.json([]);
  const rows = await db.execute(sql`
    SELECT id, username, lightning_address FROM chat_users
    WHERE id != ${userId}
      AND is_blocked = false
      AND LOWER(username) LIKE ${`%${q.toLowerCase()}%`}
    ORDER BY username
    LIMIT 8
  `);
  res.json(rows.rows);
});

router.post("/rooms/dm", auth, async (req, res) => {
  const myId = (req.session as any).userId;
  const { targetUsername } = req.body;
  const [target] = await db.select().from(chatUsersTable)
    .where(eq(chatUsersTable.username, targetUsername)).limit(1);
  if (!target) return res.status(404).json({ error: "User not found" });
  const myRooms    = await db.select().from(chatMembersTable).where(eq(chatMembersTable.userId, myId));
  const theirRooms = await db.select().from(chatMembersTable).where(eq(chatMembersTable.userId, target.id));
  const myIds      = new Set(myRooms.map(m => m.roomId));
  const shared     = theirRooms.find(m => myIds.has(m.roomId));
  if (shared) {
    const [room] = await db.select().from(chatRoomsTable).where(eq(chatRoomsTable.id, shared.roomId));
    return res.json({ room, existed: true });
  }
  const [room] = await db.insert(chatRoomsTable).values({ type: "dm" }).returning();
  await db.insert(chatMembersTable).values([
    { roomId: room.id, userId: myId },
    { roomId: room.id, userId: target.id },
  ]);
  res.json({ room, existed: false });
});

router.post("/rooms/incognito", auth, async (req, res) => {
  const myId = (req.session as any).userId;
  const { name } = req.body;
  const code = makeInviteCode();
  const [room] = await db.insert(chatRoomsTable).values({
    type: "dm", name: name ?? "Incognito Room", isIncognito: true, inviteCode: code,
  }).returning();
  await db.insert(chatMembersTable).values([{ roomId: room.id, userId: myId }]);
  res.json({ room, inviteCode: code });
});

router.post("/rooms/join/:code", auth, async (req, res) => {
  const myId = (req.session as any).userId;
  const [room] = await db.select().from(chatRoomsTable)
    .where(eq(chatRoomsTable.inviteCode, req.params.code)).limit(1);
  if (!room) return res.status(404).json({ error: "Invalid invite code" });
  const existing = await db.select().from(chatMembersTable).where(eq(chatMembersTable.userId, myId));
  if (!existing.find(m => m.roomId === room.id)) {
    await db.insert(chatMembersTable).values([{ roomId: room.id, userId: myId }]);
  }
  res.json({ room });
});

/* ── Messages ────────────────────────────── */
router.get("/rooms/:roomId/messages", auth, async (req, res) => {
  const roomId = parseInt(req.params.roomId);
  const userId = (req.session as any).userId;
  const [room] = await db.select().from(chatRoomsTable).where(eq(chatRoomsTable.id, roomId)).limit(1);
  if (room?.isIncognito) return res.json([]);

  const msgs = await db.select().from(chatMessagesTable)
    .where(eq(chatMessagesTable.roomId, roomId))
    .orderBy(chatMessagesTable.createdAt)
    .limit(200);

  const visible = msgs.filter(m => !m.isDeleted && (!m.expiresAt || m.expiresAt > new Date()));

  const userIds = [...new Set(visible.map(m => m.senderId))];
  const users   = userIds.length
    ? await db.select().from(chatUsersTable).where(inArray(chatUsersTable.id, userIds))
    : [];
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  // Get reply-to messages
  const replyIds = [...new Set(visible.map(m => m.replyToId).filter(Boolean))] as number[];
  const replyMsgs = replyIds.length
    ? await db.select().from(chatMessagesTable).where(inArray(chatMessagesTable.id, replyIds))
    : [];
  const replyMap = Object.fromEntries(replyMsgs.map(m => [m.id, m]));

  // Get read receipts — which message IDs this user has read
  const myReads = await db.select().from(messageReadsTable)
    .where(eq(messageReadsTable.userId, userId));
  const readSet = new Set(myReads.map(r => r.messageId));

  // Mark all visible messages as read for this user (batch upsert via raw SQL ignored)
  const unread = visible.filter(m => !readSet.has(m.id) && m.senderId !== userId);
  for (const m of unread) {
    await db.execute(sql`INSERT INTO message_reads (message_id, user_id) VALUES (${m.id}, ${userId}) ON CONFLICT DO NOTHING`);
  }

  res.json(
    visible.map(m => ({
      ...m,
      reactions: (() => { try { return JSON.parse(m.reactions); } catch { return {}; } })(),
      sender:   userMap[m.senderId],
      replyTo:  m.replyToId ? {
        ...replyMap[m.replyToId],
        sender: userMap[replyMap[m.replyToId]?.senderId],
      } : null,
    }))
  );
});

/* ── React to message ────────────────────── */
router.post("/rooms/:roomId/messages/:msgId/react", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const msgId  = parseInt(req.params.msgId);
  const { emoji } = req.body;
  if (!emoji) return res.status(400).json({ error: "emoji required" });

  const [msg] = await db.select().from(chatMessagesTable)
    .where(eq(chatMessagesTable.id, msgId)).limit(1);
  if (!msg) return res.status(404).json({ error: "Message not found" });

  let reactions: Record<string, number[]> = {};
  try { reactions = JSON.parse(msg.reactions); } catch {}

  if (!reactions[emoji]) reactions[emoji] = [];
  const idx = reactions[emoji].indexOf(userId);
  if (idx === -1) reactions[emoji].push(userId);
  else             reactions[emoji].splice(idx, 1);
  if (reactions[emoji].length === 0) delete reactions[emoji];

  const reactStr = JSON.stringify(reactions);
  await db.update(chatMessagesTable).set({ reactions: reactStr })
    .where(eq(chatMessagesTable.id, msgId));

  broadcastRoom(msg.roomId, { type: "reaction_update", msgId, reactions });
  res.json({ reactions });
});

/* ── Mark room as read ───────────────────── */
router.post("/rooms/:roomId/read", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const roomId = parseInt(req.params.roomId);
  const msgs   = await db.select({ id: chatMessagesTable.id })
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.roomId, roomId));
  for (const m of msgs) {
    await db.execute(sql`INSERT INTO message_reads (message_id, user_id) VALUES (${m.id}, ${userId}) ON CONFLICT DO NOTHING`);
  }
  if (msgs.length) broadcastRoom(roomId, { type: "read_update", userId, roomId });
  res.json({ ok: true });
});

/* ── Lightning invoice ───────────────────── */
router.post("/rooms/:roomId/invoice", auth, async (req, res) => {
  const roomId   = parseInt(req.params.roomId);
  const senderId = (req.session as any).userId;
  const { sats, note } = req.body;
  const inv = await createInvoice(sats, note ?? `VBC payment — ${sats} sats`);
  const [msg] = await db.insert(chatMessagesTable).values({
    roomId, senderId, type: "lightning",
    content: note ?? `⚡ ${sats} sats`,
    invoicePr: inv.pr, sats,
  }).returning();
  const [sender] = await db.select().from(chatUsersTable)
    .where(eq(chatUsersTable.id, senderId)).limit(1);
  notifyUser(senderId, { type: "message", message: { ...msg, sender } });
  res.json({ message: { ...msg, sender }, invoice: inv });
});

/* ── Upload ──────────────────────────────── */
router.post("/upload", auth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  res.json({ url: `/uploads/${req.file.filename}` });
});

export default router;
