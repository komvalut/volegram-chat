import { useState, useEffect } from "react";
import { X, Phone, Check, Loader2, ShoppingBag, Clock, RefreshCw, AlertCircle, RotateCcw, ChevronDown } from "lucide-react";

const SERVICES = [
  "Any","Telegram","WhatsApp","Signal","Viber","Instagram",
  "Facebook","Twitter","TikTok","Google","Apple","Microsoft","Amazon",
];

const SERVICE_ICONS: Record<string, string> = {
  Telegram:"📱", WhatsApp:"💬", Signal:"🔒", Viber:"📳", Instagram:"📸",
  Facebook:"👤", Twitter:"🐦", TikTok:"🎵", Google:"🔍", Apple:"🍎",
  Microsoft:"🖥", Amazon:"📦", Any:"🌐",
};

const FLAG: Record<string, string> = {
  RS:"🇷🇸", DE:"🇩🇪", US:"🇺🇸", GB:"🇬🇧", FR:"🇫🇷", IT:"🇮🇹",
  ES:"🇪🇸", BA:"🇧🇦", HR:"🇭🇷", ME:"🇲🇪", MK:"🇲🇰", SI:"🇸🇮",
  HU:"🇭🇺", RO:"🇷🇴", BG:"🇧🇬", PL:"🇵🇱", CZ:"🇨🇿", SK:"🇸🇰",
  AT:"🇦🇹", CH:"🇨🇭", NL:"🇳🇱", BE:"🇧🇪", SE:"🇸🇪", NO:"🇳🇴",
  DK:"🇩🇰", FI:"🇫🇮", PT:"🇵🇹", GR:"🇬🇷", TR:"🇹🇷", UA:"🇺🇦",
  RU:"🇷🇺", IN:"🇮🇳", CN:"🇨🇳", JP:"🇯🇵", KR:"🇰🇷", AU:"🇦🇺",
  CA:"🇨🇦", BR:"🇧🇷", MX:"🇲🇽", AR:"🇦🇷",
};

interface Country { id: number; country_code: string; country_name: string; phone_prefix: string; price_sats: number; sort_order: number; }
interface Order { id: number; country_name: string; country_code: string; phone_prefix: string; price_sats: number; status: string; otp_code: string | null; service_name: string | null; created_at: string; delivered_at: string | null; refunded_at: string | null; refund_reason: string | null; }
interface Props { user: any; onClose: () => void; onBalanceChange?: () => void; }

