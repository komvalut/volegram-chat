import { useEffect, useState } from "react";
import {
  Home, MessageCircle, TrendingUp, Wallet, User,
  Bell, ArrowLeft, Shield, LogOut, Ticket, Send,
  ShoppingCart, Tag, ArrowLeftRight, Smartphone,
  ChevronRight, Copy, Check, Zap, Plus, X,
  RefreshCw, MessageSquare,
} from "lucide-react";
import { api } from "../lib/api";
import { vws } from "../lib/ws";
import ChatWindow    from "../components/ChatWindow";
import SwapPanel     from "../components/SwapPanel";
import TradeModal    from "../components/TradeModal";
import VouchersPanel from "../components/VouchersPanel";

type Tab = "home" | "chats" | "market" | "wallet" | "profile";

export default function Chat({
  user, setUser, onLogout,
}: { user: any; setUser: (u: any) => void; onLogout: () => void }) {
  const [tab, setTab]               = useState<Tab>("home");
  const [rooms, setRooms]           = useState<any[]>([]);
  const [activeRoom, setActive]     = useState<any>(null);
  const [tradeOpen, setTradeOpen]   = useState<null | "buy_crypto" | "buy_sats">(null);
  const [showVouchers, setShowVouchers] = useState(false);
  const [comingSoon, setComingSoon]     = useState<string | null>(null);
  const [copied, setCopied]             = useState(false);

  useEffect(() => {
    vws.connect(user.id);
    api.rooms().then(setRooms).catch(() => {});
    return () => vws.disconnect();
  }, [user.id]);

  const addRoom = (room: any) => {
    setRooms(prev => prev.find(r => r.id === room.id) ? prev : [...prev, room]);
    setActive(room);
    setTab("chats");
  };

  const handleSwapBuy = async (listingId: number) => {
    const r = await fetch(`/api/swap/buy/${listingId}`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!r.ok) throw new Error("buy failed");
    const { room } = await r.json();
    addRoom(room);
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const unread = rooms.filter(r => (r.unread_count ?? 0) > 0).length;

  // ── SHARED HEADER ────────────────────────────────────────────────
  const Hdr = ({ title, back }: { title: string; back?: () => void }) => (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-100 shrink-0">
      <div className="w-9">
        {back ? (
          <button onClick={back} className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-neutral-100">
            <ArrowLeft size={20} className="text-black"/>
          </button>
        ) : (
          <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center">
            <Zap size={13} fill="#F7931A" className="text-[#F7931A]"/>
          </div>
        )}
      </div>
      <span className="font-extrabold text-black text-[15px]">{title}</span>
      <button className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-neutral-100">
        <Bell size={17} className="text-neutral-400"/>
      </button>
    </div>
  );

  // ── HOME ─────────────────────────────────────────────────────────
  const HomeTab = () => (
    <div className="flex-1 overflow-y-auto bg-[#f8f8f8]">
      <Hdr title="Volegram Chat"/>

      {/* Balance card */}
      <div className="mx-4 mt-4 mb-3 rounded-2xl bg-black text-white p-5">
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Your Balance</p>
        <div className="flex items-baseline gap-2">
          <span className="text-xl text-[#F7931A]">⚡</span>
          <span className="text-[38px] font-extrabold leading-none tracking-tight">{(user.sats_balance ?? 0).toLocaleString()}</span>
          <span className="text-sm font-semibold text-white/40 mb-0.5">sats</span>
        </div>
        <p className="text-[11px] text-white/25 mt-2 truncate">@{user.username} · {user.lightning_address}</p>
      </div>

      {/* Volegram Vouchers — featured orange button */}
      <div className="px-4 mb-3">
        <button onClick={() => setShowVouchers(true)}
          className="w-full rounded-2xl p-4 flex items-center justify-between text-white active:scale-[0.98] transition-transform"
          style={{ background: "linear-gradient(135deg,#F7931A 0%,#FF6B00 100%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center shrink-0">
              <Ticket size={18} className="text-white"/>
            </div>
            <div className="text-left">
              <p className="font-extrabold text-[15px]">Volegram Vouchers</p>
              <p className="text-[11px] text-white/70">Buy · Send · Redeem · Any currency</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[9px] uppercase tracking-wider bg-black/25 px-2 py-0.5 rounded-full font-bold">VV</span>
            <ChevronRight size={15}/>
          </div>
        </button>
      </div>

      {/* 4 quick actions */}
      <div className="px-4 mb-3">
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Quick Actions</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: <ShoppingCart size={18}/>, label: "Buy",  fn: () => setTab("market") },
            { icon: <Tag size={18}/>,          label: "Sell", fn: () => setTab("market") },
            { icon: <ArrowLeftRight size={18}/>,label:"Swap", fn: () => setTab("market") },
            { icon: <Send size={18}/>,         label: "Send", fn: () => setTab("chats")  },
          ].map(b => (
            <button key={b.label} onClick={b.fn}
              className="flex flex-col items-center gap-1.5 bg-white rounded-2xl py-3.5 border border-neutral-100 active:scale-95 transition-transform">
              <span className="text-black">{b.icon}</span>
              <span className="text-[11px] font-extrabold text-black">{b.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* eSIM + Chats shortcuts */}
      <div className="px-4 mb-3 grid grid-cols-2 gap-2">
        <button onClick={() => setComingSoon("eSIM data plans — buy eSIMs in 200+ countries with sats. Partner integration coming soon.")}
          className="flex items-center gap-3 bg-white rounded-2xl p-3.5 border border-neutral-100 active:scale-95 transition-transform">
          <Smartphone size={17} className="text-neutral-300 shrink-0"/>
          <div className="text-left">
            <p className="font-extrabold text-sm text-black">eSIM</p>
            <p className="text-[10px] text-neutral-400">Coming soon</p>
          </div>
        </button>
        <button onClick={() => setTab("chats")}
          className="flex items-center gap-3 bg-white rounded-2xl p-3.5 border border-neutral-100 active:scale-95 transition-transform">
          <div className="relative shrink-0">
            <MessageCircle size={17} className="text-black"/>
            {unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#F7931A] rounded-full"/>}
          </div>
          <div className="text-left">
            <p className="font-extrabold text-sm text-black">Chats</p>
            <p className="text-[10px] text-neutral-400">{rooms.length} open</p>
          </div>
        </button>
      </div>

      {/* Invite card */}
      <div className="px-4 mb-8">
        <div className="bg-white rounded-2xl p-4 border border-neutral-100 flex items-center justify-between">
          <div>
            <p className="font-extrabold text-sm text-black">Invite Friends</p>
            <p className="text-[10px] text-neutral-400">No KYC · Zero sign-up</p>
          </div>
          <button onClick={copyInvite}
            className="flex items-center gap-1.5 bg-black text-white text-[11px] font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform">
            {copied ? <><Check size={12}/> Copied!</> : <><Copy size={12}/> Copy link</>}
          </button>
        </div>
      </div>
    </div>
  );

  // ── CHATS ─────────────────────────────────────────────────────────
  const ChatsTab = () => (
    <div className="flex-1 flex flex-col min-h-0">
      {activeRoom ? (
        <>
          <Hdr title={activeRoom.name ?? activeRoom.other_username ?? "Chat"} back={() => setActive(null)}/>
          <div className="flex-1 min-h-0 overflow-hidden">
            <ChatWindow room={activeRoom} user={user}/>
          </div>
        </>
      ) : (
        <>
          <Hdr title="Chats"/>
          <div className="flex-1 overflow-y-auto bg-[#f8f8f8]">
            {rooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                  <MessageCircle size={26} className="text-neutral-300"/>
                </div>
                <p className="font-extrabold text-neutral-700 mb-1">No chats yet</p>
                <p className="text-sm text-neutral-400 mb-6">Start a trade to open a chat</p>
                <button onClick={() => setTab("market")}
                  className="bg-black text-white font-extrabold px-6 py-3 rounded-2xl text-sm active:scale-95 transition-transform">
                  Browse Market
                </button>
              </div>
            ) : (
              <div className="bg-white mt-3 mx-4 rounded-2xl overflow-hidden border border-neutral-100 divide-y divide-neutral-50">
                {rooms.map(room => (
                  <button key={room.id} onClick={() => setActive(room)}
                    className="w-full flex items-center gap-3 px-4 py-4 hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-left">
                    <div className="w-11 h-11 rounded-2xl bg-black shrink-0 flex items-center justify-center">
                      <span className="text-white font-extrabold text-base">
                        {(room.name ?? room.other_username ?? "?")[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-extrabold text-black text-sm truncate">{room.name ?? room.other_username ?? "Chat"}</p>
                        {(room.unread_count ?? 0) > 0 && (
                          <span className="shrink-0 bg-[#F7931A] text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                            {room.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 truncate mt-0.5">{room.last_message ?? "Tap to open"}</p>
                    </div>
                    <ChevronRight size={14} className="text-neutral-300 shrink-0"/>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      {tradeOpen && activeRoom && (
        <TradeModal roomId={activeRoom.id} defaultDir={tradeOpen}
          onClose={() => setTradeOpen(null)}
          onSent={t => { setTradeOpen(null); if (t?.roomId !== activeRoom?.id) api.rooms().then(setRooms).catch(() => {}); }}/>
      )}
    </div>
  );

  // ── MARKET ───────────────────────────────────────────────────────
  const MarketTab = () => {
    const [mTab, setMTab]         = useState<"vbc" | "swap">("vbc");
    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading]   = useState(false);
    const [creating, setCreating] = useState(false);
    const [contacting, setContacting] = useState<number | null>(null);
    const [form, setForm]         = useState({ title: "", description: "", priceSats: "", currency: "EUR", paymentMethod: "Lightning" });
    const [formErr, setFormErr]   = useState("");

    const CURRENCIES = ["EUR", "USD", "RSD", "BAM", "BTC", "USDT"];

    const loadListings = async () => {
      setLoading(true);
      try {
        const d = await fetch("/api/market/listings", { credentials: "include" }).then(r => r.json());
        setListings(d.listings ?? []);
      } catch { setListings([]); }
      finally { setLoading(false); }
    };

    useEffect(() => { if (mTab === "vbc") loadListings(); }, [mTab]);

    const createListing = async () => {
      setFormErr("");
      if (!form.title.trim()) return setFormErr("Title is required");
      const sats = parseInt(form.priceSats);
      if (!sats || sats < 1) return setFormErr("Enter price in sats");
      try {
        await fetch("/api/market/listings", {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: form.title.trim(), description: form.description.trim(), priceSats: sats, currency: form.currency, paymentMethod: form.paymentMethod }),
        });
        setCreating(false);
        setForm({ title: "", description: "", priceSats: "", currency: "EUR", paymentMethod: "Lightning" });
        loadListings();
      } catch { setFormErr("Could not create listing"); }
    };

    const contactSeller = async (listingId: number) => {
      setContacting(listingId);
      try {
        const d = await fetch(`/api/market/listings/${listingId}/contact`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
        }).then(r => r.json());
        if (d.room) addRoom(d.room);
      } catch { } finally { setContacting(null); }
    };

    const cancelListing = async (id: number) => {
      await fetch(`/api/market/listings/${id}`, { method: "DELETE", credentials: "include" });
      loadListings();
    };

    return (
      <div className="flex-1 flex flex-col min-h-0">
        <Hdr title="Market"/>

        {/* Tab switcher */}
        <div className="flex border-b border-neutral-100 bg-white shrink-0">
          <button onClick={() => setMTab("vbc")}
            className={`flex-1 py-2.5 text-[12px] font-extrabold transition-colors ${mTab === "vbc" ? "text-[#F7931A] border-b-2 border-[#F7931A]" : "text-neutral-400"}`}>
            VBC P2P Market
          </button>
          <button onClick={() => setMTab("swap")}
            className={`flex-1 py-2.5 text-[12px] font-extrabold transition-colors ${mTab === "swap" ? "text-[#F7931A] border-b-2 border-[#F7931A]" : "text-neutral-400"}`}>
            MicroSwap
          </button>
        </div>

        {mTab === "swap" ? (
          <div className="flex-1 overflow-hidden">
            <SwapPanel onBuy={handleSwapBuy} onClose={() => setTab("home")}/>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 bg-[#f8f8f8]">
            {/* Create listing form */}
            {creating && (
              <div className="bg-white border-b border-neutral-100 p-4 shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-extrabold text-black">New Listing</span>
                  <button onClick={() => setCreating(false)}><X size={16} className="text-neutral-400"/></button>
                </div>
                <div className="space-y-2">
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Title (e.g. Selling 50 EUR for sats)"
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-black"/>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Description (optional)"
                    rows={2}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-black resize-none"/>
                  <div className="flex gap-2">
                    <input type="number" value={form.priceSats} onChange={e => setForm(f => ({ ...f, priceSats: e.target.value }))}
                      placeholder="Price in sats"
                      className="flex-1 border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-black"/>
                    <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                      className="border border-neutral-200 rounded-xl px-2 py-2.5 text-sm outline-none bg-white">
                      {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <input value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                    placeholder="Payment method (e.g. Lightning, Bank transfer)"
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-black"/>
                  {formErr && <p className="text-red-500 text-xs">{formErr}</p>}
                  <button onClick={createListing}
                    className="w-full bg-black text-white font-extrabold py-3 rounded-xl text-sm active:scale-[0.98] transition-transform">
                    Post Listing
                  </button>
                </div>
              </div>
            )}

            {/* Header bar */}
            {!creating && (
              <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-100 shrink-0">
                <span className="text-xs font-bold text-neutral-500">{listings.length} active listing{listings.length !== 1 ? "s" : ""}</span>
                <div className="flex gap-2">
                  <button onClick={loadListings} className="w-8 h-8 flex items-center justify-center rounded-xl bg-neutral-100 active:scale-95 transition-transform">
                    <RefreshCw size={14} className={loading ? "animate-spin text-neutral-400" : "text-neutral-500"}/>
                  </button>
                  <button onClick={() => setCreating(true)}
                    className="flex items-center gap-1.5 bg-black text-white text-xs font-extrabold px-3 py-2 rounded-xl active:scale-95 transition-transform">
                    <Plus size={13}/> Sell
                  </button>
                </div>
              </div>
            )}

            {/* Listings */}
            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <RefreshCw size={22} className="animate-spin text-neutral-300 mx-auto mb-2"/>
                    <p className="text-xs text-neutral-400">Loading listings…</p>
                  </div>
                </div>
              )}
              {!loading && listings.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                    <Tag size={22} className="text-neutral-300"/>
                  </div>
                  <p className="font-extrabold text-neutral-700 mb-1">No listings yet</p>
                  <p className="text-sm text-neutral-400 mb-5">Be the first — post a listing to sell crypto or services for sats</p>
                  <button onClick={() => setCreating(true)}
                    className="bg-black text-white font-extrabold px-5 py-2.5 rounded-xl text-sm active:scale-95 transition-transform">
                    <Plus size={14} className="inline mr-1.5 -mt-0.5"/>Post Listing
                  </button>
                </div>
              )}
              {!loading && listings.map((l: any) => (
                <div key={l.id} className="bg-white mx-4 mt-3 rounded-2xl border border-neutral-100 p-4">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="font-extrabold text-black text-sm flex-1">{l.title}</p>
                    <div className="shrink-0 flex items-center gap-1">
                      <span className="text-[10px] font-bold text-neutral-500 border border-neutral-200 rounded-full px-2 py-0.5">{l.currency}</span>
                    </div>
                  </div>
                  {l.description && <p className="text-xs text-neutral-500 mb-2 leading-relaxed">{l.description}</p>}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#F7931A] font-extrabold text-base">⚡{Number(l.price_sats).toLocaleString()} <span className="text-xs text-neutral-400 font-semibold">sats</span></p>
                      <p className="text-[10px] text-neutral-400">via {l.payment_method} · @{l.seller_username}</p>
                    </div>
                    {l.seller_id === user.id ? (
                      <button onClick={() => cancelListing(l.id)}
                        className="text-xs font-bold text-red-400 border border-red-100 px-3 py-1.5 rounded-xl active:scale-95 transition-transform">
                        Cancel
                      </button>
                    ) : (
                      <button onClick={() => contactSeller(l.id)} disabled={contacting === l.id}
                        className="flex items-center gap-1.5 bg-black text-white text-xs font-extrabold px-3 py-2 rounded-xl active:scale-95 transition-transform disabled:opacity-50">
                        {contacting === l.id ? <RefreshCw size={12} className="animate-spin"/> : <MessageSquare size={12}/>}
                        {contacting === l.id ? "Opening…" : "Contact"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div className="h-6"/>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── WALLET ───────────────────────────────────────────────────────
  const WalletTab = () => (
    <div className="flex-1 overflow-y-auto bg-[#f8f8f8]">
      <Hdr title="Wallet"/>

      <div className="mx-4 mt-4 mb-3 rounded-2xl bg-black text-white p-5">
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Total Balance</p>
        <div className="flex items-baseline gap-2">
          <span className="text-xl text-[#F7931A]">⚡</span>
          <span className="text-[38px] font-extrabold leading-none tracking-tight">{(user.sats_balance ?? 0).toLocaleString()}</span>
          <span className="text-sm font-semibold text-white/40">sats</span>
        </div>
      </div>

      <div className="px-4 mb-3">
        <button onClick={() => setShowVouchers(true)}
          className="w-full bg-white rounded-2xl p-4 border border-neutral-100 flex items-center gap-4 active:scale-[0.98] transition-transform">
          <div className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center"
               style={{ background: "linear-gradient(135deg,#F7931A 0%,#FF6B00 100%)" }}>
            <Ticket size={18} className="text-white"/>
          </div>
          <div className="flex-1 text-left">
            <p className="font-extrabold text-black">Volegram Vouchers</p>
            <p className="text-[11px] text-neutral-400">Buy, send and redeem VV</p>
          </div>
          <ChevronRight size={15} className="text-neutral-300"/>
        </button>
      </div>

      <div className="px-4 mb-10">
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Cash Out</p>
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden divide-y divide-neutral-50">
          <button onClick={() => setTab("market")}
            className="w-full flex items-center gap-4 px-4 py-4 active:bg-neutral-50 transition-colors text-left">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 shrink-0 flex items-center justify-center">
              <TrendingUp size={17} className="text-black"/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-black text-sm">Sell via Market</p>
              <p className="text-[11px] text-neutral-400">P2P escrow · Instant crypto</p>
            </div>
            <ChevronRight size={14} className="text-neutral-300"/>
          </button>
          <button onClick={() => setComingSoon("Bank withdrawal — enter your IBAN and receive EUR, RSD or BAM. Admin processes same day. Coming very soon!")}
            className="w-full flex items-center gap-4 px-4 py-4 active:bg-neutral-50 transition-colors text-left">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 shrink-0 flex items-center justify-center">
              <Wallet size={17} className="text-neutral-400"/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-black text-sm">Bank Transfer Out</p>
              <p className="text-[11px] text-neutral-400">IBAN · EUR / RSD / BAM</p>
            </div>
            <span className="text-[9px] font-bold text-neutral-400 border border-neutral-200 rounded-full px-2 py-0.5 shrink-0">Soon</span>
          </button>
          <button onClick={() => setComingSoon("Card refund — receive your sats back on a debit or credit card. Stripe integration coming soon.")}
            className="w-full flex items-center gap-4 px-4 py-4 active:bg-neutral-50 transition-colors text-left">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 shrink-0 flex items-center justify-center">
              <ArrowLeftRight size={17} className="text-neutral-400"/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-black text-sm">Refund to Card</p>
              <p className="text-[11px] text-neutral-400">Debit / Credit card</p>
            </div>
            <span className="text-[9px] font-bold text-neutral-400 border border-neutral-200 rounded-full px-2 py-0.5 shrink-0">Soon</span>
          </button>
        </div>
      </div>
    </div>
  );

  // ── PROFILE ──────────────────────────────────────────────────────
  const ProfileTab = () => (
    <div className="flex-1 overflow-y-auto bg-[#f8f8f8]">
      <Hdr title="Profile"/>
      <div className="flex flex-col items-center pt-6 pb-5 bg-white mb-3">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="avatar" className="w-20 h-20 rounded-full object-cover mb-3 border-2 border-neutral-100"/>
        ) : (
          <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center mb-3">
            <span className="text-white text-2xl font-extrabold">{(user.username ?? "?")[0].toUpperCase()}</span>
          </div>
        )}
        <p className="font-extrabold text-xl text-black">@{user.username}</p>
        <p className="text-xs text-neutral-400 mt-0.5">{user.lightning_address}</p>
        {user.bio && <p className="text-sm text-neutral-500 mt-2 text-center px-8 leading-relaxed">{user.bio}</p>}
      </div>

      <div className="mx-4 mb-3 bg-white rounded-2xl border border-neutral-100 overflow-hidden divide-y divide-neutral-50">
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-sm text-neutral-500">Balance</span>
          <span className="text-sm font-extrabold text-black">⚡ {(user.sats_balance ?? 0).toLocaleString()} sats</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-sm text-neutral-500">Lightning</span>
          <span className="text-xs font-mono text-neutral-500 max-w-[180px] truncate">{user.lightning_address}</span>
        </div>
        {user.email && (
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-neutral-500">Email</span>
            <span className="text-xs text-neutral-500">{user.email}</span>
          </div>
        )}
      </div>

      <div className="mx-4 mb-10 space-y-2">
        {(user.is_admin || user.isAdmin) && (
          <a href="/admin" className="flex items-center gap-3 bg-black text-white rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform">
            <Shield size={16}/>
            <span className="font-extrabold text-sm flex-1">Admin Panel</span>
            <ChevronRight size={14}/>
          </a>
        )}
        <button onClick={copyInvite}
          className="w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 border border-neutral-100 active:scale-[0.98] transition-transform">
          {copied ? <Check size={16} className="text-green-500"/> : <Copy size={16} className="text-neutral-400"/>}
          <span className="font-extrabold text-sm text-black flex-1">{copied ? "Copied!" : "Copy Invite Link"}</span>
          <ChevronRight size={14} className="text-neutral-300"/>
        </button>
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 border border-red-100 active:scale-[0.98] transition-transform">
          <LogOut size={16} className="text-red-400"/>
          <span className="font-extrabold text-sm text-red-500 flex-1">Sign Out</span>
        </button>
      </div>
    </div>
  );

  const content: Record<Tab, React.ReactNode> = {
    home: <HomeTab/>, chats: <ChatsTab/>, market: <MarketTab/>,
    wallet: <WalletTab/>, profile: <ProfileTab/>,
  };

  const TABS: { id: Tab; label: string; Icon: any }[] = [
    { id: "home",    label: "Home",    Icon: Home           },
    { id: "chats",   label: "Chats",   Icon: MessageCircle  },
    { id: "market",  label: "Market",  Icon: TrendingUp     },
    { id: "wallet",  label: "Wallet",  Icon: Wallet         },
    { id: "profile", label: "Profile", Icon: User           },
  ];

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">{content[tab]}</div>

      {/* Bottom nav */}
      <nav className="shrink-0 flex bg-white border-t border-neutral-100"
           style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button key={id}
              onClick={() => { setTab(id); if (id !== "chats") setActive(null); }}
              className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 active:scale-90 transition-transform"
              style={{ color: active ? "#F7931A" : "#9ca3af" }}>
              <span className="relative">
                <Icon size={21} strokeWidth={active ? 2.5 : 1.8}/>
                {id === "chats" && unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#F7931A] rounded-full"/>
                )}
              </span>
              <span className="text-[10px] font-bold">{label}</span>
            </button>
          );
        })}
      </nav>

      {showVouchers && <VouchersPanel user={user} onClose={() => setShowVouchers(false)}/>}

      {comingSoon && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
             onClick={() => setComingSoon(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-3">
            <div className="text-3xl">🚀</div>
            <h3 className="text-xl font-extrabold text-black">Coming soon</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">{comingSoon}</p>
            <button onClick={() => setComingSoon(null)}
              className="w-full bg-black text-white font-extrabold py-3.5 rounded-2xl text-sm active:scale-[0.98] transition-transform">
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
