const SBP_KEY = process.env.SBP_API_KEY ?? "";
const BASE    = "https://api.swiss-bitcoin-pay.ch";

export function isSbpConfigured(): boolean {
  return SBP_KEY.length > 10;
}

export async function createInvoice(sats: number, desc: string) {
  if (!isSbpConfigured()) {
    throw new Error("SBP_API_KEY nije podešen. Kontaktiraj admina da aktivira Lightning depozit.");
  }
  const r = await fetch(`${BASE}/checkout`, {
    method: "POST",
    headers: { "api-key": SBP_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: sats, currency: "SAT", title: desc, delay: 1440 }),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`Swiss Bitcoin Pay greška ${r.status}${body ? ": " + body.slice(0, 100) : ""}`);
  }
  const d = await r.json();
  if (!d.pr) throw new Error("SBP nije vratio Lightning fakturu (pr). Provjeri API ključ.");
  return { pr: d.pr as string, checkoutId: d.id as string };
}

export async function checkInvoice(checkoutId: string): Promise<boolean> {
  if (!isSbpConfigured()) return false;
  try {
    const r = await fetch(`${BASE}/checkout/${checkoutId}`, {
      headers: { "api-key": SBP_KEY },
    });
    if (!r.ok) return false;
    const d = await r.json();
    return d.isPaid === true;
  } catch {
    return false;
  }
}
