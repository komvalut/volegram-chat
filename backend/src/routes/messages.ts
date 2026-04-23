import { Router } from "express";
import { db } from "../db/index.js";
import {
  chatMessagesTable, chatRoomsTable, chatMembersTable,
  chatUsersTable, chatRewardsTable,
} from "../db/schema.js";
import { eq, inArray } from "drizzle-orm";
import { createInvoice } from "../lib/lightning.js";
import { notifyUser } from "../lib/ws.js";
import multer from "multer";

const router = Router();
const upload = multer({ dest: "uploads/", limits: { fileSize: 20 * 1024 * 1024 } });

function auth(req: any, res: any, next: any) {
  if (!(req.session as any).userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

function makeInviteCode() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

router.get("/rooms", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const memberships = await db.select().from(chatMembersTable).where(eq(chatMembersTable.userId, userId));
  const roomIds = memberships.map(m => m.roomId);
  if (!roomIds.length) return res.json([]);
  const rooms = await db.select().from(chatRoomsTable).where(inArray(chatRoomsTable.id, roomIds));
  res.json(rooms);
});

// Standard DM
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

// Incognito room — messages NOT saved to DB
router.post("/rooms/incognito", auth, async (req, res) => {
  const myId = (req.session as any).userId;
  const { name } = req.body;
  const code = makeInviteCode();

  const [room] = await db.insert(chatRoomsTable).values({
    type: "dm",
    name: name ?? "Incognito Room",
    isIncognito: true,
    inviteCode: code,
  }).returning();

  await db.insert(chatMembersTable).values([{ roomId: room.id, userId: myId }]);
  res.json({ room, inviteCode: code });
});

// Join by invite code
router.post("/rooms/join/:code", auth, async (req, res) => {
  const myId = (req.session as any).userId;
  const [room] = await db.select().from(chatRoomsTable)
    .where(eq(chatRoomsTable.inviteCode, req.params.code)).limit(1);
  if (!room) return res.status(404).json({ error: "Invalid invite code" });

  const existing = await db.select().from(chatMembersTable)
    .where(eq(chatMembersTable.userId, myId));
  if (!existing.find(m => m.roomId === room.id)) {
    await db.insert(chatMembersTable).values([{ roomId: room.id, userId: myId }]);
  }
  res.json({ room });
});

router.get("/rooms/:roomId/messages", auth, async (req, res) => {
  const roomId = parseInt(req.params.roomId);
  const [room] = await db.select().from(chatRoomsTable).where(eq(chatRoomsTable.id, roomId)).limit(1);

  // Incognito rooms have no stored history
  if (room?.isIncognito) return res.json([]);

  const msgs = await db.select().from(chatMessagesTable)
    .where(eq(chatMessagesTable.roomId, roomId))
    .orderBy(chatMessagesTable.createdAt)
    .limit(100);

  const userIds = [...new Set(msgs.map(m => m.senderId))];
  const users   = userIds.length
    ? await db.select().from(chatUsersTable).where(inArray(chatUsersTable.id, userIds))
    : [];
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  res.json(
    msgs
      .filter(m => !m.isDeleted && (!m.expiresAt || m.expiresAt > new Date()))
      .map(m => ({ ...m, sender: userMap[m.senderId] }))
  );
});

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

router.post("/upload", auth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  res.json({ url: `/uploads/${req.file.filename}` });
});

export default router;
