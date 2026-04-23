import { Router } from "express";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { createInvoice } from "../lib/lightning.js";
import { notifyRoom } from "../lib/ws.js";

const router = Router();

function auth(req: any, res: any, next: any) {
  if (!(req.session as any).userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// POST /api/splits — create split payment
router.post("/", auth, async (req, res) => {
  const creatorId = (req.session as any).userId;
  const { roomId, totalSats, description, participants } = req.body;
  // participants: array of usernames (including creator optionally)

  if (!totalSats || !roomId || !participants?.length)
    return res.status(400).json({ error: "Missing fields" });

  const count   = participants.length;
  const perSats = Math.ceil(totalSats / count);

  // Create split record
  const [split] = await db.execute(sql`
    INSERT INTO vbc_splits (room_id, creator_id, total_sats, per_sats, description, participant_count, created_at)
    VALUES (${roomId}, ${creatorId}, ${totalSats}, ${perSats}, ${description ?? ""}, ${count}, NOW())
    RETURNING *
  `);
  const splitId = (split as any).id;

  // Create individual invoices for each participant
  const parts = [];
  for (const username of participants) {
    const [user] = await db.execute(sql`
      SELECT id FROM chat_users WHERE username = ${username} LIMIT 1
    `);
    const userId = (user as any)?.id ?? null;
    const invoice = await createInvoice(perSats, `${description ?? "Split"} — ${perSats.toLocaleString()} sats`);
    const [part] = await db.execute(sql`
      INSERT INTO vbc_split_participants (split_id, user_id, username, invoice_pr, sbp_checkout_id, paid, created_at)
      VALUES (${splitId}, ${userId}, ${username}, ${invoice.pr}, ${invoice.checkoutId}, false, NOW())
      RETURNING *
    `);
    parts.push({ ...part, invoicePr: invoice.pr });
  }

  const result = { splitId, totalSats, perSats, description, participants: parts };
  notifyRoom(roomId, { type: "split_created", split: result });
  res.json(result);
});

// GET /api/splits/:id — get split status
router.get("/:id", auth, async (req, res) => {
  const [split] = await db.execute(sql`SELECT * FROM vbc_splits WHERE id = ${parseInt(req.params.id)}`);
  if (!split) return res.status(404).json({ error: "Not found" });
  const parts   = await db.execute(sql`SELECT * FROM vbc_split_participants WHERE split_id = ${parseInt(req.params.id)}`);
  res.json({ ...split, participants: parts });
});

// POST /api/splits/:id/check — check payment for a participant
router.post("/:id/check/:participantId", auth, async (req, res) => {
  const { checkInvoice } = await import("../lib/lightning.js");
  const pId = parseInt(req.params.participantId);
  const [part] = await db.execute(sql`SELECT * FROM vbc_split_participants WHERE id = ${pId}`);
  if (!part || (part as any).paid) return res.json({ paid: (part as any)?.paid ?? false });

  const paid = await checkInvoice((part as any).sbp_checkout_id);
  if (paid) {
    await db.execute(sql`UPDATE vbc_split_participants SET paid = true WHERE id = ${pId}`);
    // Check if all paid
    const [{ all_paid }] = await db.execute(sql`
      SELECT (COUNT(*) FILTER (WHERE NOT paid) = 0) as all_paid
      FROM vbc_split_participants WHERE split_id = ${(part as any).split_id}
    `) as any;
    if (all_paid) {
      await db.execute(sql`UPDATE vbc_splits SET completed = true WHERE id = ${(part as any).split_id}`);
    }
  }
  res.json({ paid });
});

export default router;
