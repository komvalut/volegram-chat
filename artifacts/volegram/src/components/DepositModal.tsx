import { useState, useEffect, useRef } from "react";
import { X, Zap, Copy, Check, Loader, RefreshCw, Wallet, Building2, Users, ChevronRight, ArrowRight, Loader2, AlertCircle, Info } from "lucide-react";
import QRCode from "qrcode";

const AMOUNT_PRESETS = [1000, 5000, 10000, 50000, 100000, 500000];

interface Props {
  user: any;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
  onGoToMarket?: () => void;
}

export default function DepositModal({ user, onClose, onSuccess, onGoToMarket }: Props) {
  const [mode, setMode]           = useState<"choose" | "lightning" | "bank">("choose");
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

  const [bankForm, setBankForm]   = useState({ amount_fiat: "", currency: "EUR", note: "" });
  const [bankBusy, setBankBusy]   = useState(false);
  const [bankSent, setBankSent]   = useState(false);
  const [bankMsg, setBankMsg]     = useState("");
  const [adminIban, setAdminIban] = useState<any>(null);
  const [copiedField, setCopiedField] = useState("");

  useEffect(() => {
    fetch("/api/deposit/sbp-status")
      .then(r => r.json())
      .then(d => setSbpReady(d.configured === true))
      .catch(() => setSbpReady(false));
    fetch("/api/settings/public")
      .then(r => r.json())
      .then(d => {
        if (d.bank?.iban) setAdminIban(d.bank);
        else if (d.iban) setAdminIban({ iban: d.iban, holder: d.bankHolder, name: d.bankName, swift: d.bankSwift });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const copyField = (text: string, field: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedField(field);
    setTimeout(() => setCopiedField(""), 2000);
  };

  const copy = (text?: string) => {
    navigator.clipboard.writeText(text ?? pr).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openWallet = () => window.open(`lightning:${pr}`, "_blank");

  const fmtSats = (v: string) => {
    const n = parseInt(v.replace(/\D/g, ""));
    return isNaN(n) ? "" : n.toString();
  };

  const createInvoice = async () => {
    const sats = parseInt(amountSats.replace(/\D/g, ""));
    if (!sats || sats < 1) { setErr("Enter an amount (minimum 1 sat)"); return; }
    setLoading(true); setErr("");
    try {
      const r = await fetch("/api/deposit/lightning", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_sats: sats }),
      });
      let d: any = {};
      try { d = await r.json(); } catch {}
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
      if (attempts > 120) { clearInterval(pollRef.current!); setPolling(false); return; }
      try {
        const r = await fetch(`/api/deposit/lightning/${cid}/check`, { credentials: "include" });
        let d: any = {};
        try { d = await r.json(); } catch {}
        if (d.paid) {
          clearInterval(pollRef.current!);
          setPolling(false);
          setPaid(true);
          onSuccess(d.new_balance ?? (user.sats_balance ?? 0) + sats);
        }
      } catch {}
    }, 5000);
  };

  const submitBankRequest = async () => {
    const amt = parseFloat(bankForm.amount_fiat);
    if (!amt || amt <= 0) { setBankMsg("Enter the amount you sent"); return; }
    setBankBusy(true); setBankMsg("");
    try {
      const r = await fetch("/api/credits/topup-request", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_fiat: amt, currency: bankForm.currency, note: bankForm.note }),
      });
      let d: any = {};
      try { d = await r.json(); } catch (jsonErr) {
        throw new Error("Server error — please try again");
      }
      if (!r.ok) throw new Error(d.error ?? "Request failed");
      setBankSent(true);
    } catch (e: any) { setBankMsg(e.message); }
    finally { setBankBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
         onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[90dvh] flex flex-col">

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center">
              <Zap size={18} fill="#F7931A" className="text-[#F7931A]"/>
            </div>
            <div>
              <h2 className="font-extrabold text-black text-[15px]">Add Sats</h2>
              <p className="text-[10px] text-neutral-400">Choose how to top up your balance</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-100">
            <X size={16} className="text-neutral-400"/>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">

          {/* ── MODE: choose ── */}
          {mode === "choose" && (
            <div className="px-5 py-5 space-y-3">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Select deposit method</p>

              <button onClick={() => setMode("lightning")}
                className="w-full flex items-center gap-4 bg-black rounded-2xl p-4 active:scale-[0.98] transition-transform text-left">
                <div className="w-10 h-10 rounded-xl bg-[#F7931A]/20 flex items-center justify-center shrink-0">
                  <Zap size={18} fill="#F7931A" className="text-[#F7931A]"/>
                </div>
                <div className="flex-1">
                  <p className="font-extrabold text-white text-sm">Lightning Network</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Instant · Any Lightning wallet</p>
                  {!sbpReady && <p className="text-[10px] text-amber-400 mt-0.5">Via your Lightning address</p>}
                </div>
                <ChevronRight size={16} className="text-neutral-500"/>
              </button>

              <button onClick={() => setMode("bank")}
                className="w-full flex items-center gap-4 bg-white border-2 border-neutral-100 rounded-2xl p-4 active:scale-[0.98] transition-transform text-left">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Building2 size={18} className="text-blue-600"/>
                </div>
                <div className="flex-1">
                  <p className="font-extrabold text-black text-sm">Bank Transfer (IBAN)</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">RSD · EUR · BAM · HRK · CHF</p>
                  <p className="text-[10px] text-blue-600 mt-0.5 font-semibold">No crypto needed · Balkans friendly</p>
                </div>
                <ChevronRight size={16} className="text-neutral-400"/>
              </button>

              <button onClick={() => { onClose(); onGoToMarket?.(); }}
                className="w-full flex items-center gap-4 bg-white border-2 border-neutral-100 rounded-2xl p-4 active:scale-[0.98] transition-transform text-left">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <Users size={18} className="text-[#F7931A]"/>
                </div>
                <div className="flex-1">
                  <p className="font-extrabold text-black text-sm">Buy from P2P Market</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Pay cash · Revolut · bank to a seller</p>
                  <p className="text-[10px] text-[#F7931A] mt-0.5 font-semibold">Best for: Balkans, cash, RSD</p>
                </div>
                <ChevronRight size={16} className="text-neutral-400"/>
              </button>

              <div className="bg-neutral-50 rounded-2xl px-4 py-3 text-[11px] text-neutral-500 leading-relaxed">
                All deposit methods are anonymous — <strong className="text-black">no KYC required</strong>.
                Bank transfer and P2P are especially popular in the region.
              </div>
            </div>
          )}

          {/* ── MODE: lightning ── */}
          {mode === "lightning" && (
            <div className="px-5 py-5 space-y-4">
              <button onClick={() => { setMode("choose"); setStep("amount"); setErr(""); }}
                className="text-xs font-bold text-neutral-400 flex items-center gap-1 mb-1">
                ← Back
              </button>

              {sbpReady === true && step === "amount" && (
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
                        type="number" min="1"
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
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${amountSats === p.toString() ? "bg-black text-white border-black" : "bg-white text-neutral-600 border-neutral-200"}`}>
                        ⚡ {p >= 1000 ? `${p/1000}k` : p}
                      </button>
                    ))}
                  </div>
                  {err && <p className="text-sm text-red-600 font-medium">{err}</p>}
                  <button onClick={createInvoice} disabled={loading || !amountSats}
                    className="w-full flex items-center justify-center gap-2 bg-black text-white font-extrabold py-3.5 rounded-xl text-sm active:scale-[0.98] disabled:opacity-40">
                    {loading ? <Loader size={16} className="animate-spin"/> : <Zap size={16} fill="#F7931A" className="text-[#F7931A]"/>}
                    {loading ? "Creating invoice…" : "Create Lightning Invoice"}
                  </button>
                  <p className="text-[10px] text-neutral-400 text-center">Powered by Swiss Bitcoin Pay · Instant</p>
                </>
              )}

              {sbpReady === false && (
                <div className="space-y-4">
                  <div className="bg-neutral-900 rounded-2xl p-4 text-center space-y-3">
                    <p className="text-xs font-extrabold text-[#F7931A] uppercase tracking-wider">Your Lightning Address</p>
                    {user.lightning_address ? (
                      <>
                        <LnAddressQR address={user.lightning_address}/>
                        <code className="block text-xs font-mono text-white bg-white/10 rounded-lg px-3 py-2 break-all">
                          {user.lightning_address}
                        </code>
                        <button onClick={() => copy(user.lightning_address)}
                          className="flex items-center gap-1 mx-auto text-[11px] text-neutral-300 font-bold">
                          <Copy size={11}/> Copy address
                        </button>
                      </>
                    ) : (
                      <div className="text-center text-xs text-neutral-400">
                        <Wallet size={20} className="mx-auto mb-2"/>
                        No Lightning address set. Add one in Profile.
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 text-center leading-relaxed">
                    Send sats directly to your Lightning address from any wallet.<br/>
                    <strong className="text-black">Phoenix · Wallet of Satoshi · Breez · Zeus</strong> — all work.
                  </p>
                  <div className="bg-blue-50 rounded-xl px-4 py-3 text-[11px] text-blue-700">
                    <strong>No Lightning wallet?</strong> Go back and try Bank Transfer — no wallet needed.
                  </div>
                </div>
              )}

              {sbpReady === null && <div className="flex justify-center py-8"><Loader size={20} className="animate-spin text-neutral-400"/></div>}

              {step === "invoice" && (
                <div className="space-y-4">
                  {paid ? (
                    <div className="text-center py-6">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Check size={28} className="text-green-600"/>
                      </div>
                      <p className="font-extrabold text-xl text-black">Payment received!</p>
                      <p className="text-sm text-neutral-500 mt-1">⚡ {parseInt(amountSats).toLocaleString()} sats added</p>
                      <button onClick={onClose} className="mt-5 w-full bg-black text-white font-extrabold py-3 rounded-xl text-sm">Close</button>
                    </div>
                  ) : (
                    <>
                      <div className="text-center">
                        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full mb-3">
                          {polling ? <><RefreshCw size={11} className="animate-spin"/> Waiting for payment…</> : "Invoice ready"}
                        </div>
                        <p className="font-extrabold text-lg">⚡ {parseInt(amountSats).toLocaleString()} sats</p>
                      </div>
                      {qrDataUrl && (
                        <div className="flex justify-center">
                          <div className="p-3 bg-white border-2 border-neutral-100 rounded-2xl">
                            <img src={qrDataUrl} alt="Lightning QR" className="w-52 h-52 rounded-xl"/>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={openWallet} className="flex-1 flex items-center justify-center gap-2 bg-black text-white font-extrabold py-3 rounded-xl text-sm">
                          <Zap size={15} fill="#F7931A" className="text-[#F7931A]"/> Open Wallet
                        </button>
                        <button onClick={() => copy()} className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-neutral-100 font-bold text-sm">
                          {copied ? <Check size={15} className="text-green-600"/> : <Copy size={15}/>}
                          {copied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-neutral-400">Scan in any Lightning wallet · 24h expiry</p>
                        <button onClick={() => setStep("amount")} className="mt-2 text-[11px] text-neutral-400">← Change amount</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── MODE: bank ── */}
          {mode === "bank" && (
            <div className="px-5 py-5 space-y-4">
              <button onClick={() => { setMode("choose"); setBankSent(false); setBankMsg(""); }}
                className="text-xs font-bold text-neutral-400 flex items-center gap-1 mb-1">
                ← Back
              </button>

              {bankSent ? (
                <div className="text-center py-4 space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Check size={28} className="text-green-600"/>
                  </div>
                  <div>
                    <p className="font-extrabold text-black text-lg">Deposit request sent!</p>
                    <p className="text-sm text-neutral-500 mt-1">Admin has been notified.</p>
                  </div>

                  {/* How it works after sending */}
                  <div className="bg-[#F7931A]/10 border border-[#F7931A]/30 rounded-2xl p-4 text-left space-y-3">
                    <p className="text-xs font-extrabold text-[#F7931A] uppercase tracking-wide">What happens next?</p>
                    <div className="space-y-2">
                      {[
                        { n: "1", text: "Admin verifies your bank transfer in the system" },
                        { n: "2", text: "Your sats are credited at the current BTC rate" },
                        { n: "3", text: "You receive a system notification with the amount" },
                        { n: "4", text: "Sats appear directly in your wallet balance" },
                      ].map(s => (
                        <div key={s.n} className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-black text-white text-[10px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">{s.n}</div>
                          <p className="text-[11px] text-neutral-700">{s.text}</p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white/60 rounded-xl px-3 py-2">
                      <p className="text-[10px] text-neutral-600 font-semibold">
                        Typical processing time: <strong className="text-black">2–8 hours</strong> · Usually faster during business hours.
                      </p>
                    </div>
                  </div>

                  <div className="bg-neutral-50 rounded-xl px-4 py-3 text-[11px] text-neutral-500 text-left">
                    <Info size={12} className="inline mr-1 text-neutral-400"/>
                    If your transfer isn't credited within 24 hours, contact admin with your bank reference number.
                  </div>

                  <button onClick={onClose} className="w-full bg-black text-white font-extrabold py-3 rounded-xl text-sm">
                    Close
                  </button>
                </div>
              ) : (
                <>
                  {/* Step 1 — IBAN */}
                  <div className="bg-blue-50 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-extrabold text-blue-900 uppercase tracking-wide">Step 1 — Send your bank transfer</p>

                    {adminIban?.iban ? (
                      <div className="space-y-2">
                        <p className="text-[11px] text-blue-700">Send EUR / RSD / BAM to this account:</p>

                        <IbanField label="IBAN" value={adminIban.iban} field="iban" copiedField={copiedField} onCopy={copyField}/>
                        {adminIban.holder && <IbanField label="Account holder" value={adminIban.holder} field="holder" copiedField={copiedField} onCopy={copyField}/>}
                        {adminIban.name   && <IbanField label="Bank" value={adminIban.name} field="bank" copiedField={copiedField} onCopy={copyField}/>}
                        {adminIban.swift  && <IbanField label="SWIFT / BIC" value={adminIban.swift} field="swift" copiedField={copiedField} onCopy={copyField}/>}

                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                          <p className="text-[10px] text-amber-800 font-semibold">
                            ⚠️ Include your username <strong>@{user.username}</strong> in the payment reference/note so admin can identify your transfer.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 bg-white rounded-xl p-3 border border-blue-200">
                        <AlertCircle size={14} className="text-blue-500 mt-0.5 shrink-0"/>
                        <p className="text-[11px] text-blue-700">
                          IBAN not set yet. Contact admin via Telegram <strong>@VOLEGRAMBOT</strong> for payment details.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Step 2 — confirm */}
                  <div className="space-y-3">
                    <p className="text-xs font-extrabold text-neutral-500 uppercase tracking-wide">Step 2 — Confirm your transfer</p>
                    <p className="text-[11px] text-neutral-400 -mt-1">
                      Fill in the details below so admin can match your transfer and credit sats to your balance.
                    </p>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Amount sent</label>
                      <div className="flex gap-2">
                        <input
                          type="number" value={bankForm.amount_fiat}
                          onChange={e => setBankForm(f => ({ ...f, amount_fiat: e.target.value }))}
                          placeholder="50"
                          className="flex-1 border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-black"
                        />
                        <select value={bankForm.currency}
                          onChange={e => setBankForm(f => ({ ...f, currency: e.target.value }))}
                          className="border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-black bg-white">
                          {["EUR","RSD","BAM","HRK","CHF","USD","GBP"].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Reference / note (optional)</label>
                      <input value={bankForm.note}
                        onChange={e => setBankForm(f => ({ ...f, note: e.target.value }))}
                        placeholder="Transfer date, bank name, reference #…"
                        className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-black"
                      />
                    </div>

                    {bankMsg && (
                      <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                        <AlertCircle size={13} className="text-red-500 mt-0.5 shrink-0"/>
                        <p className="text-xs text-red-700 font-semibold">{bankMsg}</p>
                      </div>
                    )}

                    <button onClick={submitBankRequest} disabled={bankBusy || !bankForm.amount_fiat}
                      className="w-full flex items-center justify-center gap-2 bg-black text-white font-extrabold py-3 rounded-xl text-sm active:scale-[0.98] disabled:opacity-40">
                      {bankBusy ? <Loader2 size={15} className="animate-spin"/> : <ArrowRight size={15}/>}
                      {bankBusy ? "Sending…" : "Notify Admin — I've Sent the Transfer"}
                    </button>
                  </div>

                  {/* Info box */}
                  <div className="bg-neutral-50 rounded-xl px-4 py-3 text-[11px] text-neutral-500 leading-relaxed">
                    <strong className="text-black">How it works:</strong> Once admin confirms your transfer,
                    sats are credited to your balance at the current BTC/EUR rate.
                    No bank account or crypto wallet needed on your end.
                    Processing time: <strong className="text-black">2–8 hours</strong>.
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IbanField({ label, value, field, copiedField, onCopy }: { label: string; value: string; field: string; copiedField: string; onCopy: (v: string, f: string) => void }) {
  return (
    <div className="bg-white rounded-xl px-3 py-2 flex items-center justify-between gap-2 border border-blue-200">
      <div className="min-w-0">
        <p className="text-[9px] text-blue-400 font-bold uppercase tracking-wider">{label}</p>
        <p className="text-xs font-bold text-black font-mono break-all">{value}</p>
      </div>
      <button onClick={() => onCopy(value, field)} className="shrink-0 p-1">
        {copiedField === field
          ? <Check size={13} className="text-green-600"/>
          : <Copy size={13} className="text-blue-400"/>}
      </button>
    </div>
  );
}

function LnAddressQR({ address }: { address: string }) {
  const [qr, setQr] = useState("");
  useEffect(() => {
    QRCode.toDataURL(`lightning:${address}`, { margin: 1, width: 180, color: { dark: "#fff", light: "#111" } })
      .then(setQr).catch(() => {});
  }, [address]);
  return qr ? <img src={qr} alt="Lightning QR" className="w-40 h-40 rounded-lg mx-auto"/> : null;
}
