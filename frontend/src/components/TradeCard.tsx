import { useState, useEffect } from "react";
import { Zap, Copy, CheckCircle, AlertTriangle, Clock, Coins, ArrowRight } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  pending:       { label: "Waiting for Payment",  color: "text-yellow-400",  desc: "Pay the Lightning invoice to lock funds in escrow" },
  funded:        { label: "Escrow Funded ✓",      color: "text-blue-400",    desc: "Funds locked. Share your receiving address below." },
  address_shared:{ label: "Address Shared ✓",     color: "text-purple-400",  desc: "Seller should now send the crypto to your address." },
  released:      { label: "Complete ✓",           color: "text-green-400",   desc: "Escrow released. Trade complete." },
  disputed:      { label: "In Dispute",            color: "text-red-400",     desc: "Admin will review and resolve." },
  refunded:      { label: "Refunded",              color: "text-neutral-400", desc: "Sats returned to buyer." },
};

interface Trade {
  id: number;
  sats: number;
  asset: string;
  assetAmount: string;
  status: string;
  invoicePr?: string;
  buyerAddress?: string;
  buyerId: number;
  sellerId: number;
  buyer: { username: string };
  seller: { username: string };
}

export default function TradeCard({
  trade: initialTrade,
  currentUserId,
  onUpdate,
}: {
  trade: Trade;
  currentUserId: number;
  onUpdate?: (t: Trade) => void;
}) {
  const [trade, setTrade]       = useState<Trade>(initialTrade);
  const [address, setAddress]   = useState(trade.buyerAddress ?? "");
  const [polling, setPolling]   = useState(false);
  const [copied, setCopied]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState("");

  const BASE    = import.meta.env.VITE_API_URL ?? "";
  const isBuyer = currentUserId === trade.buyerId;

  const refresh = async () => {
    const r = await fetch(`${BASE}/api/trades/${trade.id}`, { credentials: "include" });
    if (r.ok) { const d = await r.json(); setTrade(d); onUpdate?.(d); }
  };

  // Poll payment for buyer when status is pending
  useEffect(() => {
    if (trade.status !== "pending" || !isBuyer) return;
    setPolling(true);
    const interval = setInterval(async () => {
      const r = await fetch(`${BASE}/api/trades/${trade.id}/check-payment`, {
        method: "POST", credentials: "include",
      });
      if (r.ok) {
        const d = await r.json();
        if (d.paid || d.alreadyFunded) { setTrade(d.trade); onUpdate?.(d.trade); clearInterval(interval); setPolling(false); }
      }
    }, 5000);
    return () => { clearInterval(interval); setPolling(false); };
  }, [trade.id, trade.status]);

  const copyInvoice = () => {
    navigator.clipboard.writeText(trade.invoicePr ?? "");
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const shareAddress = async () => {
    if (!address.trim()) return;
    setLoading(true); setErr("");
    try {
      const r = await fetch(`${BASE}/api/trades/${trade.id}/address`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerAddress: address.trim() }),
      });
      if (!r.ok) throw new Error();
      const d = await r.json(); setTrade(d.trade); onUpdate?.(d.trade);
    } catch { setErr("Failed — try again"); }
    finally { setLoading(false); }
  };

  const confirm = async () => {
    if (!window.confirm(`Confirm you received ${trade.assetAmount} ${trade.asset}? This releases escrow to the seller.`)) return;
    setLoading(true); setErr("");
    try {
      const r = await fetch(`${BASE}/api/trades/${trade.id}/confirm`, {
        method: "POST", credentials: "include",
      });
      if (!r.ok) throw new Error();
      const d = await r.json(); setTrade(d.trade); onUpdate?.(d.trade);
    } catch { setErr("Failed — try again"); }
    finally { setLoading(false); }
  };

  const dispute = async () => {
    if (!window.confirm("Open a dispute? Admin will review and decide.")) return;
    const r = await fetch(`${BASE}/api/trades/${trade.id}/dispute`, {
      method: "POST", credentials: "include",
    });
    if (r.ok) { const d = await r.json(); setTrade(d.trade); onUpdate?.(d.trade); }
  };

  const st = STATUS_LABELS[trade.status] ?? { label: trade.status, color: "text-neutral-400", desc: "" };

  return (
    <div className="border border-[#FF6A00]/30 bg-gradient-to-b from-[#0d0800] to-[#060400] p-4 rounded-sm max-w-[320px] w-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Zap size={14} className="text-[#FF6A00]"/>
        <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6A00]">VBC Escrow Trade #{trade.id}</span>
      </div>

      {/* Trade summary */}
      <div className="bg-black/40 px-3 py-2.5 mb-3 border border-white/5">
        <div className="flex items-center gap-2 text-sm font-black">
          <span className="text-[#FF6A00]">⚡ {trade.sats.toLocaleString()} sats</span>
          <ArrowRight size={12} className="text-neutral-600"/>
          <span className="text-white">{trade.assetAmount} {trade.asset}</span>
        </div>
        <div className="flex gap-3 mt-1 text-[9px] text-neutral-600">
          <span>Buyer: @{trade.buyer.username}</span>
          <span>Seller: @{trade.seller.username}</span>
        </div>
      </div>

      {/* Status */}
      <div className={`flex items-center gap-1.5 text-[10px] font-bold mb-1 ${st.color}`}>
        {trade.status === "released" ? <CheckCircle size={11}/> :
         trade.status === "disputed" ? <AlertTriangle size={11}/> :
         <Clock size={11}/>}
        {st.label}
      </div>
      <p className="text-[9px] text-neutral-600 mb-3">{st.desc}</p>

      {/* Step 1 — Pay invoice (buyer only, status: pending) */}
      {isBuyer && trade.status === "pending" && trade.invoicePr && (
        <div className="space-y-2">
          <div className="bg-black/60 border border-[#FF6A00]/20 px-2 py-1.5">
            <p className="text-[9px] text-neutral-600 mb-1">Lightning Invoice (escrow):</p>
            <p className="text-[9px] text-neutral-500 font-mono break-all leading-relaxed">
              {trade.invoicePr.slice(0, 40)}…
            </p>
          </div>
          <button onClick={copyInvoice}
            className="w-full flex items-center justify-center gap-2 bg-[#FF6A00] text-black text-[10px] font-black py-2 hover:bg-[#e55500] transition-colors">
            {copied ? <><CheckCircle size={11}/>COPIED!</> : <><Copy size={11}/>COPY INVOICE & PAY</>}
          </button>
          {polling && (
            <p className="text-[9px] text-neutral-600 text-center animate-pulse">Checking payment…</p>
          )}
        </div>
      )}

      {/* Step 2 — Share address (buyer, status: funded) */}
      {isBuyer && trade.status === "funded" && (
        <div className="space-y-2">
          <p className="text-[9px] text-[#FF6A00] font-bold">Enter your {trade.asset} address:</p>
          <input value={address} onChange={e => setAddress(e.target.value)}
            placeholder={`Your ${trade.asset} wallet address`}
            className="w-full bg-black/60 border border-[#1a1a1a] text-white text-[10px] px-2 py-1.5 outline-none focus:border-[#FF6A00] font-mono"/>
          <button onClick={shareAddress} disabled={!address.trim() || loading}
            className="w-full bg-[#FF6A00] text-black text-[10px] font-black py-2 hover:bg-[#e55500] disabled:opacity-40 transition-colors">
            {loading ? "SHARING…" : `SHARE ${trade.asset} ADDRESS`}
          </button>
        </div>
      )}

      {/* Show buyer address to seller */}
      {!isBuyer && trade.buyerAddress && (
        <div className="bg-black/60 border border-purple-900/40 px-3 py-2 mb-2">
          <p className="text-[9px] text-purple-400 font-bold mb-1">Send {trade.assetAmount} {trade.asset} to:</p>
          <div className="flex items-center gap-2">
            <code className="text-[10px] text-white font-mono break-all flex-1">{trade.buyerAddress}</code>
            <button onClick={() => navigator.clipboard.writeText(trade.buyerAddress ?? "")}
              className="shrink-0 text-neutral-700 hover:text-[#FF6A00]">
              <Copy size={10}/>
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Confirm receipt (buyer, status: address_shared) */}
      {isBuyer && trade.status === "address_shared" && (
        <div className="space-y-1.5">
          <button onClick={confirm} disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-green-700 text-white text-[10px] font-black py-2 hover:bg-green-600 disabled:opacity-40 transition-colors">
            <CheckCircle size={11}/>
            {loading ? "CONFIRMING…" : `I RECEIVED THE ${trade.asset} — RELEASE ESCROW`}
          </button>
          <button onClick={dispute}
            className="w-full text-[9px] text-neutral-600 hover:text-red-400 py-1 transition-colors">
            Problem? Open Dispute
          </button>
        </div>
      )}

      {/* Complete */}
      {trade.status === "released" && (
        <div className="flex items-center gap-2 bg-green-900/20 border border-green-900/40 px-3 py-2">
          <CheckCircle size={12} className="text-green-400"/>
          <span className="text-[10px] text-green-400 font-bold">Trade complete — escrow released!</span>
        </div>
      )}

      {/* Disputed */}
      {trade.status === "disputed" && (
        <div className="flex items-center gap-2 bg-red-900/20 border border-red-900/40 px-3 py-2">
          <AlertTriangle size={12} className="text-red-400"/>
          <span className="text-[10px] text-red-400 font-bold">Dispute open — admin reviewing.</span>
        </div>
      )}

      {err && <p className="text-[9px] text-red-500 mt-1">{err}</p>}

      <p className="text-[8px] text-neutral-800 mt-3 text-center">
        VBC Escrow • Sats locked until buyer confirms receipt
      </p>
    </div>
  );
}
