import { useState } from "react";
import { X, Zap, Send, Check, ArrowRight } from "lucide-react";

interface Props {
  userBalance: number;
  onClose: () => void;
}

export default function SendModal({ userBalance, onClose }: Props) {
  const [address, setAddress] = useState("");
  const [amount, setAmount]   = useState("");
  const [step, setStep]       = useState<"form" | "confirm" | "done">("form");
  const [error, setError]     = useState("");

  const valid = address.includes("@") && parseInt(amount) > 0 && parseInt(amount) <= userBalance;

  const submit = async () => {
    if (!valid) return;
    setError("");
    try {
      const r = await fetch("/api/wallet/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, amount_sats: parseInt(amount) }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.error ?? "Send failed. Please try again.");
        return;
      }
      setStep("done");
    } catch {
      setError("Network error. Check your connection.");
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center"
         style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
         onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-8 space-y-5">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center">
              <Send size={15} className="text-[#F7931A]"/>
            </div>
            <div>
              <p className="font-extrabold text-black text-sm">Send Bitcoin</p>
              <p className="text-[10px] text-neutral-400">via Lightning Network</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-neutral-100">
            <X size={18} className="text-neutral-500"/>
          </button>
        </div>

        {step === "form" && (
          <>
            <div className="bg-neutral-50 rounded-2xl px-4 py-3 flex items-center gap-2">
              <Zap size={13} className="text-[#F7931A]"/>
              <span className="text-xs font-bold text-neutral-500">Balance:</span>
              <span className="text-xs font-extrabold text-black">⚡ {userBalance.toLocaleString()} sats</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Recipient Lightning Address
                </label>
                <input
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="user@wallet.example"
                  className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Amount (sats)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="1000"
                  className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-black"
                />
                {amount && parseInt(amount) > userBalance && (
                  <p className="text-[11px] text-red-500 mt-1">Insufficient balance</p>
                )}
              </div>
            </div>

            {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}

            <button
              onClick={() => valid && setStep("confirm")}
              disabled={!valid}
              className="w-full bg-black text-white font-extrabold py-4 rounded-2xl text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40"
            >
              Continue <ArrowRight size={15}/>
            </button>
          </>
        )}

        {step === "confirm" && (
          <>
            <div className="bg-neutral-50 rounded-2xl p-5 space-y-3 border border-neutral-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500">To</span>
                <span className="text-xs font-mono text-black">{address}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500">Amount</span>
                <span className="text-sm font-extrabold text-black">⚡ {parseInt(amount).toLocaleString()} sats</span>
              </div>
              <div className="flex items-center justify-between border-t border-neutral-200 pt-3">
                <span className="text-xs font-bold text-neutral-500">Remaining balance</span>
                <span className="text-xs font-extrabold text-neutral-700">⚡ {(userBalance - parseInt(amount)).toLocaleString()} sats</span>
              </div>
            </div>

            {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setStep("form")}
                className="bg-neutral-100 text-black font-extrabold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform">
                Back
              </button>
              <button onClick={submit}
                className="bg-black text-white font-extrabold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform"
                style={{ background: "linear-gradient(135deg,#F7931A,#FF6B00)" }}>
                Confirm Send
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check size={28} className="text-green-600"/>
            </div>
            <div>
              <p className="text-xl font-extrabold text-black">Sent!</p>
              <p className="text-sm text-neutral-500 mt-1">⚡ {parseInt(amount).toLocaleString()} sats → {address}</p>
            </div>
            <button onClick={onClose}
              className="w-full bg-black text-white font-extrabold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
