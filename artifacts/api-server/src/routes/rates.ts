import { Router } from "express";

const router = Router();
const cache: Record<string, { ts: number; rate: number }> = {};
const TTL = 60_000;

router.get("/", async (req, res) => {
  const currencies = ["eur","usd","gbp","bam","rsd","hrk","chf"];
  const now = Date.now();
  const result: Record<string, number> = {};
  const stale: string[] = [];

  for (const c of currencies) {
    if (cache[c] && now - cache[c].ts < TTL) result[c.toUpperCase()] = cache[c].rate;
    else stale.push(c);
  }

  if (stale.length) {
    try {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${stale.join(",")}`;
      const r = await fetch(url, { headers: { "User-Agent": "Volegram/1.0", "Accept": "application/json" } });
      const j: any = await r.json();
      for (const c of stale) {
        const v = j?.bitcoin?.[c];
        if (typeof v === "number") {
          cache[c] = { ts: now, rate: v };
          result[c.toUpperCase()] = v;
        }
      }
    } catch {/* will try fallback */}

    // Fallback: blockchain.info ticker (USD/EUR/GBP/CHF supported); approximate others via USD pegs
    if (Object.keys(result).length === 0) {
      try {
        const r = await fetch("https://blockchain.info/ticker", { headers: { "User-Agent": "Volegram/1.0" } });
        const j: any = await r.json();
        const usd = j?.USD?.last;
        const eur = j?.EUR?.last;
        const gbp = j?.GBP?.last;
        const chf = j?.CHF?.last;
        const map: Record<string, number|undefined> = {
          USD: usd, EUR: eur, GBP: gbp, CHF: chf,
          BAM: eur ? eur * 1.95583 : undefined,  // BAM is pegged to EUR
          RSD: eur ? eur * 117.5  : undefined,   // approx peg
          HRK: eur ? eur * 7.5345 : undefined,   // legacy peg
        };
        for (const [k, v] of Object.entries(map)) {
          if (typeof v === "number") {
            cache[k.toLowerCase()] = { ts: now, rate: v };
            result[k] = v;
          }
        }
      } catch {/* return empty */}
    }
  }

  res.json({ btc: result, fetchedAt: new Date().toISOString() });
});

export default router;
