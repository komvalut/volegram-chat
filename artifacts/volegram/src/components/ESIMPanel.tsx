import { useState, useEffect } from "react";
import { X, Smartphone, Globe, Check, Loader2, ChevronRight, ShoppingBag } from "lucide-react";
import { api } from "../lib/api";

interface Listing {
  id: number;
  name: string;
  description: string;
  country: string;
  data_gb: string;
  validity_days: number;
  price_sats: number;
}

interface Props {
  user: any;
  onClose: () => void;
  onBalanceChange?: () => void;
}

export default function ESIMPanel({ user, onClose, onBalanceChange }: Props) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<number | null>(null);
  const [bought, setBought] = useState<any | null>(null);
  const [tab, setTab] = useState<"shop" | "orders">("shop");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.esim.list(), api.esim.orders()])
      .then(([l, o]) => { setListings(l.listings ?? []); setOrders(o.orders ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const buy = async (id: number, price: number) => {
    if (user.sats_balance < price) {
      setError("Insufficient balance. Top up your wallet first.");
      return;
    }
    setBuying(id);
    setError("");
    try {
      const { order, listing } = await api.esim.buy(id);
      setBought({ order, listing });
      onBalanceChange?.();
    } catch (e: any) {
      setError("Purchase failed. Try again.");
    } finally {
      setBuying(null);
    }
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
            <Smartphone size={14} className="text-[#F7931A]"/>
          </div>
          <div>
            <p className="font-extrabold text-black text-sm">eSIM Store</p>
            <p className="text-[10px] text-neutral-400">Buy with ⚡ sats</p>
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
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors border-b-2 ${
              tab === t ? "border-[#F7931A] text-black" : "border-transparent text-neutral-400"
            }`}>
            {t === "shop" ? "Shop" : `My Orders (${orders.length})`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f8f8f8]">
        {/* Success card */}
        {bought && (
          <div className="mx-4 mt-4 bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
              <Check size={15} className="text-white"/>
            </div>
            <div>
              <p className="font-extrabold text-green-800 text-sm">Purchase successful!</p>
              <p className="text-xs text-green-700 mt-0.5">{bought.listing.name} — Order #{bought.order.id}</p>
              <p className="text-[10px] text-green-600 mt-1">Status: pending activation. Admin will contact you via chat.</p>
              <button onClick={() => setBought(null)} className="text-[10px] text-green-700 font-bold mt-2 underline">Dismiss</button>
            </div>
          </div>
        )}

        {error && (
          <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-2xl p-3">
            <p className="text-sm text-red-700 font-semibold">{error}</p>
          </div>
        )}

        {/* SHOP TAB */}
        {tab === "shop" && (
          <div className="px-4 py-4 space-y-3">
            {loading ? (
              <div className="py-12 text-center">
                <Loader2 size={20} className="text-[#F7931A] animate-spin mx-auto mb-2"/>
                <p className="text-xs text-neutral-400">Loading plans…</p>
              </div>
            ) : listings.length === 0 ? (
              <div className="py-12 text-center">
                <Smartphone size={28} className="text-neutral-200 mx-auto mb-3"/>
                <p className="text-sm font-bold text-neutral-400">No eSIM plans available yet</p>
                <p className="text-xs text-neutral-300 mt-1">Check back soon or contact admin</p>
              </div>
            ) : listings.map(l => (
              <div key={l.id} className="bg-white rounded-2xl border border-neutral-100 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                    <Globe size={18} className="text-neutral-600"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-black text-sm">{l.name}</p>
                    {l.country && <p className="text-xs text-neutral-500">📍 {l.country}</p>}
                    <div className="flex gap-3 mt-1.5 flex-wrap">
                      {l.data_gb && (
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          {parseFloat(l.data_gb)} GB
                        </span>
                      )}
                      {l.validity_days && (
                        <span className="text-[10px] font-bold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                          {l.validity_days} days
                        </span>
                      )}
                    </div>
                    {l.description && (
                      <p className="text-[11px] text-neutral-500 mt-1.5 leading-relaxed">{l.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-50">
                  <div>
                    <p className="text-lg font-extrabold text-black">⚡ {l.price_sats.toLocaleString()}</p>
                    <p className="text-[10px] text-neutral-400">sats</p>
                  </div>
                  <button
                    onClick={() => buy(l.id, l.price_sats)}
                    disabled={buying === l.id}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs text-black active:scale-[0.97] transition-transform disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#F7931A,#FF6B00)" }}
                  >
                    {buying === l.id ? <Loader2 size={13} className="animate-spin"/> : <ShoppingBag size={13}/>}
                    {buying === l.id ? "Buying…" : "Buy Now"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ORDERS TAB */}
        {tab === "orders" && (
          <div className="px-4 py-4 space-y-3">
            {loading ? (
              <div className="py-12 text-center">
                <Loader2 size={20} className="text-[#F7931A] animate-spin mx-auto mb-2"/>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingBag size={28} className="text-neutral-200 mx-auto mb-3"/>
                <p className="text-sm font-bold text-neutral-400">No orders yet</p>
              </div>
            ) : orders.map((o: any) => (
              <div key={o.id} className="bg-white rounded-2xl border border-neutral-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-extrabold text-black text-sm">{o.name}</p>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    o.status === "completed" ? "bg-green-100 text-green-800" :
                    o.status === "active" ? "bg-blue-100 text-blue-800" :
                    "bg-amber-100 text-amber-800"
                  }`}>{o.status}</span>
                </div>
                {o.country && <p className="text-xs text-neutral-500">📍 {o.country}</p>}
                {o.phone_number && <p className="text-xs font-mono text-neutral-600 mt-1">📱 {o.phone_number}</p>}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-neutral-500">Paid ⚡ {o.price_sats.toLocaleString()} sats</span>
                  <span className="text-[10px] text-neutral-400">Order #{o.id}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
