import { WebSocketServer, WebSocket } from "ws";
import { db } from "../db/index.js";
import { chatMessagesTable, chatMembersTable, chatUsersTable } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
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
    const url = new URL(req.url ?? "/", "http://localhost");
    const userId = parseInt(url.searchParams.get("userId") ?? "0");
    if (!userId) { ws.close(); return; }

    const client: Client = { ws, userId, rooms: new Set() };
    clients.set(userId, client);

    ws.on("message", async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        await handleMessage(client, msg);
      } catch {}
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
    const { roomId, content, msgType = "text", fileUrl, sats, invoicePr } = msg;

    const [saved] = await db.insert(chatMessagesTable).values({
      roomId,
      senderId: client.userId,
      type: msgType,
      content: content ?? null,
      fileUrl: fileUrl ?? null,
      sats: sats ?? null,
      invoicePr: invoicePr ?? null,
    }).returning();

    const [sender] = await db.select().from(chatUsersTable)
      .where(eq(chatUsersTable.id, client.userId)).limit(1);

    const broadcast = JSON.stringify({
      type: "message",
      message: { ...saved, sender },
    });

    clients.forEach((c) => {
      if (c.rooms.has(roomId) && c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(broadcast);
      }
    });
  }

  if (msg.type === "typing") {
    const broadcast = JSON.stringify({
      type: "typing",
      roomId: msg.roomId,
      userId: client.userId,
    });
    clients.forEach((c) => {
      if (c.rooms.has(msg.roomId) && c.userId !== client.userId && c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(broadcast);
      }
    });
  }
}

export function notifyUser(userId: number, payload: object) {
  const c = clients.get(userId);
  if (c && c.ws.readyState === WebSocket.OPEN) {
    c.ws.send(JSON.stringify(payload));
  }
}
