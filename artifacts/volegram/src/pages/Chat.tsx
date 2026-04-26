import React, { useEffect, useState } from "react";
import {
  Home, MessageCircle, TrendingUp, Wallet, User,
  Bell, ArrowLeft, Shield, LogOut, Ticket, Send,
  ShoppingCart, ShoppingBag, Tag, ArrowLeftRight,
  ChevronRight, Copy, Check, Zap, Plus, X, QrCode,
  Smartphone, Bot, Megaphone,
} from "lucide-react";
import { api } from "../lib/api";
import { vws } from "../lib/ws";
import ChatWindow    from "../components/ChatWindow";
import TradeModal    from "../components/TradeModal";
import VouchersPanel from "../components/VouchersPanel";
import MarketTab     from "../components/MarketTab";
import QRModal       from "../components/QRModal";
import SendModal     from "../components/SendModal";
import ESIMPanel     from "../components/ESIMPanel";
import AIChat           from "../components/AIChat";
import NewChatModal     from "../components/NewChatModal";
import P2PVouchersPanel from "../components/P2PVouchersPanel";
import AdsPanel         from "../components/AdsPanel";
import DepositModal     from "../components/DepositModal";
import { requestNotifPermission } from "../lib/ws";
import { SOUND_OPTIONS, getNotifSound, setNotifSound, previewSound, type SoundKey } from "../lib/sounds";
import { THEMES, type ThemeId } from "../lib/themes";
import { t, LANGUAGES, type LangCode, isRTL } from "../lib/i18n";

type Tab = "home" | "chats" | "market" | "wallet" | "profile";

function ReferralRedeem({ lang, onSuccess }: { lang: LangCode; onSuccess: (bonus: number) => void }) {
  const [code, setCode]   = useState("");
  const [msg, setMsg]     = useState<{text:string;ok:boolean}|null>(null);
  const [loading, setLoading] = useState(false);

  const redeem = async () => {
    if (!code.trim() || loading) return;
    setLoading(true); setMsg(null);
    try {
      const r = await fetch("/api/referral/redeem", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const d = await r.json();
      if (r.ok) { setMsg({ text: d.message ?? "✓ OK", ok: true }); setCode(""); if (d.bonus_sats > 0) onSuccess(d.bonus_sats); }
      else setMsg({ text: d.error ?? "Greška", ok: false });
    } catch { setMsg({ text: "Network error", ok: false }); }
    setLoading(false);
  };

  return (
    <div className="mx-4 mb-3">
      <div className="vbc-card rounded-2xl border vbc-border overflow-hidden">
        <div className="px-4 py-3 border-b vbc-border">
          <p className="text-sm font-extrabold vbc-text">🎁 {t(lang).profile.referral}</p>
          <p className="text-[10px] vbc-text-sub mt-0.5">{t(lang).profile.referralSub}</p>
        </div>
        <div className="p-3 flex gap-2">
          <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && redeem()}
            placeholder="VBC2026…"
            className="flex-1 border vbc-border vbc-input rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-black uppercase"/>
          <button onClick={redeem} disabled={!code.trim() || loading}
            className="px-4 py-2 bg-black text-white rounded-xl text-xs font-extrabold disabled:opacity-40 active:scale-95 transition-transform">
            {loading ? "…" : t(lang).profile.redeemBtn}
          </button>
        </div>
        {msg && (
          <div className={`px-4 pb-3 text-xs font-bold ${msg.ok ? "text-green-600" : "text-red-500"}`}>{msg.text}</div>
        )}
      </div>
    </div>
  );
}

function Hdr({ title, back, right }: { title: string; back?: () => void; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 vbc-header border-b vbc-border shrink-0">
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
      <span className="font-extrabold vbc-text text-[15px]">{title}</span>
      <div className="flex items-center gap-1">
        {right}
        <button className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-neutral-100">
          <Bell size={17} className="text-neutral-400"/>
        </button>
      </div>
    </div>
  );
}

