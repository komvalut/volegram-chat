import { useState, useEffect } from "react";
import { X, Coins, Plus, Check, Loader2, Clock, TrendingUp, TrendingDown, Trash2, RefreshCw } from "lucide-react";

interface Credit {
  id: number;
  user_id: number;
  type: "offer" | "request";
  amount_sats: number;
  interest_pct: number;
  duration_days: number;
  description: string | null;
  status: string;
  borrower_id: number | null;
  poster_username: string;
  borrower_username?: string;
  created_at: string;
  due_at: string | null;
}

interface Props {
  user: any;
  onClose: () => void;
  onBalanceChange?: () => void;
}

const DURATION_OPTS = [1, 3, 7, 14, 30];

export default function CreditsPanel({ user, onClose, onBalanceChange }: Props) {
  const [tab, setTab]           = useState<"browse" | "mine" | "new">("browse");
  const [credits, setCredits]   = useState<Credit[]>([]);
  const [mine, setMine]         = useState<Credit[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState<number | null>(null);
  const [msg, setMsg]           = useState<{ text: string; ok: boolean } | null>(null);

  const [form, setForm] = useState({
    type: "offer" as "offer" | "request",
    amount_sats: "",
    interest_pct: "5",
    duration_days: 7,
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [br, mr] = await Promise.all([
        fetch("/api/credits", { credentials: "include" }).then(r => r.json()),
        fetch("/api/credits/mine", { credentials: "include" }).then(r => r.json()),
      ]);
      setCredits(br.credits ?? []);
      setMine(mr.credits ?? []);
    } catch {}
    setLoading(false);
  };

  const take = async (id: number) => {
    setMsg(null); setBusy(id);
    try {
      const r = await fetch(`/api/credits/${id}/take`, { method: "POST", credentials: "include" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsg({ text: d.message, ok: true });
      onBalanceChange?.();
      await loadAll();
    } catch (e: any) { setMsg({ text: e.message, ok: false }); }
    setBusy(null);
  };

  const repay = async (id: number) => {
    setMsg(null); setBusy(id);
    try {
      const r = await fetch(`/api/credits/${id}/repay`, { method: "POST", credentials: "include" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsg({ text: d.message, ok: true });
      onBalanceChange?.();
      await loadAll();
    } catch (e: any) { setMsg({ text: e.message, ok: false }); }
    setBusy(null);
  };

  const cancel = async (id: number) => {
    setMsg(null); setBusy(id);
    try {
      const r = await fetch(`/api/credits/${id}`, { method: "DELETE", credentials: "include" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsg({ text: "Listing cancelled.", ok: true });
      onBalanceChange?.();
      await loadAll();
    } catch (e: any) { setMsg({ text: e.message, ok: false }); }
    setBusy(null);
  };

  const submit = async () => {
    const sats = parseInt(form.amount_sats);
    if (!sats || sats < 1) { setMsg({ text: "Enter amount in sats", ok: false }); return; }
    setSubmitting(true); setMsg(null);
    try {
      const r = await fetch("/api/credits", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          amount_sats: sats,
          interest_pct: parseFloat(form.interest_pct) || 0,
          duration_days: form.duration_days,
          description: form.description || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsg({ text: `Listing posted!`, ok: true });
      setForm({ type: "offer", amount_sats: "", interest_pct: "5", duration_days: 7, description: "" });
      onBalanceChange?.();
      await loadAll();
      setTab("browse");
    } catch (e: any) { setMsg({ text: e.message, ok: false }); }
    setSubmitting(false);
  };

  const totalRepay = (c: Credit) => Math.ceil(c.amount_sats * (1 + c.interest_pct / 100));

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-neutral-100 shrink-0">
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-neutral-100">
          <X size={18} className="text-neutral-500"/>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center">
            <Coins size={14} className="text-[#F7931A]"/>
          </div>
          <div>
            <p className="font-extrabold text-black text-sm">P2P Credits</p>
            <p className="text-[10px] text-neutral-400">Lend · Borrow · Earn interest in sats</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs font-extrabold text-black">⚡ {(user.sats_balance ?? 0).toLocaleString()}</span>
          <button onClick={() => setTab("new")} className="flex items-center gap-1 bg-black text-white text-[11px] font-bold px-3 py-1.5 rounded-xl active:scale-95">
            <Plus size={12}/> Post
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-100 bg-white shrink-0">
        {([["browse","Market"], ["mine",`My Deals (${mine.length})`], ["new","+ New"]] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${
              tab === t ? "border-[#F7931A] text-black" : "border-transparent text-neutral-400"
            }`}>{label}</button>
        ))}
      </div>

      {msg && (
        <div className={`mx-4 mt-3 px-4 py-2.5 rounded-xl text-sm font-semibold ${msg.ok ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-[#f8f8f8]">

        {/* INFO BANNER */}
        {tab === "browse" && (
          <div className="mx-4 mt-4 mb-1 bg-neutral-900 rounded-2xl p-4">
            <p className="text-[11px] font-extrabold text-[#F7931A] uppercase tracking-wide mb-1">How P2P Credits work</p>
            <p className="text-[11px] text-neutral-300 leading-relaxed">
              <strong className="text-white">Lenders</strong> post offers (sats locked). <strong className="text-white">Borrowers</strong> take the offer, receive sats instantly, and repay principal + interest before the deadline.
              All settled in ⚡ sats — no banks, no KYC.
            </p>
          </div>
        )}

        {/* BROWSE */}
        {tab === "browse" && (
          <div className="px-4 py-3 space-y-3">
            {loading ? (
              <div className="py-12 text-center"><Loader2 size={20} className="animate-spin text-[#F7931A] mx-auto"/></div>
            ) : credits.length === 0 ? (
              <div className="py-12 text-center">
                <Coins size={28} className="text-neutral-200 mx-auto mb-3"/>
                <p className="text-sm font-bold text-neutral-400">No listings yet</p>
                <p className="text-xs text-neutral-300 mt-1">Be the first to post a loan offer</p>
              </div>
            ) : credits.map(c => (
              <div key={c.id} className="bg-white rounded-2xl border border-neutral-100 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${c.type === "offer" ? "bg-green-100" : "bg-blue-100"}`}>
                      {c.type === "offer" ? <TrendingUp size={13} className="text-green-700"/> : <TrendingDown size={13} className="text-blue-700"/>}
                    </div>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${c.type === "offer" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
                      {c.type === "offer" ? "LOAN OFFER" : "BORROW REQUEST"}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400">@{c.poster_username}</span>
                </div>

                <div className="flex items-center gap-4 mb-2">
                  <div>
                    <p className="text-lg font-extrabold text-black">⚡ {Number(c.amount_sats).toLocaleString()}</p>
                    <p className="text-[10px] text-neutral-400">sats</p>
                  </div>
                  <div className="h-8 w-px bg-neutral-100"/>
                  <div>
                    <p className="text-sm font-extrabold text-black">{c.interest_pct}%</p>
                    <p className="text-[10px] text-neutral-400">interest</p>
                  </div>
                  <div className="h-8 w-px bg-neutral-100"/>
                  <div>
                    <p className="text-sm font-extrabold text-black">{c.duration_days}d</p>
                    <p className="text-[10px] text-neutral-400">duration</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-xs font-extrabold text-neutral-700">Repay: ⚡{totalRepay(c).toLocaleString()}</p>
                  </div>
                </div>

                {c.description && <p className="text-xs text-neutral-500 mb-3">{c.description}</p>}

                {c.user_id !== user.id && (
                  <button onClick={() => take(c.id)} disabled={busy === c.id}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-extrabold text-xs text-black active:scale-[0.97] transition-transform disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#F7931A,#FF6B00)" }}>
                    {busy === c.id ? <Loader2 size={12} className="animate-spin"/> : null}
                    {c.type === "offer" ? "Take Loan" : "Fund Request"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* MY DEALS */}
        {tab === "mine" && (
          <div className="px-4 py-3 space-y-3">
            {loading ? <div className="py-12 text-center"><Loader2 size={20} className="animate-spin text-[#F7931A] mx-auto"/></div>
            : mine.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-bold text-neutral-400">No active deals</p>
              </div>
            ) : mine.map(c => {
              const isLender   = c.user_id === user.id && c.type === "offer";
              const isBorrower = c.borrower_id === user.id;
              const isOpen     = c.status === "open";
              const isActive   = c.status === "active";
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-neutral-100 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${c.type === "offer" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
                        {c.type === "offer" ? "LEND" : "BORROW"}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                        c.status === "open" ? "bg-amber-100 text-amber-800" :
                        c.status === "active" ? "bg-blue-100 text-blue-800" :
                        c.status === "repaid" ? "bg-green-100 text-green-800" :
                        "bg-neutral-100 text-neutral-500"
                      }`}>{c.status}</span>
                    </div>
                    {isOpen && c.user_id === user.id && (
                      <button onClick={() => cancel(c.id)} disabled={busy === c.id} className="p-1.5 rounded-lg hover:bg-red-50">
                        <Trash2 size={13} className="text-red-400"/>
                      </button>
                    )}
                  </div>
                  <p className="font-extrabold text-black">⚡ {Number(c.amount_sats).toLocaleString()} sats · {c.interest_pct}% · {c.duration_days}d</p>
                  {isActive && c.due_at && (
                    <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                      <Clock size={11}/> Due: {new Date(c.due_at).toLocaleDateString()}
                    </p>
                  )}
                  {isActive && isBorrower && (
                    <button onClick={() => repay(c.id)} disabled={busy === c.id}
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-black text-white font-extrabold text-xs active:scale-[0.97] disabled:opacity-50">
                      {busy === c.id ? <Loader2 size={12} className="animate-spin"/> : <RefreshCw size={12}/>}
                      Repay ⚡{totalRepay(c).toLocaleString()} sats
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* NEW LISTING */}
        {tab === "new" && (
          <div className="px-4 py-4">
            <div className="bg-white rounded-2xl border border-neutral-100 p-5 space-y-4">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Post a listing</p>

              <div className="grid grid-cols-2 gap-2">
                {(["offer","request"] as const).map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={`py-3 rounded-xl text-xs font-extrabold border-2 transition-all ${
                      form.type === t ? "border-black bg-black text-white" : "border-neutral-200 text-neutral-600"
                    }`}>
                    {t === "offer" ? "🏦 Lend sats" : "🙋 Borrow sats"}
                  </button>
                ))}
              </div>

              <div className="bg-neutral-50 rounded-xl p-3 text-[11px] text-neutral-600 leading-relaxed">
                {form.type === "offer"
                  ? "You lock sats now. A borrower takes the offer and receives them instantly. They repay principal + interest before the deadline."
                  : "You post how many sats you need. A lender funds it and you receive sats instantly. Repay by the deadline."}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Amount (sats)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F7931A] font-extrabold">⚡</span>
                  <input type="number" value={form.amount_sats} onChange={e => setForm(f => ({ ...f, amount_sats: e.target.value }))}
                    placeholder="5000" min="1"
                    className="w-full border border-neutral-200 rounded-xl pl-8 pr-4 py-2.5 text-sm font-extrabold font-mono outline-none focus:border-black"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Interest %</label>
                  <input type="number" value={form.interest_pct} onChange={e => setForm(f => ({ ...f, interest_pct: e.target.value }))}
                    min="0" max="100" step="0.5"
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-bold font-mono outline-none focus:border-black"/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Duration</label>
                  <div className="flex gap-1 flex-wrap">
                    {DURATION_OPTS.map(d => (
                      <button key={d} onClick={() => setForm(f => ({ ...f, duration_days: d }))}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${form.duration_days === d ? "bg-black text-white border-black" : "bg-white text-neutral-600 border-neutral-200"}`}>
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {form.amount_sats && (
                <div className="bg-[#F7931A]/10 rounded-xl px-3 py-2 text-xs font-semibold text-[#b85c00]">
                  Repayment: ⚡{Math.ceil((parseInt(form.amount_sats)||0) * (1 + (parseFloat(form.interest_pct)||0)/100)).toLocaleString()} sats
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Note (optional)</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Any collateral, conditions, etc."
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-black"/>
              </div>

              <button onClick={submit} disabled={submitting || !form.amount_sats}
                className="w-full flex items-center justify-center gap-2 bg-black text-white font-extrabold py-3 rounded-xl text-sm active:scale-[0.98] disabled:opacity-40">
                {submitting ? <Loader2 size={15} className="animate-spin"/> : <Check size={15}/>}
                {submitting ? "Posting…" : "Post Listing"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
