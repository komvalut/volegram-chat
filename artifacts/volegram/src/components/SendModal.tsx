import { useState } from "react";
import { X, Zap, Send, Check, ArrowRight, Search, User } from "lucide-react";

interface Props {
  userBalance: number;
  onClose: () => void;
  onSent?: (sats: number) => void;
}

export default function SendModal({ userBalance, onClose, onSent }: Props) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount]       = useState("");
  const [step, setStep]           = useState<"form" | "confirm" | "done">("form");
  const [error, setError]         = useState("");
  const [sending, setSending]     = useState(false);
  const [result, setResult]       = useState<{ to: string; to_lightning?: string } | null>(null);

  const amtNum = parseInt(amount) || 0;
  const isUsername = !recipient.includes("@") || recipient.startsWith("@");
  const valid = recipient.trim().length >= 2 && amtNum >= 1 && amtNum <= userBalance;

  const submit = async () => {
    if (!valid || sending) return;
    setSending(true); setError("");
    try {
      const r = await fetch("/api/wallet/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: recipient.trim(), amount_sats: amtNum }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "Send failed"); setSending(false); return; }
      setResult(d);
      setStep("done");
      onSent?.(amtNum);
    } catch {
      setError("Network error. Check your connection.");
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center"
         style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
         onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-10 space-y-5 animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center">
              <Send size={16} className="text-[#F7931A]"/>
            </div>
            <div>
              <p className="font-extrabold text-black text-base">Send Bitcoin</p>
              <p className="text-[10px] text-neutral-400 font-medium">Internal VBC transfer · instant</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-neutral-100 active:bg-neutral-200 transition-colors">
            <X size={18} className="text-neutral-500"/>
          </button>
        </div>

        {step === "form" && (
          <>
            {/* Balance */}
            <div className="bg-black rounded-2xl px-4 py-3 flex items-center gap-2">
              <Zap size={14} fill="#F7931A" className="text-[#F7931A]"/>
              <span className="text-xs font-bold text-neutral-400">Available:</span>
              <span className="text-sm font-extrabold text-white">⚡ {userBalance.toLocaleString()} sats</span>
            </div>

            <div className="space-y-4">
              {/* Recipient */}
              <div>
                <label className="block text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider mb-2">
                  Recipient
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                    {isUsername ? <User size={14} className="text-neutral-400"/> : <Zap size={14} className="text-neutral-400"/>}
                  </div>
                  <input
                    value={recipient}
                    onChange={e => { setRecipient(e.target.value); setError(""); }}
                    placeholder="@username or user@wallet.com"
                    className="w-full pl-9 pr-4 border border-neutral-200 rounded-2xl px-4 py-3.5 text-sm font-mono outline-none focus:border-black transition-colors"
                  />
                </div>
                <p className="text-[10px] text-neutral-400 mt-1.5">
                  Enter a Volegram username (e.g. <span className="font-mono">@satoshi</span>) or Lightning address
                </p>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider mb-2">
                  Amount (sats)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => { setAmount(e.target.value); setError(""); }}
                  placeholder="1000"
                  min="1"
                  className="w-full border border-neutral-200 rounded-2xl px-4 py-3.5 text-sm font-mono outline-none focus:border-black transition-colors"
                />
                <div className="flex gap-2 mt-2 flex-wrap">
                  {[1000, 5000, 10000, 21000].map(v => (
                    <button key={v} type="button" onClick={() => setAmount(String(v))}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                        amtNum === v ? "bg-black text-white border-black" : "border-neutral-200 text-neutral-500 hover:border-black"
                      }`}>
                      {v.toLocaleString()}
                    </button>
                  ))}
                </div>
                {amtNum > userBalance && amtNum > 0 && (
                  <p className="text-[11px] text-red-500 mt-1.5 font-semibold">Insufficient balance</p>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700 font-medium">
                {error}
              </div>
            )}

            <button
              onClick={() => valid && setStep("confirm")}
              disabled={!valid}
              className="w-full font-extrabold py-4 rounded-2xl text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40"
              style={{ background: valid ? "linear-gradient(135deg,#F7931A,#FF6B00)" : "#e5e5e5", color: valid ? "white" : "#999" }}>
              Continue <ArrowRight size={15}/>
            </button>
          </>
        )}

        {step === "confirm" && (
          <>
            <div className="bg-neutral-50 rounded-2xl p-5 space-y-3.5 border border-neutral-200">
              <p className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">Confirm Transfer</p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500">To</span>
                <span className="text-sm font-extrabold text-black font-mono">{recipient.startsWith("@") ? recipient : `@${recipient}`}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500">Amount</span>
                <span className="text-lg font-extrabold text-black">⚡ {amtNum.toLocaleString()} <span className="text-sm text-neutral-400">sats</span></span>
              </div>
              <div className="flex items-center justify-between border-t border-neutral-200 pt-3">
                <span className="text-xs font-bold text-neutral-500">Remaining</span>
                <span className="text-xs font-extrabold text-neutral-600">⚡ {(userBalance - amtNum).toLocaleString()} sats</span>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700 font-medium">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setStep("form")}
                className="bg-neutral-100 text-black font-extrabold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform">
                Back
              </button>
              <button onClick={submit} disabled={sending}
                className="text-white font-extrabold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#F7931A,#FF6B00)" }}>
                {sending ? "Sending…" : "Confirm Send"}
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <div className="text-center py-8 space-y-5">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check size={32} className="text-green-600"/>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-black">Sent!</p>
              <p className="text-sm text-neutral-500 mt-2">
                ⚡ <span className="font-bold text-black">{amtNum.toLocaleString()} sats</span> sent to{" "}
                <span className="font-bold text-black">@{result?.to ?? recipient}</span>
              </p>
              {result?.to_lightning && (
                <p className="text-[10px] text-neutral-400 font-mono mt-1">{result.to_lightning}</p>
              )}
            </div>
            <button onClick={onClose}
              className="w-full text-white font-extrabold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform"
              style={{ background: "linear-gradient(135deg,#F7931A,#FF6B00)" }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
