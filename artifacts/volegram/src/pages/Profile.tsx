import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Zap, Copy, Flag, Camera, Check, Ban, UserCheck,
  AlertTriangle, MessageCircle, Shield, Loader2,
} from "lucide-react";
import { api, uploadFile } from "../lib/api";

const REPORT_REASONS = [
  { id: "scam",       label: "Scam / Fraud",         icon: "⚠️" },
  { id: "spam",       label: "Spam",                  icon: "🚫" },
  { id: "harassment", label: "Harassment / Threats",  icon: "😡" },
  { id: "fake",       label: "Fake Account",          icon: "🎭" },
  { id: "other",      label: "Other",                 icon: "📝" },
];

export default function Profile({ currentUser }: { currentUser: any }) {
  const { username } = useParams<{ username: string }>();
  const nav = useNavigate();
  const [profile, setProfile]     = useState<any>(null);
  const [notFound, setNotFound]   = useState(false);
  const [editing, setEditing]     = useState(false);
  const [form, setForm]           = useState({ bio: "", email: "", phone: "", username: "", lightningAddress: "" });
  const [avatarPrev, setAvPr]     = useState("");
  const [avatarUrl, setAvUrl]     = useState("");
  const [copied, setCopied]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [avatarUploading, setAvUp] = useState(false);
  const [saveMsg, setSaveMsg]     = useState("");

  // Block state
  const [isBlockedByMe, setBlockedByMe] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  // Report state
  const [showReport, setShowReport]   = useState(false);
  const [reportReason, setReason]     = useState("");
  const [reportNote, setNote]         = useState("");
  const [reportSent, setReportSent]   = useState(false);
  const [reportLoading, setRepLoad]   = useState(false);

  const isMe = currentUser?.username === username;

  useEffect(() => {
    if (!username) return;
    setProfile(null); setNotFound(false);
    api.getProfile(username).then(p => {
      setProfile(p);
      setBlockedByMe(p.isBlockedByMe ?? false);
      setForm({
        bio: p.bio ?? "",
        email: p.email ?? "",
        phone: p.phone ?? "",
        username: p.username,
        lightningAddress: p.lightningAddress ?? "",
      });
      setAvPr(p.avatarUrl ?? "");
    }).catch(() => setNotFound(true));
  }, [username]);

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setAvPr(URL.createObjectURL(file));
    setAvUp(true);
    const url = await uploadFile(file);
    setAvUrl(url);
    setAvUp(false);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setSaveMsg("");
    try {
      const { user: updated } = await api.updateProfile({ ...form, avatarUrl: avatarUrl || undefined });
      setProfile((p: any) => ({ ...p, ...updated }));
      setEditing(false);
      setSaveMsg("Profile saved!");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (err: any) {
      setSaveMsg(err.message ?? "Save failed");
    } finally { setLoading(false); }
  };

  const copyLN = () => {
    navigator.clipboard.writeText(profile.lightningAddress);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const toggleBlock = async () => {
    if (!profile) return;
    setBlockLoading(true);
    try {
      if (isBlockedByMe) {
        await fetch(`/api/profile/block/${profile.id}`, { method: "DELETE", credentials: "include" });
        setBlockedByMe(false);
      } else {
        await fetch(`/api/profile/block/${profile.id}`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        setBlockedByMe(true);
      }
    } catch {}
    setBlockLoading(false);
  };

  const sendReport = async () => {
    if (!reportReason || reportLoading) return;
    setRepLoad(true);
    try {
      const reason = reportReason + (reportNote.trim() ? ` — ${reportNote.trim()}` : "");
      await api.report(profile.id, reason);
      setReportSent(true);
    } catch {}
    setRepLoad(false);
  };

  const openDM = async () => {
    try {
      const r = await fetch("/api/rooms/dm", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUsername: profile.username }),
      });
      if (r.ok) { const { room } = await r.json(); nav(`/chat?room=${room.id}`); }
    } catch {}
  };

  if (!profile && !notFound) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-neutral-400"/>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <p className="text-2xl">🔍</p>
        <p className="font-bold text-neutral-700">User not found</p>
        <button onClick={() => nav(-1)} className="text-xs text-neutral-400 underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-neutral-50">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Back */}
        <button onClick={() => nav(-1)}
          className="flex items-center gap-2 text-neutral-500 hover:text-black text-xs font-semibold transition-colors">
          <ArrowLeft size={14}/> Back
        </button>

        {/* Profile card */}
        <div className="bg-[#0a0a0a] rounded-3xl p-6 text-white relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-10"
               style={{ background: "radial-gradient(circle, #F7931A, transparent)" }}/>

          <div className="relative flex items-start gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-neutral-800 border-2 border-white/10">
                {(avatarPrev || profile.avatarUrl)
                  ? <img src={avatarPrev || profile.avatarUrl} className="w-full h-full object-cover" alt="avatar"/>
                  : <div className="w-full h-full flex items-center justify-center text-3xl font-extrabold text-[#F7931A]">
                      {profile.username.slice(0,1).toUpperCase()}
                    </div>
                }
                {avatarUploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-2xl">
                    <Loader2 size={16} className="animate-spin text-white"/>
                  </div>
                )}
              </div>
              {isMe && editing && (
                <label className="absolute -bottom-1 -right-1 cursor-pointer bg-[#F7931A] rounded-xl p-1.5 shadow-lg">
                  <Camera size={12} className="text-black"/>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatar}/>
                </label>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h1 className="text-xl font-extrabold">@{profile.username}</h1>
                  <p className="text-xs text-white/40 mt-0.5">
                    Member since {new Date(profile.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                  </p>
                </div>
                {isMe && !editing && (
                  <button onClick={() => setEditing(true)}
                    className="shrink-0 text-[10px] font-bold border border-white/20 text-white/60 hover:text-white hover:border-white/50 px-3 py-1.5 rounded-xl transition-colors uppercase tracking-wider">
                    Edit
                  </button>
                )}
              </div>

              {/* Lightning address */}
              <button onClick={copyLN}
                className="mt-2 flex items-center gap-1.5 text-[10px] text-white/50 hover:text-[#F7931A] font-mono transition-colors max-w-full">
                <Zap size={10} fill="currentColor"/>
                <span className="truncate">{profile.lightningAddress}</span>
                {copied ? <Check size={10} className="text-green-400 shrink-0"/> : <Copy size={10} className="shrink-0"/>}
              </button>
            </div>
          </div>

          {profile.bio && !editing && (
            <p className="mt-4 text-sm text-white/60 leading-relaxed border-t border-white/10 pt-4">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Edit form */}
        {isMe && editing && (
          <form onSubmit={saveProfile} className="bg-white rounded-3xl p-5 border border-neutral-200 space-y-4">
            <h2 className="font-extrabold text-sm uppercase tracking-wide text-neutral-700">Edit Profile</h2>

            <div>
              <label className="field-label">Username</label>
              <input value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value.replace(/[^a-zA-Z0-9_]/g,"").slice(0,30) }))}
                className="input-modern font-mono text-sm" minLength={3}/>
            </div>

            <div>
              <label className="field-label">Bio <span className="text-neutral-300 font-normal normal-case">(optional)</span></label>
              <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                rows={3} maxLength={160} placeholder="Bitcoin fan since…"
                className="input-modern resize-none text-sm"/>
            </div>

            <div>
              <label className="field-label">Lightning Address ⚡</label>
              <input value={form.lightningAddress}
                onChange={e => setForm(f => ({ ...f, lightningAddress: e.target.value.trim() }))}
                placeholder="you@walletofsatoshi.com"
                className="input-modern font-mono text-sm"/>
              <p className="text-[10px] text-neutral-400 mt-1">Changing this will update your login identity</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Email <span className="text-neutral-300 font-normal normal-case">(private)</span></label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  type="email" placeholder="for OTP login" className="input-modern text-sm"/>
              </div>
              <div>
                <label className="field-label">Phone <span className="text-neutral-300 font-normal normal-case">(private)</span></label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  type="tel" placeholder="+381 60 …" className="input-modern text-sm"/>
              </div>
            </div>

            {saveMsg && (
              <p className={`text-sm font-semibold ${saveMsg.includes("saved") ? "text-green-600" : "text-red-500"}`}>
                {saveMsg}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={loading}
                className="flex-1 btn-accent py-3 text-sm">
                {loading ? "Saving…" : "Save Profile"}
              </button>
              <button type="button" onClick={() => setEditing(false)}
                className="px-5 py-3 rounded-2xl bg-neutral-100 text-neutral-600 text-sm font-bold hover:bg-neutral-200 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Actions for other users */}
        {!isMe && currentUser && (
          <div className="flex gap-2">
            <button onClick={openDM}
              className="flex-1 flex items-center justify-center gap-2 bg-black text-white font-bold py-3 rounded-2xl text-sm active:scale-[0.98] transition-all">
              <MessageCircle size={15}/> Message
            </button>
            <button onClick={toggleBlock} disabled={blockLoading}
              className={`flex items-center gap-2 font-bold py-3 px-4 rounded-2xl text-sm transition-all active:scale-[0.98] disabled:opacity-60 ${
                isBlockedByMe
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}>
              {blockLoading
                ? <Loader2 size={14} className="animate-spin"/>
                : isBlockedByMe ? <><UserCheck size={14}/> Unblock</> : <><Ban size={14}/> Block</>
              }
            </button>
            <button onClick={() => { setShowReport(r => !r); setReportSent(false); }}
              className="flex items-center gap-2 bg-neutral-100 text-neutral-600 hover:bg-red-50 hover:text-red-600 font-bold py-3 px-4 rounded-2xl text-sm transition-all active:scale-[0.98]">
              <Flag size={14}/>
            </button>
          </div>
        )}

        {/* Block notice */}
        {!isMe && isBlockedByMe && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <Shield size={16} className="text-amber-600 shrink-0"/>
            <p className="text-sm text-amber-700">
              You have blocked <span className="font-bold">@{profile.username}</span>. They cannot message you or find you in search.
            </p>
          </div>
        )}

        {/* Report panel */}
        {!isMe && showReport && (
          <div className="bg-white border border-red-200 rounded-3xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-500"/>
              <h3 className="font-extrabold text-sm text-red-600">Report @{profile.username}</h3>
            </div>

            {reportSent ? (
              <div className="text-center py-4 space-y-2">
                <Check size={24} className="text-green-500 mx-auto"/>
                <p className="font-bold text-green-700">Report submitted</p>
                <p className="text-xs text-neutral-500">Our team will review it within 24 hours. Thank you.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-2">
                  {REPORT_REASONS.map(r => (
                    <button key={r.id} type="button"
                      onClick={() => setReason(r.id)}
                      className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                        reportReason === r.id
                          ? "border-red-400 bg-red-50"
                          : "border-neutral-200 hover:border-neutral-300"
                      }`}>
                      <span className="text-base">{r.icon}</span>
                      <span className="text-sm font-semibold text-neutral-700">{r.label}</span>
                      {reportReason === r.id && <Check size={14} className="text-red-500 ml-auto"/>}
                    </button>
                  ))}
                </div>

                <textarea value={reportNote} onChange={e => setNote(e.target.value)}
                  placeholder="Additional details (optional)…"
                  rows={2} className="input-modern text-sm resize-none"/>

                <button onClick={sendReport} disabled={!reportReason || reportLoading}
                  className="w-full bg-red-600 text-white font-extrabold py-3 rounded-2xl text-sm disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                  {reportLoading ? <><Loader2 size={14} className="animate-spin"/> Submitting…</> : "Submit Report"}
                </button>
              </>
            )}
          </div>
        )}

        {/* Danger Zone (self only) */}
        {isMe && (
          <div className="border border-red-200 bg-red-50 rounded-3xl p-5 space-y-3">
            <div>
              <p className="text-xs font-extrabold text-red-600 uppercase tracking-wide mb-1">Danger Zone</p>
              <p className="text-xs text-neutral-500">
                Permanently delete your account, all messages, and wallet balance. This cannot be undone.
              </p>
            </div>
            <button
              onClick={async () => {
                if (!window.confirm("Delete your Volegram account permanently? All data and sats balance will be lost. This cannot be undone.")) return;
                await api.deleteAccount();
                window.location.href = "/";
              }}
              className="text-xs border border-red-400 text-red-600 px-4 py-2 rounded-xl hover:bg-red-100 font-bold uppercase tracking-wide transition-colors">
              Delete Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
