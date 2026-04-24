import { useState } from "react";
import { MessageCircle, Zap, Shield, Coins, ArrowRight, Camera } from "lucide-react";
import { api, uploadFile } from "../lib/api";

type Step = "address" | "profile";

export default function Login({ onLogin }: { onLogin: (u: any) => void }) {
  const [step, setStep]       = useState<Step>("address");
  const [addr, setAddr]       = useState("");
  const [username, setUname]  = useState("");
  const [bio, setBio]         = useState("");
  const [email, setEmail]     = useState("");
  const [phone, setPhone]     = useState("");
  const [avatarUrl, setAvUrl] = useState("");
  const [avatarPrev, setAvPr] = useState("");
  const [user, setUser]       = useState<any>(null);
  const [err, setErr]         = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addr.trim()) { setErr("Enter your address"); return; }
    setLoading(true); setErr("");
    try {
      const { user: u, isNew } = await api.login(addr.trim().toLowerCase());
      setUser(u);
      setUname(u.username);
      if (isNew) setStep("profile");
      else onLogin(u);
    } catch (err: any) {
      const msg = err.message ?? "";
      setErr(msg.includes("suspended") ? "⛔ Account suspended — contact admin" : "Login failed");
    } finally { setLoading(false); }
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvPr(URL.createObjectURL(file));
    const url = await uploadFile(file);
    setAvUrl(url);
  };

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErr("");
    try {
      const { user: updated } = await api.updateProfile({
        username: username.trim() || undefined,
        bio:      bio.trim()      || undefined,
        email:    email.trim()    || undefined,
        phone:    phone.trim()    || undefined,
        avatarUrl: avatarUrl      || undefined,
      });
      onLogin(updated);
    } catch (err: any) {
      const msg = err.message ?? "";
      setErr(msg.includes("taken") ? "Username already taken" : "Update failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="h-full bg-black flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Subtle grid */}
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.02)_0,rgba(255,255,255,0.02)_1px,transparent_1px,transparent_3px)]" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo — ⚡ with BTC below */}
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center mb-4">
            <span className="text-white text-5xl leading-none">⚡</span>
            <span className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase mt-1">BTC</span>
          </div>
          <h1 className="text-2xl font-black tracking-[0.2em] text-white uppercase mb-1">VBC</h1>
          <p className="text-xs tracking-widest text-neutral-500 uppercase">Volegram Bitcoin Chat</p>
          <p className="text-xs text-neutral-700 mt-1">Zero KYC · Lightning Native · P2P</p>
        </div>

        {step === "address" && (
          <>
            <div className="grid grid-cols-2 gap-1.5 mb-6">
              {[
                { icon: <MessageCircle size={13}/>, t: "Real-time Chat" },
                { icon: <Zap size={13}/>, t: "Send Sats" },
                { icon: <Shield size={13}/>, t: "No KYC" },
                { icon: <Coins size={13}/>, t: "+1000 sats bonus" },
              ].map(f => (
                <div key={f.t} className="flex items-center gap-2 bg-white/3 border border-white/8 px-3 py-2.5 text-xs text-neutral-400">
                  <span className="text-white">{f.icon}</span>{f.t}
                </div>
              ))}
            </div>

            <form onSubmit={handleAddress} className="space-y-3">
              <div>
                <label className="block text-xs text-neutral-500 uppercase tracking-widest mb-1.5">Lightning Address</label>
                <input
                  value={addr} onChange={e => setAddr(e.target.value)}
                  placeholder="you@walletofsatoshi.com"
                  className="w-full bg-[#080808] border border-[#2a2a2a] text-white text-base px-3 py-3 outline-none focus:border-white font-mono placeholder:text-neutral-800 transition-colors"
                />
              </div>
              {err && <p className="text-sm text-red-500">{err}</p>}
              <button type="submit" disabled={loading || !addr}
                className="w-full bg-white text-black font-black uppercase tracking-widest text-sm py-3.5 hover:bg-neutral-200 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                {loading ? "CONNECTING…" : <><span>ENTER VBC</span><ArrowRight size={14}/></>}
              </button>
            </form>
            <div className="mt-5 border border-[#1e1e1e] bg-[#080808] px-4 py-3">
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                <span style={{ color: "var(--accent)" }}>⚡ Note:</span> A <strong className="text-neutral-300">valid Lightning address</strong> is required for sending sats and Lightning payments to work. We accept any input — if your address doesn't work, that's on you.
              </p>
              <p className="text-[10px] text-neutral-700 mt-1.5">
                Examples: <span className="font-mono">user@walletofsatoshi.com</span> · <span className="font-mono">you@muun.com</span> · <span className="font-mono">satoshi@blink.sv</span>
              </p>
            </div>
          </>
        )}

        {step === "profile" && (
          <>
            <p className="text-sm text-neutral-500 mb-5 text-center">Welcome! Set up your profile to continue.</p>
            <form onSubmit={handleProfile} className="space-y-3">
              {/* Avatar */}
              <div className="flex justify-center mb-2">
                <label className="cursor-pointer relative group">
                  <div className="w-20 h-20 rounded-full border-2 border-white/20 overflow-hidden bg-[#111] flex items-center justify-center">
                    {avatarPrev
                      ? <img src={avatarPrev} className="w-full h-full object-cover" alt="avatar"/>
                      : <span className="text-3xl text-white font-black">{username.slice(0,1).toUpperCase() || "?"}</span>
                    }
                  </div>
                  <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera size={18} className="text-white"/>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatar}/>
                </label>
              </div>

              <div>
                <label className="block text-xs text-neutral-500 uppercase tracking-widest mb-1">Username</label>
                <input value={username} onChange={e => setUname(e.target.value.replace(/[^a-zA-Z0-9_]/g,"").slice(0,30))}
                  placeholder="satoshi_nakamoto"
                  className="w-full bg-[#080808] border border-[#2a2a2a] text-white text-base px-3 py-2.5 outline-none focus:border-white font-mono"/>
              </div>
              <div>
                <label className="block text-xs text-neutral-500 uppercase tracking-widest mb-1">Bio <span className="text-neutral-700">(optional)</span></label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} maxLength={160}
                  placeholder="Bitcoin maximalist, hodler since 2013…"
                  className="w-full bg-[#080808] border border-[#2a2a2a] text-white text-sm px-3 py-2.5 outline-none focus:border-white font-mono resize-none"/>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-neutral-500 uppercase tracking-widest mb-1">Email <span className="text-neutral-700">(opt)</span></label>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="private@mail.com"
                    className="w-full bg-[#080808] border border-[#2a2a2a] text-white text-sm px-2 py-2 outline-none focus:border-white font-mono"/>
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 uppercase tracking-widest mb-1">Phone <span className="text-neutral-700">(opt)</span></label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+387…"
                    className="w-full bg-[#080808] border border-[#2a2a2a] text-white text-sm px-2 py-2 outline-none focus:border-white font-mono"/>
                </div>
              </div>
              {err && <p className="text-sm text-red-500">{err}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-white text-black font-black uppercase tracking-widest text-sm py-3.5 hover:bg-neutral-200 disabled:opacity-40 transition-colors">
                {loading ? "SAVING…" : "ENTER VBC ⚡"}
              </button>
              <button type="button" onClick={() => onLogin(user)} className="w-full text-xs text-neutral-600 hover:text-neutral-400 py-2">
                Skip for now →
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
