import { Router } from "express";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { sendOtpEmail, isEmailConfigured } from "../lib/mailer.js";

const router = Router();

function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function findUser(identifier: string) {
  const id = identifier.trim().toLowerCase().replace(/\s+/g, "");
  const r = await db.execute(sql`
    SELECT * FROM chat_users
    WHERE LOWER(email) = ${id}
       OR LOWER(lightning_address) = ${id}
       OR LOWER(username) = ${id}
       OR REPLACE(REPLACE(LOWER(phone), ' ', ''), '-', '') = ${id}
    LIMIT 1
  `);
  return r.rows[0] as any;
}

/* POST /api/auth/otp/request */
router.post("/request", async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ error: "Identifier required" });

  const user = await findUser(identifier);
  if (!user) return res.status(404).json({ error: "Account not found. Please register first using your Lightning address." });
  if (user.is_blocked) return res.status(403).json({ error: "Account suspended. Contact admin." });

  const code = genCode();
  await db.execute(sql`
    INSERT INTO vbc_otp_codes (user_id, code, expires_at, used)
    VALUES (${user.id}, ${code}, NOW() + INTERVAL '10 minutes', FALSE)
  `);

  const emailConfigured = isEmailConfigured();

  let emailSent = false;
  if (emailConfigured && user.email) {
    emailSent = await sendOtpEmail(user.email, code, user.username);
  }

  const devMode = !emailConfigured;

  if (devMode) {
    return res.json({
      ok: true,
      delivery: "dev-inline",
      devCode: code,
      note: "SMTP not configured — use this code directly.",
    });
  }

  if (!user.email) {
    return res.json({
      ok: true,
      delivery: "dev-inline",
      devCode: code,
      note: "No email on account — use this code directly.",
    });
  }

  if (!emailSent) {
    return res.json({
      ok: true,
      delivery: "dev-inline",
      devCode: code,
      note: "Email sending failed — use this code directly.",
    });
  }

  const maskedEmail = maskEmail(user.email);
  res.json({
    ok: true,
    delivery: "email",
    note: `Code sent to ${maskedEmail}`,
    maskedEmail,
  });
});

/* POST /api/auth/otp/verify */
router.post("/verify", async (req, res) => {
  const { identifier, code } = req.body;
  if (!identifier || !code) return res.status(400).json({ error: "Identifier and code required" });

  const user = await findUser(identifier);
  if (!user) return res.status(404).json({ error: "Account not found" });
  if (user.is_blocked) return res.status(403).json({ error: "Account suspended" });

  const r = await db.execute(sql`
    SELECT * FROM vbc_otp_codes
    WHERE user_id = ${user.id} AND code = ${code} AND used = FALSE AND expires_at > NOW()
    ORDER BY id DESC LIMIT 1
  `);
  const otp = r.rows[0] as any;
  if (!otp) return res.status(400).json({ error: "Invalid or expired code. Request a new one." });

  await db.execute(sql`UPDATE vbc_otp_codes SET used = TRUE WHERE id = ${otp.id}`);
  (req.session as any).userId = user.id;
  res.json({ user });
});

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, 2);
  const stars = "*".repeat(Math.max(2, local.length - 2));
  return `${visible}${stars}@${domain}`;
}

export default router;
