import { useEffect, useState } from "react";
import { X, Gift, Send, Ticket, Copy, Check, Sparkles, Shuffle } from "lucide-react";
import { api } from "../lib/api";

type Currency = { code: string; symbol: string; name: string };
type PaymentMethod = { code: string; name: string; instant: boolean; disabled?: boolean };
type Voucher = {
  id: number;
  code: string;
  amount: string;
  currency: string;
  payment_method: string;
  status: string;
  creator_username?: string;
  owner_username?: string;
  message?: string;
  created_at: string;
};

function jitter(amount: number, currency: string): number {
  if (currency === "SATS") return Math.floor(amount) + Math.floor(Math.random() * 99) + 1;
  const cents = Math.floor(Math.random() * 99) + 1;
  return Math.floor(amount) + cents / 100;
}

function formatAmount(amount: number | string, currency: string, symbol: string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (currency === "SATS") return `${symbol} ${Math.floor(n).toLocaleString()}`;
  return `${symbol}${n.toFixed(2)}`;
}

export default function VouchersPanel({
  user, onClose,
}: { user: any; onClose: () => void }) {
  const [tab, setTab]                     = useState<"buy"|"my"|"redeem">("buy");
  const [currencies, setCurrencies]       = useState<Currency[]>([]);
  const [paymentMethods, setPayMethods]   = useState<PaymentMethod[]>([]);
  const [bank, setBank]                   = useState<any>(null);

  // Buy form
  const [amount, setAmount]               = useState<string>("");
  const [currency, setCurrency]           = useState("EUR");
  const [paymentMethod, setPayMethod]     = useState("lightning");
  const [recipient, setRecipient]         = useState("");
  const [message, setMessage]             = useState("");
  const [buying, setBuying]               = useState(false);
  const [createdVoucher, setCreated]      = useState<any>(null);

  // My vouchers
  const [myVouchers, setMyVouchers]       = useState<Voucher[]>([]);
  const [copiedCode, setCopiedCode]       = useState<string | null>(null);
  const [sendModal, setSendModal]         = useState<Voucher | null>(null);
  const [sendTo, setSendTo]               = useState("");

  // Redeem
  const [redeemCode, setRedeemCode]       = useState("");
  const [redeemMsg, setRedeemMsg]         = useState<string | null>(null);

  const [error, setError]                 = useState("");

  useEffect(() => {
    api.voucherCurrencies().then(d => {
      setCurrencies(d.currencies);
      setPayMethods(d.paymentMethods);
    });
    api.publicSettings().then(d => setBank(d.bank)).catch(() => {});
    refreshMy();
  }, []);

  const refreshMy = () => api.voucherList().then(d => setMyVouchers(d.vouchers)).catch(() => {});

  const handleRandomize = () => {
    const base = parseFloat(amount) || (currency === "SATS" ? 1000 : 5);
    setAmount(jitter(base, currency).toString());
  };

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!amount || parseFloat(amount) <= 0) { setError("Enter an amount"); return; }
    setBuying(true);
    try {
      const final = jitter(parseFloat(amount), currency);
      const r = await api.voucherCreate({
        amount: final, currency, paymentMethod,
        recipientUsername: recipient.trim() || undefined,
        message: message.trim() || undefined,
      });
      setCreated(r.voucher);
      refreshMy();
    } catch (err: any) {
      setError(err.message || "Failed to create voucher");
    } finally { setBuying(false); }
  };

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedCode(txt);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  const handleSend = async () => {
    if (!sendModal || !sendTo.trim()) return;
    try {
      await api.voucherSend(sendModal.id, sendTo.trim());
      setSendModal(null); setSendTo("");
      refreshMy();
    } catch (e: any) {
      alert(e.message || "Send failed");
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setRedeemMsg(null); setError("");
    try {
      const r = await api.voucherRedeem(redeemCode.trim().toUpperCase());
      setRedeemMsg(`✓ Redeemed! +${r.satsCredited.toLocaleString()} sats added (commission: ${r.commissionSats} sats).`);
      setRedeemCode("");
      refreshMy();
    } catch (e: any) {
      setError(e.message || "Redeem failed");
    }
  };

  const symbol = (cur: string) => currencies.find(c => c.code === cur)?.symbol ?? cur;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-3xl w-full max-w-lg my-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between"
             style={{ background: "linear-gradient(135deg, #F7931A 0%, #FF6B00 100%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black/20 flex items-center justify-center">
              <Ticket size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">Volegram Vouchers</h2>
              <p className="text-xs text-white/80">Buy · Send · Redeem · Any amount</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-black/10">
            <X size={20}/>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200 px-2">
          {[
            { k: "buy",    label: "Buy",    icon: <Sparkles size={14}/> },
            { k: "my",     label: "My VV",  icon: <Gift size={14}/> },
            { k: "redeem", label: "Redeem", icon: <Ticket size={14}/> },
          ].map(t => (
            <button key={t.k} onClick={() => { setTab(t.k as any); setError(""); setCreated(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
                tab === t.k ? "text-[var(--accent)] border-b-2 border-[var(--accent)]" : "text-neutral-500 hover:text-neutral-900"
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-4">
          {error && <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}

          {/* ───── BUY ───── */}
          {tab === "buy" && !createdVoucher && (
            <form onSubmit={handleBuy} className="space-y-4">
              {/* Currency picker */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">Currency</label>
                <div className="grid grid-cols-4 gap-2">
                  {currencies.map(c => (
                    <button key={c.code} type="button" onClick={() => setCurrency(c.code)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        currency === c.code
                          ? "bg-black text-white shadow-md"
                          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                      }`}>
                      <div className="text-base">{c.symbol}</div>
                      <div className="text-[10px] opacity-70">{c.code}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">
                  Amount <span className="text-neutral-400 font-normal normal-case">(any value, no minimum)</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-neutral-500">
                      {symbol(currency)}
                    </span>
                    <input type="number" step="any" min="0" value={amount} onChange={e => setAmount(e.target.value)}
                      placeholder={currency === "SATS" ? "1000" : "1.45"}
                      className="input-modern pl-12 text-2xl font-bold font-mono" />
                  </div>
                  <button type="button" onClick={handleRandomize}
                    className="px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors flex items-center gap-2 font-semibold text-sm"
                    title="Randomize to non-round amount">
                    <Shuffle size={16}/>
                  </button>
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  Final amount auto-jittered to a unique non-round value (e.g. {currency === "SATS" ? "1.047 sats" : `${symbol(currency)}1.45`}).
                </p>
              </div>

              {/* Payment method */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">Payment Method</label>
                <div className="space-y-2">
                  {paymentMethods.map(pm => (
                    <button key={pm.code} type="button" disabled={pm.disabled}
                      onClick={() => !pm.disabled && setPayMethod(pm.code)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                        pm.disabled ? "opacity-50 cursor-not-allowed bg-neutral-50 border-neutral-200" :
                        paymentMethod === pm.code
                          ? "bg-black text-white border-black shadow-md"
                          : "bg-white border-neutral-200 hover:border-neutral-400"
                      }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{pm.name}</span>
                        {pm.instant && <span className="text-[10px] uppercase tracking-wider bg-green-500/20 text-green-700 px-2 py-0.5 rounded-full font-bold">Instant</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional gift */}
              <details className="rounded-xl bg-neutral-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-neutral-700">
                  🎁 Send as gift (optional)
                </summary>
                <div className="mt-3 space-y-2">
                  <input value={recipient} onChange={e => setRecipient(e.target.value)}
                    placeholder="Recipient @username" className="input-modern text-sm" />
                  <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2} maxLength={200}
                    placeholder="Personal message…" className="input-modern resize-none text-sm" />
                </div>
              </details>

              <button type="submit" disabled={buying} className="btn-accent w-full">
                {buying ? "Creating…" : <><Sparkles size={16}/> Create Voucher</>}
              </button>
            </form>
          )}

          {/* Created voucher confirmation */}
          {tab === "buy" && createdVoucher && (
            <div className="space-y-4 animate-slide-up">
              <div className="rounded-2xl p-5 text-white"
                   style={{ background: "linear-gradient(135deg, #F7931A 0%, #FF6B00 100%)" }}>
                <div className="text-xs uppercase tracking-wider opacity-80 font-bold mb-1">Voucher Created</div>
                <div className="text-3xl font-extrabold mb-3">
                  {formatAmount(createdVoucher.amount, createdVoucher.currency, symbol(createdVoucher.currency))}
                </div>
                <div className="bg-black/20 rounded-xl p-3 flex items-center justify-between">
                  <code className="font-mono text-sm font-bold tracking-wide">{createdVoucher.code}</code>
                  <button onClick={() => copy(createdVoucher.code)} className="p-2 hover:bg-white/20 rounded-lg">
                    {copiedCode === createdVoucher.code ? <Check size={16}/> : <Copy size={16}/>}
                  </button>
                </div>
              </div>

              {createdVoucher.payment_method === "bank" && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm">
                  <div className="font-bold text-amber-900 mb-2">⏳ Bank Transfer Pending</div>
                  <p className="text-amber-800 mb-3">Send the exact amount to:</p>
                  <div className="space-y-1 font-mono text-xs">
                    <div><span className="font-bold text-neutral-700">IBAN:</span> {bank?.iban || "(admin not configured)"}</div>
                    <div><span className="font-bold text-neutral-700">Holder:</span> {bank?.holder || "—"}</div>
                    <div><span className="font-bold text-neutral-700">Bank:</span> {bank?.name || "—"} {bank?.swift ? `(${bank.swift})` : ""}</div>
                    <div><span className="font-bold text-neutral-700">Reference:</span> {createdVoucher.code}</div>
                  </div>
                  <p className="text-xs text-amber-800 mt-2">Voucher activates after admin confirms receipt.</p>
                </div>
              )}

              {createdVoucher.payment_method === "lightning" && (
                <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm">
                  <div className="font-bold text-green-900 mb-1">⚡ Active</div>
                  <p className="text-green-800">Voucher is ready. Share the code or send it to a user.</p>
                </div>
              )}

              <button onClick={() => { setCreated(null); setAmount(""); setRecipient(""); setMessage(""); setTab("my"); }}
                className="btn-primary w-full">
                Done — View My Vouchers
              </button>
            </div>
          )}

          {/* ───── MY VOUCHERS ───── */}
          {tab === "my" && (
            <div className="space-y-3">
              {myVouchers.length === 0 ? (
                <div className="text-center py-10 text-neutral-500 text-sm">
                  No vouchers yet. Buy your first one in the Buy tab.
                </div>
              ) : myVouchers.map(v => (
                <div key={v.id} className="surface-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl font-extrabold text-black">
                          {formatAmount(v.amount, v.currency, symbol(v.currency))}
                        </span>
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                          v.status === "active"   ? "bg-green-100 text-green-800" :
                          v.status === "pending"  ? "bg-amber-100 text-amber-800" :
                          v.status === "redeemed" ? "bg-neutral-200 text-neutral-700" :
                          "bg-red-100 text-red-700"
                        }`}>{v.status}</span>
                      </div>
                      <code className="text-xs font-mono text-neutral-600">{v.code}</code>
                      <p className="text-xs text-neutral-500 mt-1">
                        {v.creator_username === user.username ? "Created by you" : `From @${v.creator_username}`}
                        {v.owner_username && v.owner_username !== v.creator_username && ` → @${v.owner_username}`}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button onClick={() => copy(v.code)} className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200" title="Copy code">
                        {copiedCode === v.code ? <Check size={14}/> : <Copy size={14}/>}
                      </button>
                      {v.status === "active" && v.owner_username === user.username && (
                        <button onClick={() => { setSendModal(v); setSendTo(""); }} className="p-2 rounded-lg bg-black text-white hover:bg-neutral-800" title="Send as gift">
                          <Send size={14}/>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ───── REDEEM ───── */}
          {tab === "redeem" && (
            <form onSubmit={handleRedeem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">Voucher Code</label>
                <input value={redeemCode} onChange={e => setRedeemCode(e.target.value.toUpperCase())}
                  placeholder="VV-XXXX-XXXX-XXXX"
                  className="input-modern font-mono text-base" />
                <p className="text-xs text-neutral-500 mt-2">Enter the code to credit your balance in sats.</p>
              </div>
              {redeemMsg && (
                <div className="rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800 font-medium">{redeemMsg}</div>
              )}
              <button type="submit" disabled={!redeemCode.trim()} className="btn-accent w-full">
                <Sparkles size={16}/> Redeem to Sats
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Send modal */}
      {sendModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={() => setSendModal(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-extrabold">Send Voucher</h3>
            <p className="text-sm text-neutral-600">
              Gift <strong>{formatAmount(sendModal.amount, sendModal.currency, symbol(sendModal.currency))}</strong> to a user.
            </p>
            <input value={sendTo} onChange={e => setSendTo(e.target.value)}
              placeholder="@username" className="input-modern" autoFocus />
            <div className="flex gap-2">
              <button onClick={() => setSendModal(null)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={handleSend} disabled={!sendTo.trim()} className="btn-accent flex-1">Send Gift</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
