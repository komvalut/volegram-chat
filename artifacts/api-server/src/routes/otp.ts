import { Router } from "express";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

const router = Router();

function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Find a user by email OR lightning_address OR username
async function findUser(identifier: string) {
  const id = identifier.trim().toLowerCase();
  const r = await db.execute(sql`
    SELECT * FROM chat_users
    WHERE LOWER(email) = ${id} OR LOWER(lightning_address) = ${id} OR LOWER(username) = ${id}
    LIMIT 1
  `);
  return r.rows[0] as any;
}

/* Request OTP — generate code, store; return code in dev (no email service yet) */
router.post("/request", async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ error: "Identifier required" });

  const user = await findUser(identifier);
  if (!user) return res.status(404).json({ error: "User not found. Sign up via Lightning Address first." });
  if (user.is_blocked) return res.status(403).json({ error: "Account suspended" });

  const code = genCode();
  await db.execute(sql`
    INSERT INTO vbc_otp_codes (user_id, code, expires_at, used)
    VALUES (${user.id}, ${code}, NOW() + INTERVAL '10 minutes', FALSE)
  `);

  // In dev (no email service): return code in response so user can self-verify.
  // In production: send via email/SMS instead and remove devCode from response.
  const devMode = !process.env.SMTP_HOST && !process.env.TWILIO_SID;
  res.json({
    ok: true,
    delivery: devMode ? "dev-inline" : "email",
    devCode: devMode ? code : undefined,
    note: devMode ? "Email service not configured — use this code." : `Code sent to ${user.email ?? user.lightning_address}`,
  });
});

/* Verify OTP — log in if valid */
router.post("/verify", async (req, res) => {
  const { identifier, code } = req.body;
  if (!identifier || !code) return res.status(400).json({ error: "Identifier and code required" });

  const user = await findUser(identifier);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.is_blocked) return res.status(403).json({ error: "Account suspended" });

  const r = await db.execute(sql`
    SELECT * FROM vbc_otp_codes
    WHERE user_id = ${user.id} AND code = ${code} AND used = FALSE AND expires_at > NOW()
    ORDER BY id DESC LIMIT 1
  `);
  const otp = r.rows[0] as any;
  if (!otp) return res.status(400).json({ error: "Invalid or expired code" });

  await db.execute(sql`UPDATE vbc_otp_codes SET used = TRUE WHERE id = ${otp.id}`);
  (req.session as any).userId = user.id;
  res.json({ user });
});

export default router;