export default function OTPPanel({ user, onClose, onBalanceChange }: Props) {
  const [tab, setTab]           = useState<"shop" | "orders">("shop");
  const [countries, setCountries] = useState<Country[]>([]);
  const [orders, setOrders]     = useState<Order[]>([]);
  const [loading, setLoading]   = useState(true);
  const [buying, setBuying]     = useState<number | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [service, setService]   = useState("Any");
  const [serviceOpen, setServiceOpen] = useState(false);
  const [refunding, setRefunding] = useState<number | null>(null);
  const [refundMsg, setRefundMsg] = useState<{ id: number; msg: string; ok: boolean } | null>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cr, or] = await Promise.all([
        fetch("/api/otp-mgmt/public", { credentials: "include" }).then(r => r.json()),
        fetch("/api/otp-mgmt/orders", { credentials: "include" }).then(r => r.json()),
      ]);
      setCountries(cr.countries ?? []);
      setOrders(or.orders ?? []);
    } catch {}
    setLoading(false);
  };

  const buy = async (country: Country) => {
    setError(""); setSuccess(null);
    if ((user.sats_balance ?? 0) < country.price_sats) {
      setError(`Not enough sats. You need ${country.price_sats.toLocaleString()} sats — deposit first.`);
      return;
    }
    setBuying(country.id);
    try {
      const r = await fetch(`/api/otp-mgmt/buy/${country.id}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service }),
      });
      let d: any = {};
      try { d = await r.json(); } catch {}
      if (!r.ok) throw new Error(d.error ?? "Purchase failed");
      setSuccess(`Order placed for ${SERVICE_ICONS[service] ?? "🌐"} ${service} · ${country.country_name}. Admin will deliver your SMS code via chat shortly.`);
      onBalanceChange?.();
      await loadAll();
      setTab("orders");
    } catch (e: any) {
      setError(e.message || "Purchase failed — please try again");
    } finally { setBuying(null); }
  };

  const requestRefund = async (orderId: number) => {
    setRefunding(orderId); setRefundMsg(null);
    try {
      const r = await fetch(`/api/otp-mgmt/orders/${orderId}/refund`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      let d: any = {};
      try { d = await r.json(); } catch {}
      if (!r.ok) throw new Error(d.error ?? "Refund failed");
      setRefundMsg({ id: orderId, msg: `Refund successful! ⚡ ${d.refunded_sats?.toLocaleString() ?? ""} sats returned to your balance.`, ok: true });
      onBalanceChange?.();
      await loadAll();
    } catch (e: any) {
      setRefundMsg({ id: orderId, msg: e.message, ok: false });
    } finally { setRefunding(null); }
  };

  const canRefund = (o: Order) => {
    if (o.status === "refunded" || (o.status === "delivered" && o.otp_code)) return false;
    const ageMin = (Date.now() - new Date(o.created_at).getTime()) / 60000;
    return ageMin >= 30;
  };

  const minutesUntilRefund = (o: Order) => {
    const ageMin = (Date.now() - new Date(o.created_at).getTime()) / 60000;
    return Math.max(0, Math.ceil(30 - ageMin));
  };

  const filtered = countries.filter(c =>
    c.country_name.toLowerCase().includes(search.toLowerCase()) ||
    c.country_code.toLowerCase().includes(search.toLowerCase()) ||
    c.phone_prefix.includes(search)
  );

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-white">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-neutral-100 shrink-0">
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-neutral-100">
          <X size={18} className="text-neutral-500"/>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center">
            <Phone size={14} className="text-[#F7931A]"/>
          </div>
          <div>
            <p className="font-extrabold text-black text-sm">P2P OTP Numbers</p>
            <p className="text-[10px] text-neutral-400">Virtual SMS · Pay with ⚡ sats · No KYC</p>
          </div>
        </div>
        <div className="ml-auto text-xs font-extrabold text-black">
          ⚡ {(user.sats_balance ?? 0).toLocaleString()}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-100 bg-white shrink-0">
        {(["shop","orders"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${
              tab === t ? "border-[#F7931A] text-black" : "border-transparent text-neutral-400"
            }`}>
            {t === "shop" ? "Buy Number" : `My Orders (${orders.length})`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f8f8f8]">

        {/* Alerts */}
        {success && (
          <div className="mx-4 mt-4 bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
            <Check size={16} className="text-green-600 mt-0.5 shrink-0"/>
            <div>
              <p className="font-extrabold text-green-800 text-sm">Order placed!</p>
              <p className="text-xs text-green-700 mt-0.5">{success}</p>
              <button onClick={() => setSuccess(null)} className="text-[10px] text-green-700 font-bold mt-1 underline">Dismiss</button>
            </div>
          </div>
        )}
        {error && (
          <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-2xl p-3 flex items-start gap-2">
            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5"/>
            <p className="text-sm text-red-700 font-semibold">{error}</p>
          </div>
        )}

        {/* ── SHOP ── */}
        {tab === "shop" && (
          <div className="px-4 py-4 space-y-3">

            {/* Service selector */}
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Service (what do you need OTP for?)</p>
              <div className="relative">
                <button onClick={() => setServiceOpen(!serviceOpen)}
                  className="w-full flex items-center justify-between gap-2 bg-white border-2 border-black rounded-xl px-4 py-2.5 text-sm font-extrabold">
                  <span>{SERVICE_ICONS[service] ?? "🌐"} {service}</span>
                  <ChevronDown size={14} className={`transition-transform ${serviceOpen ? "rotate-180" : ""}`}/>
                </button>
                {serviceOpen && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-2xl shadow-xl overflow-hidden">
                    <div className="grid grid-cols-3 gap-1 p-2 max-h-48 overflow-y-auto">
                      {SERVICES.map(s => (
                        <button key={s} onClick={() => { setService(s); setServiceOpen(false); }}
                          className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl text-[10px] font-bold transition-all ${service === s ? "bg-black text-white" : "hover:bg-neutral-100 text-neutral-700"}`}>
                          <span className="text-lg">{SERVICE_ICONS[s] ?? "🌐"}</span>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Country search */}
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Country</p>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search country or prefix…"
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-black bg-white"
              />
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Buy a virtual phone number slot. Pay with sats — admin sends you the SMS code via chat within minutes.
              If no code arrives in 30 minutes, you can request a full refund.
            </p>

            {loading ? (
              <div className="py-12 text-center">
                <Loader2 size={20} className="text-[#F7931A] animate-spin mx-auto mb-2"/>
                <p className="text-xs text-neutral-400">Loading countries…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-14 text-center">
                <Phone size={28} className="text-neutral-200 mx-auto mb-3"/>
                <p className="text-sm font-bold text-neutral-400">{search ? "No countries match your search" : "No OTP services available"}</p>
                {!search && <p className="text-xs text-neutral-300 mt-1">Admin will activate countries soon</p>}
              </div>
            ) : filtered.map(c => (
              <div key={c.id} className="bg-white rounded-2xl border border-neutral-100 p-4 flex items-center gap-3 shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-center shrink-0 text-2xl">
                  {FLAG[c.country_code] ?? "🌍"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-black text-sm">{c.country_name}</p>
                  <p className="text-xs text-neutral-400">{c.phone_prefix} · {SERVICE_ICONS[service] ?? "🌐"} {service}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-extrabold text-black text-sm">⚡ {(c.price_sats||0).toLocaleString()}</p>
                  <button
                    onClick={() => buy(c)}
                    disabled={buying === c.id}
                    className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-[11px] text-black active:scale-[0.97] transition-transform disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#F7931A,#FF6B00)" }}
                  >
                    {buying === c.id ? <Loader2 size={11} className="animate-spin"/> : <ShoppingBag size={11}/>}
                    {buying === c.id ? "…" : "Buy"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ORDERS ── */}
        {tab === "orders" && (
          <div className="px-4 py-4 space-y-3">

            {loading ? (
              <div className="py-12 text-center"><Loader2 size={20} className="text-[#F7931A] animate-spin mx-auto mb-2"/></div>
            ) : orders.length === 0 ? (
              <div className="py-14 text-center">
                <ShoppingBag size={28} className="text-neutral-200 mx-auto mb-3"/>
                <p className="text-sm font-bold text-neutral-400">No orders yet</p>
                <p className="text-xs text-neutral-300 mt-1">Buy a number slot from the Buy Number tab</p>
              </div>
            ) : orders.map((o) => {
              const age = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000);
              const waitLeft = minutesUntilRefund(o);
              return (
                <div key={o.id} className="bg-white rounded-2xl border border-neutral-100 p-4 shadow-sm space-y-3">

                  {/* Top row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{FLAG[o.country_code] ?? "🌍"}</span>
                      <div>
                        <p className="font-extrabold text-black text-sm">{o.country_name}</p>
                        {o.service_name && o.service_name !== "Any" && (
                          <p className="text-[10px] text-neutral-400">{SERVICE_ICONS[o.service_name] ?? "🌐"} {o.service_name}</p>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={o.status}/>
                  </div>

                  {/* OTP code — delivered */}
                  {o.otp_code && o.status === "delivered" && (
                    <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] text-green-600 font-bold uppercase tracking-wide mb-0.5">Your OTP Code</p>
                      <p className="font-mono font-extrabold text-green-900 text-xl tracking-widest">{o.otp_code}</p>
                    </div>
                  )}

                  {/* Pending — waiting */}
                  {o.status === "pending" && !o.otp_code && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-800 font-semibold">
                        <Clock size={12}/>
                        Admin will send you the SMS code via chat shortly.
                      </div>
                      {waitLeft > 0 ? (
                        <p className="text-[10px] text-amber-600">
                          Refund available in <strong>{waitLeft} min</strong> if no code is delivered.
                        </p>
                      ) : (
                        <p className="text-[10px] text-amber-700 font-semibold">
                          30 min passed — you can now request a full refund.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Refunded */}
                  {o.status === "refunded" && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] text-blue-700 font-extrabold">
                        <RotateCcw size={11}/>
                        Refunded — ⚡ {Number(o.price_sats).toLocaleString()} sats returned
                      </div>
                      {o.refund_reason && (
                        <p className="text-[10px] text-blue-500">Reason: {o.refund_reason}</p>
                      )}
                    </div>
                  )}

                  {/* Refund message */}
                  {refundMsg?.id === o.id && (
                    <div className={`rounded-xl px-3 py-2 text-[11px] font-semibold ${refundMsg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      {refundMsg.msg}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400">
                      ⚡ {Number(o.price_sats).toLocaleString()} · #{o.id} · {new Date(o.created_at).toLocaleDateString()}
                    </span>
                    {canRefund(o) && (
                      <button
                        onClick={() => requestRefund(o.id)}
                        disabled={refunding === o.id}
                        className="flex items-center gap-1 text-[11px] font-extrabold text-blue-600 border border-blue-200 rounded-xl px-3 py-1.5 active:scale-[0.97] transition-transform disabled:opacity-50 bg-blue-50">
                        {refunding === o.id ? <Loader2 size={10} className="animate-spin"/> : <RotateCcw size={10}/>}
                        {refunding === o.id ? "Refunding…" : "Get Refund"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Refund explanation */}
            <div className="bg-neutral-100 rounded-2xl px-4 py-3 space-y-1.5">
              <p className="text-xs font-extrabold text-black">When can I get a refund?</p>
              <div className="space-y-1 text-[11px] text-neutral-600 leading-relaxed">
                <p>✅ <strong>No code delivered</strong> — if 30 minutes pass with no OTP code, full refund is automatically available.</p>
                <p>✅ <strong>Admin manual refund</strong> — if the number doesn't work or code is wrong, contact admin via chat.</p>
                <p>❌ <strong>Code already delivered</strong> — once OTP code is sent to you, refunds are not possible.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:   { label: "Pending",   cls: "bg-amber-100 text-amber-800" },
    delivered: { label: "Delivered", cls: "bg-green-100 text-green-800" },
    refunded:  { label: "Refunded",  cls: "bg-blue-100 text-blue-700" },
  };
  const s = map[status] ?? { label: status, cls: "bg-neutral-100 text-neutral-600" };
  return <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}
