import { useState, useEffect } from "react";
import { X, Target, Plus, Check, Loader2, ChevronRight, Trophy, Clock, Flame, TrendingUp, ArrowLeft, Trash2 } from "lucide-react";

interface Prediction {
  id: number;
  creator_id: number;
  creator_username: string;
  title: string;
  description: string | null;
  options: string[];
  pool_sats: number;
  status: "open" | "closed" | "settled";
  close_at: string | null;
  result_option_idx: number | null;
  commission_rate: number;
  bet_count: number;
  created_at: string;
}

interface Bet {
  id: number;
  user_id: number;
  username: string;
  option_idx: number;
  amount_sats: number;
  payout_sats: number | null;
}

interface Props {
  user: any;
  onClose: () => void;
  onBalanceChange?: () => void;
}

export default function PredictionPanel({ user, onClose, onBalanceChange }: Props) {
  const [tab, setTab]                   = useState<"browse" | "mine" | "new">("browse");
  const [predictions, setPredictions]   = useState<Prediction[]>([]);
  const [myBets, setMyBets]             = useState<any[]>([]);
  const [selected, setSelected]         = useState<Prediction | null>(null);
  const [bets, setBets]                 = useState<Bet[]>([]);
  const [loading, setLoading]           = useState(true);
  const [busy, setBusy]                 = useState(false);
  const [msg, setMsg]                   = useState<{ text: string; ok: boolean } | null>(null);
  const [betAmount, setBetAmount]       = useState("");
  const [betOption, setBetOption]       = useState<number | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    options: ["", ""],
    close_at: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pr, mr] = await Promise.all([
        fetch("/api/predictions", { credentials: "include" }).then(r => r.json()),
        fetch("/api/predictions/user/my-bets", { credentials: "include" }).then(r => r.json()),
      ]);
      setPredictions(pr.predictions ?? []);
      setMyBets(mr.bets ?? []);
    } catch {}
    setLoading(false);
  };

  const openPrediction = async (p: Prediction) => {
    setSelected(p);
    setBets([]);
    setBetOption(null);
    setBetAmount("");
    setMsg(null);
    try {
      const r = await fetch(`/api/predictions/${p.id}`, { credentials: "include" });
      const d = await r.json();
      setSelected(d.prediction);
      setBets(d.bets ?? []);
    } catch {}
  };

  const placeBet = async () => {
    if (!selected || betOption === null || !betAmount) return;
    const sats = parseInt(betAmount);
    if (!sats || sats < 1) { setMsg({ text: "Enter amount in sats", ok: false }); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`/api/predictions/${selected.id}/bet`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option_idx: betOption, amount_sats: sats }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsg({ text: d.message, ok: true });
      setBetAmount("");
      onBalanceChange?.();
      await openPrediction(selected);
      await loadAll();
    } catch (e: any) { setMsg({ text: e.message, ok: false }); }
    setBusy(false);
  };

  const settle = async (optionIdx: number) => {
    if (!selected) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`/api/predictions/${selected.id}/settle`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result_option_idx: optionIdx }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsg({ text: `Settled! "${d.result}" won. Prize: ⚡${d.prizePool?.toLocaleString()} to ${d.winners} winners.`, ok: true });
      onBalanceChange?.();
      await loadAll();
      setSelected(null);
    } catch (e: any) { setMsg({ text: e.message, ok: false }); }
    setBusy(false);
  };

  const closeBetting = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await fetch(`/api/predictions/${selected.id}/close`, { method: "POST", credentials: "include" });
      await openPrediction({ ...selected, status: "closed" } as any);
      await loadAll();
    } catch {}
    setBusy(false);
  };

  const submitPrediction = async () => {
    const opts = form.options.filter(o => o.trim());
    if (!form.title.trim() || opts.length < 2) {
      setMsg({ text: "Title + at least 2 options required", ok: false }); return;
    }
    setSubmitting(true); setMsg(null);
    try {
      const r = await fetch("/api/predictions", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          options: opts,
          close_at: form.close_at || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsg({ text: "Prediction posted!", ok: true });
      setForm({ title: "", description: "", options: ["", ""], close_at: "" });
      await loadAll();
      setTab("browse");
    } catch (e: any) { setMsg({ text: e.message, ok: false }); }
    setSubmitting(false);
  };

  const optionTotals = (p: Prediction, localBets: Bet[]) => {
    const options = Array.isArray(p.options) ? p.options : JSON.parse(p.options as any);
    return options.map((_: string, i: number) =>
      localBets.filter(b => b.option_idx === i).reduce((s, b) => s + parseInt(b.amount_sats as any), 0)
    );
  };

  const myBetOnSelected = bets.find(b => b.user_id === user.id);

  // ── Detail view ──
  if (selected) {
    const options: string[] = Array.isArray(selected.options) ? selected.options : JSON.parse(selected.options as any);
    const totals = optionTotals(selected, bets);
    const pool   = parseInt(selected.pool_sats as any);
    const isCreator = selected.creator_id === user.id;
    const canSettle = (isCreator || user.isAdmin) && selected.status !== "settled";

    return (
      <div className="fixed inset-0 z-[75] flex flex-col bg-white">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100 shrink-0">
          <button onClick={() => setSelected(null)} className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-neutral-100">
            <ArrowLeft size={18} className="text-neutral-600"/>
          </button>
          <div className="flex-1">
            <p className="font-extrabold text-black text-sm truncate">{selected.title}</p>
            <p className="text-[10px] text-neutral-400">@{selected.creator_username} · ⚡{pool.toLocaleString()} pool</p>
          </div>
          <span className={`text-[10px] font-extrabold uppercase px-2 py-1 rounded-full ${
            selected.status === "open" ? "bg-green-100 text-green-800" :
            selected.status === "closed" ? "bg-amber-100 text-amber-800" :
            "bg-neutral-100 text-neutral-500"
          }`}>{selected.status}</span>
        </div>

        {msg && (
          <div className={`mx-4 mt-3 px-4 py-2.5 rounded-xl text-sm font-semibold ${msg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {msg.text}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {selected.description && (
            <p className="text-sm text-neutral-600 leading-relaxed">{selected.description}</p>
          )}

          {/* Options with progress bars */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Pick your prediction</p>
            {options.map((opt, i) => {
              const pct = pool > 0 ? Math.round((totals[i] / pool) * 100) : 0;
              const isMine = myBetOnSelected?.option_idx === i;
              const isWinner = selected.status === "settled" && selected.result_option_idx === i;
              return (
                <button key={i}
                  onClick={() => { if (selected.status === "open") setBetOption(i === betOption ? null : i); }}
                  disabled={selected.status !== "open"}
                  className={`w-full rounded-2xl overflow-hidden border-2 transition-all active:scale-[0.98] text-left ${
                    isWinner ? "border-green-400 bg-green-50" :
                    betOption === i ? "border-black" :
                    isMine ? "border-[#F7931A]" :
                    "border-neutral-100 bg-white"
                  }`}>
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isWinner && <Trophy size={14} className="text-green-600"/>}
                        <span className="font-extrabold text-sm text-black">{opt}</span>
                        {isMine && <span className="text-[9px] bg-[#F7931A] text-white px-1.5 py-0.5 rounded-full font-bold">MY BET</span>}
                      </div>
                      <span className="text-xs font-extrabold text-neutral-500">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${pct}%`,
                        background: isWinner ? "#22c55e" : betOption === i ? "#000" : "#F7931A"
                      }}/>
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-1">⚡ {totals[i].toLocaleString()} sats · {bets.filter(b => b.option_idx === i).length} bets</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bet form */}
          {selected.status === "open" && betOption !== null && (
            <div className="bg-neutral-50 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-extrabold text-black">Bet on: <span className="text-[#F7931A]">{options[betOption]}</span></p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F7931A] font-extrabold">⚡</span>
                <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)}
                  placeholder="1000" min="1"
                  className="w-full border border-neutral-200 rounded-xl pl-8 pr-4 py-2.5 text-sm font-extrabold font-mono outline-none focus:border-black bg-white"/>
              </div>
              <div className="flex gap-2">
                {[500, 1000, 5000, 10000].map(a => (
                  <button key={a} onClick={() => setBetAmount(a.toString())}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${betAmount === String(a) ? "bg-black text-white border-black" : "bg-white text-neutral-600 border-neutral-200"}`}>
                    {a >= 1000 ? `${a/1000}k` : a}
                  </button>
                ))}
              </div>
              <button onClick={placeBet} disabled={busy || !betAmount}
                className="w-full flex items-center justify-center gap-2 bg-black text-white font-extrabold py-3 rounded-xl text-sm active:scale-[0.98] disabled:opacity-40">
                {busy ? <Loader2 size={14} className="animate-spin"/> : <TrendingUp size={14}/>}
                {busy ? "Placing…" : "Place Bet"}
              </button>
            </div>
          )}

          {/* Settle section (creator/admin only) */}
          {canSettle && (
            <div className="border-2 border-amber-200 bg-amber-50 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-extrabold text-amber-900">Settle prediction (pick winner)</p>
              {selected.status === "open" && (
                <button onClick={closeBetting} disabled={busy}
                  className="w-full py-2 rounded-xl bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300 active:scale-[0.98]">
                  Close betting first
                </button>
              )}
              {(selected.status === "closed") && (
                <div className="grid grid-cols-2 gap-2">
                  {options.map((opt, i) => (
                    <button key={i} onClick={() => settle(i)} disabled={busy}
                      className="py-2 rounded-xl bg-black text-white text-xs font-bold active:scale-[0.98] disabled:opacity-40">
                      {busy ? "…" : `"${opt.slice(0,12)}" wins`}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-amber-600">Commission {Math.round(selected.commission_rate * 100)}% of pool goes to platform on settlement.</p>
            </div>
          )}

          {/* Bets list */}
          {bets.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">All bets ({bets.length})</p>
              <div className="space-y-2">
                {bets.map(b => (
                  <div key={b.id} className="flex items-center justify-between bg-white border border-neutral-100 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-700">@{b.username}</span>
                      <span className="text-[10px] text-[#F7931A] font-bold">{options[b.option_idx]}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-extrabold text-black">⚡ {parseInt(b.amount_sats as any).toLocaleString()}</p>
                      {b.payout_sats && <p className="text-[10px] text-green-600 font-bold">+⚡{b.payout_sats.toLocaleString()}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-neutral-100 shrink-0">
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-neutral-100">
          <X size={18} className="text-neutral-500"/>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center">
            <Target size={14} className="text-[#F7931A]"/>
          </div>
          <div>
            <p className="font-extrabold text-black text-sm">P2P Prediction</p>
            <p className="text-[10px] text-neutral-400">Bet sats on any outcome · Earn if right</p>
          </div>
        </div>
        <div className="ml-auto">
          <button onClick={() => setTab("new")} className="flex items-center gap-1 bg-black text-white text-[11px] font-bold px-3 py-1.5 rounded-xl active:scale-95">
            <Plus size={12}/> Create
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-100 bg-white shrink-0">
        {([["browse","Predictions"], ["mine",`My Bets (${myBets.length})`], ["new","+ New"]] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${
              tab === t ? "border-[#F7931A] text-black" : "border-transparent text-neutral-400"
            }`}>{label}</button>
        ))}
      </div>

      {msg && (
        <div className={`mx-4 mt-3 px-4 py-2.5 rounded-xl text-sm font-semibold ${msg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-[#f8f8f8]">

        {/* BROWSE */}
        {tab === "browse" && (
          <div className="px-4 py-4 space-y-3">
            <div className="bg-neutral-900 rounded-2xl p-4">
              <p className="text-[11px] font-extrabold text-[#F7931A] uppercase tracking-wide mb-1">How P2P Prediction works</p>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Anyone can create a prediction (BTC price, sports, anything). Others bet sats on the outcome.
                Creator (or admin) settles by picking the winner. Losers' pool is split proportionally among winners.
                Platform takes <strong className="text-white">5%</strong> commission (adjustable by admin).
              </p>
            </div>

            {loading ? (
              <div className="py-12 text-center"><Loader2 size={20} className="animate-spin text-[#F7931A] mx-auto"/></div>
            ) : predictions.length === 0 ? (
              <div className="py-12 text-center">
                <Target size={28} className="text-neutral-200 mx-auto mb-3"/>
                <p className="text-sm font-bold text-neutral-400">No predictions yet</p>
                <button onClick={() => setTab("new")} className="mt-3 bg-black text-white px-4 py-2 rounded-xl text-xs font-bold">Create first</button>
              </div>
            ) : predictions.map(p => {
              const options: string[] = Array.isArray(p.options) ? p.options : JSON.parse(p.options as any);
              const pool = parseInt(p.pool_sats as any);
              return (
                <button key={p.id} onClick={() => openPrediction(p)}
                  className="w-full text-left bg-white rounded-2xl border border-neutral-100 p-4 shadow-sm active:scale-[0.98] transition-transform">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-extrabold text-black text-sm flex-1 leading-tight">{p.title}</p>
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                      p.status === "open" ? "bg-green-100 text-green-800" :
                      p.status === "settled" ? "bg-neutral-100 text-neutral-500" :
                      "bg-amber-100 text-amber-800"
                    }`}>{p.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {options.slice(0, 4).map((opt, i) => (
                      <span key={i} className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-semibold">{opt}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <span>@{p.creator_username}</span>
                    <div className="flex items-center gap-3">
                      {parseInt(p.bet_count as any) > 0 && <span><Flame size={10} className="inline"/> {p.bet_count} bets</span>}
                      <span className="font-extrabold text-black">⚡ {pool.toLocaleString()}</span>
                      {p.close_at && <span><Clock size={10} className="inline"/> {new Date(p.close_at).toLocaleDateString()}</span>}
                      <ChevronRight size={12}/>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* MY BETS */}
        {tab === "mine" && (
          <div className="px-4 py-4 space-y-3">
            {loading ? <div className="py-12 text-center"><Loader2 size={20} className="animate-spin text-[#F7931A] mx-auto"/></div>
            : myBets.length === 0 ? (
              <div className="py-12 text-center"><p className="text-sm font-bold text-neutral-400">No bets yet</p></div>
            ) : myBets.map(b => {
              const options: string[] = Array.isArray(b.options) ? b.options : JSON.parse(b.options);
              const won = b.result_option_idx !== null && b.option_idx === b.result_option_idx;
              return (
                <div key={b.id} className={`bg-white rounded-2xl border-2 p-4 ${won ? "border-green-300" : b.status === "settled" ? "border-neutral-100" : "border-neutral-100"}`}>
                  <p className="font-extrabold text-black text-sm mb-1">{b.title}</p>
                  <p className="text-[11px] text-neutral-500 mb-2">Your pick: <strong className="text-black">{options[b.option_idx]}</strong></p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-black">⚡ {parseInt(b.amount_sats).toLocaleString()} bet</span>
                    {b.payout_sats ? (
                      <span className="text-green-600 font-extrabold">+⚡{b.payout_sats.toLocaleString()} won!</span>
                    ) : b.status === "settled" ? (
                      <span className="text-red-400 font-bold">Lost</span>
                    ) : (
                      <span className={`uppercase text-[10px] font-bold px-2 py-0.5 rounded-full ${b.status === "open" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{b.status}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* NEW */}
        {tab === "new" && (
          <div className="px-4 py-4">
            <div className="bg-white rounded-2xl border border-neutral-100 p-5 space-y-4">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Create a prediction market</p>

              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Question / Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Will BTC hit $100k by end of 2025?"
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-black"/>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Description (optional)</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Add context, rules, source of truth…" rows={2}
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-black resize-none"/>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Options (min 2) *</label>
                <div className="space-y-2">
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={opt} onChange={e => setForm(f => ({ ...f, options: f.options.map((o, j) => j === i ? e.target.value : o) }))}
                        placeholder={`Option ${i + 1}`}
                        className="flex-1 border border-neutral-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-black"/>
                      {form.options.length > 2 && (
                        <button onClick={() => setForm(f => ({ ...f, options: f.options.filter((_, j) => j !== i) }))}
                          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-red-50">
                          <Trash2 size={13} className="text-red-400"/>
                        </button>
                      )}
                    </div>
                  ))}
                  {form.options.length < 6 && (
                    <button onClick={() => setForm(f => ({ ...f, options: [...f.options, ""] }))}
                      className="w-full py-2 border border-dashed border-neutral-300 rounded-xl text-xs font-bold text-neutral-400 hover:border-black hover:text-black transition-colors">
                      + Add option
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Betting closes (optional)</label>
                <input type="datetime-local" value={form.close_at} onChange={e => setForm(f => ({ ...f, close_at: e.target.value }))}
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-black bg-white"/>
              </div>

              <div className="bg-neutral-50 rounded-xl px-3 py-2 text-[11px] text-neutral-500">
                You (creator) settle the prediction by picking the winning option after the event.
              </div>

              <button onClick={submitPrediction} disabled={submitting || !form.title.trim()}
                className="w-full flex items-center justify-center gap-2 bg-black text-white font-extrabold py-3 rounded-xl text-sm active:scale-[0.98] disabled:opacity-40">
                {submitting ? <Loader2 size={14} className="animate-spin"/> : <Target size={14}/>}
                {submitting ? "Creating…" : "Create Prediction"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
