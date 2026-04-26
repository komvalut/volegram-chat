import { useState, useEffect, useRef } from "react";
import { X, Zap, Copy, Check, Loader, RefreshCw, AlertTriangle } from "lucide-react";
import QRCode from "qrcode";

const AMOUNT_PRESETS = [1000, 5000, 10000, 50000, 100000, 500000];

interface Props {
  user: any;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}

export default function DepositModal({ user, onClose, onSuccess }: Props) {
  const [step, setStep]           = useState<"amount" | "invoice">("amount");
  const [amountSats, setAmount]   = useState("");
  const [pr, setPr]               = useState("");
  const [checkoutId, setCheckoutId] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [polling, setPolling]     = useState(false);
  const [paid, setPaid]           = useState(false);
  const [err, setErr]             = useState("");
  const [sbpReady, setSbpReady]   = useState<boolean | null>(null);
  const pollRef                   = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/deposit/sbp-status")
      .then(r => r.json())
      .then(d => setSbpReady(d.configured === true))
      .catch(() => setSbpReady(false));
  }, []);

  const createInvoice = async () => {
    const sats = parseInt(amountSats.replace(/\D/g, ""));
    if (!sats || sats < 100) { setErr("Minimum depozit je 100 sats"); return; }
    setLoading(true); setErr("");
    try {
      const r = await fetch("/api/deposit/lightning", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_sats: sats }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Greška");
      setPr(d.pr);
      setCheckoutId(d.checkoutId);
      const qr = await QRCode.toDataURL(d.pr.toUpperCase(), { margin: 2, width: 280, color: { dark: "#000", light: "#fff" } });
      setQrDataUrl(qr);
      setStep("invoice");
      startPolling(d.checkoutId, sats);
    } catch (e: any) {
      setErr(e.message || "Greška pri kreiranju fakture");
    } finally { setLoading(false); }
  };

  const startPolling = (cid: string, sats: number) => {
    setPolling(true);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 120) { // 10 min
        clearInterval(pollRef.current!);
        setPolling(false);
        return;
      }
      try {
        const r = await fetch(`/api/deposit/lightning/${cid}/check`, { credentials: "include" });
        const d = await r.json();
        if (d.paid) {
          clearInterval(pollRef.current!);
          setPolling(false);
          setPaid(true);
          onSuccess(d.new_balance ?? (user.sats_balance ?? 0) + sats);
        }
      } catch {}
    }, 5000);
  };

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const copy = () => {
    navigator.clipboard.writeText(pr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openWallet = () => {
    window.open(`lightning:${pr}`, "_blank");
  };

  const fmtSats = (v: string) => {
    const n = parseInt(v.replace(/\D/g, ""));
    return isNaN(n) ? "" : n.toString();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
         onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center">
              <Zap size={18} fill="#F7931A" className="text-[#F7931A]"/>
            </div>
            <div>
              <h2 className="font-extrabold text-black text-[15px]">Lightning Depozit</h2>
              <p className="text-[10px] text-neutral-400">Swiss Bitcoin Pay · Instant</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-100">
            <X size={16} className="text-neutral-400"/>
          </button>
        </div>

        {/* ── STEP 1: Amount ── */}
        {step === "amount" && (
          <div className="px-5 py-5 space-y-4">

            {/* SBP not configured warning */}
            {sbpReady === false && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0"/>
                <div>
                  <p className="text-xs font-extrabold text-red-700">Lightning depozit nije aktivan</p>
                  <p className="text-[11px] text-red-600 mt-0.5 leading-relaxed">
                    Admin treba da podesi <strong>SBP_API_KEY</strong> (Swiss Bitcoin Pay). Kontaktiraj admina.
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Iznos (sats)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F7931A] font-extrabold text-lg">⚡</span>
                <input
                  value={amountSats}
                  onChange={e => setAmount(fmtSats(e.target.value))}
                  onKeyDown={e => e.key === "Enter" && createInvoice()}
                  placeholder="10000"
                  type="number"
                  min="100"
                  className="w-full border border-neutral-200 rounded-xl pl-9 pr-4 py-3 text-xl font-extrabold font-mono outline-none focus:border-black"
                  autoFocus
                />
              </div>
              {amountSats && (
                <p className="text-[10px] text-neutral-400 mt-1.5">
                  ≈ €{((parseInt(amountSats) / 1_000_000) * (user.btcEurRate ?? 90000)).toFixed(2)} EUR
                </p>
              )}
            </div>

            {/* Presets */}
            <div className="grid grid-cols-3 gap-2">
              {AMOUNT_PRESETS.map(p => (
                <button key={p} onClick={() => setAmount(p.toString())}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    amountSats === p.toString() ? "bg-black text-white border-black" : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                  }`}>
                  ⚡ {p >= 1000 ? `${(p/1000)}k` : p}
                </button>
              ))}
            </div>

            {err && <p className="text-sm text-red-600 font-medium">{err}</p>}

            <button onClick={createInvoice} disabled={loading || !amountSats || sbpReady === false}
              className="w-full flex items-center justify-center gap-2 bg-black text-white font-extrabold py-3.5 rounded-xl text-sm active:scale-[0.98] transition-all disabled:opacity-40">
              {loading ? <Loader size={16} className="animate-spin"/> : <Zap size={16} fill="#F7931A" className="text-[#F7931A]"/>}
              {loading ? "Kreiram fakturu…" : sbpReady === false ? "⛔ SBP nije aktivan" : "Kreiraj Lightning fakturu"}
            </button>

            <p className="text-[10px] text-neutral-400 text-center">
              Powered by Swiss Bitcoin Pay · Instant · Zero fees within VBC
            </p>
          </div>
        )}

        {/* ── STEP 2: Invoice / QR ── */}
        {step === "invoice" && (
          <div className="px-5 py-5 space-y-4">
            {paid ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check size={28} className="text-green-600"/>
                </div>
                <p className="font-extrabold text-xl text-black">Plaćanje primljeno!</p>
                <p className="text-sm text-neutral-500 mt-1">⚡ {parseInt(amountSats).toLocaleString()} sats dodato na tvoj nalog</p>
                <button onClick={onClose}
                  className="mt-5 w-full bg-black text-white font-extrabold py-3 rounded-xl text-sm">
                  Zatvori
                </button>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full mb-3">
                    {polling ? <><RefreshCw size={11} className="animate-spin"/> Čekam plaćanje…</> : "Faktura kreirana"}
                  </div>
                  <p className="font-extrabold text-lg text-black">
                    ⚡ {parseInt(amountSats).toLocaleString()} sats
                  </p>
                </div>

                {qrDataUrl && (
                  <div className="flex justify-center">
                    <div className="p-3 bg-white border-2 border-neutral-100 rounded-2xl">
                      <img src={qrDataUrl} alt="Lightning QR" className="w-52 h-52 rounded-xl"/>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={openWallet}
                    className="flex-1 flex items-center justify-center gap-2 bg-black text-white font-extrabold py-3 rounded-xl text-sm active:scale-[0.98] transition-all">
                    <Zap size={15} fill="#F7931A" className="text-[#F7931A]"/>
                    Otvori novčanik
                  </button>
                  <button onClick={copy}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-neutral-100 font-bold text-sm active:scale-[0.98] transition-all">
                    {copied ? <Check size={15} className="text-green-600"/> : <Copy size={15} className="text-neutral-600"/>}
                    {copied ? "Kopirano" : "Kopiraj"}
                  </button>
                </div>

                <div className="text-center">
                  <p className="text-[10px] text-neutral-400">
                    Skeniraj u bilo kom Lightning novčaniku · Faktura ističe za 24h
                  </p>
                  <button onClick={() => { setStep("amount"); if (pollRef.current) clearInterval(pollRef.current); }}
                    className="mt-2 text-[11px] text-neutral-400 hover:text-black font-medium">
                    ← Promeni iznos
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
