import { useState } from "react";
import { ArrowLeftRight, X } from "lucide-react";

const POPULAR = ["ADA", "ETH", "USDT", "SOL", "XMR", "BTC", "DOGE", "DOT"];

export default function TradeModal({
  roomId, onClose, onSent,
}: { roomId: number; onClose: () => void; onSent: (trade: any) => void }) {
  const [sellerUsername, setSeller] = useState("");
  const [sats, setSats]             = useState("");
  const [asset, setAsset]           = useState("ADA");
  const [assetAmount, setAmount]    = useState("");
  const [loading, setLoading]       = useState(false);
  const [err, setErr]               = useState("");

  const BASE = import.meta.env.VITE_API_URL ?? "";

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (!sellerUsername.trim() || !sats || !assetAmount) {
      setErr("Fill in all fields"); return;
    }
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/trades`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          sellerUsername: sellerUsername.replace("@","").trim(),
          sats: parseInt(sats),
          asset: asset.toUpperCase(),
          assetAmount: assetAmount.trim(),
        }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error ?? "Failed"); }
      const { trade } = await r.json();
      onSent(trade);
      onClose();
    } catch (e: any) {
      setErr(e.message ?? "Failed — try again");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#080808] border border-[#FF6A00]/30 w-full max-w-sm p-6 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-neutral-600 hover:text-white"><X size={16}/></button>

        <div className="flex items-center gap-2 mb-5">
          <ArrowLeftRight size={16} className="text-[#FF6A00]"/>
          <h2 className="font-black uppercase tracking-widest text-sm text-[#FF6A00]">New P2P Trade</h2>
        </div>

        <p className="text-[10px] text-neutral-600 mb-4">
          You pay Lightning → escrow holds sats until you confirm receiving the crypto.
        </p>

        <form onSubmit={create} className="space-y-3">
          <div>
            <label className="block text-[10px] text-neutral-600 uppercase tracking-widest mb-1">Seller Username</label>
            <input value={sellerUsername} onChange={e => setSeller(e.target.value)}
              placeholder="@satoshi" autoComplete="off"
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white text-sm px-3 py-2 outline-none focus:border-[#FF6A00] font-mono"/>
          </div>

          <div>
            <label className="block text-[10px] text-neutral-600 uppercase tracking-widest mb-1">You Pay (sats → escrow)</label>
            <input value={sats} onChange={e => setSats(e.target.value)} type="number" min="1" placeholder="50000"
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white text-sm px-3 py-2 outline-none focus:border-[#FF6A00] font-mono"/>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-neutral-600 uppercase tracking-widest mb-1">Crypto</label>
              <div className="grid grid-cols-4 gap-1 mb-1">
                {POPULAR.map(c => (
                  <button key={c} type="button" onClick={() => setAsset(c)}
                    className={`text-[9px] py-1 border font-bold transition-colors
                      ${asset === c ? "border-[#FF6A00] text-[#FF6A00] bg-[#FF6A00]/10" : "border-[#1a1a1a] text-neutral-600 hover:border-[#FF6A00]/40"}`}>
                    {c}
                  </button>
                ))}
              </div>
              <input value={asset} onChange={e => setAsset(e.target.value.toUpperCase())}
                placeholder="OTHER"
                className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white text-xs px-2 py-1.5 outline-none focus:border-[#FF6A00] font-mono uppercase"/>
            </div>
            <div>
              <label className="block text-[10px] text-neutral-600 uppercase tracking-widest mb-1">Amount</label>
              <input value={assetAmount} onChange={e => setAmount(e.target.value)} placeholder="1000"
                className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white text-sm px-3 py-2 outline-none focus:border-[#FF6A00] font-mono"/>
            </div>
          </div>

          {sats && assetAmount && asset && (
            <div className="bg-[#FF6A00]/5 border border-[#FF6A00]/20 px-3 py-2 text-[10px] text-neutral-400">
              ⚡ {parseInt(sats).toLocaleString()} sats → {assetAmount} {asset}
            </div>
          )}

          {err && <p className="text-xs text-red-500">{err}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-[#FF6A00] text-black font-black uppercase tracking-widest text-sm py-3 hover:bg-[#e55500] disabled:opacity-40 transition-colors">
            {loading ? "CREATING ESCROW…" : "CREATE TRADE ⚡"}
          </button>
        </form>
      </div>
    </div>
  );
}
