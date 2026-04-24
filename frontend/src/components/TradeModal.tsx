import { useState } from "react";
import { ArrowLeftRight, X, Zap, Banknote } from "lucide-react";

const PRIVACY_COINS = [
  "ARRR", "XMR",  "ZEC",  "DASH", "FIRO", "BEAM",
  "GRIN", "OXEN", "PIVX", "ZANO", "SCRT", "DUSK",
  "NAV",  "PART", "ROSE", "MINA",
];
const OTHER_COINS = ["BTC", "ETH", "ADA", "SOL", "USDT", "USDC", "DOT", "DOGE"];

const FIAT_METHODS = [
  "Revolut", "Wise", "SEPA", "PayPal", "Skrill",
  "Cash", "Paysafe", "Crypto.com Pay", "Other",
];

// direction: "buy_crypto"  → I pay Lightning, I get crypto
//            "buy_sats"    → I pay fiat, I get BTC/sats
type Direction = "buy_crypto" | "buy_sats";

export default function TradeModal({
  roomId, onClose, onSent,
}: { roomId: number; onClose: () => void; onSent: (trade: any) => void }) {
  const [dir, setDir]               = useState<Direction>("buy_crypto");
  const [sellerUsername, setSeller] = useState("");
  const [sats, setSats]             = useState("");
  const [asset, setAsset]           = useState("ARRR");
  const [assetAmount, setAmount]    = useState("");
  const [fiatMethod, setFiatM]      = useState("Revolut");
  const [fiatAmount, setFiatA]      = useState("");
  const [fiatCurrency, setFiatC]    = useState("EUR");
  const [loading, setLoading]       = useState(false);
  const [err, setErr]               = useState("");

  const BASE = import.meta.env.VITE_API_URL ?? "";

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (!sellerUsername.trim() || !sats) { setErr("Fill in all fields"); return; }
    if (dir === "buy_crypto" && !assetAmount) { setErr("Enter amount to receive"); return; }
    if (dir === "buy_sats"   && !fiatAmount)  { setErr("Enter fiat amount"); return; }

    setLoading(true);
    try {
      const body: any = {
        roomId,
        sellerUsername: sellerUsername.replace("@","").trim(),
        sats:      parseInt(sats),
        tradeType: dir === "buy_sats" ? "fiat" : "lightning",
        asset:       dir === "buy_sats" ? "BTC/Lightning" : asset.toUpperCase(),
        assetAmount: dir === "buy_sats"
          ? `${fiatAmount} ${fiatCurrency} via ${fiatMethod}`
          : assetAmount.trim(),
      };
      const r = await fetch(`${BASE}/api/trades`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error ?? "Failed"); }
      const { trade } = await r.json();
      onSent(trade);
      onClose();
    } catch (e: any) {
      setErr(e.message ?? "Failed — try again");
    } finally { setLoading(false); }
  };

  const isPrivacy = PRIVACY_COINS.includes(asset);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#080808] border border-white/20 w-full max-w-sm p-5 relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-neutral-600 hover:text-white"><X size={16}/></button>

        <div className="flex items-center gap-2 mb-4">
          <ArrowLeftRight size={16} className="text-white"/>
          <h2 className="font-black uppercase tracking-widest text-sm text-white">New P2P Trade</h2>
        </div>

        {/* Direction toggle */}
        <div className="grid grid-cols-2 gap-1 mb-4 border border-[#1a1a1a] p-1">
          <button type="button" onClick={() => setDir("buy_crypto")}
            className={`flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-wider transition-colors
              ${dir === "buy_crypto" ? "bg-white text-black" : "text-neutral-600 hover:text-white"}`}>
            <Zap size={11}/> Pay Lightning → Get Crypto
          </button>
          <button type="button" onClick={() => setDir("buy_sats")}
            className={`flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-wider transition-colors
              ${dir === "buy_sats" ? "bg-white text-black" : "text-neutral-600 hover:text-white"}`}>
            <Banknote size={11}/> Pay Fiat → Get BTC ⚡
          </button>
        </div>

        <form onSubmit={create} className="space-y-3">

          {/* Mode explanation */}
          {dir === "buy_crypto" ? (
            <p className="text-[10px] text-neutral-600 bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-2">
              ⚡ You pay Lightning → sats go to escrow → seller sends crypto → you confirm receipt → escrow is released.
            </p>
          ) : (
            <p className="text-[10px] text-neutral-600 bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-2">
              💶 You send fiat (Revolut, SEPA…) → seller confirms → sends sats/BTC to your Lightning address.
            </p>
          )}

          {/* Counterparty */}
          <div>
            <label className="block text-[10px] text-neutral-600 uppercase tracking-widest mb-1">
              {dir === "buy_crypto" ? "Seller Username" : "BTC Seller Username"}
            </label>
            <input value={sellerUsername} onChange={e => setSeller(e.target.value)}
              placeholder="@satoshi" autoComplete="off"
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white text-sm px-3 py-2 outline-none focus:border-white font-mono"/>
          </div>

          {/* ── BUY CRYPTO: pay Lightning ── */}
          {dir === "buy_crypto" && (<>
            <div>
              <label className="block text-[10px] text-neutral-600 uppercase tracking-widest mb-1">You Pay (sats → escrow)</label>
              <input value={sats} onChange={e => setSats(e.target.value)} type="number" min="1" placeholder="50000"
                className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white text-sm px-3 py-2 outline-none focus:border-white font-mono"/>
            </div>

            <div>
              <label className="block text-[10px] text-neutral-600 uppercase tracking-widest mb-1.5">You Receive</label>
              <div className="mb-2">
                <p className="text-[8px] text-purple-500 uppercase tracking-widest font-bold mb-1">🏴‍☠️ Privacy Coins</p>
                <div className="grid grid-cols-4 gap-1">
                  {PRIVACY_COINS.map(c => (
                    <button key={c} type="button" onClick={() => setAsset(c)}
                      className={`text-[9px] py-1 border font-bold transition-colors
                        ${asset === c ? "border-purple-500 text-purple-300 bg-purple-900/20" : "border-purple-900/30 text-neutral-600 hover:border-purple-600 hover:text-purple-400"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-2">
                <p className="text-[8px] text-neutral-700 uppercase tracking-widest font-bold mb-1">Other</p>
                <div className="grid grid-cols-4 gap-1">
                  {OTHER_COINS.map(c => (
                    <button key={c} type="button" onClick={() => setAsset(c)}
                      className={`text-[9px] py-1 border font-bold transition-colors
                        ${asset === c ? "border-white text-white bg-white/5" : "border-[#1a1a1a] text-neutral-600 hover:border-white/25"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={asset} onChange={e => setAsset(e.target.value.toUpperCase())}
                  placeholder="Custom ticker"
                  className={`bg-[#0a0a0a] border text-white text-xs px-2 py-1.5 outline-none font-mono uppercase
                    ${isPrivacy ? "border-purple-900/40 focus:border-purple-500" : "border-[#1a1a1a] focus:border-white"}`}/>
                <input value={assetAmount} onChange={e => setAmount(e.target.value)} placeholder="Amount (e.g. 1000)"
                  className="bg-[#0a0a0a] border border-[#1a1a1a] text-white text-xs px-2 py-1.5 outline-none focus:border-white font-mono"/>
              </div>
            </div>

            {sats && assetAmount && asset && (() => {
              const s   = parseInt(sats) || 0;
              const fee = Math.ceil(s * 0.01);
              return (
                <div className={`border px-3 py-2 text-[10px] ${isPrivacy ? "bg-purple-900/10 border-purple-900/40 text-purple-300" : "bg-white/5 border-white/10 text-neutral-400"}`}>
                  {isPrivacy && <p className="font-black mb-0.5">🏴‍☠️ Privacy coin — untraceable</p>}
                  <p>⚡ {s.toLocaleString()} sats → {assetAmount} {asset}</p>
                  <div className="flex gap-3 mt-1.5 pt-1.5 border-t border-white/5 text-[9px] text-neutral-600">
                    <span>Fee 1%: {fee.toLocaleString()} ⚡</span>
                    <span className="ml-auto">Seller gets: {(s - fee).toLocaleString()} ⚡</span>
                  </div>
                </div>
              );
            })()}
          </>)}

          {/* ── BUY SATS: pay fiat ── */}
          {dir === "buy_sats" && (<>
            <div>
              <label className="block text-[10px] text-neutral-600 uppercase tracking-widest mb-1">You Want (sats)</label>
              <div className="flex gap-2 items-center">
                <input value={sats} onChange={e => setSats(e.target.value)} type="number" min="1" placeholder="100000"
                  className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] text-white text-sm px-3 py-2 outline-none focus:border-white font-mono"/>
                <span className="text-[10px] text-neutral-600 shrink-0">sats ⚡</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-neutral-600 uppercase tracking-widest mb-1">You Pay (fiat)</label>
              <div className="flex gap-2">
                <input value={fiatAmount} onChange={e => setFiatA(e.target.value)} placeholder="5" type="number" min="0.01" step="0.01"
                  className="w-20 bg-[#0a0a0a] border border-[#1a1a1a] text-white text-sm px-2 py-2 outline-none focus:border-white font-mono"/>
                <select value={fiatCurrency} onChange={e => setFiatC(e.target.value)}
                  className="bg-[#0a0a0a] border border-[#1a1a1a] text-white text-xs px-2 py-2 outline-none focus:border-white">
                  {["EUR","USD","RSD","GBP","CHF","SEK","PLN","CZK","HRK","BAM","RON","HUF"].map(c =>
                    <option key={c} value={c}>{c}</option>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-neutral-600 uppercase tracking-widest mb-1.5">Payment Method</label>
              <div className="grid grid-cols-3 gap-1">
                {FIAT_METHODS.map(m => (
                  <button key={m} type="button" onClick={() => setFiatM(m)}
                    className={`text-[9px] py-1.5 border font-bold transition-colors
                      ${fiatMethod === m ? "border-white text-white bg-white/5" : "border-[#1a1a1a] text-neutral-600 hover:border-white/25"}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {sats && fiatAmount && (
              <div className="bg-blue-900/10 border border-blue-900/40 px-3 py-2 text-[10px] text-blue-300">
                <p className="font-black mb-0.5">💶 Fiat → ⚡ BTC/Lightning</p>
                {fiatAmount} {fiatCurrency} via {fiatMethod} → {parseInt(sats).toLocaleString()} sats
              </div>
            )}
          </>)}

          {err && <p className="text-xs text-red-500">{err}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-white text-black font-black uppercase tracking-widest text-sm py-3 hover:bg-neutral-200 disabled:opacity-40 transition-colors">
            {loading ? "CREATING TRADE…" : dir === "buy_crypto" ? "CREATE TRADE ⚡" : "CREATE FIAT TRADE 💶"}
          </button>
        </form>
      </div>
    </div>
  );
}
