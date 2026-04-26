import { useEffect, useState } from "react";
import {
  Shield, Ban, CheckCircle, AlertTriangle, ArrowLeft, Users, Flag,
  Ticket, Settings, Trash2, Crown, Plus, Minus, Smartphone, Edit2,
  X, Check, RefreshCw, Key, Loader2, ShoppingBag, Send, Megaphone,
  Gift, Phone,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

type Tab = "users" | "vouchers" | "esim" | "p2p" | "ads" | "referral" | "otp" | "settings" | "reports";

export default function Admin({ user }: { user: any }) {
  const nav = useNavigate();
  const [tab, setTab]           = useState<Tab>("users");
  const [users, setUsers]       = useState<any[]>([]);
  const [reports, setReports]   = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(false);

  // eSIM state
  const [esimListings, setEsimListings] = useState<any[]>([]);
  const [esimOrders, setEsimOrders]     = useState<any[]>([]);
  const [esimForm, setEsimForm]         = useState<any | null>(null);
  const [esimTab, setEsimTab]           = useState<"listings" | "orders">("listings");
  const [esimSaving, setEsimSaving]     = useState(false);

  // P2P Voucher state
  const [p2pListings, setP2pListings]   = useState<any[]>([]);
  const [p2pOrders, setP2pOrders]       = useState<any[]>([]);
  const [p2pTab, setP2pTab]             = useState<"listings"|"orders">("listings");
  const [p2pForm, setP2pForm]           = useState<any|null>(null);
  const [p2pSaving, setP2pSaving]       = useState(false);
  const [deliverModal, setDeliverModal] = useState<{id:number;buyer:string;item:string}|null>(null);
  const [deliverCode, setDeliverCode]   = useState("");
  const [deliverMsg, setDeliverMsg]     = useState("");

  // Ads state
  const [adsAll, setAdsAll]         = useState<any[]>([]);
  const [adsPriceInput, setAdsPriceInput] = useState("1000");
  const [adsPriceMsg, setAdsPriceMsg]     = useState("");

  // Referral state
  const [refCodes, setRefCodes]     = useState<any[]>([]);
  const [refForm, setRefForm]       = useState<any | null>(null);
  const [refSaving, setRefSaving]   = useState(false);
  const [refMsg, setRefMsg]         = useState("");

  // OTP Countries state
  const [otpCountries, setOtpCountries] = useState<any[]>([]);
  const [otpOrders, setOtpOrders]       = useState<any[]>([]);
  const [otpCForm, setOtpCForm]         = useState<any | null>(null);
  const [otpCSaving, setOtpCSaving]     = useState(false);
  const [otpDeliverModal, setOtpDeliverModal] = useState<any | null>(null);
  const [otpDeliverCode, setOtpDeliverCode]   = useState("");
  const [otpDeliverMsg, setOtpDeliverMsg]     = useState("");

  // settings
  const [commissionPct, setCommissionPct]           = useState("2");
  const [creditsCommissionPct, setCreditsCommPct]   = useState("10");
  const [predictionCommissionPct, setPredCommPct]   = useState("5");
  const [swapCommissionPct, setSwapCommPct]         = useState("1");
  const [iban, setIban]     = useState("");
  const [holder, setHolder] = useState("");
  const [bankName, setBankName] = useState("");
  const [swift, setSwift]   = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [marketEnabled, setMarketEnabled] = useState(true);

  // OTP admin
  const [otpUser, setOtpUser]   = useState("");
  const [otpCode, setOtpCode]   = useState("");
  const [otpMsg, setOtpMsg]     = useState("");

  useEffect(() => {
    refresh();
    api.publicSettings().then(d => {
      setCommissionPct((d.commissionRate * 100).toFixed(2));
      if (d.creditsCommission != null) setCreditsCommPct((d.creditsCommission * 100).toFixed(2));
      if (d.predictionCommission != null) setPredCommPct((d.predictionCommission * 100).toFixed(2));
      if (d.swapCommission != null) setSwapCommPct((d.swapCommission * 100).toFixed(2));
      setIban(d.bank?.iban ?? "");
      setHolder(d.bank?.holder ?? "");
      setBankName(d.bank?.name ?? "");
      setSwift(d.bank?.swift ?? "");
      if (typeof d.marketEnabled === "boolean") setMarketEnabled(d.marketEnabled);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === "esim") {
      api.admin.esimList().then(d => setEsimListings(d.listings ?? [])).catch(() => {});
      api.admin.esimOrders().then(d => setEsimOrders(d.orders ?? [])).catch(() => {});
    }
    if (tab === "p2p") {
      api.p2p.admin.listAll().then(d => setP2pListings(d.listings ?? [])).catch(() => {});
      api.p2p.admin.listOrders().then(d => setP2pOrders(d.orders ?? [])).catch(() => {});
    }
    if (tab === "ads") {
      api.ads.admin.listAll().then(d => setAdsAll(d.ads ?? [])).catch(() => {});
      api.ads.pricing().then(d => setAdsPriceInput(String(d.price_per_day ?? 1000))).catch(() => {});
    }
    if (tab === "referral") {
      fetch("/api/referral/admin/list", { credentials: "include" })
        .then(r => r.json()).then(d => setRefCodes(d.codes ?? [])).catch(() => {});
    }
    if (tab === "otp") {
      fetch("/api/otp-mgmt/countries", { credentials: "include" })
        .then(r => r.json()).then(d => setOtpCountries(d.countries ?? [])).catch(() => {});
      fetch("/api/otp-mgmt/admin/orders", { credentials: "include" })
        .then(r => r.json()).then(d => setOtpOrders(d.orders ?? [])).catch(() => {});
    }
  }, [tab]);

  const refresh = () => {
    api.admin.users().then(setUsers).catch(() => {});
    api.admin.reports().then(setReports).catch(() => {});
    api.admin.voucherListAll().then(d => setVouchers(d.vouchers ?? [])).catch(() => {});
  };

  const block = async (id: number, blocked: boolean) => {
    setLoading(true);
    if (blocked) await api.admin.unblock(id); else await api.admin.block(id);
    refresh(); setLoading(false);
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
    if (!confirm("Permanently delete this user?")) return;
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
    await api.admin.setSetting("commission_rate",      rate.toString());
    await api.admin.setSetting("credits_commission",   ((parseFloat(creditsCommissionPct) || 0) / 100).toString());
    await api.admin.setSetting("prediction_commission",((parseFloat(predictionCommissionPct) || 0) / 100).toString());
    await api.admin.setSetting("swap_commission",      ((parseFloat(swapCommissionPct) || 0) / 100).toString());
    await api.admin.setSetting("bank_iban",   iban);
    await api.admin.setSetting("bank_holder", holder);
    await api.admin.setSetting("bank_name",   bankName);
    await api.admin.setSetting("bank_swift",  swift);
    await api.admin.setSetting("market_enabled", marketEnabled ? "true" : "false");
    setSavedMsg("✓ Saved");
    setTimeout(() => setSavedMsg(""), 2500);
  };

  const confirmVoucher = async (id: number) => {
    await api.admin.voucherConfirm(id); refresh();
  };
  const voidVoucher = async (id: number) => {
    if (!confirm("Void this voucher?")) return;
    await api.admin.voucherVoid(id); refresh();
  };

  // eSIM
  const saveEsim = async () => {
    if (!esimForm) return;
    setEsimSaving(true);
    try {
      if (esimForm.id) {
        await api.admin.esimUpdate(esimForm.id, esimForm);
      } else {
        await api.admin.esimCreate(esimForm);
      }
      const d = await api.admin.esimList();
      setEsimListings(d.listings ?? []);
      setEsimForm(null);
    } catch {}
    setEsimSaving(false);
  };

  const deleteEsim = async (id: number) => {
    if (!confirm("Delete this eSIM plan?")) return;
    await api.admin.esimDelete(id);
    setEsimListings(prev => prev.filter(l => l.id !== id));
  };

  const updateOrderStatus = async (id: number, status: string) => {
    await api.admin.esimOrderStatus(id, status);
    setEsimOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  // OTP admin
  const createAdminOtp = async () => {
    if (!otpUser.trim()) return;
    setOtpMsg("");
    try {
      const code = otpCode.trim() || Math.floor(100000 + Math.random() * 900000).toString();
      const r = await fetch("/api/admin/otp/create", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: otpUser, code }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        setOtpMsg(`✓ Code created: ${d.code || code}`);
        setOtpUser(""); setOtpCode("");
      } else {
        setOtpMsg(`Error: ${d.error || "Failed"}`);
      }
    } catch { setOtpMsg("Network error"); }
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.lightningAddress.toLowerCase().includes(search.toLowerCase())
  );

  const ESIM_BLANK = { name:"", description:"", country:"", data_gb:"", validity_days:"", price_sats:"", phone_number:"", active: true };

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
        <div className="ml-auto flex gap-3 text-xs text-neutral-600 font-semibold flex-wrap">
          <span>{users.length} users</span>
          <span>{vouchers.length} vouchers</span>
          <span>{reports.filter(r => !r.resolved).length} open reports</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 bg-white px-2 overflow-x-auto">
        {([
          ["users",    "Users",    <Users size={13}/>],
          ["vouchers", "Vouchers", <Ticket size={13}/>],
          ["esim",     "eSIM",     <Smartphone size={13}/>],
          ["p2p",      "P2P Store",<ShoppingBag size={13}/>],
          ["ads",      "Oglasi",   <Megaphone size={13}/>],
          ["referral", "Referral", <Gift size={13}/>],
          ["otp",      "OTP Mgmt", <Phone size={13}/>],
          ["settings", "Settings", <Settings size={13}/>],
          ["reports",  "Reports",  <Flag size={13}/>],
        ] as any[]).map(([id, label, icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wide transition-colors border-b-2 whitespace-nowrap
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-black">@{u.username}</span>
                      {u.isAdmin   && <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">Admin</span>}
                      {u.isBlocked && <span className="text-[10px] font-bold uppercase bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Blocked</span>}
                    </div>
                    <p className="text-xs text-neutral-600 truncate font-mono">{u.lightningAddress}</p>
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
                      className={`px-2 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${u.isBlocked ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-700 hover:bg-red-100 hover:text-red-700"}`}>
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
                  <div className="flex items-center gap-2 flex-wrap">
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
                  {v.proof_url && <a href={v.proof_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline font-bold">📎 View Payment Proof</a>}
                </div>
                <div className="flex gap-1 shrink-0">
                  {v.status === "pending" && (
                    <button onClick={() => confirmVoucher(v.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700">
                      Confirm Payment
                    </button>
                  )}
                  {v.status !== "voided" && v.status !== "redeemed" && (
                    <button onClick={() => voidVoucher(v.id)} className="p-1.5 rounded-lg bg-neutral-100 hover:bg-red-100 text-red-700" title="Void"><Trash2 size={12}/></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─────────── eSIM ─────────── */}
        {tab === "esim" && (
          <div>
            {/* eSIM sub-tabs */}
            <div className="flex gap-2 mb-5">
              {(["listings","orders"] as const).map(t => (
                <button key={t} onClick={() => setEsimTab(t)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-colors ${
                    esimTab === t ? "bg-black text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}>{t === "listings" ? `Plans (${esimListings.length})` : `Orders (${esimOrders.length})`}</button>
              ))}
            </div>

            {/* Edit/Create form */}
            {esimForm !== null && (
              <div className="surface-card p-5 mb-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-black">{esimForm.id ? "Edit eSIM Plan" : "New eSIM Plan"}</h3>
                  <button onClick={() => setEsimForm(null)}><X size={16} className="text-neutral-400"/></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase tracking-wider">Plan Name *</label>
                    <input value={esimForm.name} onChange={e => setEsimForm((f:any) => ({ ...f, name: e.target.value }))}
                      placeholder="Serbia 5GB · 30 days" className="input-modern text-sm"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase tracking-wider">Country</label>
                    <input value={esimForm.country} onChange={e => setEsimForm((f:any) => ({ ...f, country: e.target.value }))}
                      placeholder="Serbia" className="input-modern text-sm"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase tracking-wider">Phone Number</label>
                    <input value={esimForm.phone_number} onChange={e => setEsimForm((f:any) => ({ ...f, phone_number: e.target.value }))}
                      placeholder="+381 60 123 4567" className="input-modern text-sm font-mono"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase tracking-wider">Data (GB)</label>
                    <input type="number" step="0.5" value={esimForm.data_gb} onChange={e => setEsimForm((f:any) => ({ ...f, data_gb: e.target.value }))}
                      placeholder="5" className="input-modern text-sm"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase tracking-wider">Validity (days)</label>
                    <input type="number" value={esimForm.validity_days} onChange={e => setEsimForm((f:any) => ({ ...f, validity_days: e.target.value }))}
                      placeholder="30" className="input-modern text-sm"/>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase tracking-wider">Price (sats) *</label>
                    <input type="number" value={esimForm.price_sats} onChange={e => setEsimForm((f:any) => ({ ...f, price_sats: e.target.value }))}
                      placeholder="50000" className="input-modern text-sm font-mono"/>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase tracking-wider">Description</label>
                    <textarea rows={2} value={esimForm.description} onChange={e => setEsimForm((f:any) => ({ ...f, description: e.target.value }))}
                      placeholder="Data plan details, activation instructions…" className="input-modern text-sm resize-none"/>
                  </div>
                  {esimForm.id && (
                    <div className="col-span-2 flex items-center gap-3">
                      <input type="checkbox" id="esim-active" checked={esimForm.active}
                        onChange={e => setEsimForm((f:any) => ({ ...f, active: e.target.checked }))}/>
                      <label htmlFor="esim-active" className="text-sm font-semibold text-black">Active (visible to users)</label>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={saveEsim} disabled={esimSaving || !esimForm.name || !esimForm.price_sats}
                    className="btn-accent flex items-center gap-2">
                    {esimSaving ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
                    {esimForm.id ? "Update Plan" : "Create Plan"}
                  </button>
                  <button onClick={() => setEsimForm(null)} className="btn-ghost">Cancel</button>
                </div>
              </div>
            )}

            {/* Listings */}
            {esimTab === "listings" && (
              <div className="space-y-3">
                {!esimForm && (
                  <button onClick={() => setEsimForm({ ...ESIM_BLANK })}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black text-white font-bold text-sm mb-4">
                    <Plus size={15}/> Add eSIM Plan
                  </button>
                )}
                {esimListings.length === 0 && !esimForm && (
                  <div className="py-10 text-center">
                    <Smartphone size={28} className="text-neutral-200 mx-auto mb-3"/>
                    <p className="text-sm text-neutral-500">No eSIM plans yet. Click "Add eSIM Plan" to create one.</p>
                  </div>
                )}
                {esimListings.map(l => (
                  <div key={l.id} className="surface-card p-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                      <Smartphone size={16} className="text-neutral-600"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-extrabold text-black text-sm">{l.name}</span>
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${l.active ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-600"}`}>
                          {l.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {l.country && <p className="text-xs text-neutral-500">📍 {l.country}</p>}
                      {l.phone_number && <p className="text-xs font-mono text-neutral-600">📱 {l.phone_number}</p>}
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {l.data_gb && <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{parseFloat(l.data_gb)}GB</span>}
                        {l.validity_days && <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">{l.validity_days}d</span>}
                        <span className="text-[10px] font-bold text-black">⚡ {l.price_sats.toLocaleString()} sats</span>
                      </div>
                      {l.description && <p className="text-xs text-neutral-500 mt-1 truncate">{l.description}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setEsimForm({ ...l, data_gb: l.data_gb ?? "", validity_days: l.validity_days ?? "" })}
                        className="p-1.5 rounded-lg bg-neutral-100 hover:bg-blue-100 text-blue-700" title="Edit">
                        <Edit2 size={12}/>
                      </button>
                      <button onClick={() => deleteEsim(l.id)}
                        className="p-1.5 rounded-lg bg-neutral-100 hover:bg-red-100 text-red-700" title="Delete">
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Orders */}
            {esimTab === "orders" && (
              <div className="space-y-3">
                {esimOrders.length === 0 && (
                  <p className="text-sm text-neutral-500 py-8 text-center">No eSIM orders yet.</p>
                )}
                {esimOrders.map((o:any) => (
                  <div key={o.id} className="surface-card p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-black text-sm">#{o.id} — {o.name}</span>
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                          o.status === "completed" ? "bg-green-100 text-green-800" :
                          o.status === "active"    ? "bg-blue-100 text-blue-800" :
                          o.status === "cancelled" ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-800"
                        }`}>{o.status}</span>
                      </div>
                      <p className="text-xs text-neutral-600">@{o.username} · {o.country} · ⚡ {o.price_sats.toLocaleString()} sats</p>
                      {o.phone_number && <p className="text-xs font-mono text-neutral-500 mt-0.5">📱 {o.phone_number}</p>}
                      <p className="text-[10px] text-neutral-400">{new Date(o.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {(["pending","active","completed","cancelled"] as const).filter(s => s !== o.status).map(s => (
                        <button key={s} onClick={() => updateOrderStatus(o.id, s)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${
                            s === "completed" ? "border-green-300 text-green-700 hover:bg-green-50" :
                            s === "cancelled" ? "border-red-300 text-red-700 hover:bg-red-50" :
                            "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                          }`}>{s}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─────────── P2P VOUCHER STORE ─────────── */}
        {tab === "p2p" && (
          <div>
            {/* P2P sub-tabs */}
            <div className="flex gap-1 mb-5">
              {(["listings","orders"] as const).map(t => (
                <button key={t} onClick={() => setP2pTab(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize border transition-colors ${
                    p2pTab === t ? "bg-black text-white border-black" : "bg-white text-neutral-500 border-neutral-200"
                  }`}>{t === "listings" ? "Listings" : `Orders (${p2pOrders.length})`}</button>
              ))}
              <button onClick={() => { setP2pForm({ service:"", service_name:"", denomination:"", denomination_sort:0, price_sats:"", stock:-1, icon:"🎫", description:"" }); setP2pTab("listings"); }}
                className="ml-auto flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-[#F7931A] text-white hover:bg-[#e07f10]">
                <Plus size={12}/> Add Listing
              </button>
            </div>

            {/* Form */}
            {p2pForm && p2pTab === "listings" && (
              <div className="surface-card p-5 mb-5 border-2 border-[#F7931A]">
                <h3 className="font-extrabold text-black mb-4">{p2pForm.id ? "Edit Listing" : "New Listing"}</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Service Key</label>
                    <input value={p2pForm.service} onChange={e => setP2pForm((f:any)=>({...f,service:e.target.value}))}
                      placeholder="xbon / steam / paysafe…" className="input-modern text-sm w-full"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Service Name</label>
                    <input value={p2pForm.service_name} onChange={e => setP2pForm((f:any)=>({...f,service_name:e.target.value}))}
                      placeholder="X Bon" className="input-modern text-sm w-full"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Denomination</label>
                    <input value={p2pForm.denomination} onChange={e => setP2pForm((f:any)=>({...f,denomination:e.target.value}))}
                      placeholder="500 RSD / 10 EUR" className="input-modern text-sm w-full"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Sort (numeric)</label>
                    <input type="number" value={p2pForm.denomination_sort} onChange={e => setP2pForm((f:any)=>({...f,denomination_sort:Number(e.target.value)}))}
                      className="input-modern text-sm w-full"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Price (sats)</label>
                    <input type="number" value={p2pForm.price_sats} onChange={e => setP2pForm((f:any)=>({...f,price_sats:e.target.value}))}
                      className="input-modern text-sm w-full"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Stock (-1 = unlimited)</label>
                    <input type="number" value={p2pForm.stock} onChange={e => setP2pForm((f:any)=>({...f,stock:Number(e.target.value)}))}
                      className="input-modern text-sm w-full"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Icon (emoji)</label>
                    <input value={p2pForm.icon} onChange={e => setP2pForm((f:any)=>({...f,icon:e.target.value}))}
                      className="input-modern text-sm w-full" maxLength={4}/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Active</label>
                    <select value={p2pForm.active === false ? "false" : "true"} onChange={e => setP2pForm((f:any)=>({...f,active:e.target.value==="true"}))}
                      className="input-modern text-sm w-full">
                      <option value="true">Active</option>
                      <option value="false">Disabled</option>
                    </select>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Description</label>
                  <input value={p2pForm.description ?? ""} onChange={e => setP2pForm((f:any)=>({...f,description:e.target.value}))}
                    placeholder="Short description (optional)" className="input-modern text-sm w-full"/>
                </div>
                <div className="flex gap-2">
                  <button onClick={async () => {
                    setP2pSaving(true);
                    try {
                      if (p2pForm.id) {
                        await api.p2p.admin.update(p2pForm.id, p2pForm);
                      } else {
                        await api.p2p.admin.create(p2pForm);
                      }
                      setP2pForm(null);
                      api.p2p.admin.listAll().then(d => setP2pListings(d.listings ?? [])).catch(()=>{});
                    } catch(e:any){ alert(e.message); }
                    setP2pSaving(false);
                  }} className="flex items-center gap-1 text-sm font-bold px-4 py-2 rounded-xl bg-black text-white hover:bg-neutral-800 disabled:opacity-60" disabled={p2pSaving}>
                    {p2pSaving ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>}
                    {p2pForm.id ? "Save" : "Create"}
                  </button>
                  <button onClick={() => setP2pForm(null)} className="text-sm px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 font-bold">Cancel</button>
                </div>
              </div>
            )}

            {/* Listings table */}
            {p2pTab === "listings" && (
              <div className="space-y-2">
                {p2pListings.map((l:any) => (
                  <div key={l.id} className="surface-card p-4 flex items-center gap-3">
                    <div className="text-2xl shrink-0">{l.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-black text-sm">{l.service_name} — {l.denomination}</span>
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full ${l.active ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-600"}`}>
                          {l.active ? "Active" : "Off"}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500">⚡ {Number(l.price_sats).toLocaleString()} sats · Stock: {l.stock === -1 ? "∞" : l.stock}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setP2pForm({...l, price_sats: l.price_sats})}
                        className="p-1.5 rounded-lg hover:bg-neutral-100"><Edit2 size={12}/></button>
                      <button onClick={async () => {
                        if (!confirm("Delete this listing?")) return;
                        await api.p2p.admin.remove(l.id);
                        setP2pListings(ps => ps.filter(x => x.id !== l.id));
                      }} className="p-1.5 rounded-lg hover:bg-red-100 text-red-600"><Trash2 size={12}/></button>
                    </div>
                  </div>
                ))}
                {p2pListings.length === 0 && <p className="text-sm text-neutral-500 py-8 text-center">No listings yet.</p>}
              </div>
            )}

            {/* Orders with deliver action */}
            {p2pTab === "orders" && (
              <div className="space-y-3">
                {p2pOrders.map((o:any) => (
                  <div key={o.id} className="surface-card p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl shrink-0">{o.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-extrabold text-black text-sm">#{o.id} — {o.service_name} {o.denomination}</span>
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full ${
                            o.status === "delivered" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                          }`}>{o.status}</span>
                        </div>
                        <p className="text-xs text-neutral-500">@{o.buyer_username} · ⚡ {Number(o.price_sats).toLocaleString()} sats</p>
                        <p className="text-[10px] text-neutral-400">{new Date(o.created_at).toLocaleString()}</p>
                        {o.voucher_code && (
                          <p className="text-xs font-mono mt-1 bg-green-50 text-green-900 px-2 py-1 rounded-lg inline-block">{o.voucher_code}</p>
                        )}
                      </div>
                      {o.status === "pending" && (
                        <button onClick={() => { setDeliverModal({id:o.id, buyer:o.buyer_username, item:`${o.service_name} ${o.denomination}`}); setDeliverCode(""); setDeliverMsg(""); }}
                          className="shrink-0 flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-xl bg-black text-white hover:bg-neutral-800">
                          <Send size={11}/> Deliver
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {p2pOrders.length === 0 && <p className="text-sm text-neutral-500 py-8 text-center">No orders yet.</p>}
              </div>
            )}
          </div>
        )}

        {/* Deliver modal */}
        {deliverModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setDeliverModal(null)}>
            <div onClick={e => e.stopPropagation()} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              <h3 className="font-extrabold text-black mb-1">Deliver Voucher</h3>
              <p className="text-sm text-neutral-500 mb-4">Order #{deliverModal.id} — {deliverModal.item} for @{deliverModal.buyer}</p>
              <input value={deliverCode} onChange={e => setDeliverCode(e.target.value)}
                placeholder="Enter voucher code / activation key"
                className="input-modern w-full font-mono mb-3 text-sm"/>
              {deliverMsg && <p className="text-sm text-green-700 mb-3">{deliverMsg}</p>}
              <div className="flex gap-2">
                <button onClick={async () => {
                  if (!deliverCode.trim()) return;
                  try {
                    await api.p2p.admin.deliver(deliverModal.id, deliverCode.trim());
                    setDeliverMsg("Delivered successfully!");
                    api.p2p.admin.listOrders().then(d => setP2pOrders(d.orders ?? [])).catch(()=>{});
                    setTimeout(() => setDeliverModal(null), 1500);
                  } catch(e:any) { setDeliverMsg(e.message); }
                }} className="flex-1 py-2.5 rounded-xl bg-black text-white text-sm font-bold hover:bg-neutral-800">
                  Send Code to Buyer
                </button>
                <button onClick={() => setDeliverModal(null)} className="px-4 py-2.5 rounded-xl bg-neutral-100 text-neutral-700 text-sm font-bold">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────── ADS ─────────── */}
        {tab === "ads" && (
          <div className="space-y-4">
            {/* Price setting */}
            <section className="surface-card p-5">
              <h3 className="font-extrabold text-base mb-1 flex items-center gap-2"><Megaphone size={16}/> Ad Price</h3>
              <p className="text-xs text-neutral-500 mb-3">Sats per advertising day (default 1000)</p>
              <div className="flex items-center gap-3">
                <input type="number" value={adsPriceInput} onChange={e => setAdsPriceInput(e.target.value)}
                  className="input-modern font-mono w-36 text-sm" min="1"/>
                <span className="text-sm text-neutral-600 font-medium">sats/day</span>
                <button onClick={async () => {
                  await api.ads.admin.setPrice(parseInt(adsPriceInput));
                  setAdsPriceMsg("✓ Saved"); setTimeout(() => setAdsPriceMsg(""), 2000);
                }} className="btn-accent py-2 px-4 text-sm">Save</button>
                {adsPriceMsg && <span className="text-green-600 text-sm font-bold">{adsPriceMsg}</span>}
              </div>
            </section>

            {/* Ads list */}
            <div className="space-y-2">
              {adsAll.length === 0 ? (
                <p className="text-sm text-neutral-400 py-8 text-center">No ads yet.</p>
              ) : adsAll.map((ad: any) => (
                <div key={ad.id} className="surface-card p-4 flex gap-4 items-start">
                  {ad.image_url && (
                    <img src={ad.image_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0"/>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-extrabold text-sm text-black">{ad.title}</span>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                        ad.status === "active"   ? "bg-green-100 text-green-800" :
                        ad.status === "pending"  ? "bg-amber-100 text-amber-800" :
                        ad.status === "rejected" ? "bg-red-100 text-red-700"     :
                        "bg-neutral-200 text-neutral-500"
                      }`}>{ad.status}</span>
                    </div>
                    <p className="text-xs text-neutral-500 truncate mb-1">{ad.description}</p>
                    <div className="text-[10px] text-neutral-400 space-x-2">
                      <span>@{ad.poster_username}</span>
                      <span>⚡ {ad.paid_sats?.toLocaleString()} sats</span>
                      <span>{ad.duration_days}d</span>
                      <span>Exp: {new Date(ad.expires_at).toLocaleDateString()}</span>
                    </div>
                    {ad.contact && <p className="text-[10px] text-neutral-500 mt-0.5">📞 {ad.contact}</p>}
                    {ad.link && <a href={ad.link} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline mt-0.5 block truncate">{ad.link}</a>}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {ad.status !== "active" && (
                      <button onClick={async () => {
                        await api.ads.admin.setStatus(ad.id, "active");
                        setAdsAll(a => a.map(x => x.id === ad.id ? { ...x, status: "active" } : x));
                      }} className="text-[11px] font-bold px-2 py-1 rounded-lg bg-green-100 text-green-800 hover:bg-green-200">
                        Aktiviraj
                      </button>
                    )}
                    {ad.status !== "rejected" && (
                      <button onClick={async () => {
                        await api.ads.admin.setStatus(ad.id, "rejected");
                        setAdsAll(a => a.map(x => x.id === ad.id ? { ...x, status: "rejected" } : x));
                      }} className="text-[11px] font-bold px-2 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200">
                        Reject
                      </button>
                    )}
                    <button onClick={async () => {
                      if (!confirm("Delete ad?")) return;
                      await api.ads.admin.remove(ad.id);
                      setAdsAll(a => a.filter(x => x.id !== ad.id));
                    }} className="p-1.5 rounded-lg bg-neutral-100 hover:bg-red-100 text-red-700" title="Delete">
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─────────── SETTINGS ─────────── */}
        {tab === "settings" && (
          <div className="max-w-xl space-y-6">

            {/* P2P Market Global Toggle */}
            <section className="surface-card p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-base mb-0.5">P2P Market</h3>
                  <p className="text-xs text-neutral-500">Enable or disable the P2P Market tab for all users. Disabling hides it from everyone regardless of their personal preference.</p>
                </div>
                <button
                  onClick={() => setMarketEnabled(v => !v)}
                  className={`w-14 h-7 rounded-full transition-colors relative shrink-0 ${marketEnabled ? "bg-[#F7931A]" : "bg-neutral-200"}`}>
                  <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${marketEnabled ? "right-0.5" : "left-0.5"}`}/>
                </button>
              </div>
              <div className="mt-3">
                <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${marketEnabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {marketEnabled ? "✓ Market ENABLED" : "✗ Market DISABLED"}
                </span>
              </div>
            </section>

            <section className="surface-card p-5">
              <h3 className="font-extrabold text-base mb-3">Commission Rates</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Voucher Redemption</label>
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.01" min="0" max="100" value={commissionPct} onChange={e => setCommissionPct(e.target.value)}
                      className="input-modern font-mono text-xl font-extrabold w-24 text-center"/>
                    <span className="font-extrabold text-lg">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">P2P Credits (of interest)</label>
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.01" min="0" max="100" value={creditsCommissionPct} onChange={e => setCreditsCommPct(e.target.value)}
                      className="input-modern font-mono text-xl font-extrabold w-24 text-center"/>
                    <span className="font-extrabold text-lg">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">P2P Predictions (of pool)</label>
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.01" min="0" max="100" value={predictionCommissionPct} onChange={e => setPredCommPct(e.target.value)}
                      className="input-modern font-mono text-xl font-extrabold w-24 text-center"/>
                    <span className="font-extrabold text-lg">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">P2P Swap (of amount)</label>
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.01" min="0" max="100" value={swapCommissionPct} onChange={e => setSwapCommPct(e.target.value)}
                      className="input-modern font-mono text-xl font-extrabold w-24 text-center"/>
                    <span className="font-extrabold text-lg">%</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="surface-card p-5">
              <h3 className="font-extrabold text-base mb-1">Bank Transfer (IBAN)</h3>
              <p className="text-xs text-neutral-500 mb-4">Shown to users who choose bank transfer for vouchers.</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1">IBAN</label>
                  <input value={iban} onChange={e => setIban(e.target.value)} placeholder="BA39 1290 0794 0102 8494" className="input-modern font-mono text-sm"/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1">Account Holder</label>
                    <input value={holder} onChange={e => setHolder(e.target.value)} className="input-modern text-sm"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1">Bank Name</label>
                    <input value={bankName} onChange={e => setBankName(e.target.value)} className="input-modern text-sm"/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1">SWIFT / BIC</label>
                  <input value={swift} onChange={e => setSwift(e.target.value)} className="input-modern font-mono text-sm"/>
                </div>
              </div>
            </section>

            {/* OTP Admin — create login codes for users */}
            <section className="surface-card p-5">
              <div className="flex items-center gap-2 mb-1">
                <Key size={16} className="text-[#F7931A]"/>
                <h3 className="font-extrabold text-base">Create OTP Login Code</h3>
              </div>
              <p className="text-xs text-neutral-500 mb-4">
                Generate a one-time login code for any user (by username or Lightning address).
                Leave Code field empty to auto-generate a 6-digit code.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1">User (username or Lightning address)</label>
                  <input value={otpUser} onChange={e => setOtpUser(e.target.value)}
                    placeholder="satoshi or satoshi@wallet.com"
                    className="input-modern text-sm font-mono"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1">Code (optional — leave blank for auto)</label>
                  <input value={otpCode} onChange={e => setOtpCode(e.target.value)}
                    placeholder="123456"
                    className="input-modern text-sm font-mono tracking-widest"
                    maxLength={10}/>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <button onClick={createAdminOtp}
                  className="btn-primary flex items-center gap-2 text-sm px-5 py-3">
                  <Key size={14}/> Create Code
                </button>
                {otpMsg && (
                  <span className={`text-sm font-bold ${otpMsg.startsWith("✓") ? "text-green-700" : "text-red-600"}`}>{otpMsg}</span>
                )}
              </div>
            </section>

            <div className="flex items-center gap-4">
              <button onClick={saveSettings} className="btn-accent">Save All Settings</button>
              {savedMsg && <span className="text-sm text-green-700 font-bold">{savedMsg}</span>}
            </div>
          </div>
        )}

        {/* ─────────── REFERRAL CODES ─────────── */}
        {tab === "referral" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-base text-black">Referral Codes</h2>
                <p className="text-xs text-neutral-500">Unlimited codes · users enter a code and receive bonus sats</p>
              </div>
              <button onClick={() => setRefForm({ code: "", bonus_sats: 1000, max_uses: "", description: "", expires_at: "", active: true })}
                className="flex items-center gap-1.5 bg-black text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-neutral-800">
                <Plus size={13}/> New code
              </button>
            </div>

            {refMsg && (
              <div className={`px-4 py-2 rounded-xl text-sm font-bold ${refMsg.startsWith("✓") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                {refMsg}
              </div>
            )}

            {refForm && (
              <div className="surface-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-black">{refForm.id ? "Uredi kod" : "Novi kod"}</span>
                  <button onClick={() => setRefForm(null)}><X size={16} className="text-neutral-400"/></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Kod *</label>
                    <input value={refForm.code} onChange={e => setRefForm((f:any)=>({...f,code:e.target.value.toUpperCase()}))}
                      placeholder="VBC2026" disabled={!!refForm.id}
                      className="input-modern text-sm w-full font-mono"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Bonus sats</label>
                    <input type="number" value={refForm.bonus_sats} onChange={e => setRefForm((f:any)=>({...f,bonus_sats:parseInt(e.target.value)||0}))}
                      className="input-modern text-sm w-full"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Max upotreba (prazno=∞)</label>
                    <input type="number" value={refForm.max_uses} onChange={e => setRefForm((f:any)=>({...f,max_uses:e.target.value}))}
                      placeholder="∞"
                      className="input-modern text-sm w-full"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Ističe (prazno=nikad)</label>
                    <input type="datetime-local" value={refForm.expires_at} onChange={e => setRefForm((f:any)=>({...f,expires_at:e.target.value}))}
                      className="input-modern text-sm w-full"/>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Opis (interno)</label>
                  <input value={refForm.description} onChange={e => setRefForm((f:any)=>({...f,description:e.target.value}))}
                    placeholder="Opis koda za internu upotrebu" className="input-modern text-sm w-full"/>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={refForm.active} onChange={e => setRefForm((f:any)=>({...f,active:e.target.checked}))}
                      className="w-4 h-4 rounded"/>
                    Aktivan
                  </label>
                </div>
                <div className="flex gap-2">
                  <button disabled={refSaving} onClick={async () => {
                    setRefSaving(true); setRefMsg("");
                    try {
                      const method = refForm.id ? "PATCH" : "POST";
                      const url = refForm.id ? `/api/referral/admin/${refForm.id}` : "/api/referral/admin/create";
                      const body = { ...refForm, max_uses: refForm.max_uses ? parseInt(refForm.max_uses) : null, expires_at: refForm.expires_at || null };
                      const r = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
                      const d = await r.json();
                      if (!r.ok) throw new Error(d.error);
                      setRefForm(null);
                      fetch("/api/referral/admin/list", { credentials: "include" }).then(r=>r.json()).then(d=>setRefCodes(d.codes??[]));
                      setRefMsg("✓ Sačuvano!");
                      setTimeout(()=>setRefMsg(""), 3000);
                    } catch(e:any) { setRefMsg("✗ " + e.message); }
                    setRefSaving(false);
                  }} className="flex items-center gap-1 text-sm font-bold px-4 py-2 rounded-xl bg-black text-white disabled:opacity-60">
                    {refSaving ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>}
                    {refForm.id ? "Save" : "Create"}
                  </button>
                  <button onClick={() => setRefForm(null)} className="text-sm px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 font-bold">Cancel</button>
                </div>
              </div>
            )}

            {refCodes.length === 0 && !refForm && (
              <div className="text-center py-8 text-neutral-400 text-sm">No referral codes yet. Create the first one.</div>
            )}
            {refCodes.map(rc => (
              <div key={rc.id} className="surface-card p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <Gift size={18} className="text-amber-600"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono font-extrabold text-black text-sm">{rc.code}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${rc.active ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-500"}`}>
                        {rc.active ? "Aktivan" : "Off"}
                      </span>
                      <span className="text-xs text-[#F7931A] font-bold">+{(rc.bonus_sats||0).toLocaleString()} sats</span>
                    </div>
                    <div className="text-[11px] text-neutral-500 space-y-0.5">
                      <p>Korišćen: <strong>{rc.use_count ?? 0}</strong>{rc.max_uses ? ` / ${rc.max_uses}` : " (∞)"}</p>
                      {rc.description && <p>{rc.description}</p>}
                      {rc.expires_at && <p>Ističe: {new Date(rc.expires_at).toLocaleDateString("sr-RS")}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setRefForm({...rc, max_uses: rc.max_uses ?? "", expires_at: rc.expires_at ? rc.expires_at.slice(0,16) : ""})}
                      className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-100">
                      <Edit2 size={13} className="text-neutral-500"/>
                    </button>
                    <button onClick={async () => {
                      if (!confirm(`Delete code "${rc.code}"?`)) return;
                      await fetch(`/api/referral/admin/${rc.id}`, { method: "DELETE", credentials: "include" });
                      setRefCodes(cs => cs.filter(c => c.id !== rc.id));
                    }} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-50">
                      <Trash2 size={13} className="text-red-400"/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─────────── OTP COUNTRY MANAGEMENT ─────────── */}
        {tab === "otp" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-base text-black">OTP Management</h2>
                <p className="text-xs text-neutral-500">Unlimited countries and SMS numbers with custom pricing</p>
              </div>
              <button onClick={() => setOtpCForm({ country_code: "", country_name: "", phone_prefix: "+", price_sats: 0, phone_number: "", notes: "", active: true, sort_order: 0 })}
                className="flex items-center gap-1.5 bg-black text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-neutral-800">
                <Plus size={13}/> Add
              </button>
            </div>

            {otpCForm && (
              <div className="surface-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-black">{otpCForm.id ? "Uredi unos" : "Novi unos"}</span>
                  <button onClick={() => setOtpCForm(null)}><X size={16} className="text-neutral-400"/></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Zemlja (SR, DE...)</label>
                    <input value={otpCForm.country_code} onChange={e => setOtpCForm((f:any)=>({...f,country_code:e.target.value.toUpperCase()}))}
                      placeholder="RS" maxLength={5} className="input-modern text-sm w-full"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Naziv</label>
                    <input value={otpCForm.country_name} onChange={e => setOtpCForm((f:any)=>({...f,country_name:e.target.value}))}
                      placeholder="Srbija" className="input-modern text-sm w-full"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Prefiks</label>
                    <input value={otpCForm.phone_prefix} onChange={e => setOtpCForm((f:any)=>({...f,phone_prefix:e.target.value}))}
                      placeholder="+381" className="input-modern text-sm w-full font-mono"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Cena OTP (sats)</label>
                    <input type="number" value={otpCForm.price_sats} onChange={e => setOtpCForm((f:any)=>({...f,price_sats:parseInt(e.target.value)||0}))}
                      className="input-modern text-sm w-full"/>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">SMS number (optional)</label>
                    <input value={otpCForm.phone_number} onChange={e => setOtpCForm((f:any)=>({...f,phone_number:e.target.value}))}
                      placeholder="+381601234567" className="input-modern text-sm w-full font-mono"/>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Napomene (interno)</label>
                    <input value={otpCForm.notes} onChange={e => setOtpCForm((f:any)=>({...f,notes:e.target.value}))}
                      placeholder="Operator, ograničenja, itd." className="input-modern text-sm w-full"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Redosled (manji = pre)</label>
                    <input type="number" value={otpCForm.sort_order} onChange={e => setOtpCForm((f:any)=>({...f,sort_order:parseInt(e.target.value)||0}))}
                      className="input-modern text-sm w-full"/>
                  </div>
                  <div className="flex items-center gap-2 pt-3">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={otpCForm.active} onChange={e => setOtpCForm((f:any)=>({...f,active:e.target.checked}))}
                        className="w-4 h-4 rounded"/>
                      Aktivna zemlja
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button disabled={otpCSaving} onClick={async () => {
                    setOtpCSaving(true);
                    try {
                      const method = otpCForm.id ? "PATCH" : "POST";
                      const url = otpCForm.id ? `/api/otp-mgmt/countries/${otpCForm.id}` : "/api/otp-mgmt/countries";
                      const r = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(otpCForm) });
                      const d = await r.json();
                      if (!r.ok) throw new Error(d.error);
                      setOtpCForm(null);
                      fetch("/api/otp-mgmt/countries", { credentials: "include" }).then(r=>r.json()).then(d=>setOtpCountries(d.countries??[]));
                    } catch(e:any) { alert(e.message); }
                    setOtpCSaving(false);
                  }} className="flex items-center gap-1 text-sm font-bold px-4 py-2 rounded-xl bg-black text-white disabled:opacity-60">
                    {otpCSaving ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>}
                    {otpCForm.id ? "Save" : "Add"}
                  </button>
                  <button onClick={() => setOtpCForm(null)} className="text-sm px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 font-bold">Cancel</button>
                </div>
              </div>
            )}

            {/* OTP Orders section */}
            {otpOrders.length > 0 && (
              <div className="mb-4">
                <h3 className="font-extrabold text-sm text-black mb-2">Pending OTP Orders ({otpOrders.filter((o:any)=>o.status==="pending").length})</h3>
                <div className="space-y-2">
                  {otpOrders.map((o:any) => (
                    <div key={o.id} className="surface-card p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="font-extrabold text-black text-sm">#{o.id} — {o.country_name} ({o.phone_prefix})</span>
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full ${o.status==="delivered" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{o.status}</span>
                        </div>
                        <p className="text-xs text-neutral-500">@{o.buyer_username} · ⚡ {Number(o.price_sats).toLocaleString()} sats</p>
                        {o.phone_number && <p className="text-xs font-mono text-neutral-600">SMS: {o.phone_number}</p>}
                        {o.otp_code && <p className="text-xs font-mono bg-green-50 text-green-900 px-2 py-1 rounded-lg inline-block mt-1">{o.otp_code}</p>}
                      </div>
                      {o.status === "pending" && (
                        <button onClick={() => { setOtpDeliverModal(o); setOtpDeliverCode(""); setOtpDeliverMsg(""); }}
                          className="shrink-0 flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-xl bg-black text-white hover:bg-neutral-800">
                          <Send size={11}/> Deliver
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {otpCountries.length === 0 && !otpCForm && (
              <div className="text-center py-8 text-neutral-400 text-sm">No countries added yet. Add the first one.</div>
            )}
            {otpCountries.map(oc => (
              <div key={oc.id} className="surface-card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0 font-extrabold text-sm text-neutral-700">
                    {oc.country_code}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-extrabold text-black text-sm">{oc.country_name}</span>
                      <span className="font-mono text-xs text-neutral-500">{oc.phone_prefix}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${oc.active ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-500"}`}>
                        {oc.active ? "Aktivan" : "Off"}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-500 flex flex-wrap gap-x-3">
                      <span>Cena: <strong>{(oc.price_sats||0).toLocaleString()} sats</strong></span>
                      {oc.phone_number && <span>SMS: <span className="font-mono">{oc.phone_number}</span></span>}
                      {oc.notes && <span>{oc.notes}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setOtpCForm({...oc})}
                      className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-100">
                      <Edit2 size={13} className="text-neutral-500"/>
                    </button>
                    <button onClick={async () => {
                      if (!confirm(`Delete "${oc.country_name}"?`)) return;
                      await fetch(`/api/otp-mgmt/countries/${oc.id}`, { method: "DELETE", credentials: "include" });
                      setOtpCountries(cs => cs.filter(c => c.id !== oc.id));
                    }} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-50">
                      <Trash2 size={13} className="text-red-400"/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* OTP Deliver Modal */}
        {otpDeliverModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setOtpDeliverModal(null)}>
            <div onClick={e => e.stopPropagation()} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              <h3 className="font-extrabold text-black mb-1">Deliver OTP Code</h3>
              <p className="text-sm text-neutral-500 mb-4">Order #{otpDeliverModal.id} — {otpDeliverModal.country_name} for @{otpDeliverModal.buyer_username}</p>
              <input value={otpDeliverCode} onChange={e => setOtpDeliverCode(e.target.value)}
                placeholder="Enter OTP / SMS code"
                className="input-modern w-full font-mono mb-3 text-lg tracking-widest text-center"/>
              {otpDeliverMsg && <p className="text-sm text-green-700 mb-3">{otpDeliverMsg}</p>}
              <div className="flex gap-2">
                <button onClick={async () => {
                  if (!otpDeliverCode.trim()) return;
                  try {
                    const r = await fetch(`/api/otp-mgmt/admin/orders/${otpDeliverModal.id}/deliver`, {
                      method: "POST", credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ code: otpDeliverCode.trim() }),
                    });
                    const d = await r.json();
                    if (!r.ok) throw new Error(d.error);
                    setOtpDeliverMsg("✓ Delivered!");
                    setOtpOrders(os => os.map(o => o.id === otpDeliverModal.id ? { ...o, status: "delivered", otp_code: otpDeliverCode.trim() } : o));
                    setTimeout(() => setOtpDeliverModal(null), 1500);
                  } catch(e: any) { setOtpDeliverMsg(e.message); }
                }} className="flex-1 py-2.5 rounded-xl bg-black text-white text-sm font-bold hover:bg-neutral-800">
                  Send Code
                </button>
                <button onClick={() => setOtpDeliverModal(null)} className="px-4 py-2.5 rounded-xl bg-neutral-100 text-neutral-700 text-sm font-bold">Cancel</button>
              </div>
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
                    <button onClick={() => resolve(r.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700">Resolve</button>
                    <button onClick={() => block(r.targetId, false)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700">Block User</button>
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
