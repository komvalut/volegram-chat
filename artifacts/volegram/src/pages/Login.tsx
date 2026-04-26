import { useState, useRef, useEffect } from "react";
import { MessageCircle, Zap, Shield, Coins, ArrowRight, Camera, Sparkles, KeyRound, Phone, ChevronDown, Search, Copy, Download, Smartphone, Monitor } from "lucide-react";
import { api, uploadFile } from "../lib/api";
import HowItWorks from "../components/HowItWorks";
import { COUNTRIES_SORTED, type Country } from "../lib/countries";

type Step = "address" | "profile";
type Mode = "lightning" | "otp";
type OtpSubMode = "identifier" | "phone";

export default function Login({ onLogin }: { onLogin: (u: any) => void }) {
  const [step, setStep]       = useState<Step>("address");
  const [pwaPrompt, setPwaPrompt]   = useState<any>(null);
  const [isIOS, setIsIOS]           = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [mode, setMode]       = useState<Mode>("lightning");
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

  const [otpSubMode, setOtpSubMode] = useState<OtpSubMode>("identifier");
  const [otpId, setOtpId]     = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpDevCode, setOtpDevCode] = useState<string | null>(null);
  const [otpNote, setOtpNote] = useState<string>("");

  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES_SORTED[0]);
  const [phoneNum, setPhoneNum] = useState("");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowCountryPicker(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone) {
      setIsInstalled(true); return;
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);
    if (!ios) {
      const handler = (e: any) => { e.preventDefault(); setPwaPrompt(e); };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  const handleInstall = async () => {
    if (isIOS) { setShowIOSHint(h => !h); return; }
    if (!pwaPrompt) { window.open(window.location.href, "_blank"); return; }
    pwaPrompt.prompt();
    const { outcome } = await pwaPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setPwaPrompt(null);
  };

  const filteredCountries = COUNTRIES_SORTED.filter(c =>
    !countrySearch || c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.dial.includes(countrySearch)
  );

  const getOtpIdentifier = () =>
    otpSubMode === "phone" ? `${selectedCountry.dial}${phoneNum.replace(/^0/, "")}` : otpId.trim();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = getOtpIdentifier();
    if (!identifier) { setErr("Enter your contact info"); return; }
    setLoading(true); setErr("");
    try {
      const r = await api.otpRequest(identifier);
      setOtpSent(true);
      setOtpDevCode(r.devCode ?? null);
      setOtpNote(r.note ?? "");
    } catch (e: any) {
      setErr(e.message || "Failed to send code");
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) { setErr("Enter the 6-digit code"); return; }
    setLoading(true); setErr("");
    try {
      const identifier = getOtpIdentifier();
      const r = await api.otpVerify(identifier, otpCode.trim());
      onLogin(r.user);
    } catch (e: any) {
      setErr(e.message || "Invalid code — request a new one");
    } finally { setLoading(false); }
  };

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
      setErr(msg.includes("suspended") ? "Account suspended — contact admin" : "Login failed. Check your Lightning address and try again.");
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
      setErr(msg.includes("taken") ? "Username already taken — choose another" : "Update failed. Try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg)] flex flex-col items-center px-4 py-8 relative">
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
              {/* Mode toggle */}
              <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl mb-4">
                <button type="button" onClick={() => { setMode("lightning"); setErr(""); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                    mode === "lightning" ? "bg-white shadow-sm text-black" : "text-neutral-500"
                  }`}>
                  ⚡ Lightning
                </button>
                <button type="button" onClick={() => { setMode("otp"); setErr(""); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                    mode === "otp" ? "bg-white shadow-sm text-black" : "text-neutral-500"
                  }`}>
                  <KeyRound size={12} className="inline -mt-0.5 mr-1"/> Email Code
                </button>
              </div>

              {mode === "lightning" && (
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
                      Use any Lightning address — no email or phone needed. Account created automatically.
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
              )}

              {mode === "otp" && !otpSent && (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="flex gap-1 p-1 bg-neutral-50 rounded-lg border border-neutral-100">
                    <button type="button" onClick={() => { setOtpSubMode("identifier"); setErr(""); }}
                      className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${
                        otpSubMode === "identifier" ? "bg-white shadow-sm text-black" : "text-neutral-400"
                      }`}>
                      Email / Username
                    </button>
                    <button type="button" onClick={() => { setOtpSubMode("phone"); setErr(""); }}
                      className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-bold uppercase tracking-wide flex items-center justify-center gap-1 transition-all ${
                        otpSubMode === "phone" ? "bg-white shadow-sm text-black" : "text-neutral-400"
                      }`}>
                      <Phone size={10}/> Phone
                    </button>
                  </div>

                  {otpSubMode === "identifier" ? (
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                        Email · Username · Lightning address
                      </label>
                      <input
                        value={otpId}
                        onChange={e => setOtpId(e.target.value)}
                        placeholder="email@example.com or @username"
                        className="input-modern text-sm"
                        autoFocus
                      />
                      <p className="text-xs text-[var(--text-dim)] mt-2">
                        For existing accounts only. First-time? Use the Lightning tab above.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                        Phone number
                      </label>
                      <div className="flex gap-2">
                        <div className="relative" ref={pickerRef}>
                          <button type="button"
                            onClick={() => setShowCountryPicker(v => !v)}
                            className="h-full flex items-center gap-1 px-3 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm font-medium hover:border-neutral-300 transition-colors whitespace-nowrap">
                            <span>{selectedCountry.flag}</span>
                            <span className="text-neutral-600 text-xs">{selectedCountry.dial}</span>
                            <ChevronDown size={12} className="text-neutral-400"/>
                          </button>

                          {showCountryPicker && (
                            <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-white border border-neutral-200 rounded-2xl shadow-2xl overflow-hidden">
                              <div className="p-2 border-b border-neutral-100">
                                <div className="flex items-center gap-2 bg-neutral-50 rounded-xl px-3 py-2">
                                  <Search size={13} className="text-neutral-400"/>
                                  <input autoFocus value={countrySearch} onChange={e => setCountrySearch(e.target.value)}
                                    placeholder="Search…" className="flex-1 text-xs bg-transparent outline-none"/>
                                </div>
                              </div>
                              <div className="max-h-48 overflow-y-auto">
                                {filteredCountries.map((c, i) =>
                                  c.code === "_" ? (
                                    <div key={i} className="px-3 py-1 text-[9px] text-neutral-300 font-bold uppercase tracking-wider"
                                         style={{ pointerEvents:"none" }}>─</div>
                                  ) : (
                                    <button key={c.code} type="button"
                                      onClick={() => { setSelectedCountry(c); setShowCountryPicker(false); setCountrySearch(""); }}
                                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-neutral-50 transition-colors ${
                                        c.code === selectedCountry.code ? "bg-orange-50" : ""
                                      }`}>
                                      <span className="text-base">{c.flag}</span>
                                      <span className="text-xs text-neutral-700 flex-1 truncate">{c.name}</span>
                                      <span className="text-[10px] font-mono text-neutral-400">{c.dial}</span>
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <input
                          value={phoneNum}
                          onChange={e => setPhoneNum(e.target.value.replace(/[^\d\s\-]/g, ""))}
                          placeholder="060 000 0000"
                          className="input-modern text-sm flex-1 font-mono"
                          type="tel"
                          autoFocus
                        />
                      </div>
                      <p className="text-xs text-[var(--text-dim)] mt-2">
                        Enter the phone number registered on your Volegram account.
                      </p>
                    </div>
                  )}

                  {err && <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{err}</div>}

                  <button type="submit"
                    disabled={loading || (otpSubMode === "identifier" ? !otpId.trim() : !phoneNum.trim())}
                    className="btn-accent w-full">
                    {loading ? "Sending code…" : (<><KeyRound size={16}/> Send Code</>)}
                  </button>
                </form>
              )}

              {mode === "otp" && otpSent && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  {otpDevCode && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-4 space-y-3">
                      <div className="text-xs font-bold text-amber-900 uppercase tracking-wide">Your Login Code</div>
                      <div className="flex items-center justify-between gap-3 bg-black rounded-xl px-4 py-3">
                        <span className="font-mono text-2xl font-extrabold tracking-[0.3em] text-[#F7931A]">
                          {otpDevCode}
                        </span>
                        <button type="button"
                          onClick={() => setOtpCode(otpDevCode)}
                          className="text-xs bg-[#F7931A] text-black font-extrabold px-3 py-1.5 rounded-lg hover:bg-orange-400 transition-colors whitespace-nowrap">
                          Use →
                        </button>
                      </div>
                      {otpNote && <p className="text-[10px] text-amber-700">{otpNote}</p>}
                    </div>
                  )}

                  {!otpDevCode && (
                    <div className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
                      📧 Code sent to your email — check your inbox (and spam folder).
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      6-Digit Code
                    </label>
                    <input
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g,"").slice(0,6))}
                      placeholder="123456"
                      className="input-modern font-mono text-2xl text-center tracking-widest font-extrabold"
                      autoFocus
                    />
                  </div>
                  {err && <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{err}</div>}
                  <button type="submit" disabled={loading || otpCode.length < 6} className="btn-accent w-full">
                    {loading ? "Verifying…" : (<><Sparkles size={16}/> Sign In</>)}
                  </button>
                  <button type="button" onClick={() => { setOtpSent(false); setOtpCode(""); setOtpDevCode(null); setOtpNote(""); setErr(""); }}
                    className="w-full text-xs text-[var(--text-muted)] hover:text-[var(--text)] py-1 font-medium">
                    ← Use a different identifier
                  </button>
                </form>
              )}
            </div>

            <p className="text-center text-xs text-[var(--text-dim)] mt-5">
              Examples: <span className="font-mono text-[var(--text-muted)]">user@walletofsatoshi.com</span> ·{" "}
              <span className="font-mono text-[var(--text-muted)]">you@blink.sv</span>
            </p>

            <div className="mt-5">
              <HowItWorks />
            </div>
          </>
        )}

        {step === "profile" && (
          <div className="surface-card-elevated p-6 animate-slide-up">
            <div className="text-center mb-5">
              <p className="text-lg font-extrabold text-[var(--text)]">Set your username</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Your username is how others find you and message you. You can also add a photo, bio, and contact info.
              </p>
            </div>
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

              <button type="submit" disabled={loading || username.trim().length < 3} className="btn-accent w-full">
                {loading ? "Saving…" : (<><Sparkles size={16}/> Enter Volegram</>)}
              </button>
              {username.trim().length < 3 && (
                <p className="text-center text-xs text-[var(--text-dim)]">Username must be at least 3 characters</p>
              )}
            </form>
          </div>
        )}

        {/* ── Install App block ── */}
        {!isInstalled && (
          <div className="mt-5 space-y-2">
            <div className="surface-card px-4 py-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center shrink-0">
                  <Download size={18} className="text-[#F7931A]"/>
                </div>
                <div className="flex-1">
                  <p className="font-extrabold text-[var(--text)] text-sm">Install Volegram</p>
                  <p className="text-[11px] text-[var(--text-muted)]">Add to home screen — works offline</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleInstall}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-black text-white text-xs font-extrabold uppercase tracking-wide hover:bg-neutral-800 transition-colors">
                  {isIOS ? <><Smartphone size={13}/> iPhone / iPad</> : <><Monitor size={13}/> Install App</>}
                </button>
                <button onClick={() => { navigator.clipboard.writeText(window.location.origin); }}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 text-xs font-bold hover:bg-neutral-50 transition-colors">
                  <Copy size={12}/> Copy link
                </button>
              </div>
              {showIOSHint && (
                <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800 space-y-1">
                  <p className="font-bold">How to install on iPhone / iPad:</p>
                  <p>1. Tap the <strong>Share button</strong> (⬆) in Safari</p>
                  <p>2. Scroll down and tap <strong>Add to Home Screen</strong></p>
                  <p>3. Tap <strong>Add</strong> — done!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Invite friends ── */}
        <div className="surface-card mt-3 px-4 py-3 flex items-center gap-3">
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
