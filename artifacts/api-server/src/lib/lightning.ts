const SBP_KEY = process.env.SBP_API_KEY ?? "";
const BASE    = "https://api.swiss-bitcoin-pay.ch";

export async function createInvoice(sats: number, desc: string) {
  const r = await fetch(`${BASE}/checkout`, {
    method: "POST",
    headers: { "api-key": SBP_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: sats, currency: "SAT", title: desc, delay: 1440 }),
  });
  if (!r.ok) throw new Error(`SBP error ${r.status}`);
  const d = await r.json();
  return { pr: d.pr as string, checkoutId: d.id as string };
}

export async function checkInvoice(checkoutId: string): Promise<boolean> {
  const r = await fetch(`${BASE}/checkout/${checkoutId}`, {
    headers: { "api-key": SBP_KEY },
  });
  if (!r.ok) return false;
  const d = await r.json();
  return d.isPaid === true;
}
