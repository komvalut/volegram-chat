import { useState, useEffect, useRef } from "react";
import { X, Zap, Copy, Check, Loader, RefreshCw, AlertTriangle, Wallet } from "lucide-react";
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

  const createInvoice = async () => {
    const sats = parseInt(amountSats.replace(/\D/g, ""));
    if (!sats || sats < 100) { setErr("Minimum deposit is 100 sats"); return; }
    setLoading(true); setErr("");
    try {
      const r = await fetch("/api/deposit/lightning", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_sats: sats }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed to create invoice");
      setPr(d.pr);
      setCheckoutId(d.checkoutId);
      const qr = await QRCode.toDataURL(d.pr.toUpperCase(), { margin: 2, width: 280, color: { dark: "#000", light: "#fff" } });
      setQrDataUrl(qr);
      setStep("invoice");
      startPolling(d.checkoutId, sats);
    } catch (e: any) {
      setErr(e.message || "Failed to create invoice — try again");
    } finally { setLoading(false); }
  };

  const startPolling = (cid: string, sats: number) => {
    setPolling(true);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 120) {
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
              <h2 className="font-extrabold text-black text-[15px]">Lightning Deposit</h2>
              <p className="text-[10px] text-neutral-400">Swiss Bitcoin Pay · Instant</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-100">
            <X size={16} className="text-neutral-400"/>
          </button>
        </div>

        {/* STEP 1: Amount */}
        {step === "amount" && (
          <div className="px-5 py-5 space-y-4">

            {/* SBP not configured */}
            {sbpReady === false && (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                  <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0"/>
                  <div>
                    <p className="text-xs font-extrabold text-amber-800">Swiss Bitcoin Pay not configured</p>
                    <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                      Admin needs to set <strong>SBP_API_KEY</strong>. Until then, use your Lightning address below to receive sats directly.
                    </p>
                  </div>
                </div>

                {/* Fallback: show their Lightning address as QR */}
                {user.lightning_address && (
                  <div className="rounded-2xl border border-neutral-200 p-4 text-center space-y-3">
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Your Lightning Address</p>
                    <div className="bg-neutral-900 rounded-xl p-2 flex justify-center">
                      <LnAddressQR address={user.lightning_address}/>
                    </div>
                    <code className="block text-xs font-mono text-black bg-neutral-100 rounded-lg px-3 py-2 break-all">
                      {user.lightning_address}
                    </code>
                    <p className="text-[10px] text-neutral-400">
                      Share this address to receive sats from any Lightning wallet.
                    </p>
                  </div>
                )}

                {!user.lightning_address && (
                  <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 text-center text-xs text-neutral-500">
                    <Wallet size={20} className="mx-auto mb-2 text-neutral-300"/>
                    Add a Lightning address in your Profile to receive sats.
                  </div>
                )}
              </div>
            )}

            {/* Amount selector (only shown when SBP is ready) */}
            {sbpReady === true && (
              <>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Amount (sats)</label>
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

                <button onClick={createInvoice} disabled={loading || !amountSats}
                  className="w-full flex items-center justify-center gap-2 bg-black text-white font-extrabold py-3.5 rounded-xl text-sm active:scale-[0.98] transition-all disabled:opacity-40">
                  {loading ? <Loader size={16} className="animate-spin"/> : <Zap size={16} fill="#F7931A" className="text-[#F7931A]"/>}
                  {loading ? "Creating invoice…" : "Create Lightning Invoice"}
                </button>

                <p className="text-[10px] text-neutral-400 text-center">
                  Powered by Swiss Bitcoin Pay · Instant · Zero fees within VBC
                </p>
              </>
            )}

            {sbpReady === null && (
              <div className="flex justify-center py-6">
                <Loader size={20} className="animate-spin text-neutral-400"/>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Invoice / QR */}
        {step === "invoice" && (
          <div className="px-5 py-5 space-y-4">
            {paid ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check size={28} className="text-green-600"/>
                </div>
                <p className="font-extrabold text-xl text-black">Payment received!</p>
                <p className="text-sm text-neutral-500 mt-1">⚡ {parseInt(amountSats).toLocaleString()} sats added to your balance</p>
                <button onClick={onClose}
                  className="mt-5 w-full bg-black text-white font-extrabold py-3 rounded-xl text-sm">
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full mb-3">
                    {polling ? <><RefreshCw size={11} className="animate-spin"/> Waiting for payment…</> : "Invoice created"}
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
                    Open Wallet
                  </button>
                  <button onClick={copy}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-neutral-100 font-bold text-sm active:scale-[0.98] transition-all">
                    {copied ? <Check size={15} className="text-green-600"/> : <Copy size={15} className="text-neutral-600"/>}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>

                <div className="text-center">
                  <p className="text-[10px] text-neutral-400">
                    Scan in any Lightning wallet · Invoice expires in 24h
                  </p>
                  <button onClick={() => { setStep("amount"); if (pollRef.current) clearInterval(pollRef.current); }}
                    className="mt-2 text-[11px] text-neutral-400 hover:text-black font-medium">
                    ← Change amount
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

function LnAddressQR({ address }: { address: string }) {
  const [qr, setQr] = useState("");
  useEffect(() => {
    QRCode.toDataURL(`lightning:${address}`, { margin: 1, width: 180, color: { dark: "#fff", light: "#111" } })
      .then(setQr).catch(() => {});
  }, [address]);
  return qr ? <img src={qr} alt="Lightning QR" className="w-40 h-40 rounded-lg"/> : null;
}
