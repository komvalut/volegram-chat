import { useEffect, useState } from "react";
import { X, ShoppingBag, Package, Clock, Check, ChevronRight, Loader, RefreshCw } from "lucide-react";
import { api } from "../lib/api";

interface Listing {
  id: number;
  service: string;
  service_name: string;
  denomination: string;
  price_sats: number;
  stock: number;
  icon: string;
  description: string;
  active: boolean;
}

interface Order {
  id: number;
  service_name: string;
  denomination: string;
  icon: string;
  price_sats: number;
  status: string;
  voucher_code: string | null;
  created_at: string;
  delivered_at: string | null;
}

const SERVICE_BG: Record<string, string> = {
  xbon:    "bg-purple-50 border-purple-200",
  aircash: "bg-blue-50 border-blue-200",
  paysafe: "bg-red-50 border-red-200",
  steam:   "bg-gray-50 border-gray-200",
  google:  "bg-green-50 border-green-200",
  apple:   "bg-zinc-50 border-zinc-200",
  netflix: "bg-red-50 border-red-100",
  spotify: "bg-emerald-50 border-emerald-200",
  amazon:  "bg-amber-50 border-amber-200",
};

export default function P2PVouchersPanel({ user, onClose }: { user: any; onClose: () => void }) {
  const [tab, setTab]               = useState<"shop"|"orders">("shop");
  const [listings, setListings]     = useState<Listing[]>([]);
  const [orders, setOrders]         = useState<Order[]>([]);
  const [loading, setLoading]       = useState(true);
  const [buying, setBuying]         = useState<number | null>(null);
  const [success, setSuccess]       = useState<string | null>(null);
  const [error, setError]           = useState("");
  const [selectedService, setSelectedService] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [l, o] = await Promise.all([api.p2p.list(), api.p2p.myOrders()]);
      setListings(l.listings ?? []);
      setOrders(o.orders ?? []);
    } catch {}
    setLoading(false);
  };

  // Group listings by service
  const services = [...new Set(listings.map(l => l.service))];
  const activeService = selectedService ?? services[0] ?? null;
  const shown = activeService ? listings.filter(l => l.service === activeService) : listings;

  const getServiceName = (svc: string) => listings.find(l => l.service === svc)?.service_name ?? svc;
  const getServiceIcon = (svc: string) => listings.find(l => l.service === svc)?.icon ?? "🎫";

  const handleBuy = async (listing: Listing) => {
    setError(""); setSuccess(null);
    if ((user.sats_balance ?? 0) < listing.price_sats) {
      setError(`Insufficient balance. Need ${listing.price_sats.toLocaleString()} sats.`);
      return;
    }
    setBuying(listing.id);
    try {
      const r = await api.p2p.buy(listing.id);
      setSuccess(r.message ?? "Order placed!");
      await loadAll();
      setTab("orders");
    } catch (e: any) {
      setError(e.message || "Purchase failed");
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
         onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[92vh] shadow-2xl">

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center">
              <ShoppingBag size={18} className="text-[#F7931A]"/>
            </div>
            <div>
              <h2 className="font-extrabold text-black text-[15px]">P2P Voucher Store</h2>
              <p className="text-[10px] text-neutral-400">Pay with sats · Admin delivers code</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={loadAll} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-100">
              <RefreshCw size={14} className="text-neutral-400"/>
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-100">
              <X size={16} className="text-neutral-400"/>
            </button>
          </div>
        </div>

        {/* Balance bar */}
        <div className="px-5 py-2.5 bg-black flex items-center justify-between shrink-0">
          <span className="text-[11px] text-white/50 font-bold uppercase tracking-wider">Your balance</span>
          <span className="text-sm font-extrabold text-[#F7931A]">⚡ {(user.sats_balance ?? 0).toLocaleString()} sats</span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-100 shrink-0 px-1">
          {[
            { k: "shop",   label: "Shop",       icon: <ShoppingBag size={13}/> },
            { k: "orders", label: "My Orders",  icon: <Package size={13}/> },
          ].map(t => (
            <button key={t.k} onClick={() => { setTab(t.k as any); setError(""); setSuccess(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-bold transition-colors ${
                tab === t.k ? "text-black border-b-2 border-black" : "text-neutral-400"
              }`}>
              {t.icon} {t.label}
              {t.k === "orders" && orders.filter(o => o.status === "delivered").length > 0 && (
                <span className="ml-1 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {orders.filter(o => o.status === "delivered" && !o.voucher_code?.startsWith("SEEN")).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader size={22} className="animate-spin text-neutral-300"/>
            </div>
          )}

          {!loading && tab === "shop" && (
            <>
              {error && (
                <div className="mx-4 mt-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
              )}
              {success && (
                <div className="mx-4 mt-3 rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800 flex items-center gap-2">
                  <Check size={14} className="text-green-600 shrink-0"/>{success}
                </div>
              )}

              {/* Service selector */}
              <div className="px-4 pt-3 pb-2">
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {services.map(svc => (
                    <button
                      key={svc}
                      onClick={() => setSelectedService(svc)}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold border transition-all ${
                        activeService === svc
                          ? "bg-black text-white border-black"
                          : "bg-white text-neutral-600 border-neutral-200"
                      }`}
                    >
                      <span>{getServiceIcon(svc)}</span>
                      {getServiceName(svc)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Listings grid */}
              <div className="px-4 pb-6 grid grid-cols-2 gap-2">
                {shown.map(listing => {
                  const canBuy = (user.sats_balance ?? 0) >= listing.price_sats;
                  const isBuying = buying === listing.id;
                  const bgClass = SERVICE_BG[listing.service] ?? "bg-neutral-50 border-neutral-200";
                  return (
                    <button
                      key={listing.id}
                      onClick={() => !isBuying && handleBuy(listing)}
                      disabled={isBuying || !canBuy}
                      className={`flex flex-col p-4 rounded-2xl border text-left transition-all active:scale-[0.97] disabled:opacity-60 ${bgClass}`}
                    >
                      <div className="text-2xl mb-2">{listing.icon}</div>
                      <p className="font-extrabold text-black text-sm leading-tight">{listing.denomination}</p>
                      <p className="text-[10px] text-neutral-500 mb-3">{listing.service_name}</p>
                      <div className="mt-auto flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-neutral-400 font-medium">Price</p>
                          <p className="font-extrabold text-black text-sm">⚡ {listing.price_sats.toLocaleString()}</p>
                        </div>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${canBuy ? "bg-black" : "bg-neutral-200"}`}>
                          {isBuying
                            ? <Loader size={13} className="animate-spin text-white"/>
                            : <ChevronRight size={13} className={canBuy ? "text-white" : "text-neutral-400"}/>
                          }
                        </div>
                      </div>
                      {listing.stock >= 0 && (
                        <p className="text-[9px] text-neutral-400 mt-1.5">Stock: {listing.stock}</p>
                      )}
                    </button>
                  );
                })}
              </div>

              {shown.length === 0 && !loading && (
                <div className="text-center py-12 text-neutral-400 text-sm">No vouchers available</div>
              )}
            </>
          )}

          {!loading && tab === "orders" && (
            <div className="px-4 py-3 space-y-2 pb-6">
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package size={28} className="text-neutral-200 mx-auto mb-3"/>
                  <p className="text-sm text-neutral-400">No orders yet</p>
                  <p className="text-[10px] text-neutral-300 mt-1">Browse the shop to buy vouchers</p>
                </div>
              ) : orders.map(order => (
                <div key={order.id} className="bg-white border border-neutral-100 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl shrink-0">{order.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-extrabold text-black text-sm">{order.service_name} {order.denomination}</p>
                        <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                          order.status === "delivered" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                        }`}>{order.status}</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-0.5">⚡ {order.price_sats.toLocaleString()} sats</p>
                      <p className="text-[10px] text-neutral-300 mt-0.5">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                      {order.status === "pending" && (
                        <div className="mt-2 flex items-center gap-1.5 text-amber-700 bg-amber-50 rounded-xl px-2.5 py-1.5">
                          <Clock size={11}/>
                          <span className="text-[10px] font-semibold">Admin will send your code shortly</span>
                        </div>
                      )}
                      {order.status === "delivered" && order.voucher_code && (
                        <div className="mt-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                          <p className="text-[9px] text-green-700 font-bold uppercase tracking-wider mb-0.5">Your voucher code</p>
                          <p className="font-mono font-extrabold text-green-900 text-sm tracking-wide select-all">{order.voucher_code}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
