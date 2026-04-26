import nodemailer from "nodemailer";

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user ?? "noreply@volegram.app";

  if (!host || !user || !pass) return null;

  return {
    transport: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    }),
    from,
  };
}

export async function sendOtpEmail(toEmail: string, code: string, username: string): Promise<boolean> {
  const cfg = createTransport();
  if (!cfg) return false;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .card { max-width: 440px; margin: 0 auto; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: #000; padding: 28px 32px; text-align: center; }
    .bolt { font-size: 40px; }
    .brand { color: #F7931A; font-size: 22px; font-weight: 900; margin-top: 8px; letter-spacing: -0.5px; }
    .body { padding: 32px; }
    .greeting { color: #555; font-size: 14px; margin-bottom: 20px; }
    .code-box { background: #000; border-radius: 16px; padding: 24px; text-align: center; margin: 20px 0; }
    .code { color: #F7931A; font-size: 38px; font-weight: 900; letter-spacing: 8px; font-family: 'Courier New', monospace; }
    .code-label { color: rgba(255,255,255,0.4); font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin-top: 6px; }
    .expire { color: #999; font-size: 12px; text-align: center; margin-top: 12px; }
    .warning { background: #fff8ed; border: 1px solid #fde68a; border-radius: 12px; padding: 14px; margin-top: 20px; color: #92400e; font-size: 12px; }
    .footer { padding: 16px 32px; background: #f9f9f9; text-align: center; color: #bbb; font-size: 11px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="bolt">⚡</div>
      <div class="brand">Volegram</div>
    </div>
    <div class="body">
      <p class="greeting">Zdravo ${username}! Primili smo zahtev za prijavljivanje na tvoj Volegram nalog.</p>
      <div class="code-box">
        <div class="code">${code}</div>
        <div class="code-label">Tvoj jednokratni kod</div>
      </div>
      <p class="expire">⏱ Kod važi <strong>10 minuta</strong></p>
      <div class="warning">
        <strong>Bezbednost:</strong> Nikad ne delimo ovaj kod ni sa kim. Ako nisi ti zatražio/la, ignoriši ovaj mejl.
      </div>
    </div>
    <div class="footer">
      Volegram Bitcoin Chat · Zero KYC · Lightning Network
    </div>
  </div>
</body>
</html>
  `.trim();

  try {
    await cfg.transport.sendMail({
      from: `"Volegram ⚡" <${cfg.from}>`,
      to: toEmail,
      subject: `${code} — Volegram kod za prijavljivanje`,
      text: `Tvoj Volegram kod: ${code}\n\nVaži 10 minuta. Nikad ne deluj sa ovim kodom.`,
      html,
    });
    return true;
  } catch (err) {
    console.error("[VBC Mailer] Failed to send email:", err);
    return false;
  }
}

export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}
