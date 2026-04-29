import { Router } from "express";
import { db } from "../db/index.js";
import {
  chatUsersTable, chatRoomsTable, chatMembersTable, chatMessagesTable,
} from "../db/schema.js";
import { eq, inArray } from "drizzle-orm";
import { createInvoice } from "../lib/lightning.js";
import { notifyUser } from "../lib/ws.js";

const router = Router();
const MICROSWAP_API = process.env.MICROSWAP_API_URL ?? "https://sonero-p2p.onrender.com";

function auth(req: any, res: any, next: any) {
  if (!(req.session as any).userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// Proxy listings from MICROSWAP — no CORS issues for client
router.get("/listings", async (req, res) => {
  try {
    const qs = new URLSearchParams(req.query as any).toString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const r  = await fetch(`${MICROSWAP_API}/api/listings${qs ? "?" + qs : ""}`, {
      headers: { "Accept": "application/json" },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!r.ok) return res.status(r.status).json({ error: "MICROSWAP unavailable" });
    const data = await r.json();
    res.json(data);
  } catch (e: any) {
    if (e.name === 'AbortError') {
      return res.status(504).json({ error: "MICROSWAP timeout" });
    }
    res.status(502).json({ error: "Cannot reach MICROSWAP" });
  }
});

// Proxy single listing
router.get("/listings/:id", async (req, res) => {
  try {
    const r = await fetch(`${MICROSWAP_API}/api/listings/${req.params.id}`,
      { headers: { "Accept": "application/json" } });
    if (!r.ok) return res.status(r.status).json({ error: "Not found" });
    res.json(await r.json());
  } catch {
    res.status(502).json({ error: "Cannot reach MICROSWAP" });
  }
});

// Buy from MICROSWAP — creates DM room with seller + invoice message
router.post("/buy/:listingId", auth, async (req, res) => {
  try {
    const buyerId = (req.session as any).userId;

    // Fetch listing
    const lr = await fetch(`${MICROSWAP_API}/api/listings/${req.params.listingId}`,
      { headers: { "Accept": "application/json" } });
    if (!lr.ok) return res.status(404).json({ error: "Listing not found" });
    const listing = await lr.json();

    const priceSats: number = listing.priceSats ?? listing.price_sats ?? 0;
    const title: string     = listing.title ?? "Listing";

    // Create Lightning invoice
    const invoice = await createInvoice(priceSats, `VBC × MICROSWAP: ${title}`);

    // Find or create DM room between buyer and seller
    // Seller may not have VBC account — we create a "marketplace" room
    const [buyer] = await db.select().from(chatUsersTable)
      .where(eq(chatUsersTable.id, buyerId)).limit(1);

    // Check if seller has VBC account via lightning address
    let sellerUser: any = null;
    if (listing.sellerLightningAddress || listing.seller?.lightningAddress) {
      const lnAddr = listing.sellerLightningAddress ?? listing.seller?.lightningAddress;
      const [u] = await db.select().from(chatUsersTable)
        .where(eq(chatUsersTable.lightningAddress, lnAddr)).limit(1);
      sellerUser = u ?? null;
    }

    // Find or create DM room
    let room: any = null;
    if (sellerUser) {
      const myRooms    = await db.select().from(chatMembersTable).where(eq(chatMembersTable.userId, buyerId));
      const theirRooms = await db.select().from(chatMembersTable).where(eq(chatMembersTable.userId, sellerUser.id));
      const myIds      = new Set(myRooms.map(m => m.roomId));
      const shared     = theirRooms.find(m => myIds.has(m.roomId));
      if (shared) {
        const [r] = await db.select().from(chatRoomsTable).where(eq(chatRoomsTable.id, shared.roomId));
        room = r;
      } else {
        const [r] = await db.insert(chatRoomsTable).values({ type: "dm" }).returning();
        await db.insert(chatMembersTable).values([
          { roomId: r.id, userId: buyerId },
          { roomId: r.id, userId: sellerUser.id },
        ]);
        room = r;
      }
    } else {
      // Create solo marketplace room (buyer only sees invoice)
      const [r] = await db.insert(chatRoomsTable)
        .values({ type: "dm", name: `Trade: ${title.slice(0, 40)}` }).returning();
      await db.insert(chatMembersTable).values([{ roomId: r.id, userId: buyerId }]);
      room = r;
    }

    // Insert invoice message
    const [msg] = await db.insert(chatMessagesTable).values({
      roomId:    room.id,
      senderId:  buyerId,
      type:      "lightning",
      content:   `🛒 MICROSWAP: ${title}`,
      invoicePr: invoice.pr,
      sbpCheckoutId: invoice.checkoutId,
      sats:      priceSats,
    }).returning();

    if (sellerUser) {
      notifyUser(sellerUser.id, {
        type: "message",
        message: { ...msg, sender: buyer },
      });
    }

    res.json({ room, message: { ...msg, sender: buyer }, invoice });
  } catch (err: any) {
    console.error(`[SwapBuy] Error: ${err.message}`);
    res.status(500).json({ error: "Purchase initialization failed" });
  }
});

export default router;
