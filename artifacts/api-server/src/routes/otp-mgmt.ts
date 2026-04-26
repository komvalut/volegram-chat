import { Router } from "express";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

const router = Router();

const SERVICES = [
  "Telegram","WhatsApp","Signal","Viber","Instagram","Facebook","Twitter","TikTok",
  "Google","Apple","Microsoft","Amazon","Netflix","Spotify","Uber","Airbnb","Any"
];

function adminAuth(req: any, res: any, next: any) {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  db.execute(sql`SELECT is_admin FROM chat_users WHERE id = ${userId}`).then(r => {
    if (!(r.rows[0] as any)?.is_admin) return res.status(403).json({ error: "Forbidden" });
    next();
  }).catch(() => res.status(500).json({ error: "DB error" }));
}

// ── Available services list ──────────────────────────────────────
router.get("/services", (_req, res) => {
  res.json({ services: SERVICES });
});

// ── Countries admin CRUD ─────────────────────────────────────────
router.get("/countries", adminAuth, async (_req, res) => {
  const r = await db.execute(sql`SELECT * FROM otp_countries ORDER BY sort_order ASC, country_name ASC`);
  res.json({ countries: r.rows });
});

router.post("/countries", adminAuth, async (req, res) => {
  const { country_code, country_name, phone_prefix, price_sats, phone_number, notes, active, sort_order } = req.body;
  if (!country_code || !country_name || !phone_prefix)
    return res.status(400).json({ error: "country_code, country_name and phone_prefix are required" });
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

router.delete("/countries/:id", adminAuth, async (req, res) => {
  await db.execute(sql`DELETE FROM otp_countries WHERE id = ${req.params.id}`);
  res.json({ ok: true });
});

// ── Public: active countries ─────────────────────────────────────
router.get("/public", async (_req, res) => {
  const r = await db.execute(sql`
    SELECT id, country_code, country_name, phone_prefix, price_sats, sort_order
    FROM otp_countries WHERE active = true
    ORDER BY sort_order ASC, country_name ASC
  `);
  res.json({ countries: r.rows });
});

// ── API Providers (SMSPool, SMSHero, Airalo, etc.) ───────────────
// GET /api/otp-mgmt/providers — admin: list all providers
router.get("/providers", adminAuth, async (_req, res) => {
  try {
    const r = await db.execute(sql`
      SELECT id, provider, enabled, config,
             CASE WHEN api_key IS NOT NULL THEN true ELSE false END AS has_key,
             updated_at
      FROM vbc_api_providers ORDER BY provider ASC
    `);
    res.json({ providers: r.rows });
  } catch { res.json({ providers: [] }); }
});

// POST /api/otp-mgmt/providers — admin: create or update a provider
router.post("/providers", adminAuth, async (req, res) => {
  const { provider, api_key, api_secret, enabled, config } = req.body;
  if (!provider) return res.status(400).json({ error: "provider is required" });
  try {
    await db.execute(sql`
      INSERT INTO vbc_api_providers (provider, api_key, api_secret, enabled, config, updated_at)
      VALUES (${provider}, ${api_key ?? null}, ${api_secret ?? null},
              ${enabled === true}, ${JSON.stringify(config ?? {})}, NOW())
      ON CONFLICT (provider)
      DO UPDATE SET
        api_key    = COALESCE(${api_key ?? null}, vbc_api_providers.api_key),
        api_secret = ${api_secret ?? null},
        enabled    = ${enabled === true},
        config     = ${JSON.stringify(config ?? {})},
        updated_at = NOW()
    `);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/otp-mgmt/providers/:provider/test — admin: test API connectivity
router.post("/providers/:provider/test", adminAuth, async (req, res) => {
  const { provider } = req.params;
  try {
    const pr = await db.execute(sql`SELECT * FROM vbc_api_providers WHERE provider = ${provider} LIMIT 1`);
    const p = pr.rows[0] as any;
    if (!p) return res.status(404).json({ error: "Provider not configured" });

    if (provider === "smspool") {
      const r = await fetch(`https://api.smspool.net/request/balance?key=${p.api_key}`);
      const d = await r.json() as any;
      return res.json({ ok: true, balance: d.balance ?? d, provider });
    }
    if (provider === "smshero") {
      const r = await fetch(`https://smshero.io/api/v3/getBalance?apiKey=${p.api_key}`);
      const d = await r.json() as any;
      return res.json({ ok: true, balance: d.balance ?? d, provider });
    }
    if (provider === "airalo") {
      const cfg = p.config ?? {};
      const r = await fetch("https://partners-api.airalo.com/v2/balance", {
        headers: { Authorization: `Bearer ${p.api_key}`, Accept: "application/json" }
      });
      const d = await r.json() as any;
      return res.json({ ok: r.ok, data: d, provider });
    }
    return res.json({ ok: true, message: "Generic provider — no test endpoint defined", provider });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Helper: try to auto-fulfill via SMS API ───────────────────────
async function tryAutoFulfill(orderId: number, countryCode: string, serviceName: string): Promise<{ code: string; source: string } | null> {
  try {
    const pr = await db.execute(sql`SELECT * FROM vbc_api_providers WHERE enabled = true AND provider IN ('smspool','smshero') LIMIT 1`);
    if (!pr.rows.length) return null;
    const p = pr.rows[0] as any;

    if (p.provider === "smspool") {
      const serviceSlug = serviceName.toLowerCase() === "any" ? "telegram" : serviceName.toLowerCase();
      const buyRes = await fetch(
        `https://api.smspool.net/purchase/sms?key=${p.api_key}&country=${countryCode.toLowerCase()}&service=${serviceSlug}`,
        { method: "POST" }
      );
      const buyData = await buyRes.json() as any;
      if (buyData.number && buyData.order_id) {
        for (let i = 0; i < 18; i++) {
          await new Promise(r => setTimeout(r, 10000));
          const codeRes = await fetch(
            `https://api.smspool.net/sms/check?key=${p.api_key}&orderid=${buyData.order_id}`
          );
          const codeData = await codeRes.json() as any;
          if (codeData.sms) return { code: codeData.sms, source: "smspool" };
        }
      }
    }

    if (p.provider === "smshero") {
      const serviceSlug = serviceName.toLowerCase() === "any" ? "telegram" : serviceName.toLowerCase();
      const buyRes = await fetch(
        `https://smshero.io/api/v3/getNumber?apiKey=${p.api_key}&countryCode=${countryCode.toUpperCase()}&service=${serviceSlug}`
      );
      const buyData = await buyRes.json() as any;
      if (buyData.number && buyData.activationId) {
        for (let i = 0; i < 18; i++) {
          await new Promise(r => setTimeout(r, 10000));
          const codeRes = await fetch(
            `https://smshero.io/api/v3/getActivationStatus?apiKey=${p.api_key}&id=${buyData.activationId}`
          );
          const codeData = await codeRes.json() as any;
          if (codeData.code) return { code: codeData.code, source: "smshero" };
        }
      }
    }
  } catch {}
  return null;
}

// ── User: buy an OTP slot ─────────────────────────────────────────
router.post("/buy/:id", async (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const countryId = parseInt(req.params.id);
  const serviceName = (req.body?.service ?? "Any").trim() || "Any";

  const cr = await db.execute(sql`SELECT * FROM otp_countries WHERE id = ${countryId} AND active = true LIMIT 1`);
  const country = cr.rows[0] as any;
  if (!country) return res.status(404).json({ error: "Country not found" });

  const ur = await db.execute(sql`SELECT sats_balance FROM chat_users WHERE id = ${userId} LIMIT 1`);
  const user = ur.rows[0] as any;
  if (!user || user.sats_balance < country.price_sats)
    return res.status(400).json({ error: `Insufficient balance. Need ${country.price_sats} sats.` });

  await db.execute(sql`UPDATE chat_users SET sats_balance = sats_balance - ${country.price_sats} WHERE id = ${userId}`);
  const or = await db.execute(sql`
    INSERT INTO otp_orders (user_id, country_id, price_sats, service_name, status, created_at)
    VALUES (${userId}, ${countryId}, ${country.price_sats}, ${serviceName}, 'pending', NOW())
    RETURNING *
  `);
  const order = or.rows[0] as any;

  res.json({ ok: true, order, auto: false });

  // Try auto-fulfill in background (non-blocking)
  tryAutoFulfill(order.id, country.country_code, serviceName).then(async result => {
    if (result) {
      await db.execute(sql`
        UPDATE otp_orders SET status = 'delivered', otp_code = ${result.code}, delivered_at = NOW()
        WHERE id = ${order.id}
      `);
    }
  }).catch(() => {});
});

// ── User: my OTP orders ───────────────────────────────────────────
router.get("/orders", async (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const r = await db.execute(sql`
    SELECT o.id, o.price_sats, o.status, o.otp_code, o.created_at, o.delivered_at,
           o.refunded_at, o.refund_reason, o.service_name,
           c.country_code, c.country_name, c.phone_prefix
    FROM otp_orders o
    JOIN otp_countries c ON c.id = o.country_id
    WHERE o.user_id = ${userId}
    ORDER BY o.created_at DESC
    LIMIT 50
  `);
  res.json({ orders: r.rows });
});

// ── User: request refund ──────────────────────────────────────────
// Allowed only if: status = 'pending', no code, order > 30 min old
router.post("/orders/:id/refund", async (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const orderId = parseInt(req.params.id);
  const or = await db.execute(sql`
    SELECT * FROM otp_orders WHERE id = ${orderId} AND user_id = ${userId} LIMIT 1
  `);
  const order = or.rows[0] as any;
  if (!order) return res.status(404).json({ error: "Order not found" });

  if (order.status === "refunded") return res.status(400).json({ error: "Already refunded" });
  if (order.status === "delivered" && order.otp_code)
    return res.status(400).json({ error: "Code was already delivered — cannot refund" });

  const ageMinutes = (Date.now() - new Date(order.created_at).getTime()) / 60000;
  if (ageMinutes < 30) {
    const remaining = Math.ceil(30 - ageMinutes);
    return res.status(400).json({ error: `Please wait ${remaining} more minute(s) before requesting a refund. Admin has until 30 minutes to deliver your code.` });
  }

  await db.execute(sql`UPDATE chat_users SET sats_balance = sats_balance + ${order.price_sats} WHERE id = ${userId}`);
  await db.execute(sql`
    UPDATE otp_orders SET status = 'refunded', refunded_at = NOW(),
      refund_reason = 'No OTP code delivered within 30 minutes — automatic refund'
    WHERE id = ${orderId}
  `);
  res.json({ ok: true, refunded_sats: order.price_sats });
});

// ── Admin: all OTP orders ─────────────────────────────────────────
router.get("/admin/orders", adminAuth, async (_req, res) => {
  const r = await db.execute(sql`
    SELECT o.*, c.country_name, c.country_code, c.phone_prefix, c.phone_number,
           u.username AS buyer_username
    FROM otp_orders o
    JOIN otp_countries c ON c.id = o.country_id
    JOIN chat_users u ON u.id = o.user_id
    ORDER BY o.created_at DESC
    LIMIT 500
  `);
  res.json({ orders: r.rows });
});

// ── Admin: deliver OTP code ───────────────────────────────────────
router.post("/admin/orders/:id/deliver", adminAuth, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "OTP code required" });
  await db.execute(sql`
    UPDATE otp_orders SET status = 'delivered', otp_code = ${code}, delivered_at = NOW()
    WHERE id = ${parseInt(req.params.id)}
  `);
  res.json({ ok: true });
});

// ── Admin: manual refund for an order ────────────────────────────
router.post("/admin/orders/:id/refund", adminAuth, async (req, res) => {
  const { reason } = req.body;
  const orderId = parseInt(req.params.id);
  const or = await db.execute(sql`SELECT * FROM otp_orders WHERE id = ${orderId} LIMIT 1`);
  const order = or.rows[0] as any;
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.status === "refunded") return res.status(400).json({ error: "Already refunded" });
  await db.execute(sql`UPDATE chat_users SET sats_balance = sats_balance + ${order.price_sats} WHERE id = ${order.user_id}`);
  await db.execute(sql`
    UPDATE otp_orders SET status = 'refunded', refunded_at = NOW(),
      refund_reason = ${reason ?? 'Admin issued refund'}
    WHERE id = ${orderId}
  `);
  res.json({ ok: true });
});

export default router;
