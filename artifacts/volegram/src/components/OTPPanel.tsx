import { useState, useEffect } from "react";
import { X, Phone, Check, Loader2, ShoppingBag, ChevronRight, Clock } from "lucide-react";

interface Country {
  id: number;
  country_code: string;
  country_name: string;
  phone_prefix: string;
  price_sats: number;
  sort_order: number;
}

interface Order {
  id: number;
  country_name: string;
  country_code: string;
  phone_prefix: string;
  price_sats: number;
  status: string;
  otp_code: string | null;
  created_at: string;
  delivered_at: string | null;
}

interface Props {
  user: any;
  onClose: () => void;
  onBalanceChange?: () => void;
}

export default function OTPPanel({ user, onClose, onBalanceChange }: Props) {
  const [tab, setTab]           = useState<"shop" | "orders">("shop");
  const [countries, setCountries] = useState<Country[]>([]);
  const [orders, setOrders]     = useState<Order[]>([]);
  const [loading, setLoading]   = useState(true);
  const [buying, setBuying]     = useState<number | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);
  const [error, setError]       = useState("");

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
      setError(`Insufficient balance. Need ${country.price_sats.toLocaleString()} sats.`);
      return;
    }
    setBuying(country.id);
    try {
      const r = await fetch(`/api/otp-mgmt/buy/${country.id}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      setSuccess(`Order placed! Admin will contact you via chat with the OTP code.`);
      onBalanceChange?.();
      await loadAll();
      setTab("orders");
    } catch (e: any) {
      setError(e.message || "Purchase failed");
    } finally {
      setBuying(null);
    }
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
            <p className="font-extrabold text-black text-sm">OTP Numbers</p>
            <p className="text-[10px] text-neutral-400">Virtual SMS · Pay with ⚡ sats</p>
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
            {t === "shop" ? "Countries" : `My Orders (${orders.length})`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f8f8f8]">

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
          <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-2xl p-3">
            <p className="text-sm text-red-700 font-semibold">{error}</p>
          </div>
        )}

        {/* SHOP */}
        {tab === "shop" && (
          <div className="px-4 py-4 space-y-2">
            <p className="text-[11px] text-neutral-400 mb-3 leading-relaxed">
              Buy a virtual phone number slot for the selected country. Pay with sats — admin sends you the SMS code via chat.
            </p>
            {loading ? (
              <div className="py-12 text-center">
                <Loader2 size={20} className="text-[#F7931A] animate-spin mx-auto mb-2"/>
                <p className="text-xs text-neutral-400">Loading…</p>
              </div>
            ) : countries.length === 0 ? (
              <div className="py-14 text-center">
                <Phone size={28} className="text-neutral-200 mx-auto mb-3"/>
                <p className="text-sm font-bold text-neutral-400">No OTP services available yet</p>
                <p className="text-xs text-neutral-300 mt-1">Admin will add countries soon</p>
              </div>
            ) : countries.map(c => (
              <div key={c.id} className="bg-white rounded-2xl border border-neutral-100 p-4 flex items-center gap-3 shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-center shrink-0 text-2xl">
                  {FLAG[c.country_code] ?? "🌍"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-black text-sm">{c.country_name}</p>
                  <p className="text-xs text-neutral-400">{c.phone_prefix} · SMS OTP</p>
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

        {/* ORDERS */}
        {tab === "orders" && (
          <div className="px-4 py-4 space-y-3">
            {loading ? (
              <div className="py-12 text-center">
                <Loader2 size={20} className="text-[#F7931A] animate-spin mx-auto mb-2"/>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-14 text-center">
                <ShoppingBag size={28} className="text-neutral-200 mx-auto mb-3"/>
                <p className="text-sm font-bold text-neutral-400">No orders yet</p>
              </div>
            ) : orders.map((o: any) => (
              <div key={o.id} className="bg-white rounded-2xl border border-neutral-100 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{FLAG[o.country_code] ?? "🌍"}</span>
                    <p className="font-extrabold text-black text-sm">{o.country_name}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    o.status === "delivered" ? "bg-green-100 text-green-800" :
                    "bg-amber-100 text-amber-800"
                  }`}>{o.status}</span>
                </div>

                {o.otp_code && (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-2">
                    <p className="text-[10px] text-green-600 font-bold uppercase tracking-wide mb-0.5">OTP Code</p>
                    <p className="font-mono font-extrabold text-green-900 text-lg tracking-widest">{o.otp_code}</p>
                  </div>
                )}

                {o.status === "pending" && !o.otp_code && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mb-2">
                    <Clock size={12}/>
                    Admin will send you the code via chat shortly
                  </div>
                )}

                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-neutral-500">⚡ {Number(o.price_sats).toLocaleString()} sats</span>
                  <span className="text-[10px] text-neutral-400">Order #{o.id} · {new Date(o.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
