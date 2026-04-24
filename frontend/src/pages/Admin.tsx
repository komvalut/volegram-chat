import { useEffect, useState } from "react";
import { Shield, Ban, CheckCircle, AlertTriangle, ArrowLeft, Users, Flag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

type Tab = "users" | "reports";

export default function Admin({ user }: { user: any }) {
  const nav = useNavigate();
  const [tab, setTab]       = useState<Tab>("users");
  const [users, setUsers]   = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.admin.users().then(setUsers).catch(() => {});
    api.admin.reports().then(setReports).catch(() => {});
  }, []);

  const block = async (id: number, blocked: boolean) => {
    setLoading(true);
    if (blocked) await api.admin.unblock(id); else await api.admin.block(id);
    const updated = await api.admin.users();
    setUsers(updated);
    setLoading(false);
  };

  const resolve = async (id: number) => {
    await api.admin.resolveReport(id);
    setReports(r => r.map(x => x.id === id ? { ...x, resolved: true } : x));
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.lightningAddress.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full bg-black flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1a1a1a] flex items-center gap-4">
        <button onClick={() => nav("/")} className="text-neutral-600 hover:text-white transition-colors">
          <ArrowLeft size={16}/>
        </button>
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-white"/>
          <span className="font-black uppercase tracking-widest text-sm text-white">VBC Admin</span>
        </div>
        <div className="ml-auto flex gap-4 text-xs text-neutral-600">
          <span>{users.length} users</span>
          <span>{reports.filter(r => !r.resolved).length} open reports</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1a1a1a]">
        {([["users","Users", <Users size={13}/>], ["reports","Reports", <Flag size={13}/>]] as any[]).map(([id, label, icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest transition-colors border-b-2
              ${tab === id ? "border-white text-white" : "border-transparent text-neutral-600 hover:text-white"}`}>
            {icon}{label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === "users" && (
          <>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search username or Lightning address…"
              className="w-full max-w-md bg-[#0a0a0a] border border-[#1a1a1a] text-white text-xs px-3 py-2 mb-4 outline-none focus:border-white font-mono"/>
            <div className="space-y-1">
              {filtered.map(u => (
                <div key={u.id} className={`flex items-center gap-4 px-4 py-3 border ${u.isBlocked ? "border-red-900/30 bg-red-900/5" : "border-[#1a1a1a] bg-[#050505]"} hover:border-[#2a2a2a]`}>
                  <div className="w-8 h-8 rounded-full border border-[#2a2a2a] overflow-hidden flex-shrink-0">
                    {u.avatarUrl
                      ? <img src={u.avatarUrl} className="w-full h-full object-cover" alt=""/>
                      : <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center text-xs text-white font-black">{u.username.slice(0,1).toUpperCase()}</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">@{u.username}</span>
                      {u.isAdmin   && <span className="text-[10px] bg-white/10 text-white px-1.5 py-0.5">ADMIN</span>}
                      {u.isBlocked && <span className="text-[10px] bg-red-900/30 text-red-400 px-1.5 py-0.5">BLOCKED</span>}
                    </div>
                    <p className="text-[10px] text-neutral-600 truncate">{u.lightningAddress}</p>
                    {u.email && <p className="text-[10px] text-neutral-700">{u.email}</p>}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-neutral-700">
                    <span>⚡{u.satsBalance.toLocaleString()}</span>
                    <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                  </div>
                  {!u.isAdmin && (
                    <button onClick={() => block(u.id, u.isBlocked)} disabled={loading}
                      className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 border transition-colors
                        ${u.isBlocked
                          ? "border-green-800 text-green-400 hover:bg-green-900/20"
                          : "border-red-800 text-red-400 hover:bg-red-900/20"}`}>
                      {u.isBlocked ? <><CheckCircle size={10}/>UNBLOCK</> : <><Ban size={10}/>BLOCK</>}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "reports" && (
          <div className="space-y-2">
            {reports.length === 0 && <p className="text-xs text-neutral-700">No reports yet.</p>}
            {reports.map(r => (
              <div key={r.id} className={`px-4 py-3 border ${r.resolved ? "border-[#1a1a1a] opacity-50" : "border-yellow-900/40 bg-yellow-900/5"}`}>
                <div className="flex items-center gap-3 mb-1">
                  <AlertTriangle size={12} className="text-yellow-500"/>
                  <span className="text-xs text-white">Report #{r.id}</span>
                  <span className="text-[10px] text-neutral-600">{new Date(r.createdAt).toLocaleString()}</span>
                  {r.resolved && <span className="text-[10px] text-green-600 ml-auto">Resolved</span>}
                </div>
                <p className="text-xs text-neutral-400 mb-1">Reporter: user #{r.reporterId} → Target: user #{r.targetId}</p>
                <p className="text-xs text-neutral-500 italic">"{r.reason}"</p>
                {!r.resolved && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => resolve(r.id)}
                      className="text-[10px] border border-green-800 text-green-400 px-2 py-1 hover:bg-green-900/20">
                      RESOLVE
                    </button>
                    <button onClick={() => block(r.targetId, false)}
                      className="text-[10px] border border-red-800 text-red-400 px-2 py-1 hover:bg-red-900/20">
                      BLOCK USER
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
