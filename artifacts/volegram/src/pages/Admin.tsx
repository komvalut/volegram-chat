import { useEffect, useState } from "react";
import { Shield, Ban, CheckCircle, AlertTriangle, ArrowLeft, Users, Flag, Ticket, Settings, Trash2, Crown, Plus, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

type Tab = "users" | "vouchers" | "settings" | "reports";

export default function Admin({ user }: { user: any }) {
  const nav = useNavigate();
  const [tab, setTab]           = useState<Tab>("users");
  const [users, setUsers]       = useState<any[]>([]);
  const [reports, setReports]   = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(false);

  // settings
  const [commissionPct, setCommissionPct] = useState<string>("2");
  const [iban, setIban]    = useState("");
  const [holder, setHolder] = useState("");
  const [bankName, setBankName] = useState("");
  const [swift, setSwift]  = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    refresh();
    api.publicSettings().then(d => {
      setCommissionPct((d.commissionRate * 100).toFixed(2));
      setIban(d.bank?.iban ?? "");
      setHolder(d.bank?.holder ?? "");
      setBankName(d.bank?.name ?? "");
      setSwift(d.bank?.swift ?? "");
    }).catch(() => {});
  }, []);

  const refresh = () => {
    api.admin.users().then(setUsers).catch(() => {});
    api.admin.reports().then(setReports).catch(() => {});
    api.admin.voucherListAll().then(d => setVouchers(d.vouchers ?? [])).catch(() => {});
  };

  const block = async (id: number, blocked: boolean) => {
    setLoading(true);
    if (blocked) await api.admin.unblock(id); else await api.admin.block(id);
    refresh();
    setLoading(false);
  };

  const promote = async (id: number, isAdmin: boolean) => {
    if (isAdmin) await api.admin.demoteUser(id);
    else await api.admin.promoteUser(id);
    refresh();
  };

  const adjustBal = async (id: number, delta: number) => {
    await api.admin.adjustBalance(id, delta);
    refresh();
  };

  const removeUser = async (id: number) => {
    if (!confirm("Permanently delete this user and all their data?")) return;
    await api.admin.deleteUser(id);
    refresh();
  };

  const resolve = async (id: number) => {
    await api.admin.resolveReport(id);
    setReports(r => r.map(x => x.id === id ? { ...x, resolved: true } : x));
  };

  const saveSettings = async () => {
    setSavedMsg("");
    const rate = (parseFloat(commissionPct) || 0) / 100;
    await api.admin.setSetting("commission_rate", rate.toString());
    await api.admin.setSetting("bank_iban",   iban);
    await api.admin.setSetting("bank_holder", holder);
    await api.admin.setSetting("bank_name",   bankName);
    await api.admin.setSetting("bank_swift",  swift);
    setSavedMsg("✓ Saved");
    setTimeout(() => setSavedMsg(""), 2500);
  };

  const confirmVoucher = async (id: number) => {
    await api.admin.voucherConfirm(id);
    refresh();
  };
  const voidVoucher = async (id: number) => {
    if (!confirm("Void this voucher?")) return;
    await api.admin.voucherVoid(id);
    refresh();
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.lightningAddress.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full bg-[var(--bg)] flex flex-col text-black">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-200 flex items-center gap-4 bg-white">
        <button onClick={() => nav("/")} className="text-neutral-600 hover:text-black transition-colors">
          <ArrowLeft size={18}/>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
               style={{ background: "linear-gradient(135deg, #F7931A 0%, #FF6B00 100%)" }}>
            <Shield size={16} className="text-white"/>
          </div>
          <span className="font-extrabold tracking-tight text-base text-black">Volegram Admin</span>
        </div>
        <div className="ml-auto flex gap-4 text-xs text-neutral-600 font-semibold">
          <span>{users.length} users</span>
          <span>{vouchers.length} vouchers</span>
          <span>{reports.filter(r => !r.resolved).length} open reports</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 bg-white px-2">
        {([
          ["users","Users", <Users size={14}/>],
          ["vouchers","Vouchers", <Ticket size={14}/>],
          ["settings","Settings", <Settings size={14}/>],
          ["reports","Reports", <Flag size={14}/>],
        ] as any[]).map(([id, label, icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wide transition-colors border-b-2
              ${tab === id ? "border-[var(--accent)] text-black" : "border-transparent text-neutral-500 hover:text-black"}`}>
            {icon}{label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* ─────────── USERS ─────────── */}
        {tab === "users" && (
          <>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search username or Lightning address…"
              className="input-modern max-w-md mb-4 text-sm font-mono"/>
            <div className="space-y-2">
              {filtered.map(u => (
                <div key={u.id} className={`flex items-center gap-4 px-4 py-3 rounded-xl border ${u.isBlocked ? "border-red-200 bg-red-50" : "border-neutral-200 bg-white"} hover:border-neutral-400 transition-colors`}>
                  <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                    {u.avatarUrl
                      ? <img src={u.avatarUrl} className="w-full h-full object-cover" alt=""/>
                      : <div className="w-full h-full bg-neutral-200 flex items-center justify-center text-sm text-black font-extrabold">{u.username.slice(0,1).toUpperCase()}</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-black">@{u.username}</span>
                      {u.isAdmin   && <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">Admin</span>}
                      {u.isBlocked && <span className="text-[10px] font-bold uppercase bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Blocked</span>}
                    </div>
                    <p className="text-xs text-neutral-600 truncate font-mono">{u.lightningAddress}</p>
                    {u.email && <p className="text-xs text-neutral-500">{u.email}</p>}
                  </div>
                  <div className="text-xs text-neutral-700 text-right shrink-0">
                    <div className="font-bold">⚡ {u.satsBalance.toLocaleString()}</div>
                    <div className="text-neutral-400">{new Date(u.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => adjustBal(u.id, 1000)} className="p-1.5 rounded-lg bg-neutral-100 hover:bg-green-100 text-green-700" title="+1000 sats"><Plus size={12}/></button>
                    <button onClick={() => adjustBal(u.id, -1000)} className="p-1.5 rounded-lg bg-neutral-100 hover:bg-red-100 text-red-700" title="-1000 sats"><Minus size={12}/></button>
                    <button onClick={() => promote(u.id, u.isAdmin)} className={`p-1.5 rounded-lg ${u.isAdmin ? "bg-amber-100 text-amber-700" : "bg-neutral-100 hover:bg-amber-100 text-neutral-700"}`} title={u.isAdmin ? "Demote" : "Make admin"}><Crown size={12}/></button>
                    <button onClick={() => block(u.id, u.isBlocked)} disabled={loading}
                      className={`px-2 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${
                        u.isBlocked ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-neutral-100 text-neutral-700 hover:bg-red-100 hover:text-red-700"
                      }`}>
                      {u.isBlocked ? <CheckCircle size={11}/> : <Ban size={11}/>}
                    </button>
                    {u.id !== user.id && (
                      <button onClick={() => removeUser(u.id)} className="p-1.5 rounded-lg bg-neutral-100 hover:bg-red-200 text-red-700" title="Delete"><Trash2 size={12}/></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ─────────── VOUCHERS ─────────── */}
        {tab === "vouchers" && (
          <div className="space-y-2">
            {vouchers.length === 0 && <p className="text-sm text-neutral-500">No vouchers issued yet.</p>}
            {vouchers.map(v => (
              <div key={v.id} className="surface-card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                     style={{ background: "linear-gradient(135deg, #F7931A 0%, #FF6B00 100%)" }}>
                  <Ticket size={16} className="text-white"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base">
                      {v.currency === "SATS" ? `⚡ ${parseFloat(v.amount).toLocaleString()}` : `${v.currency} ${parseFloat(v.amount).toFixed(2)}`}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                      v.status === "active"   ? "bg-green-100 text-green-800" :
                      v.status === "pending"  ? "bg-amber-100 text-amber-800" :
                      v.status === "redeemed" ? "bg-neutral-200 text-neutral-700" :
                      "bg-red-100 text-red-700"
                    }`}>{v.status}</span>
                    <span className="text-[10px] text-neutral-500 uppercase">{v.payment_method}</span>
                  </div>
                  <code className="text-xs font-mono text-neutral-600">{v.code}</code>
                  <p className="text-xs text-neutral-500">@{v.creator_username} → @{v.owner_username} · {new Date(v.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {v.status === "pending" && (
                    <button onClick={() => confirmVoucher(v.id)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700">
                      Confirm Payment
                    </button>
                  )}
                  {v.status !== "voided" && v.status !== "redeemed" && (
                    <button onClick={() => voidVoucher(v.id)} className="p-1.5 rounded-lg bg-neutral-100 hover:bg-red-100 text-red-700" title="Void">
                      <Trash2 size={12}/>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─────────── SETTINGS ─────────── */}
        {tab === "settings" && (
          <div className="max-w-xl space-y-6">
            <section className="surface-card p-5">
              <h3 className="font-extrabold text-base mb-1">Commission Rate</h3>
              <p className="text-xs text-neutral-500 mb-4">Charged on voucher redemption (in sats). Change anytime.</p>
              <div className="flex items-center gap-3">
                <input type="number" step="0.01" min="0" max="100" value={commissionPct} onChange={e => setCommissionPct(e.target.value)}
                  className="input-modern font-mono text-2xl font-extrabold w-32 text-center"/>
                <span className="text-2xl font-extrabold">%</span>
                <span className="text-xs text-neutral-500 ml-3">(e.g. 2 = 2% per redemption)</span>
              </div>
            </section>

            <section className="surface-card p-5">
              <h3 className="font-extrabold text-base mb-1">Bank Transfer (IBAN)</h3>
              <p className="text-xs text-neutral-500 mb-4">Shown to users who choose bank transfer payment for vouchers.</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1">IBAN</label>
                  <input value={iban} onChange={e => setIban(e.target.value)} placeholder="BA39 1290 0794 0102 8494" className="input-modern font-mono text-sm"/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1">Account Holder</label>
                    <input value={holder} onChange={e => setHolder(e.target.value)} placeholder="Volegram d.o.o." className="input-modern text-sm"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1">Bank Name</label>
                    <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="UniCredit Bank" className="input-modern text-sm"/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1">SWIFT / BIC <span className="text-neutral-400 font-normal normal-case">(optional)</span></label>
                  <input value={swift} onChange={e => setSwift(e.target.value)} placeholder="UNCRBA22" className="input-modern font-mono text-sm"/>
                </div>
              </div>
            </section>

            <div className="flex items-center gap-4">
              <button onClick={saveSettings} className="btn-accent">Save All Settings</button>
              {savedMsg && <span className="text-sm text-green-700 font-bold">{savedMsg}</span>}
            </div>
          </div>
        )}

        {/* ─────────── REPORTS ─────────── */}
        {tab === "reports" && (
          <div className="space-y-2">
            {reports.length === 0 && <p className="text-sm text-neutral-500">No reports yet.</p>}
            {reports.map(r => (
              <div key={r.id} className={`px-4 py-3 rounded-xl border ${r.resolved ? "border-neutral-200 bg-neutral-50 opacity-60" : "border-amber-200 bg-amber-50"}`}>
                <div className="flex items-center gap-3 mb-1">
                  <AlertTriangle size={14} className="text-amber-600"/>
                  <span className="text-sm font-bold">Report #{r.id}</span>
                  <span className="text-xs text-neutral-500">{new Date(r.createdAt).toLocaleString()}</span>
                  {r.resolved && <span className="text-xs text-green-700 ml-auto font-bold">Resolved</span>}
                </div>
                <p className="text-xs text-neutral-600 mb-1">Reporter: user #{r.reporterId} → Target: user #{r.targetId}</p>
                <p className="text-sm text-neutral-800 italic">"{r.reason}"</p>
                {!r.resolved && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => resolve(r.id)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700">
                      Resolve
                    </button>
                    <button onClick={() => block(r.targetId, false)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700">
                      Block User
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
