import { useEffect, useState } from "react";
import { ShoppingCart, Tag, ArrowLeftRight, Shield } from "lucide-react";
import { api } from "../lib/api";
import { vws } from "../lib/ws";
import ChatSidebar from "../components/ChatSidebar";
import ChatWindow  from "../components/ChatWindow";
import SwapPanel   from "../components/SwapPanel";
import TradeModal  from "../components/TradeModal";

export default function Chat({
  user, setUser, onLogout,
}: { user: any; setUser: (u: any) => void; onLogout: () => void }) {
  const [rooms, setRooms]           = useState<any[]>([]);
  const [activeRoom, setActive]     = useState<any>(null);
  const [showSwap, setShowSwap]     = useState(false);
  const [tradeOpen, setTradeOpen]   = useState<null | "buy_crypto" | "buy_sats">(null);
  const [contactErr, setContactErr] = useState("");

  useEffect(() => {
    vws.connect(user.id);
    api.rooms().then(setRooms).catch(() => {});
    return () => vws.disconnect();
  }, [user.id]);

  const addRoom = (room: any) => {
    setRooms(prev => prev.find(r => r.id === room.id) ? prev : [...prev, room]);
    setActive(room);
  };

  const handleSwapBuy = async (listingId: number) => {
    const r = await fetch(`/api/swap/buy/${listingId}`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!r.ok) throw new Error("buy failed");
    const { room } = await r.json();
    addRoom(room);
    setShowSwap(false);
  };

  // Buy = open trade modal in "I want to buy crypto with sats" mode (also opens marketplace)
  const handleBuy = () => {
    if (!activeRoom) {
      setShowSwap(true);
      return;
    }
    setTradeOpen("buy_crypto");
  };

  // Sell = open trade modal in "I want fiat for my sats" mode (helper for sellers)
  const handleSell = () => {
    if (!activeRoom) {
      setShowSwap(true);
      return;
    }
    setTradeOpen("buy_sats");
  };

  // Swap = open MICROSWAP marketplace
  const handleSwap = () => {
    setShowSwap(true);
  };

  // Contact admin = find first admin and open DM
  const handleContactAdmin = async () => {
    setContactErr("");
    try {
      // Use the public users endpoint via admin lookup — fall back to a known username
      const r = await fetch("/api/profile/admin", { credentials: "include" });
      let adminUsername: string | null = null;
      if (r.ok) {
        const d = await r.json();
        adminUsername = d?.username ?? null;
      }
      if (!adminUsername) {
        setContactErr("No admin available right now. Try again later.");
        setTimeout(() => setContactErr(""), 4000);
        return;
      }
      const { room } = await api.openDM(adminUsername);
      addRoom(room);
    } catch {
      setContactErr("Could not reach admin. Try again later.");
      setTimeout(() => setContactErr(""), 4000);
    }
  };

  const handleTradeSent = (trade: any) => {
    // The trade message will be injected by ChatWindow's own state when it
    // receives the websocket message. Just close the modal here.
    setTradeOpen(null);
    // If trade returned a roomId we'll already be on that room.
    if (trade?.roomId && trade.roomId !== activeRoom?.id) {
      // ensure room is in list
      api.rooms().then(setRooms).catch(() => {});
    }
  };

  const ActionCards = (
    <div className="px-4 pt-3 pb-2 bg-white border-b border-neutral-200">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button onClick={handleBuy} className="action-card justify-center" data-testid="action-buy">
          <ShoppingCart size={16}/> Buy
        </button>
        <button onClick={handleSell} className="action-card justify-center" data-testid="action-sell">
          <Tag size={16}/> Sell
        </button>
        <button onClick={handleSwap} className="action-card justify-center" data-testid="action-swap">
          <ArrowLeftRight size={16}/> Swap
        </button>
        <button onClick={handleContactAdmin} className="action-card justify-center" data-testid="action-contact-admin">
          <Shield size={16}/> Contact Admin
        </button>
      </div>
      {contactErr && (
        <p className="mt-2 text-xs text-red-600 font-bold">{contactErr}</p>
      )}
    </div>
  );

  return (
    <div className="h-full flex bg-white overflow-hidden text-black">
      {/* Sidebar */}
      <ChatSidebar
        user={user}
        rooms={rooms}
        activeRoomId={activeRoom?.id ?? null}
        onSelectRoom={r => { setActive(r); setShowSwap(false); }}
        onNewDM={addRoom}
        onLogout={onLogout}
        onSwapBuy={handleSwapBuy}
        showSwap={showSwap}
        onToggleSwap={() => setShowSwap(p => !p)}
      />

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {ActionCards}

        <div className="flex-1 flex min-w-0 overflow-hidden">
          <div className="flex flex-col flex-1 min-w-0">
            {activeRoom && !showSwap ? (
              <ChatWindow room={activeRoom} user={user}/>
            ) : !showSwap ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6 bg-white">
                <div className="flex flex-col items-center mb-4">
                  <span className="text-6xl leading-none text-black">⚡</span>
                  <span className="text-xs font-black tracking-[0.3em] text-black/40 uppercase mt-1">BTC</span>
                </div>
                <h2 className="text-3xl font-black uppercase tracking-[0.2em] text-black mb-2">VBC</h2>
                <p className="text-sm tracking-widest text-neutral-500 uppercase mb-8">Volegram Bitcoin Chat</p>
                <div className="grid grid-cols-2 gap-3 text-sm text-neutral-700 max-w-xs">
                  <div className="border border-neutral-300 px-4 py-4 hover:border-black transition-colors">⚡ Send sats</div>
                  <div className="border border-neutral-300 px-4 py-4 hover:border-black transition-colors">🖼️ Share photos</div>
                  <div className="border border-neutral-300 px-4 py-4 hover:border-black transition-colors">🔥 Burn messages</div>
                  <div className="border border-neutral-300 px-4 py-4 hover:border-black transition-colors">🔒 Zero KYC</div>
                </div>

                <div className="mt-8 max-w-xs w-full border border-neutral-300 bg-white px-5 py-4 text-center">
                  <p className="text-sm font-black uppercase tracking-[0.2em] mb-1 text-black">
                    ⚡ Invite &amp; Install
                  </p>
                  <p className="text-xs text-neutral-600 mb-3 leading-relaxed">
                    Know someone who values privacy &amp; Bitcoin? Send them the link — no sign-up, no KYC.
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.origin);
                      alert("Link copied! Share it with your Bitcoin friends.");
                    }}
                    className="w-full text-sm font-black uppercase tracking-widest py-2.5 mb-2 transition-colors bg-black text-white hover:bg-neutral-800"
                  >
                    Copy Invite Link
                  </button>
                </div>

                <p className="text-xs text-neutral-500 mt-4">
                  Tap <span className="text-black font-bold">SWAP</span> above to browse MICROSWAP listings
                </p>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-neutral-500 bg-white">
                Select a chat or buy a listing →
              </div>
            )}
          </div>

          {showSwap && (
            <div className="w-80 shrink-0 border-l border-neutral-200 flex flex-col">
              <SwapPanel
                onBuy={handleSwapBuy}
                onClose={() => setShowSwap(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Trade modal triggered by Buy/Sell action cards */}
      {tradeOpen && activeRoom && (
        <TradeModal
          roomId={activeRoom.id}
          defaultDir={tradeOpen}
          onClose={() => setTradeOpen(null)}
          onSent={handleTradeSent}
        />
      )}
    </div>
  );
}
