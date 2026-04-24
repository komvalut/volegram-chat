import { WebSocketServer, WebSocket } from "ws";
import { db } from "../db/index.js";
import { chatMessagesTable, chatUsersTable, chatRoomsTable } from "../db/schema.js";
import { eq } from "drizzle-orm";
import type { Server } from "http";

interface Client {
  ws: WebSocket;
  userId: number;
  rooms: Set<number>;
}

const clients = new Map<number, Client>();

export function setupWS(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const url    = new URL(req.url ?? "/", "http://localhost");
    const userId = parseInt(url.searchParams.get("userId") ?? "0");
    if (!userId) { ws.close(); return; }

    const client: Client = { ws, userId, rooms: new Set() };
    clients.set(userId, client);

    ws.on("message", async (raw) => {
      try { await handleMessage(client, JSON.parse(raw.toString())); } catch {}
    });
    ws.on("close", () => clients.delete(userId));
    ws.send(JSON.stringify({ type: "connected", userId }));
  });
}

async function handleMessage(client: Client, msg: any) {
  if (msg.type === "join") {
    client.rooms.add(msg.roomId);
    client.ws.send(JSON.stringify({ type: "joined", roomId: msg.roomId }));
  }

  if (msg.type === "message") {
    const { roomId, content, msgType = "text", fileUrl, sats, invoicePr, burnSecs } = msg;

    // Check if room is incognito — skip DB save
    const [room] = await db.select().from(chatRoomsTable)
      .where(eq(chatRoomsTable.id, roomId)).limit(1);

    const isIncognito = room?.isIncognito ?? false;

    let saved: any;

    if (!isIncognito) {
      const expiresAt = burnSecs && burnSecs > 0
        ? new Date(Date.now() + burnSecs * 1000) : null;

      const [s] = await db.insert(chatMessagesTable).values({
        roomId,
        senderId:  client.userId,
        type:      msgType,
        content:   content ?? null,
        fileUrl:   fileUrl ?? null,
        sats:      sats ?? null,
        invoicePr: invoicePr ?? null,
        expiresAt: expiresAt ?? undefined,
      }).returning();
      saved = s;
    } else {
      // Ephemeral message — in-memory only
      saved = {
        id:          Date.now(),
        roomId,
        senderId:    client.userId,
        type:        msgType,
        content:     content ?? null,
        fileUrl:     fileUrl ?? null,
        sats:        sats ?? null,
        invoicePr:   invoicePr ?? null,
        isDeleted:   false,
        invoicePaid: false,
        expiresAt:   null,
        createdAt:   new Date().toISOString(),
        ephemeral:   true,
      };
    }

    const [sender] = await db.select().from(chatUsersTable)
      .where(eq(chatUsersTable.id, client.userId)).limit(1);

    const broadcast = JSON.stringify({ type: "message", message: { ...saved, sender } });
    clients.forEach(c => {
      if (c.rooms.has(roomId) && c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(broadcast);
      }
    });
  }

  if (msg.type === "typing") {
    const broadcast = JSON.stringify({ type: "typing", roomId: msg.roomId, userId: client.userId });
    clients.forEach(c => {
      if (c.rooms.has(msg.roomId) && c.userId !== client.userId && c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(broadcast);
      }
    });
  }
}

export function notifyUser(userId: number, payload: object) {
  const c = clients.get(userId);
  if (c && c.ws.readyState === WebSocket.OPEN) c.ws.send(JSON.stringify(payload));
}

export function broadcastRoom(roomId: number, payload: object) {
  const data = JSON.stringify(payload);
  clients.forEach(c => {
    if (c.rooms.has(roomId) && c.ws.readyState === WebSocket.OPEN) c.ws.send(data);
  });
}
