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

function auth(req: any, res: any, next: any) {
  if (!(req.session as any).userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// GET /api/referral/admin/list  — admin: list all codes
router.get("/admin/list", adminAuth, async (req, res) => {
  const r = await db.execute(sql`
    SELECT rc.*, cu.username as creator_username,
      (SELECT COUNT(*) FROM referral_uses ru WHERE ru.code_id = rc.id) as use_count
    FROM referral_codes rc
    LEFT JOIN chat_users cu ON cu.id = rc.created_by
    ORDER BY rc.created_at DESC
  `);
  res.json({ codes: r.rows });
});

// POST /api/referral/admin/create — admin: create a new referral code
router.post("/admin/create", adminAuth, async (req, res) => {
  const userId = (req.session as any).userId;
  const { code, bonus_sats, max_uses, description, expires_at } = req.body;
  if (!code || !code.trim()) return res.status(400).json({ error: "Code is required" });

  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  if (clean.length < 3 || clean.length > 30) return res.status(400).json({ error: "Code must be 3-30 alphanumeric chars" });

  try {
    await db.execute(sql`
      INSERT INTO referral_codes (code, bonus_sats, max_uses, description, expires_at, created_by, created_at, active)
      VALUES (
        ${clean},
        ${bonus_sats ?? 0},
        ${max_uses ?? null},
        ${description ?? null},
        ${expires_at ?? null},
        ${userId},
        NOW(),
        true
      )
    `);
    res.json({ ok: true, code: clean });
  } catch (e: any) {
    if (e.message?.includes("unique")) return res.status(409).json({ error: "Code already exists" });
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/referral/admin/:id — admin: update a code
router.patch("/admin/:id", adminAuth, async (req, res) => {
  const { id } = req.params;
  const { bonus_sats, max_uses, description, expires_at, active } = req.body;
  await db.execute(sql`
    UPDATE referral_codes SET
      bonus_sats  = COALESCE(${bonus_sats ?? null}, bonus_sats),
      max_uses    = ${max_uses ?? null},
      description = ${description ?? null},
      expires_at  = ${expires_at ?? null},
      active      = COALESCE(${active ?? null}, active)
    WHERE id = ${id}
  `);
  res.json({ ok: true });
});

// DELETE /api/referral/admin/:id — admin: delete a code
router.delete("/admin/:id", adminAuth, async (req, res) => {
  await db.execute(sql`DELETE FROM referral_codes WHERE id = ${req.params.id}`);
  res.json({ ok: true });
});

// POST /api/referral/redeem — user redeems a referral code
router.post("/redeem", auth, async (req, res) => {
  const userId = (req.session as any).userId;
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Code required" });

  const codeR = await db.execute(sql`
    SELECT * FROM referral_codes
    WHERE UPPER(code) = UPPER(${code}) AND active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1
  `);
  const codeRow = codeR.rows[0] as any;
  if (!codeRow) return res.status(404).json({ error: "Invalid or expired code" });

  if (codeRow.max_uses !== null) {
    const useCount = await db.execute(sql`SELECT COUNT(*) as c FROM referral_uses WHERE code_id = ${codeRow.id}`);
    if ((useCount.rows[0] as any).c >= codeRow.max_uses) {
      return res.status(400).json({ error: "This code has reached its maximum uses" });
    }
  }

  const alreadyUsed = await db.execute(sql`
    SELECT id FROM referral_uses WHERE code_id = ${codeRow.id} AND user_id = ${userId} LIMIT 1
  `);
  if (alreadyUsed.rows.length > 0) return res.status(409).json({ error: "You already used this code" });

  await db.execute(sql`INSERT INTO referral_uses (code_id, user_id, created_at) VALUES (${codeRow.id}, ${userId}, NOW())`);

  if (codeRow.bonus_sats > 0) {
    await db.execute(sql`UPDATE chat_users SET sats_balance = sats_balance + ${codeRow.bonus_sats} WHERE id = ${userId}`);
  }

  res.json({ ok: true, bonus_sats: codeRow.bonus_sats, message: `Code applied! +${codeRow.bonus_sats} sats credited.` });
});

export default router;
