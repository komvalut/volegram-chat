import { Router } from "express";
import { db } from "../db/index.js";
import {
  chatMessagesTable, chatRoomsTable, chatMembersTable,
  chatUsersTable, chatRewardsTable,
} from "../db/schema.js";
import { eq, and, desc, or, inArray } from "drizzle-orm";
import { createInvoice, checkInvoice } from "../lib/lightning.js";
import { notifyUser } from "../lib/ws.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();
const upload = multer({ dest: "uploads/", limits: { fileSize: 20 * 1024 * 1024 } });

function auth(req: any, res: any, next: any) {
  if (!(req.session as any).userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

router.get("/rooms", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const memberships = await db.select().from(chatMembersTable)
    .where(eq(chatMembersTable.userId, userId));
  const roomIds = memberships.map(m => m.roomId);
  if (!roomIds.length) return res.json([]);

  const rooms = await db.select().from(chatRoomsTable)
    .where(inArray(chatRoomsTable.id, roomIds));
  res.json(rooms);
});

router.post("/rooms/dm", auth, async (req, res) => {
  const myId = (req.session as any).userId;
  const { targetUsername } = req.body;

  const [target] = await db.select().from(chatUsersTable)
    .where(eq(chatUsersTable.username, targetUsername)).limit(1);
  if (!target) return res.status(404).json({ error: "User not found" });

  const myRooms = await db.select().from(chatMembersTable).where(eq(chatMembersTable.userId, myId));
  const theirRooms = await db.select().from(chatMembersTable).where(eq(chatMembersTable.userId, target.id));

  const myRoomIds = new Set(myRooms.map(m => m.roomId));
  const sharedRoomId = theirRooms.find(m => myRoomIds.has(m.roomId))?.roomId;

  if (sharedRoomId) {
    const [room] = await db.select().from(chatRoomsTable).where(eq(chatRoomsTable.id, sharedRoomId));
    return res.json({ room, existed: true });
  }

  const [room] = await db.insert(chatRoomsTable).values({ type: "dm" }).returning();
  await db.insert(chatMembersTable).values([
    { roomId: room.id, userId: myId },
    { roomId: room.id, userId: target.id },
  ]);
  res.json({ room, existed: false });
});

router.get("/rooms/:roomId/messages", auth, async (req, res) => {
  const roomId = parseInt(req.params.roomId);
  const msgs = await db.select().from(chatMessagesTable)
    .where(eq(chatMessagesTable.roomId, roomId))
    .orderBy(desc(chatMessagesTable.createdAt))
    .limit(50);

  const userIds = [...new Set(msgs.map(m => m.senderId))];
  const users = userIds.length
    ? await db.select().from(chatUsersTable).where(inArray(chatUsersTable.id, userIds))
    : [];
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  res.json(msgs.reverse().map(m => ({ ...m, sender: userMap[m.senderId] })));
});

router.post("/rooms/:roomId/invoice", auth, async (req, res) => {
  const roomId = parseInt(req.params.roomId);
  const senderId = (req.session as any).userId;
  const { sats, note } = req.body;

  const inv = await createInvoice(sats, note ?? `VOLEGRAM payment — ${sats} sats`);

  const [msg] = await db.insert(chatMessagesTable).values({
    roomId, senderId, type: "lightning",
    content: note ?? `⚡ ${sats} sats`,
    invoicePr: inv.pr,
    sats,
  }).returning();

  const [sender] = await db.select().from(chatUsersTable)
    .where(eq(chatUsersTable.id, senderId)).limit(1);

  notifyUser(senderId, { type: "message", message: { ...msg, sender } });
  res.json({ message: { ...msg, sender }, invoice: inv });
});

router.post("/upload", auth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

export default router;
