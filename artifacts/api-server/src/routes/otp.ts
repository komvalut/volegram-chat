import { Router } from "express";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { sendOtpEmail, isEmailConfigured } from "../lib/mailer.js";

const router = Router();

function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Find a user by email OR lightning_address OR username OR phone
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
  if (!user) return res.status(404).json({ error: "Korisnik nije pronađen. Registruj se prvo putem Lightning adrese." });
  if (user.is_blocked) return res.status(403).json({ error: "Nalog suspendovan" });

  const code = genCode();
  await db.execute(sql`
    INSERT INTO vbc_otp_codes (user_id, code, expires_at, used)
    VALUES (${user.id}, ${code}, NOW() + INTERVAL '10 minutes', FALSE)
  `);

  const emailConfigured = isEmailConfigured();

  // Try to send email if user has email set and SMTP is configured
  let emailSent = false;
  if (emailConfigured && user.email) {
    emailSent = await sendOtpEmail(user.email, code, user.username);
  }

  const devMode = !emailConfigured;

  if (devMode) {
    // No SMTP configured — show code on screen (development mode)
    return res.json({
      ok: true,
      delivery: "dev-inline",
      devCode: code,
      note: "SMTP nije podešen — koristi ovaj kod direktno.",
    });
  }

  if (!user.email) {
    // SMTP configured but user has no email — show code on screen
    return res.json({
      ok: true,
      delivery: "dev-inline",
      devCode: code,
      note: "Nemas email na nalogu — koristi ovaj kod direktno.",
    });
  }

  if (!emailSent) {
    // SMTP configured but sending failed — fallback show code
    return res.json({
      ok: true,
      delivery: "dev-inline",
      devCode: code,
      note: "Slanje emaila nije uspelo — koristi ovaj kod direktno.",
    });
  }

  // Email sent successfully — do NOT return code
  const maskedEmail = maskEmail(user.email);
  res.json({
    ok: true,
    delivery: "email",
    note: `Kod je poslat na ${maskedEmail}`,
    maskedEmail,
  });
});

/* POST /api/auth/otp/verify */
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
  if (!otp) return res.status(400).json({ error: "Neispravan ili istekao kod. Zatraži novi." });

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
