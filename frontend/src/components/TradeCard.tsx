import { useState, useEffect, useRef } from "react";
import { Zap, Copy, CheckCircle, AlertTriangle, Clock, ArrowRight, Upload, ZoomIn, X } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  pending:         { label: "Pending",               color: "text-yellow-400",  desc: "" },
  funded:          { label: "Escrow Funded ✓",        color: "text-blue-400",    desc: "Funds locked safely in escrow." },
  address_shared:  { label: "Address Shared ✓",       color: "text-purple-400",  desc: "Seller: send crypto to the address below." },
  proof_submitted: { label: "Payment Proof Sent ✓",   color: "text-blue-400",    desc: "Seller: review the screenshot and release BTC." },
  released:        { label: "Complete ✓",             color: "text-green-400",   desc: "Trade complete. Escrow released." },
  disputed:        { label: "Disputed — Admin Review", color: "text-red-400",     desc: "Admin will review and decide." },
  refunded:        { label: "Refunded",               color: "text-neutral-400", desc: "Sats returned to buyer." },
};

interface Trade {
  id: number;
  sats: number;
  asset: string;
  assetAmount: string;
  status: string;
  tradeType: string;
  invoicePr?: string;
  buyerAddress?: string;
  paymentProofUrl?: string;
  buyerId: number;
  sellerId: number;
  feeSats?: number;
  feeRate?: string;
  buyer:  { username: string; lightningAddress?: string };
  seller: { username: string; lightningAddress?: string };
}

