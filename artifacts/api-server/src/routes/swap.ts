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

const DEMO_LISTINGS = [
  { id: 1, title: "Buy BTC via EUR bank transfer", priceSats: 10000, currency: "EUR", amount: 6.65, sellerUsername: "demo_seller_1", type: "buy_crypto" },
  { id: 2, title: "Sell sats for RSD cash", priceSats: 5000, currency: "RSD", amount: 391, sellerUsername: "demo_seller_2", type: "buy_sats" },
  { id: 3, title: "Buy sats with USDT", priceSats: 20000, currency: "USD", amount: 15.6, sellerUsername: "demo_seller_3", type: "buy_crypto" },
];

async function fetchWithTimeout(url: string, ms = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const r = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    clearTimeout(id);
    return r;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

// Proxy listings from MICROSWAP — no CORS issues for client
router.get("/listings", async (req, res) => {
  try {
    const qs = new URLSearchParams(req.query as any).toString();
    const r  = await fetchWithTimeout(`${MICROSWAP_API}/api/listings${qs ? "?" + qs : ""}`);
    if (!r.ok) return res.json({ listings: DEMO_LISTINGS, demo: true });
    const data = await r.json();
    res.json(data);
  } catch {
    res.json({ listings: DEMO_LISTINGS, demo: true });
  }
});

// Proxy single listing
router.get("/listings/:id", async (req, res) => {
  try {
    const r = await fetchWithTimeout(`${MICROSWAP_API}/api/listings/${req.params.id}`);
    if (!r.ok) {
      const demo = DEMO_LISTINGS.find(l => l.id === parseInt(req.params.id));
      return demo ? res.json(demo) : res.status(404).json({ error: "Not found" });
    }
    res.json(await r.json());
  } catch {
    const demo = DEMO_LISTINGS.find(l => l.id === parseInt(req.params.id));
    return demo ? res.json(demo) : res.status(404).json({ error: "Not found" });
  }
});

// Buy from MICROSWAP — creates DM room with seller + invoice message
router.post("/buy/:listingId", auth, async (req, res) => {
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
    sats:      priceSats,
  }).returning();

  if (sellerUser) {
    notifyUser(sellerUser.id, {
      type: "message",
      message: { ...msg, sender: buyer },
    });
  }

  res.json({ room, message: { ...msg, sender: buyer }, invoice });
});

export default router;
