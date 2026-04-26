import { useEffect, useState } from "react";
import { X, ShoppingBag, Package, Clock, Check, ChevronRight, Loader, RefreshCw, Tag, Plus, Trash2, Store, User, Copy, CheckCircle } from "lucide-react";
import { api } from "../lib/api";

interface AdminListing {
  id: number; service: string; service_name: string; denomination: string;
  price_sats: number; stock: number; icon: string; description: string; active: boolean;
}
interface Order {
  id: number; service_name: string; denomination: string; icon: string;
  price_sats: number; status: string; voucher_code: string | null;
  created_at: string; delivered_at: string | null;
}
interface UserListing {
  id: number; service: string; service_name: string; denomination: string;
  fiat_amount: number | null; fiat_currency: string; price_sats: number; icon: string;
  created_at: string; seller_username?: string; buyer_username?: string;
  status?: string; voucher_code?: string;
}

const SERVICES = [
  { id: "xbon",      name: "X Bon",          icon: "🎮" },
  { id: "aircash",   name: "Aircash",         icon: "💸" },
  { id: "paysafe",   name: "Paysafe Card",    icon: "💳" },
  { id: "steam",     name: "Steam",           icon: "🎮" },
  { id: "google",    name: "Google Play",     icon: "▶️"  },
  { id: "apple",     name: "Apple / iTunes",  icon: "🍎" },
  { id: "netflix",   name: "Netflix",         icon: "🎬" },
  { id: "spotify",   name: "Spotify",         icon: "🎵" },
  { id: "amazon",    name: "Amazon",          icon: "📦" },
  { id: "psn",       name: "PlayStation",     icon: "🎮" },
  { id: "xbox",      name: "Xbox",            icon: "🎮" },
  { id: "nintendo",  name: "Nintendo eShop",  icon: "🎮" },
  { id: "riot",      name: "Riot Points",     icon: "⚔️" },
  { id: "fortnite",  name: "Fortnite V-Bucks",icon: "🎯" },
  { id: "roblox",    name: "Roblox",          icon: "🟥" },
  { id: "pubg",      name: "PUBG UC",         icon: "🔫" },
  { id: "freefire",  name: "Free Fire",       icon: "💎" },
  { id: "disney",    name: "Disney+",         icon: "🏰" },
  { id: "youtube",   name: "YouTube Premium", icon: "▶️"  },
  { id: "deezer",    name: "Deezer",          icon: "🎵" },
  { id: "wolt",      name: "Wolt",            icon: "🛵" },
  { id: "minecraft", name: "Minecraft",       icon: "⛏️" },
  { id: "mteltv",    name: "Mtel TV",         icon: "📺" },
  { id: "booking",   name: "Booking.com",     icon: "🏨" },
  { id: "shein",     name: "Shein",           icon: "👗" },
  { id: "other",     name: "Other",           icon: "🎫" },
];

const FIAT_CURRENCIES = ["RSD","EUR","USD","GBP","CHF","BAM","HRK","RON","HUF","PLN","CZK","SEK","NOK","DKK","TRY","UAH","CAD","AUD"];

const SERVICE_BG: Record<string, string> = {
  xbon:"bg-purple-50 border-purple-200", aircash:"bg-blue-50 border-blue-200",
  paysafe:"bg-red-50 border-red-200", steam:"bg-gray-50 border-gray-200",
  google:"bg-green-50 border-green-200", apple:"bg-zinc-50 border-zinc-200",
  netflix:"bg-red-50 border-red-100", spotify:"bg-emerald-50 border-emerald-200",
  amazon:"bg-amber-50 border-amber-200",
};

type MainTab = "shop" | "market" | "sell" | "orders" | "mine";

