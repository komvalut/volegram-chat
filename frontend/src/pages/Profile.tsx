import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Copy, Flag, Camera, Check } from "lucide-react";
import { api, uploadFile } from "../lib/api";

export default function Profile({ currentUser }: { currentUser: any }) {
  const { username } = useParams<{ username: string }>();
  const nav = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({ bio: "", email: "", phone: "", username: "", lightningAddress: "" });
  const [avatarPrev, setAvPr] = useState("");
  const [avatarUrl, setAvUrl] = useState("");
  const [copied, setCopied]   = useState(false);
  const [reportReason, setRR] = useState("");
  const [showReport, setShRp] = useState(false);
  const [loading, setLoading] = useState(false);

  const isMe = currentUser?.username === username;

  useEffect(() => {
    if (!username) return;
    api.getProfile(username).then(p => {
      setProfile(p);
      setForm({ bio: p.bio ?? "", email: p.email ?? "", phone: p.phone ?? "", username: p.username, lightningAddress: p.lightningAddress ?? "" });
      setAvPr(p.avatarUrl ?? "");
    }).catch(() => setProfile(null));
  }, [username]);

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setAvPr(URL.createObjectURL(file));
    const url = await uploadFile(file);
    setAvUrl(url);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const { user: updated } = await api.updateProfile({ ...form, avatarUrl: avatarUrl || undefined });
      setProfile({ ...profile, ...updated });
      setEditing(false);
    } catch {} finally { setLoading(false); }
  };

  const copyLN = () => {
    navigator.clipboard.writeText(profile.lightningAddress);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const sendReport = async () => {
    if (!reportReason.trim()) return;
    await api.report(profile.id, reportReason);
    setShRp(false); setRR("");
    alert("Report submitted. Thank you.");
  };

  if (!profile) return (
    <div className="h-full bg-black flex items-center justify-center">
      <p className="text-xs text-neutral-600">User not found.</p>
    </div>
  );

  return (
    <div className="h-full bg-black overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-6">
        <button onClick={() => nav(-1)} className="flex items-center gap-2 text-neutral-600 hover:text-white text-xs mb-6 transition-colors">
          <ArrowLeft size={14}/> Back
        </button>

        {/* Profile Card */}
        <div className="border border-[#1a1a1a] bg-[#050505] p-6 mb-4">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full border-2 border-[#FF6A00]/40 overflow-hidden bg-[#111]">
                {(avatarPrev || profile.avatarUrl)
                  ? <img src={avatarPrev || profile.avatarUrl} className="w-full h-full object-cover" alt="avatar"/>
                  : <div className="w-full h-full flex items-center justify-center text-3xl text-[#FF6A00] font-black">
                      {profile.username.slice(0,1).toUpperCase()}
                    </div>
                }
              </div>
              {isMe && editing && (
                <label className="absolute bottom-0 right-0 cursor-pointer bg-[#FF6A00] rounded-full p-1">
                  <Camera size={10} className="text-black"/>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatar}/>
                </label>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-white">@{profile.username}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Zap size={11} className="text-[#FF6A00]"/>
                <span className="text-xs text-neutral-500 font-mono truncate">{profile.lightningAddress}</span>
                <button onClick={copyLN} className="text-neutral-700 hover:text-[#FF6A00] transition-colors">
                  {copied ? <Check size={11} className="text-green-400"/> : <Copy size={11}/>}
                </button>
              </div>
              <p className="text-[10px] text-neutral-700 mt-1">Member since {new Date(profile.createdAt).toLocaleDateString()}</p>
            </div>

            {isMe && !editing && (
              <button onClick={() => setEditing(true)}
                className="text-[10px] border border-[#2a2a2a] text-neutral-500 hover:text-white hover:border-[#FF6A00] px-3 py-1.5 transition-colors">
                EDIT
              </button>
            )}
          </div>

          {profile.bio && !editing && (
            <p className="mt-4 text-sm text-neutral-400 leading-relaxed border-t border-[#1a1a1a] pt-4">{profile.bio}</p>
          )}
        </div>

        {/* Edit Form */}
        {isMe && editing && (
          <form onSubmit={saveProfile} className="border border-[#F7931A]/30 bg-[#050505] p-5 mb-4 space-y-3">
            <h2 className="text-sm font-black uppercase tracking-widest text-[#F7931A] mb-3">Edit Profile</h2>
            <div>
              <label className="block text-xs text-neutral-500 uppercase tracking-widest mb-1">Username</label>
              <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.replace(/[^a-zA-Z0-9_]/g,"").slice(0,30) }))}
                className="w-full bg-[#080808] border border-[#1a1a1a] text-white text-base px-3 py-2.5 outline-none focus:border-[#F7931A] font-mono"/>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 uppercase tracking-widest mb-1">Lightning Address ⚡</label>
              <input value={form.lightningAddress} onChange={e => setForm(f => ({ ...f, lightningAddress: e.target.value.trim() }))}
                placeholder="you@walletofsatoshi.com"
                className="w-full bg-[#080808] border border-[#1a1a1a] text-white text-base px-3 py-2.5 outline-none focus:border-[#F7931A] font-mono"/>
              <p className="text-[11px] text-neutral-700 mt-1">Changing this will be your new login identity</p>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 uppercase tracking-widest mb-1">Bio</label>
              <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} maxLength={160}
                className="w-full bg-[#080808] border border-[#1a1a1a] text-white text-sm px-3 py-2.5 outline-none focus:border-[#F7931A] font-mono resize-none"/>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-neutral-500 uppercase tracking-widest mb-1">Email (private)</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email"
                  className="w-full bg-[#080808] border border-[#1a1a1a] text-white text-sm px-2 py-2 outline-none focus:border-[#F7931A] font-mono"/>
              </div>
              <div>
                <label className="block text-xs text-neutral-500 uppercase tracking-widest mb-1">Phone (private)</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} type="tel"
                  className="w-full bg-[#080808] border border-[#1a1a1a] text-white text-sm px-2 py-2 outline-none focus:border-[#F7931A] font-mono"/>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={loading}
                className="bg-[#FF6A00] text-black font-black text-xs uppercase tracking-widest px-5 py-2 hover:bg-[#e55500] disabled:opacity-40">
                {loading ? "SAVING…" : "SAVE"}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="text-xs text-neutral-600 hover:text-white px-3 py-2">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Actions */}
        {!isMe && currentUser && (
          <div className="flex gap-2">
            <button onClick={() => setShRp(!showReport)}
              className="flex items-center gap-1.5 text-[10px] border border-[#1a1a1a] text-neutral-600 hover:text-red-400 hover:border-red-900 px-3 py-2 transition-colors">
              <Flag size={11}/> Report User
            </button>
          </div>
        )}

        {/* Self-destruct */}
        {isMe && (
          <div className="mt-6 border border-red-900/30 bg-red-900/5 p-4">
            <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-1">Danger Zone</p>
            <p className="text-[10px] text-neutral-600 mb-3">
              Permanently delete your account, all messages and data.<br/>
              This cannot be undone.
            </p>
            <button
              onClick={async () => {
                if (!window.confirm("Delete your VBC account permanently? This cannot be undone.")) return;
                await api.deleteAccount();
                window.location.href = "/login";
              }}
              className="text-[10px] border border-red-800 text-red-400 px-4 py-2 hover:bg-red-900/30 font-bold uppercase tracking-widest transition-colors">
              DELETE ACCOUNT
            </button>
          </div>
        )}

        {showReport && (
          <div className="mt-3 border border-red-900/40 bg-red-900/5 p-4">
            <p className="text-xs text-red-400 font-bold mb-2">Report @{profile.username}</p>
            <textarea value={reportReason} onChange={e => setRR(e.target.value)} rows={3}
              placeholder="Describe the issue (scam, spam, abusive behaviour…)"
              className="w-full bg-[#080808] border border-[#1a1a1a] text-white text-xs px-3 py-2 outline-none focus:border-red-500 font-mono resize-none mb-2"/>
            <button onClick={sendReport} disabled={!reportReason.trim()}
              className="text-[10px] bg-red-700 text-white font-bold px-4 py-2 hover:bg-red-600 disabled:opacity-40">
              SUBMIT REPORT
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