const TABS: { id: Tab; en: string; sr: string; Icon: React.ComponentType<any> }[] = [
  { id: "home",    en: "Home",    sr: "Početna", Icon: Home          },
  { id: "chats",   en: "Chats",   sr: "Poruke",  Icon: MessageCircle },
  { id: "market",  en: "Market",  sr: "Tržište", Icon: TrendingUp    },
  { id: "wallet",  en: "Wallet",  sr: "Novčanik",Icon: Wallet        },
  { id: "profile", en: "Profile", sr: "Profil",  Icon: User          },
];

export default function Chat({
  user, setUser, onLogout, themeId, onThemeChange, lang, onLangChange,
}: {
  user: any;
  setUser: (u: any) => void;
  onLogout: () => void;
  themeId: ThemeId;
  onThemeChange: (id: ThemeId) => void;
  lang: LangCode;
  onLangChange: (l: LangCode) => void;
}) {
  const [tab, setTab]           = useState<Tab>("home");
  const [rooms, setRooms]       = useState<any[]>([]);
  const [activeRoom, setActive] = useState<any>(null);
  const [tradeOpen, setTradeOpen]   = useState<null | "buy_crypto" | "buy_sats">(null);
  const [showVouchers, setShowVouchers] = useState(false);
  const [comingSoon, setComingSoon]     = useState<string | null>(null);
  const [copied, setCopied]             = useState(false);
  const [qrValue, setQrValue]           = useState<{ value: string; label: string } | null>(null);
  const [showSend, setShowSend]         = useState(false);
  const [showESIM, setShowESIM]         = useState(false);
  const [showAI, setShowAI]             = useState(false);
  const [showNewChat, setShowNewChat]   = useState(false);
  const [showP2P, setShowP2P]           = useState(false);
  const [showAds, setShowAds]           = useState(false);
  const [showDeposit, setShowDeposit]   = useState(false);
  const [notifSound, setNotifSoundState] = useState<SoundKey>(getNotifSound);
  const [adminMarketEnabled, setAdminMarketEnabled] = useState(true);
  const [userShowMarket, setUserShowMarket] = useState<boolean>(() =>
    localStorage.getItem("vbc-market-visible") !== "false"
  );

  // Wallet state
  const [depositLn, setDepositLn] = useState<string>(user.lightning_address ?? "");
  const [savingLn, setSavingLn]   = useState(false);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const [addingCrypto, setAddingCrypto] = useState(false);
  const [newCrypto, setNewCrypto] = useState({ symbol: "BTC", name: "Bitcoin", address: "" });
  const [cryptoAddresses, setCryptoAddresses] = useState<{id:string;symbol:string;name:string;address:string}[]>(() => {
    try { return JSON.parse(localStorage.getItem("vbc-crypto-addrs") || "[]"); } catch { return []; }
  });


  const showMarket = adminMarketEnabled && userShowMarket;

  const toggleUserMarket = (v: boolean) => {
    setUserShowMarket(v);
    localStorage.setItem("vbc-market-visible", String(v));
    if (!v && tab === "market") setTab("home");
  };

  const visibleTabs = TABS.filter(t => t.id !== "market" || showMarket);

  useEffect(() => {
    fetch("/api/settings/public", { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (typeof d.marketEnabled === "boolean") setAdminMarketEnabled(d.marketEnabled); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    vws.connect(user.id);
    requestNotifPermission();
    api.rooms().then(setRooms).catch(() => {});
    return () => vws.disconnect();
  }, [user.id]);

  // Keep WS informed of which room the user is viewing (so sounds aren't played for visible messages)
  useEffect(() => {
    vws.setActiveRoom(activeRoom?.id ?? null);
  }, [activeRoom]);

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

  const copyAddr = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 1500);
  };

  const saveLnAddress = async () => {
    if (depositLn === user.lightning_address) return;
    setSavingLn(true);
    try {
      await api.updateProfile({ lightningAddress: depositLn });
      setUser({ ...user, lightning_address: depositLn });
    } catch {}
    finally { setSavingLn(false); }
  };

  const addCryptoAddr = () => {
    if (!newCrypto.address.trim()) return;
    const entry = { id: Date.now().toString(), ...newCrypto, address: newCrypto.address.trim() };
    const updated = [...cryptoAddresses, entry];
    setCryptoAddresses(updated);
    localStorage.setItem("vbc-crypto-addrs", JSON.stringify(updated));
    setNewCrypto({ symbol: "BTC", name: "Bitcoin", address: "" });
    setAddingCrypto(false);
  };

  const removeCryptoAddr = (id: string) => {
    const updated = cryptoAddresses.filter(a => a.id !== id);
    setCryptoAddresses(updated);
    localStorage.setItem("vbc-crypto-addrs", JSON.stringify(updated));
  };

  const CRYPTO_PRESETS = [
    { symbol: "BTC",  name: "Bitcoin"  },
    { symbol: "ETH",  name: "Ethereum" },
    { symbol: "USDT", name: "Tether USDT" },
    { symbol: "SOL",  name: "Solana"   },
    { symbol: "BNB",  name: "BNB"      },
    { symbol: "TRX",  name: "Tron"     },
    { symbol: "XMR",  name: "Monero"   },
    { symbol: "CUSTOM", name: "Custom" },
  ];

  const unread = rooms.filter(r => (r.unread_count ?? 0) > 0).length;

  return (
    <div className="h-full flex flex-col vbc-bg overflow-hidden">

      {/* ── TAB CONTENT ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* HOME */}
        {tab === "home" && (
          <div className="flex-1 overflow-y-auto vbc-bg">
            <Hdr title="Volegram Chat"/>

            <div className="mx-4 mt-4 mb-3 rounded-2xl bg-black text-white p-5">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Your Balance</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl text-[#F7931A]">⚡</span>
                <span className="text-[38px] font-extrabold leading-none tracking-tight">
                  {(user.sats_balance ?? 0).toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-white/40 mb-0.5">sats</span>
              </div>
              <p className="text-[11px] text-white/25 mt-2 truncate">@{user.username} · {user.lightning_address}</p>
            </div>

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

            <div className="px-4 mb-3">
              <p className="text-[10px] font-bold vbc-text-dim uppercase tracking-widest mb-2">
                {t(lang).home.quickActions}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: <ShoppingCart size={18}/>, label: t(lang).home.buy,    fn: () => setTab("market") },
                  { icon: <Tag size={18}/>,           label: t(lang).home.sell,   fn: () => setTab("market") },
                  { icon: <Send size={18}/>,          label: t(lang).home.send,   fn: () => setShowSend(true) },
                  { icon: <Bot size={18}/>,           label: "AI Agent",           fn: () => setShowAI(true) },
                ].map(b => (
                  <button key={b.label} onClick={b.fn}
                    className="flex flex-col items-center gap-1.5 vbc-card rounded-2xl py-3.5 border vbc-border active:scale-95 transition-transform">
                    <span className="vbc-text">{b.icon}</span>
                    <span className="text-[11px] font-extrabold vbc-text">{b.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-4 mb-3 grid grid-cols-2 gap-2">
              <a href="https://t.me/VOLEGRAMBOT" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-white rounded-2xl p-3.5 border border-neutral-100 active:scale-95 transition-transform">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                     style={{ background: "linear-gradient(135deg,#229ED9 0%,#1A7EB0 100%)" }}>
                  <Send size={14} className="text-white"/>
                </div>
                <div className="text-left">
                  <p className="font-extrabold text-sm text-black">Telegram Bot</p>
                  <p className="text-[10px] text-neutral-400">@VOLEGRAMBOT</p>
                </div>
              </a>
              <button onClick={() => setShowESIM(true)}
                className="flex items-center gap-3 bg-white rounded-2xl p-3.5 border border-neutral-100 active:scale-95 transition-transform">
                <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center shrink-0">
                  <Smartphone size={14} className="text-[#F7931A]"/>
                </div>
                <div className="text-left">
                  <p className="font-extrabold text-sm text-black">eSIM Store</p>
                  <p className="text-[10px] text-neutral-400">Buy with sats</p>
                </div>
              </button>
              <button onClick={() => setShowP2P(true)}
                className="col-span-2 flex items-center gap-3 bg-white rounded-2xl p-3.5 border border-neutral-100 active:scale-95 transition-transform">
                <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center shrink-0">
                  <ShoppingBag size={14} className="text-[#F7931A]"/>
                </div>
                <div className="text-left">
                  <p className="font-extrabold text-sm text-black">P2P Voucher Store</p>
                  <p className="text-[10px] text-neutral-400">X Bon · Mtel TV · Paysafe · Steam · PSN · Xbox</p>
                </div>
                <ChevronRight size={14} className="text-neutral-300 ml-auto shrink-0"/>
              </button>
              <button onClick={() => setShowAds(true)}
                className="col-span-2 flex items-center gap-3 bg-white rounded-2xl p-3.5 border border-neutral-100 active:scale-95 transition-transform">
                <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center shrink-0">
                  <Megaphone size={14} className="text-[#F7931A]"/>
                </div>
                <div className="text-left">
                  <p className="font-extrabold text-sm text-black">VBC Oglasi</p>
                  <p className="text-[10px] text-neutral-400">Postavi oglas za sats · P2P klasifikovani</p>
                </div>
                <ChevronRight size={14} className="text-neutral-300 ml-auto shrink-0"/>
              </button>
            </div>

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
        )}

        {/* CHATS */}
        {tab === "chats" && (
          <div className="flex-1 flex flex-col min-h-0">
            {activeRoom ? (
              <>
                <Hdr
                  title={activeRoom.name ?? activeRoom.other_username ?? "Chat"}
                  back={() => { setActive(null); api.rooms().then(setRooms).catch(() => {}); }}
                />
                <div className="flex-1 min-h-0 overflow-hidden">
                  <ChatWindow room={activeRoom} user={user}/>
                </div>
              </>
            ) : (
              <>
                <Hdr
                  title="Chats"
                  right={
                    <button
                      onClick={() => setShowNewChat(true)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-black active:scale-95 transition-transform"
                      title="New chat"
                    >
                      <Plus size={16} className="text-white"/>
                    </button>
                  }
                />
                <div className="flex-1 overflow-y-auto vbc-bg">
                  {rooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                      <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                        <MessageCircle size={26} className="text-neutral-300"/>
                      </div>
                      <p className="font-extrabold text-neutral-700 mb-1">No chats yet</p>
                      <p className="text-sm text-neutral-400 mb-6">Start a new chat or browse the market</p>
                      <div className="flex gap-3">
                        <button onClick={() => setShowNewChat(true)}
                          className="bg-black text-white font-extrabold px-5 py-3 rounded-2xl text-sm active:scale-95 transition-transform flex items-center gap-2">
                          <Plus size={14}/> New Chat
                        </button>
                        <button onClick={() => setTab("market")}
                          className="bg-white border border-neutral-200 text-black font-extrabold px-5 py-3 rounded-2xl text-sm active:scale-95 transition-transform">
                          Market
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="px-4 pt-3 pb-1">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                          {rooms.length} conversation{rooms.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="bg-white mx-4 rounded-2xl overflow-hidden border border-neutral-100 divide-y divide-neutral-50 mb-4">
                        {rooms.map(room => {
                          const displayName = room.name ?? room.other_username ?? "Chat";
                          const initial = displayName[0].toUpperCase();
                          const hasUnread = (room.unread_count ?? 0) > 0;
                          const timeStr = room.last_message_at
                            ? (() => {
                                const d = new Date(room.last_message_at);
                                const now = new Date();
                                const diffMs = now.getTime() - d.getTime();
                                if (diffMs < 60000) return "now";
                                if (diffMs < 3600000) return `${Math.floor(diffMs/60000)}m`;
                                if (diffMs < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                                return d.toLocaleDateString([], { month: "short", day: "numeric" });
                              })()
                            : null;
                          return (
                            <button key={room.id} onClick={() => setActive(room)}
                              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-left">
                              <div className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center font-extrabold text-base
                                ${room.isIncognito ? "bg-purple-900/20 text-purple-400 border border-purple-800" : "bg-black text-white"}`}>
                                {room.isIncognito ? "🔒" : initial}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                  <p className={`text-sm truncate ${hasUnread ? "font-extrabold text-black" : "font-semibold text-neutral-700"}`}>
                                    {displayName}
                                  </p>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {timeStr && <span className="text-[10px] text-neutral-400">{timeStr}</span>}
                                    {hasUnread && (
                                      <span className="bg-[#F7931A] text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                                        {room.unread_count}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <p className={`text-xs truncate ${hasUnread ? "text-neutral-700 font-medium" : "text-neutral-400"}`}>
                                  {room.last_message ?? "Tap to chat"}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
            {tradeOpen && activeRoom && (
              <TradeModal roomId={activeRoom.id} defaultDir={tradeOpen}
                onClose={() => setTradeOpen(null)}
                onSent={t => {
                  setTradeOpen(null);
                  if (t?.roomId !== activeRoom?.id) api.rooms().then(setRooms).catch(() => {});
                }}/>
            )}
          </div>
        )}

        {/* MARKET */}
        {tab === "market" && (
          <MarketTab
            user={user}
            onBuy={handleSwapBuy}
            onClose={() => setTab("home")}
            onContactRoom={addRoom}
          />
        )}

        {/* WALLET */}
        {tab === "wallet" && (
          <div className="flex-1 overflow-y-auto vbc-bg">
            <Hdr title={t(lang).wallet.title}/>

            {/* Balance */}
            <div className="mx-4 mt-4 mb-3 rounded-2xl bg-black text-white p-5">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Stanje</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl text-[#F7931A]">⚡</span>
                <span className="text-[38px] font-extrabold leading-none tracking-tight">
                  {(user.sats_balance ?? 0).toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-white/40">sats</span>
              </div>
              <p className="text-[10px] text-white/25 mt-2">@{user.username}</p>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowDeposit(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#F7931A] text-black font-extrabold py-2.5 rounded-xl text-sm active:scale-[0.97] transition-all">
                  <Zap size={14} fill="black" className="text-black"/> Dopuni
                </button>
                <button onClick={() => setShowSend(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 text-white font-extrabold py-2.5 rounded-xl text-sm active:scale-[0.97] transition-all">
                  <Send size={14}/> Pošalji
                </button>
              </div>
            </div>

            {/* Deposit */}
            <div className="px-4 mb-3">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Deposit</p>
              <div className="bg-white rounded-2xl border border-neutral-100 p-4 space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Zap size={13} className="text-[#F7931A]"/>
                    <span className="text-xs font-extrabold text-black uppercase tracking-wide">Lightning Address</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={depositLn}
                      onChange={e => setDepositLn(e.target.value)}
                      onBlur={saveLnAddress}
                      placeholder="you@wallet.satoshi.stream"
                      className="flex-1 text-xs font-mono border border-neutral-200 rounded-xl px-3 py-2.5 outline-none focus:border-black bg-neutral-50"
                    />
                    <button
                      onClick={() => depositLn && setQrValue({ value: depositLn, label: "Lightning Address" })}
                      disabled={!depositLn}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-neutral-100 active:scale-95 transition-transform disabled:opacity-40"
                    >
                      <QrCode size={14} className="text-neutral-600"/>
                    </button>
                    <button
                      onClick={() => copyAddr(depositLn)}
                      disabled={!depositLn}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-neutral-100 active:scale-95 transition-transform disabled:opacity-40"
                    >
                      {copiedAddr === depositLn ? <Check size={14} className="text-green-600"/> : <Copy size={14} className="text-neutral-600"/>}
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1.5">Share your Lightning address to receive Bitcoin instantly. Tap to edit.</p>
                </div>
              </div>
            </div>

            {/* Crypto Addresses */}
            <div className="px-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">My Crypto Addresses</p>
                <button onClick={() => setAddingCrypto(true)}
                  className="flex items-center gap-1 text-[11px] font-bold text-black active:opacity-70">
                  <Plus size={12}/> Add
                </button>
              </div>

              {addingCrypto && (
                <div className="bg-white rounded-2xl border border-neutral-100 p-4 mb-2 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-extrabold text-black">Add Address</span>
                    <button onClick={() => setAddingCrypto(false)}><X size={15} className="text-neutral-400"/></button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {CRYPTO_PRESETS.map(p => (
                      <button key={p.symbol} onClick={() => setNewCrypto({ symbol: p.symbol, name: p.name, address: newCrypto.address })}
                        className={`py-2 rounded-xl text-[10px] font-bold transition-all ${
                          newCrypto.symbol === p.symbol ? "bg-black text-white" : "bg-neutral-100 text-neutral-600"
                        }`}>
                        {p.symbol === "CUSTOM" ? "+" : p.symbol}
                      </button>
                    ))}
                  </div>
                  {newCrypto.symbol === "CUSTOM" && (
                    <input
                      value={newCrypto.name}
                      onChange={e => setNewCrypto(n => ({ ...n, name: e.target.value }))}
                      placeholder="Coin name (e.g. Cardano)"
                      className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-black"
                    />
                  )}
                  <input
                    value={newCrypto.address}
                    onChange={e => setNewCrypto(n => ({ ...n, address: e.target.value }))}
                    placeholder={`${newCrypto.name} address`}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-black"
                  />
                  <button onClick={addCryptoAddr} disabled={!newCrypto.address.trim()}
                    className="w-full bg-black text-white font-extrabold py-2.5 rounded-xl text-xs active:scale-[0.98] transition-transform disabled:opacity-40">
                    Save Address
                  </button>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden divide-y divide-neutral-50">
                {cryptoAddresses.length === 0 && !addingCrypto ? (
                  <div className="py-8 text-center">
                    <Wallet size={22} className="text-neutral-200 mx-auto mb-2"/>
                    <p className="text-xs text-neutral-400">No addresses saved</p>
                    <p className="text-[10px] text-neutral-300 mt-0.5">Add BTC, ETH, USDT, SOL or any custom address</p>
                  </div>
                ) : cryptoAddresses.map(addr => (
                  <div key={addr.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-extrabold text-neutral-600">{addr.symbol.slice(0,4)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-black text-xs">{addr.name}</p>
                      <p className="text-[10px] font-mono text-neutral-400 truncate">{addr.address}</p>
                    </div>
                    <button onClick={() => setQrValue({ value: addr.address, label: `${addr.name} (${addr.symbol})` })}
                      className="p-1.5 rounded-lg active:bg-neutral-100">
                      <QrCode size={13} className="text-neutral-400"/>
                    </button>
                    <button onClick={() => copyAddr(addr.address)}
                      className="p-1.5 rounded-lg active:bg-neutral-100">
                      {copiedAddr === addr.address
                        ? <Check size={13} className="text-green-600"/>
                        : <Copy size={13} className="text-neutral-400"/>}
                    </button>
                    <button onClick={() => removeCryptoAddr(addr.id)}
                      className="p-1.5 rounded-lg active:bg-neutral-100">
                      <X size={13} className="text-neutral-300"/>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Vouchers */}
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

            {/* Cash Out */}
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
        )}

        {/* PROFILE */}
        {tab === "profile" && (
          <div className="flex-1 overflow-y-auto vbc-bg">
            <Hdr title={t(lang).profile.title}/>
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

            {/* Language Picker — all 14 languages */}
            <div className="mx-4 mb-3 vbc-card rounded-2xl border vbc-border overflow-hidden">
              <div className="px-4 py-3 border-b vbc-border">
                <p className="text-sm font-extrabold vbc-text">🌐 {t(lang).profile.language}</p>
                <p className="text-[10px] vbc-text-sub mt-0.5">{Object.values(LANGUAGES).map(l => l.flag).join(" ")}</p>
              </div>
              <div className="grid grid-cols-2 divide-x-0">
                {(Object.entries(LANGUAGES) as [LangCode, { name: string; native: string; flag: string }][]).map(([code, meta]) => (
                  <button key={code} onClick={() => onLangChange(code)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b vbc-border transition-all text-left ${
                      lang === code ? "vbc-accent-btn" : "vbc-bg vbc-text opacity-70 hover:opacity-100"
                    }`}>
                    <span className="text-base leading-none">{meta.flag}</span>
                    <span className="flex-1">{meta.native}</span>
                    {lang === code && <Check size={12} className="shrink-0"/>}
                  </button>
                ))}
              </div>
            </div>

            {/* P2P Market Toggle (user preference) */}
            {adminMarketEnabled && (
              <div className="mx-4 mb-3 vbc-card rounded-2xl border vbc-border overflow-hidden">
                <button
                  onClick={() => toggleUserMarket(!userShowMarket)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 active:scale-[0.98] transition-transform">
                  <TrendingUp size={16} className="vbc-text-dim shrink-0"/>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-extrabold vbc-text">{t(lang).profile.showMarket}</p>
                    <p className="text-[10px] vbc-text-sub mt-0.5">{t(lang).profile.showMarketSub}</p>
                  </div>
                  <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${userShowMarket ? "bg-[#F7931A]" : "bg-neutral-200"}`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${userShowMarket ? "right-0.5" : "left-0.5"}`}/>
                  </div>
                </button>
              </div>
            )}

            {/* Theme Picker */}
            <div className="mx-4 mb-3 vbc-card rounded-2xl border vbc-border overflow-hidden">
              <div className="px-4 py-3 border-b vbc-border">
                <p className="text-sm font-extrabold vbc-text">🎨 {t(lang).profile.theme}</p>
                <p className="text-[10px] vbc-text-sub mt-0.5">{t(lang).profile.chooseTheme}</p>
              </div>
              <div className="grid grid-cols-4 gap-3 p-4">
                {Object.values(THEMES).map(theme => (
                  <button key={theme.id} onClick={() => onThemeChange(theme.id)}
                    className={`flex flex-col items-center gap-1.5 active:scale-95 transition-transform`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold relative shadow-md border-2 transition-all ${
                      themeId === theme.id ? "border-white scale-110" : "border-transparent"
                    }`}
                      style={{ background: `linear-gradient(135deg, ${theme.preview[0]} 0%, ${theme.preview[1]} 100%)` }}>
                      <span style={{ textShadow: "0 0 8px rgba(0,0,0,0.5)" }}>{theme.emoji}</span>
                      {themeId === theme.id && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ background: theme.preview[2] }}>
                          <Check size={9} className="text-white font-bold"/>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold vbc-text-sub">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notification sound picker */}
            <div className="mx-4 mb-3 vbc-card rounded-2xl border vbc-border overflow-hidden">
              <div className="px-4 py-3 border-b vbc-border">
                <p className="text-sm font-extrabold vbc-text">🔔 {t(lang).profile.notifSound}</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">Za nove poruke u pozadini</p>
              </div>
              <div className="grid grid-cols-3 gap-0 divide-x divide-y divide-neutral-50">
                {SOUND_OPTIONS.map(opt => (
                  <button key={opt.key}
                    onClick={() => {
                      setNotifSound(opt.key);
                      setNotifSoundState(opt.key);
                      previewSound(opt.key);
                    }}
                    className={`flex flex-col items-center gap-1 py-3 px-2 transition-colors active:scale-95 ${
                      notifSound === opt.key ? "bg-black text-white" : "bg-white text-neutral-700 hover:bg-neutral-50"
                    }`}>
                    <span className="text-lg">{opt.emoji}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wide leading-tight text-center ${
                      notifSound === opt.key ? "text-[#F7931A]" : "text-neutral-500"
                    }`}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Referral Code Redemption */}
            <ReferralRedeem lang={lang} onSuccess={(bonus) => setUser((u:any) => u ? {...u, sats_balance: (u.sats_balance??0) + bonus} : u)}/>

            <div className="mx-4 mb-10 space-y-2">
              {(user.is_admin || user.isAdmin) && (
                <a href="/admin" className="flex items-center gap-3 bg-black text-white rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform">
                  <Shield size={16}/>
                  <span className="font-extrabold text-sm flex-1">Admin Panel</span>
                  <ChevronRight size={14}/>
                </a>
              )}
              <button onClick={copyInvite}
                className="w-full flex items-center gap-3 vbc-card rounded-2xl px-4 py-3.5 border vbc-border active:scale-[0.98] transition-transform">
                {copied ? <Check size={16} className="text-green-500"/> : <Copy size={16} className="text-neutral-400"/>}
                <span className="font-extrabold text-sm vbc-text flex-1">{copied ? t(lang).profile.copied : t(lang).profile.copyInvite}</span>
                <ChevronRight size={14} className="text-neutral-300"/>
              </button>
              <button onClick={onLogout}
                className="w-full flex items-center gap-3 bg-red-50 rounded-2xl px-4 py-3.5 border border-red-100 active:scale-[0.98] transition-transform">
                <LogOut size={16} className="text-red-400"/>
                <span className="font-extrabold text-sm text-red-500 flex-1">{t(lang).profile.signOut}</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── AI FLOATING BUTTON ─────────────────────────────────────── */}
      {!showAI && !showESIM && !showSend && !qrValue && !showVouchers && !comingSoon && (
        <button
          onClick={() => setShowAI(true)}
          className="fixed bottom-24 right-4 z-40 w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center active:scale-95 transition-transform animate-glow"
          style={{ background: "linear-gradient(135deg, #F7931A 0%, #FF6B00 100%)" }}
        >
          <Bot size={20} className="text-white"/>
        </button>
      )}

      {/* ── BOTTOM NAV ──────────────────────────────────────────────── */}
      <nav className="shrink-0 flex vbc-nav border-t vbc-border"
           style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {visibleTabs.map(({ id, Icon }) => {
          const active = tab === id;
          const navT   = t(lang).nav;
          const label  = navT[id as keyof typeof navT] ?? id;
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

      {qrValue && <QRModal value={qrValue.value} label={qrValue.label} onClose={() => setQrValue(null)}/>}

      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onRoomCreated={room => {
            addRoom(room);
            setShowNewChat(false);
          }}
        />
      )}

      {showSend && <SendModal userBalance={user.sats_balance ?? 0} onClose={() => setShowSend(false)}/>}
      {showDeposit && (
        <DepositModal
          user={user}
          onClose={() => setShowDeposit(false)}
          onSuccess={(newBal) => {
            setShowDeposit(false);
            setUser((u: any) => u ? { ...u, sats_balance: newBal } : u);
          }}
        />
      )}

      {showESIM && <ESIMPanel user={user} onClose={() => setShowESIM(false)}/>}
      {showP2P  && <P2PVouchersPanel user={user} onClose={() => setShowP2P(false)}/>}
      {showAds  && <AdsPanel user={user} onClose={() => setShowAds(false)}/>}

      {showAI && <AIChat onClose={() => setShowAI(false)}/>}

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