export default function P2PVouchersPanel({ user, onClose }: { user: any; onClose: () => void }) {
  const [tab, setTab]                   = useState<MainTab>("shop");
  const [adminListings, setAdminListings] = useState<AdminListing[]>([]);
  const [userListings, setUserListings] = useState<UserListing[]>([]);
  const [myListings, setMyListings]     = useState<UserListing[]>([]);
  const [orders, setOrders]             = useState<Order[]>([]);
  const [loading, setLoading]           = useState(true);
  const [buying, setBuying]             = useState<number | null>(null);
  const [buyResult, setBuyResult]       = useState<{code: string; msg: string} | null>(null);
  const [success, setSuccess]           = useState<string | null>(null);
  const [error, setError]               = useState("");
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [copied, setCopied]             = useState<string | null>(null);

  // Sell form state
  const [sellForm, setSellForm] = useState({
    service: "xbon", service_name: "X Bon", icon: "🎮",
    denomination: "", fiat_amount: "", fiat_currency: "RSD",
    price_sats: "", voucher_code: "",
  });
  const [selling, setSelling] = useState(false);
  const [sellMsg, setSellMsg] = useState("");

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    if (tab === "market") loadUserMarket();
    if (tab === "mine") loadMyListings();
    if (tab === "orders") loadOrders();
  }, [tab]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [l, o] = await Promise.all([api.p2p.list(), api.p2p.myOrders()]);
      setAdminListings(l.listings ?? []);
      setOrders(o.orders ?? []);
    } catch {}
    setLoading(false);
  };
  const loadUserMarket = async () => {
    try { const d = await api.p2p.userMarket(); setUserListings(d.listings ?? []); } catch {}
  };
  const loadMyListings = async () => {
    try { const d = await api.p2p.myListings(); setMyListings(d.listings ?? []); } catch {}
  };
  const loadOrders = async () => {
    try { const d = await api.p2p.myOrders(); setOrders(d.orders ?? []); } catch {}
  };

  const services = [...new Set(adminListings.map(l => l.service))];
  const activeService = selectedService ?? services[0] ?? null;
  const shown = activeService ? adminListings.filter(l => l.service === activeService) : adminListings;
  const getServiceName = (svc: string) => adminListings.find(l => l.service === svc)?.service_name ?? svc;
  const getServiceIcon = (svc: string) => adminListings.find(l => l.service === svc)?.icon ?? "🎫";

  const handleBuyAdmin = async (listing: AdminListing) => {
    setError(""); setSuccess(null);
    if ((user.sats_balance ?? 0) < listing.price_sats) {
      setError(`Insufficient balance. Need ${listing.price_sats.toLocaleString()} sats.`);
      return;
    }
    setBuying(listing.id);
    try {
      const r = await api.p2p.buy(listing.id);
      setSuccess(r.message ?? "Order placed!");
      await loadAll(); setTab("orders");
    } catch (e: any) { setError(e.message || "Purchase failed"); }
    finally { setBuying(null); }
  };

  const handleBuyUser = async (listing: UserListing) => {
    setError(""); setBuyResult(null);
    if ((user.sats_balance ?? 0) < listing.price_sats) {
      setError(`Insufficient balance. Need ${listing.price_sats.toLocaleString()} sats.`);
      return;
    }
    setBuying(listing.id);
    try {
      const r = await api.p2p.buyFromUser(listing.id);
      setBuyResult({ code: r.voucher_code, msg: r.message });
      await loadUserMarket();
    } catch (e: any) { setError(e.message || "Purchase failed"); }
    finally { setBuying(null); }
  };

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault(); setSellMsg(""); setSelling(true);
    try {
      const priceNum = parseInt(sellForm.price_sats);
      if (!priceNum || priceNum < 1000) throw new Error("Minimum price is 1,000 sats");
      if (!sellForm.denomination.trim()) throw new Error("Enter denomination (e.g. 500 RSD)");
      if (!sellForm.voucher_code.trim()) throw new Error("Enter the voucher code");
      await api.p2p.sell({
        service: sellForm.service,
        service_name: sellForm.service_name,
        denomination: sellForm.denomination.trim(),
        fiat_amount: sellForm.fiat_amount ? parseFloat(sellForm.fiat_amount) : undefined,
        fiat_currency: sellForm.fiat_currency,
        price_sats: priceNum,
        icon: sellForm.icon,
        voucher_code: sellForm.voucher_code.trim(),
      });
      setSellMsg("✓ Listed! Your voucher is now on the market.");
      setSellForm(f => ({ ...f, denomination: "", fiat_amount: "", price_sats: "", voucher_code: "" }));
      loadMyListings();
    } catch (e: any) { setSellMsg("✗ " + (e.message || "Failed")); }
    finally { setSelling(false); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code); setTimeout(() => setCopied(null), 2000);
  };

  const TABS: { k: MainTab; label: string; icon: React.ReactNode }[] = [
    { k: "shop",   label: "Shop",    icon: <ShoppingBag size={12}/> },
    { k: "market", label: "Market",  icon: <Store size={12}/> },
    { k: "sell",   label: "Sell",    icon: <Tag size={12}/> },
    { k: "orders", label: "Orders",  icon: <Package size={12}/> },
    { k: "mine",   label: "Mine",    icon: <User size={12}/> },
  ];

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
              <h2 className="font-extrabold text-black text-[15px]">Voucher Store</h2>
              <p className="text-[10px] text-neutral-400">Admin shop · P2P market · Sell yours</p>
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
        <div className="flex border-b border-neutral-100 shrink-0 px-1 overflow-x-auto no-scrollbar">
          {TABS.map(t => (
            <button key={t.k} onClick={() => { setTab(t.k); setError(""); setSuccess(null); setBuyResult(null); }}
              className={`flex-1 shrink-0 flex items-center justify-center gap-1 py-3 text-xs font-bold transition-colors whitespace-nowrap ${
                tab === t.k ? "text-black border-b-2 border-black" : "text-neutral-400"
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && tab === "shop" && (
            <div className="flex items-center justify-center py-16">
              <Loader size={22} className="animate-spin text-neutral-300"/>
            </div>
          )}

          {/* ── ADMIN SHOP ── */}
          {!loading && tab === "shop" && (
            <>
              {error && <div className="mx-4 mt-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
              {success && (
                <div className="mx-4 mt-3 rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800 flex items-center gap-2">
                  <Check size={14} className="text-green-600 shrink-0"/>{success}
                </div>
              )}
              <div className="px-4 pt-3 pb-2">
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {services.map(svc => (
                    <button key={svc} onClick={() => setSelectedService(svc)}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold border transition-all ${
                        activeService === svc ? "bg-black text-white border-black" : "bg-white text-neutral-600 border-neutral-200"
                      }`}>
                      <span>{getServiceIcon(svc)}</span>{getServiceName(svc)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="px-4 pb-6 grid grid-cols-2 gap-2">
                {shown.map(listing => {
                  const canBuy = (user.sats_balance ?? 0) >= listing.price_sats;
                  const isBuying = buying === listing.id;
                  const bgClass = SERVICE_BG[listing.service] ?? "bg-neutral-50 border-neutral-200";
                  return (
                    <button key={listing.id} onClick={() => !isBuying && handleBuyAdmin(listing)}
                      disabled={isBuying || !canBuy}
                      className={`flex flex-col p-4 rounded-2xl border text-left transition-all active:scale-[0.97] disabled:opacity-60 ${bgClass}`}>
                      <div className="text-2xl mb-2">{listing.icon}</div>
                      <p className="font-extrabold text-black text-sm leading-tight">{listing.denomination}</p>
                      <p className="text-[10px] text-neutral-500 mb-3">{listing.service_name}</p>
                      <div className="mt-auto flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-neutral-400 font-medium">Price</p>
                          <p className="font-extrabold text-black text-sm">⚡ {listing.price_sats.toLocaleString()}</p>
                        </div>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${canBuy ? "bg-black" : "bg-neutral-200"}`}>
                          {isBuying ? <Loader size={13} className="animate-spin text-white"/> : <ChevronRight size={13} className={canBuy ? "text-white" : "text-neutral-400"}/>}
                        </div>
                      </div>
                      {listing.stock >= 0 && <p className="text-[9px] text-neutral-400 mt-1.5">Stock: {listing.stock}</p>}
                    </button>
                  );
                })}
              </div>
              {shown.length === 0 && <div className="text-center py-12 text-neutral-400 text-sm">No vouchers available</div>}
            </>
          )}

          {/* ── USER MARKET ── */}
          {tab === "market" && (
            <div className="px-4 py-3 pb-6 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">P2P Market — buy from users</p>
                <button onClick={loadUserMarket} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-100">
                  <RefreshCw size={12} className="text-neutral-400"/>
                </button>
              </div>
              {error && <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
              {buyResult && (
                <div className="rounded-2xl bg-green-50 border border-green-200 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-green-800 font-bold text-sm">
                    <CheckCircle size={16}/> Purchase successful!
                  </div>
                  <p className="text-[10px] text-green-700">Your voucher code:</p>
                  <div className="flex items-center gap-2 bg-white border border-green-200 rounded-xl px-3 py-2">
                    <span className="font-mono font-extrabold text-green-900 flex-1 text-sm select-all">{buyResult.code}</span>
                    <button onClick={() => copyCode(buyResult.code)} className="shrink-0">
                      {copied === buyResult.code ? <CheckCircle size={14} className="text-green-600"/> : <Copy size={14} className="text-neutral-400"/>}
                    </button>
                  </div>
                </div>
              )}
              {userListings.length === 0 && !buyResult ? (
                <div className="text-center py-12">
                  <Store size={28} className="text-neutral-200 mx-auto mb-3"/>
                  <p className="text-sm text-neutral-400">No user listings yet</p>
                  <p className="text-[10px] text-neutral-300 mt-1">Be the first to sell a voucher in the Market tab</p>
                </div>
              ) : (
                userListings.map(ul => {
                  const canBuy = (user.sats_balance ?? 0) >= ul.price_sats;
                  const isBuying = buying === ul.id;
                  return (
                    <div key={ul.id} className="border border-neutral-100 rounded-2xl p-4 flex items-center gap-3">
                      <div className="text-2xl shrink-0">{ul.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-extrabold text-black text-sm">{ul.service_name} {ul.denomination}</span>
                          {ul.fiat_amount && (
                            <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded-full font-bold">
                              {ul.fiat_amount} {ul.fiat_currency}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-500">@{ul.seller_username}</p>
                        <p className="font-extrabold text-sm text-black mt-0.5">⚡ {ul.price_sats.toLocaleString()} sats</p>
                      </div>
                      <button onClick={() => handleBuyUser(ul)} disabled={!canBuy || isBuying}
                        className={`shrink-0 flex items-center gap-1 text-xs font-extrabold px-3 py-2.5 rounded-xl transition-all ${
                          canBuy ? "bg-black text-white hover:bg-neutral-800" : "bg-neutral-100 text-neutral-400"
                        } disabled:opacity-60`}>
                        {isBuying ? <Loader size={12} className="animate-spin"/> : "Buy"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── SELL ── */}
          {tab === "sell" && (
            <form onSubmit={handleSell} className="px-4 py-4 pb-6 space-y-4">
              <div className="rounded-2xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-[11px] text-amber-800">
                <strong>How it works:</strong> List your voucher code. Buyer pays in sats — you receive <strong>97%</strong> instantly. Code is revealed only after payment.
              </div>

              {/* Service selector */}
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Service / Voucher type</label>
                <select value={sellForm.service}
                  onChange={e => {
                    const svc = SERVICES.find(s => s.id === e.target.value)!;
                    setSellForm(f => ({ ...f, service: svc.id, service_name: svc.name, icon: svc.icon }));
                  }}
                  className="input-modern text-sm w-full">
                  {SERVICES.map(s => (
                    <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                  ))}
                </select>
              </div>

              {/* Denomination + fiat */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Denomination</label>
                  <input value={sellForm.denomination} onChange={e => setSellForm(f => ({ ...f, denomination: e.target.value }))}
                    placeholder="e.g. 500 RSD or 10 EUR"
                    className="input-modern text-sm w-full"/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Face value</label>
                  <div className="flex gap-1.5">
                    <input value={sellForm.fiat_amount} onChange={e => setSellForm(f => ({ ...f, fiat_amount: e.target.value }))}
                      placeholder="500" type="number" min="0"
                      className="input-modern text-sm flex-1 w-0"/>
                    <select value={sellForm.fiat_currency} onChange={e => setSellForm(f => ({ ...f, fiat_currency: e.target.value }))}
                      className="input-modern text-xs w-20 shrink-0 px-1">
                      {FIAT_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Price in sats */}
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Your asking price (sats)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">⚡</span>
                  <input value={sellForm.price_sats} onChange={e => setSellForm(f => ({ ...f, price_sats: e.target.value }))}
                    placeholder="min. 1,000 sats" type="number" min="1000"
                    className="input-modern text-sm w-full pl-8 font-mono font-bold"/>
                </div>
                {sellForm.price_sats && parseInt(sellForm.price_sats) >= 1000 && (
                  <p className="text-[10px] text-neutral-400 mt-1">
                    You receive: ⚡ {Math.floor(parseInt(sellForm.price_sats) * 0.97).toLocaleString()} sats (after 3% fee)
                  </p>
                )}
              </div>

              {/* Voucher code */}
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Voucher code / PIN</label>
                <textarea value={sellForm.voucher_code} onChange={e => setSellForm(f => ({ ...f, voucher_code: e.target.value }))}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  rows={2}
                  className="input-modern text-sm w-full font-mono resize-none"/>
                <p className="text-[10px] text-neutral-400 mt-1">Hidden from buyers until payment is confirmed.</p>
              </div>

              {sellMsg && (
                <p className={`text-sm font-bold rounded-xl px-3 py-2 ${sellMsg.startsWith("✓") ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                  {sellMsg}
                </p>
              )}

              <button type="submit" disabled={selling}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-black text-white font-extrabold text-sm hover:bg-neutral-800 disabled:opacity-60">
                {selling ? <Loader size={16} className="animate-spin"/> : <Plus size={16}/>}
                {selling ? "Listing…" : "List Voucher for Sale"}
              </button>
            </form>
          )}

          {/* ── MY ORDERS ── */}
          {tab === "orders" && (
            <div className="px-4 py-3 space-y-2 pb-6">
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package size={28} className="text-neutral-200 mx-auto mb-3"/>
                  <p className="text-sm text-neutral-400">No orders yet</p>
                  <p className="text-[10px] text-neutral-300 mt-1">Browse the Shop or Market to buy vouchers</p>
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
                      <p className="text-[10px] text-neutral-300 mt-0.5">{new Date(order.created_at).toLocaleDateString()}</p>
                      {order.status === "pending" && (
                        <div className="mt-2 flex items-center gap-1.5 text-amber-700 bg-amber-50 rounded-xl px-2.5 py-1.5">
                          <Clock size={11}/>
                          <span className="text-[10px] font-semibold">Admin will send your code shortly</span>
                        </div>
                      )}
                      {order.status === "delivered" && order.voucher_code && (
                        <div className="mt-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                          <p className="text-[9px] text-green-700 font-bold uppercase tracking-wider mb-1">Your voucher code</p>
                          <div className="flex items-center gap-2">
                            <p className="font-mono font-extrabold text-green-900 text-sm tracking-wide select-all flex-1">{order.voucher_code}</p>
                            <button onClick={() => copyCode(order.voucher_code!)} className="shrink-0">
                              {copied === order.voucher_code ? <CheckCircle size={14} className="text-green-600"/> : <Copy size={14} className="text-neutral-400"/>}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── MY LISTINGS ── */}
          {tab === "mine" && (
            <div className="px-4 py-3 pb-6 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Your active listings</p>
                <button onClick={loadMyListings} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-100">
                  <RefreshCw size={12} className="text-neutral-400"/>
                </button>
              </div>
              {myListings.length === 0 ? (
                <div className="text-center py-12">
                  <Tag size={28} className="text-neutral-200 mx-auto mb-3"/>
                  <p className="text-sm text-neutral-400">No listings yet</p>
                  <p className="text-[10px] text-neutral-300 mt-1">Go to the Sell tab to list your vouchers</p>
                </div>
              ) : myListings.map(ml => (
                <div key={ml.id} className="border border-neutral-100 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl shrink-0">{ml.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-extrabold text-black text-sm">{ml.service_name} {ml.denomination}</span>
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full ${
                          ml.status === "active" ? "bg-green-100 text-green-800" :
                          ml.status === "sold" ? "bg-blue-100 text-blue-700" : "bg-neutral-100 text-neutral-500"
                        }`}>{ml.status}</span>
                      </div>
                      {ml.fiat_amount && (
                        <p className="text-[10px] text-neutral-500">{ml.fiat_amount} {ml.fiat_currency}</p>
                      )}
                      <p className="text-[10px] text-neutral-500">⚡ {ml.price_sats.toLocaleString()} sats</p>
                      {ml.status === "sold" && ml.buyer_username && (
                        <p className="text-[10px] text-blue-600 mt-0.5">Sold to @{ml.buyer_username}</p>
                      )}
                      <p className="text-[10px] text-neutral-300 mt-0.5">{new Date(ml.created_at).toLocaleDateString()}</p>
                    </div>
                    {ml.status === "active" && (
                      <button onClick={async () => {
                        if (!confirm("Cancel this listing?")) return;
                        try { await api.p2p.cancelListing(ml.id); loadMyListings(); }
                        catch (e: any) { alert(e.message); }
                      }} className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-50">
                        <Trash2 size={14} className="text-red-400"/>
                      </button>
                    )}
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
