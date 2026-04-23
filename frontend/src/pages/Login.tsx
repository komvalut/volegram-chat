import { useState } from "react";
import { Zap, Shield, MessageCircle, Coins } from "lucide-react";
import { api } from "../lib/api";

export default function Login({ onLogin }: { onLogin: (u: any) => void }) {
  const [addr, setAddr]   = useState("");
  const [err, setErr]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addr.includes("@")) { setErr("Enter a valid Lightning address (user@wallet.com)"); return; }
    setLoading(true); setErr("");
    try {
      const { user } = await api.login(addr.trim().toLowerCase());
      onLogin(user);
    } catch {
      setErr("Login failed — try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-black flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Scanlines */}
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_3px)]" />

      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#FF6A00]/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-3">⚡</div>
          <h1 className="text-3xl font-black tracking-widest text-[#FF6A00] neon-text uppercase">VOLEGRAM</h1>
          <p className="text-xs text-neutral-500 mt-1 tracking-wider">Lightning P2P Chat · Zero KYC</p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-2 mb-8">
          {[
            { icon: <MessageCircle size={14}/>, label: "Real-time Chat" },
            { icon: <Zap size={14}/>, label: "Send Sats" },
            { icon: <Shield size={14}/>, label: "No KYC" },
            { icon: <Coins size={14}/>, label: "Earn Rewards" },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-2 bg-white/3 border border-white/5 px-3 py-2 text-xs text-neutral-400">
              <span className="text-[#FF6A00]">{f.icon}</span>
              {f.label}
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="block text-xs text-neutral-500 uppercase tracking-widest mb-1">Lightning Address</label>
            <input
              value={addr}
              onChange={e => setAddr(e.target.value)}
              placeholder="satoshi@wallet.satoshi.com"
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#f0f0f0] text-sm px-3 py-2.5 outline-none focus:border-[#FF6A00] transition-colors placeholder:text-neutral-700 font-mono"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {err && <p className="text-xs text-red-500">{err}</p>}

          <button
            type="submit"
            disabled={loading || !addr}
            className="w-full bg-[#FF6A00] text-black font-black uppercase tracking-widest text-sm py-3 hover:bg-[#e55500] disabled:opacity-40 transition-colors"
          >
            {loading ? "CONNECTING…" : "ENTER VOLEGRAM ⚡"}
          </button>
        </form>

        <p className="text-center text-xs text-neutral-700 mt-6">
          Your Lightning address is your identity.<br />
          No password needed. +1000 sats welcome bonus.
        </p>
      </div>
    </div>
  );
}