export default function TradeCard({
  trade: initial, currentUserId, onUpdate,
}: { trade: Trade; currentUserId: number; onUpdate?: (t: Trade) => void }) {
  const [trade, setTrade]     = useState<Trade>(initial);
  const [address, setAddress] = useState(initial.buyerAddress ?? "");
  const [polling, setPolling] = useState(false);
  const [copied, setCopied]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");
  const [zoom, setZoom]       = useState(false);
  const fileRef               = useRef<HTMLInputElement>(null);

  const BASE     = import.meta.env.VITE_API_URL ?? "";
  const isBuyer  = currentUserId === trade.buyerId;
  const isSeller = currentUserId === trade.sellerId;
  const isFiat   = trade.tradeType === "fiat";

  const update = (t: Trade) => { setTrade(t); onUpdate?.(t); };

  const refresh = async () => {
    const r = await fetch(`${BASE}/api/trades/${trade.id}`, { credentials: "include" });
    if (r.ok) update(await r.json());
  };

  // Poll Lightning payment confirmation
  useEffect(() => {
    if (trade.status !== "pending" || !isBuyer || isFiat) return;
    setPolling(true);
    const iv = setInterval(async () => {
      const r = await fetch(`${BASE}/api/trades/${trade.id}/check-payment`, {
        method: "POST", credentials: "include",
      });
      if (r.ok) {
        const d = await r.json();
        if (d.paid || d.alreadyFunded) { update(d.trade); clearInterval(iv); setPolling(false); }
      }
    }, 5000);
    return () => { clearInterval(iv); setPolling(false); };
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
      const d = await r.json(); update(d.trade);
    } catch { setErr("Failed — try again"); }
    finally { setLoading(false); }
  };

  const uploadProof = async (file: File) => {
    setLoading(true); setErr("");
    const fd = new FormData();
    fd.append("proof", file);
    try {
      const r = await fetch(`${BASE}/api/trades/${trade.id}/proof`, {
        method: "POST", credentials: "include", body: fd,
      });
      if (!r.ok) throw new Error();
      const d = await r.json(); update(d.trade);
    } catch { setErr("Upload failed — try again"); }
    finally { setLoading(false); }
  };

  const confirm = async () => {
    const msg = isFiat
      ? `Confirm you received the fiat payment? This releases ${trade.sats.toLocaleString()} sats to the buyer.`
      : `Confirm you received ${trade.assetAmount} ${trade.asset}? This releases escrow to the seller.`;
    if (!window.confirm(msg)) return;
    setLoading(true); setErr("");
    try {
      const r = await fetch(`${BASE}/api/trades/${trade.id}/confirm`, {
        method: "POST", credentials: "include",
      });
      if (!r.ok) throw new Error();
      const d = await r.json(); update(d.trade);
    } catch { setErr("Failed — try again"); }
    finally { setLoading(false); }
  };

  const dispute = async () => {
    if (!window.confirm("Open a dispute? Admin will review all evidence.")) return;
    const r = await fetch(`${BASE}/api/trades/${trade.id}/dispute`, {
      method: "POST", credentials: "include",
    });
    if (r.ok) { const d = await r.json(); update(d.trade); }
  };

  const st = STATUS_LABELS[trade.status] ?? { label: trade.status, color: "text-neutral-400", desc: "" };

  return (
    <>
      <div className="border border-[#FF6A00]/30 bg-gradient-to-b from-[#0d0800] to-[#060400] p-4 max-w-[320px] w-full">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Zap size={13} className="text-[#FF6A00]"/>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6A00]">
            VBC {isFiat ? "💶 Fiat" : "⚡ Lightning"} Trade #{trade.id}
          </span>
        </div>

        {/* Summary */}
        <div className="bg-black/40 px-3 py-2.5 mb-3 border border-white/5">
          <div className="flex items-center gap-2 text-sm font-black">
            {isFiat ? (
              <>
                <span className="text-blue-300">{trade.assetAmount}</span>
                <ArrowRight size={11} className="text-neutral-600"/>
                <span className="text-[#FF6A00]">⚡ {trade.sats.toLocaleString()} sats</span>
              </>
            ) : (
              <>
                <span className="text-[#FF6A00]">⚡ {trade.sats.toLocaleString()} sats</span>
                <ArrowRight size={11} className="text-neutral-600"/>
                <span className="text-white">{trade.assetAmount} {trade.asset}</span>
              </>
            )}
          </div>
          <div className="flex gap-3 mt-1 text-[9px] text-neutral-600">
            <span>Buyer: @{trade.buyer.username}</span>
            <span>Seller: @{trade.seller.username}</span>
          </div>
          {/* Fee breakdown */}
          {(trade.feeSats ?? 0) > 0 && (
            <div className="mt-2 pt-2 border-t border-white/5 grid grid-cols-3 text-[8px] text-neutral-700">
              <span>Escrow: {trade.sats.toLocaleString()} ⚡</span>
              <span className="text-center">Fee: {(trade.feeSats ?? 0).toLocaleString()} ⚡ ({parseFloat(trade.feeRate ?? "0") * 100}%)</span>
              <span className="text-right text-neutral-500">Seller gets: {(trade.sats - (trade.feeSats ?? 0)).toLocaleString()} ⚡</span>
            </div>
          )}
        </div>

        {/* Status */}
        <div className={`flex items-center gap-1.5 text-[10px] font-bold mb-1 ${st.color}`}>
          {trade.status === "released" ? <CheckCircle size={11}/> :
           trade.status === "disputed" ? <AlertTriangle size={11}/> :
           <Clock size={11}/>}
          {st.label}
        </div>
        {st.desc && <p className="text-[9px] text-neutral-600 mb-3">{st.desc}</p>}

        {/* ══════════ LIGHTNING TRADE STEPS ══════════ */}
        {!isFiat && (<>
          {/* Step 1 — Pay invoice */}
          {isBuyer && trade.status === "pending" && trade.invoicePr && (
            <div className="space-y-2">
              <div className="bg-black/60 border border-[#FF6A00]/20 px-2 py-1.5">
                <p className="text-[9px] text-neutral-600 mb-1">Lightning Escrow Invoice:</p>
                <p className="text-[9px] text-neutral-500 font-mono break-all">{trade.invoicePr.slice(0,50)}…</p>
              </div>
              <button onClick={copyInvoice}
                className="w-full flex items-center justify-center gap-2 bg-[#FF6A00] text-black text-[10px] font-black py-2 hover:bg-[#e55500]">
                {copied ? <><CheckCircle size={11}/>COPIED!</> : <><Copy size={11}/>COPY INVOICE & PAY</>}
              </button>
              {polling && <p className="text-[9px] text-neutral-600 text-center animate-pulse">Checking payment…</p>}
            </div>
          )}
          {/* Step 2 — Share address */}
          {isBuyer && trade.status === "funded" && (
            <div className="space-y-2">
              <p className="text-[9px] text-[#FF6A00] font-bold">Enter your {trade.asset} address:</p>
              <input value={address} onChange={e => setAddress(e.target.value)}
                placeholder={`Your ${trade.asset} wallet address`}
                className="w-full bg-black/60 border border-[#1a1a1a] text-white text-[10px] px-2 py-1.5 outline-none focus:border-[#FF6A00] font-mono"/>
              <button onClick={shareAddress} disabled={!address.trim() || loading}
                className="w-full bg-[#FF6A00] text-black text-[10px] font-black py-2 disabled:opacity-40">
                {loading ? "SHARING…" : `SHARE ${trade.asset} ADDRESS`}
              </button>
            </div>
          )}
          {/* Show address to seller */}
          {!isBuyer && trade.buyerAddress && (
            <div className="bg-black/60 border border-purple-900/40 px-3 py-2 mb-2">
              <p className="text-[9px] text-purple-400 font-bold mb-1">Send {trade.assetAmount} {trade.asset} to:</p>
              <div className="flex items-center gap-2">
                <code className="text-[10px] text-white font-mono break-all flex-1">{trade.buyerAddress}</code>
                <button onClick={() => navigator.clipboard.writeText(trade.buyerAddress ?? "")} className="shrink-0 text-neutral-700 hover:text-[#FF6A00]">
                  <Copy size={10}/>
                </button>
              </div>
            </div>
          )}
          {/* Step 3 — Buyer confirms */}
          {isBuyer && trade.status === "address_shared" && (
            <div className="space-y-1.5">
              <button onClick={confirm} disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-green-700 text-white text-[10px] font-black py-2 hover:bg-green-600 disabled:opacity-40">
                <CheckCircle size={11}/>
                {loading ? "CONFIRMING…" : `I RECEIVED ${trade.asset} — RELEASE ESCROW`}
              </button>
              <button onClick={dispute} className="w-full text-[9px] text-neutral-600 hover:text-red-400 py-1">
                Problem? Open Dispute
              </button>
            </div>
          )}
        </>)}

        {/* ══════════ FIAT TRADE STEPS ══════════ */}
        {isFiat && (<>
          {/* Buyer: pending → upload proof */}
          {isBuyer && trade.status === "pending" && (
            <div className="space-y-2">
              <div className="bg-blue-900/10 border border-blue-900/40 px-3 py-2">
                <p className="text-[9px] text-blue-300 font-bold mb-1">1. Send payment</p>
                <p className="text-[9px] text-neutral-500">{trade.assetAmount}</p>
                <p className="text-[9px] text-neutral-600 mt-1">
                  Contact @{trade.seller.username} for their payment details, then upload your Revolut / bank screenshot below.
                </p>
              </div>
              <p className="text-[9px] text-[#FF6A00] font-bold mt-1">2. Upload payment proof:</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadProof(f); }}/>
              <button onClick={() => fileRef.current?.click()} disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#FF6A00] text-black text-[10px] font-black py-2 hover:bg-[#e55500] disabled:opacity-40">
                <Upload size={11}/>
                {loading ? "UPLOADING…" : "UPLOAD PAYMENT SCREENSHOT"}
              </button>
              <p className="text-[8px] text-neutral-700 text-center">Revolut, bank app, PayPal screenshot</p>
            </div>
          )}

          {/* Buyer: proof submitted — waiting */}
          {isBuyer && trade.status === "proof_submitted" && (
            <div className="bg-blue-900/10 border border-blue-900/40 px-3 py-2">
              <p className="text-[9px] text-blue-300 font-bold">✓ Proof submitted</p>
              <p className="text-[9px] text-neutral-600 mt-1">Waiting for @{trade.seller.username} to confirm and release BTC.</p>
            </div>
          )}

          {/* Seller: proof submitted — review & confirm */}
          {isSeller && trade.status === "proof_submitted" && (
            <div className="space-y-2">
              {trade.paymentProofUrl && (
                <div>
                  <p className="text-[9px] text-[#FF6A00] font-bold mb-1.5">Payment proof from buyer:</p>
                  <div className="relative border border-[#1a1a1a] overflow-hidden cursor-zoom-in group"
                    onClick={() => setZoom(true)}>
                    <img src={`${BASE}${trade.paymentProofUrl}`} alt="Payment proof"
                      className="w-full object-contain max-h-40"/>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                      <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity"/>
                    </div>
                  </div>
                  <p className="text-[8px] text-neutral-700 mt-1 text-center">Click to zoom</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={confirm} disabled={loading}
                  className="flex items-center justify-center gap-1 bg-green-700 text-white text-[9px] font-black py-2 hover:bg-green-600 disabled:opacity-40">
                  <CheckCircle size={10}/>
                  {loading ? "…" : "LOOKS LEGIT — RELEASE BTC"}
                </button>
                <button onClick={dispute}
                  className="flex items-center justify-center gap-1 border border-red-900 text-red-400 text-[9px] font-bold py-2 hover:bg-red-900/20">
                  <AlertTriangle size={10}/> FAKE — DISPUTE
                </button>
              </div>
              <p className="text-[8px] text-neutral-700 text-center">
                Verify amount + recipient match the trade before releasing.
              </p>
            </div>
          )}

          {/* Seller: pending — waiting for buyer to pay & upload */}
          {isSeller && trade.status === "pending" && (
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-2">
              <p className="text-[9px] text-neutral-500">Waiting for @{trade.buyer.username} to send {trade.assetAmount} and upload payment proof.</p>
            </div>
          )}

          {/* Seller's Lightning address hint */}
          {isBuyer && trade.seller.lightningAddress && (
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-2 mt-2">
              <p className="text-[9px] text-neutral-600 mb-1">After seller confirms, BTC arrives at your Lightning address:</p>
              <code className="text-[9px] text-[#FF6A00] font-mono">{trade.buyer.lightningAddress}</code>
            </div>
          )}
        </>)}

        {/* Complete */}
        {trade.status === "released" && (
          <div className="flex items-center gap-2 bg-green-900/20 border border-green-900/40 px-3 py-2">
            <CheckCircle size={12} className="text-green-400"/>
            <span className="text-[10px] text-green-400 font-bold">Trade complete!</span>
          </div>
        )}

        {/* Disputed */}
        {trade.status === "disputed" && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 bg-red-900/20 border border-red-900/40 px-3 py-2">
              <AlertTriangle size={12} className="text-red-400"/>
              <span className="text-[10px] text-red-400 font-bold">Dispute open — admin reviewing.</span>
            </div>
            {trade.paymentProofUrl && (
              <div className="border border-red-900/30 overflow-hidden cursor-zoom-in" onClick={() => setZoom(true)}>
                <img src={`${BASE}${trade.paymentProofUrl}`} alt="Evidence" className="w-full object-contain max-h-32"/>
              </div>
            )}
          </div>
        )}

        {err && <p className="text-[9px] text-red-500 mt-1">{err}</p>}

        {/* Dispute button for non-final states */}
        {!["released","disputed","refunded"].includes(trade.status) && !isFiat && trade.status !== "pending" && (
          <button onClick={dispute} className="w-full text-[9px] text-neutral-700 hover:text-red-400 mt-2 py-1">
            Open Dispute
          </button>
        )}

        <p className="text-[8px] text-neutral-800 mt-3 text-center">VBC Escrow • Sats locked until confirmed</p>
      </div>

      {/* Fullscreen zoom */}
      {zoom && trade.paymentProofUrl && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4" onClick={() => setZoom(false)}>
          <button onClick={() => setZoom(false)} className="absolute top-4 right-4 text-white hover:text-[#FF6A00]">
            <X size={24}/>
          </button>
          <img src={`${BASE}${trade.paymentProofUrl}`} alt="Payment proof"
            className="max-w-full max-h-full object-contain"/>
          <p className="absolute bottom-4 text-[10px] text-neutral-600 uppercase tracking-widest">
            Payment proof — verify amount and recipient
          </p>
        </div>
      )}
    </>
  );
}
