import { Router } from "express";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

const router = Router();

function adminAuth(req: any, res: any, next: any) {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  db.execute(sql`SELECT is_admin FROM chat_users WHERE id = ${userId}`).then(r => {
    if (!(r.rows[0] as any)?.is_admin) return res.status(403).json({ error: "Forbidden" });
    next();
  }).catch(() => res.status(500).json({ error: "DB error" }));
}

// GET /api/otp-mgmt/countries — admin: list all managed country/number entries
router.get("/countries", adminAuth, async (req, res) => {
  const r = await db.execute(sql`SELECT * FROM otp_countries ORDER BY sort_order ASC, country_name ASC`);
  res.json({ countries: r.rows });
});

// POST /api/otp-mgmt/countries — admin: add a new entry
router.post("/countries", adminAuth, async (req, res) => {
  const { country_code, country_name, phone_prefix, price_sats, phone_number, notes, active, sort_order } = req.body;
  if (!country_code || !country_name || !phone_prefix) {
    return res.status(400).json({ error: "country_code, country_name and phone_prefix are required" });
  }
  try {
    const r = await db.execute(sql`
      INSERT INTO otp_countries
        (country_code, country_name, phone_prefix, price_sats, phone_number, notes, active, sort_order, created_at)
      VALUES
        (${country_code.toUpperCase()}, ${country_name}, ${phone_prefix},
         ${price_sats ?? 0}, ${phone_number ?? null}, ${notes ?? null},
         ${active !== false}, ${sort_order ?? 0}, NOW())
      RETURNING id
    `);
    res.json({ ok: true, id: (r.rows[0] as any).id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/otp-mgmt/countries/:id — admin: update entry
router.patch("/countries/:id", adminAuth, async (req, res) => {
  const { country_code, country_name, phone_prefix, price_sats, phone_number, notes, active, sort_order } = req.body;
  await db.execute(sql`
    UPDATE otp_countries SET
      country_code = COALESCE(${country_code?.toUpperCase() ?? null}, country_code),
      country_name = COALESCE(${country_name ?? null}, country_name),
      phone_prefix = COALESCE(${phone_prefix ?? null}, phone_prefix),
      price_sats   = COALESCE(${price_sats ?? null}, price_sats),
      phone_number = ${phone_number ?? null},
      notes        = ${notes ?? null},
      active       = COALESCE(${active ?? null}, active),
      sort_order   = COALESCE(${sort_order ?? null}, sort_order)
    WHERE id = ${req.params.id}
  `);
  res.json({ ok: true });
});

// DELETE /api/otp-mgmt/countries/:id — admin: remove entry
router.delete("/countries/:id", adminAuth, async (req, res) => {
  await db.execute(sql`DELETE FROM otp_countries WHERE id = ${req.params.id}`);
  res.json({ ok: true });
});

// GET /api/otp-mgmt/public — public: return active countries with pricing (for login page)
router.get("/public", async (req, res) => {
  const r = await db.execute(sql`
    SELECT country_code, country_name, phone_prefix, price_sats, sort_order
    FROM otp_countries WHERE active = true
    ORDER BY sort_order ASC, country_name ASC
  `);
  res.json({ countries: r.rows });
});

export default router;
