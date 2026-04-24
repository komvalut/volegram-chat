import { useState } from "react";
import { MessageCircle, Zap, Shield, Coins, ArrowRight, Camera, Sparkles } from "lucide-react";
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
    if (!addr.trim()) { setErr("Enter your Lightning address"); return; }
    setLoading(true); setErr("");
    try {
      const { user: u, isNew } = await api.login(addr.trim().toLowerCase());
      setUser(u);
      setUname(u.username);
      if (isNew) setStep("profile");
      else onLogin(u);
    } catch (err: any) {
      const msg = err.message ?? "";
      setErr(msg.includes("suspended") ? "Account suspended — contact admin" : "Login failed. Try again.");
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
    <div className="h-full overflow-y-auto bg-[var(--bg)] flex flex-col items-center px-4 py-8 relative">
      {/* Soft accent glow background */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full"
           style={{ background: "radial-gradient(circle, rgba(247,147,26,0.10) 0%, transparent 60%)" }} />

      <div className="relative z-10 w-full max-w-md mt-4">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
               style={{ background: "linear-gradient(135deg, #F7931A 0%, #FF6B00 100%)",
                        boxShadow: "0 12px 32px rgba(247,147,26,0.35)" }}>
            <span className="text-3xl">⚡</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--text)] tracking-tight">
            <span className="accent-text-gradient">Volegram</span>
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">
            Bitcoin Lightning Chat · Zero KYC
          </p>
        </div>

        {step === "address" && (
          <>
            <div className="grid grid-cols-2 gap-2 mb-6">
              <div className="feature-pill"><MessageCircle size={16}/> Real-time chat</div>
              <div className="feature-pill"><Zap size={16}/> Instant sats</div>
              <div className="feature-pill"><Shield size={16}/> No KYC ever</div>
              <div className="feature-pill"><Coins size={16}/> +1000 sats free</div>
            </div>

            <div className="surface-card-elevated p-6">
              <form onSubmit={handleAddress} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Your Lightning Address
                  </label>
                  <input
                    value={addr}
                    onChange={e => setAddr(e.target.value)}
                    placeholder="you@walletofsatoshi.com"
                    className="input-modern font-mono text-sm"
                    autoFocus
                  />
                  <p className="text-xs text-[var(--text-dim)] mt-2">
                    Use any Lightning address — no email or phone needed.
                  </p>
                </div>

                {err && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                    {err}
                  </div>
                )}

                <button type="submit" disabled={loading || !addr.trim()} className="btn-accent w-full">
                  {loading ? "Connecting…" : (<><Sparkles size={16}/> Enter Volegram <ArrowRight size={16}/></>)}
                </button>
              </form>
            </div>

            {/* Examples */}
            <p className="text-center text-xs text-[var(--text-dim)] mt-5">
              Examples: <span className="font-mono text-[var(--text-muted)]">user@walletofsatoshi.com</span> ·{" "}
              <span className="font-mono text-[var(--text-muted)]">you@blink.sv</span>
            </p>
          </>
        )}

        {step === "profile" && (
          <div className="surface-card-elevated p-6 animate-slide-up">
            <p className="text-sm text-[var(--text-muted)] mb-5 text-center">
              Welcome! Set up your profile <span className="text-[var(--text-dim)]">— or skip and start chatting.</span>
            </p>
            <form onSubmit={handleProfile} className="space-y-4">
              <div className="flex justify-center mb-2">
                <label className="cursor-pointer relative group">
                  <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
                       style={{ background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)" }}>
                    {avatarPrev
                      ? <img src={avatarPrev} className="w-full h-full object-cover" alt="avatar"/>
                      : <span className="text-4xl text-black font-extrabold">{username.slice(0,1).toUpperCase() || "?"}</span>
                    }
                  </div>
                  <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera size={20} className="text-white"/>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatar}/>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Username</label>
                <input value={username} onChange={e => setUname(e.target.value.replace(/[^a-zA-Z0-9_]/g,"").slice(0,30))}
                  placeholder="satoshi_nakamoto" className="input-modern font-mono text-sm"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Bio <span className="text-[var(--text-dim)] font-normal normal-case">(optional)</span>
                </label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} maxLength={160}
                  placeholder="Bitcoin maximalist since 2013…" className="input-modern resize-none text-sm"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                    Email <span className="text-[var(--text-dim)] font-normal normal-case">(opt)</span>
                  </label>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="optional"
                    className="input-modern text-sm"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                    Phone <span className="text-[var(--text-dim)] font-normal normal-case">(opt)</span>
                  </label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="optional"
                    className="input-modern text-sm"/>
                </div>
              </div>

              {err && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{err}</div>
              )}

              <button type="submit" disabled={loading} className="btn-accent w-full">
                {loading ? "Saving…" : (<><Sparkles size={16}/> Enter Volegram</>)}
              </button>
              <button type="button" onClick={() => onLogin(user)} className="w-full text-sm text-[var(--text-muted)] hover:text-[var(--text)] py-2 font-medium transition-colors">
                Skip for now →
              </button>
            </form>
          </div>
        )}

        {/* Invite footer */}
        <div className="surface-card mt-6 px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: "var(--accent-dim)" }}>
            <Zap size={18} className="accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text)]">Invite friends</p>
            <p className="text-xs text-[var(--text-muted)] truncate">Share Volegram. No sign-up. Just Bitcoin.</p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.origin);
              alert("Link copied — share it!");
            }}
            className="shrink-0 text-xs font-bold uppercase tracking-wide px-3 py-2 rounded-lg accent-gradient"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}
