import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { vws } from "../lib/ws";
import ChatSidebar from "../components/ChatSidebar";
import ChatWindow  from "../components/ChatWindow";
import SwapPanel   from "../components/SwapPanel";

export default function Chat({
  user, setUser, onLogout,
}: { user: any; setUser: (u: any) => void; onLogout: () => void }) {
  const [rooms, setRooms]       = useState<any[]>([]);
  const [activeRoom, setActive] = useState<any>(null);
  const [showSwap, setShowSwap] = useState(false);

  useEffect(() => {
    vws.connect(user.id);
    api.rooms().then(setRooms).catch(() => {});
    return () => vws.disconnect();
  }, [user.id]);

  const addRoom = (room: any) => {
    setRooms(prev => prev.find(r => r.id === room.id) ? prev : [...prev, room]);
    setActive(room);
  };

  // Called when user clicks Buy in SwapPanel
  const handleSwapBuy = async (listingId: number) => {
    const BASE = import.meta.env.VITE_API_URL ?? "";
    const r = await fetch(`${BASE}/api/swap/buy/${listingId}`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!r.ok) throw new Error("buy failed");
    const { room } = await r.json();
    // Add room to list and switch to it
    addRoom(room);
    setShowSwap(false); // Close swap panel, focus on chat
  };

  return (
    <div className="h-full flex bg-black overflow-hidden">
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
      <div className="flex-1 flex min-w-0">
        {/* Main chat window */}
        <div className={`flex flex-col transition-all duration-200 ${showSwap ? "flex-1" : "flex-1"}`}>
          {activeRoom && !showSwap ? (
            <ChatWindow room={activeRoom} user={user}/>
          ) : !showSwap ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div className="flex flex-col items-center mb-4">
                <span className="text-6xl leading-none">⚡</span>
                <span className="text-[10px] font-black tracking-[0.3em] text-white/30 uppercase mt-1">BTC</span>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-white mb-2">VBC</h2>
              <p className="text-sm tracking-widest text-neutral-500 uppercase mb-8">Volegram Bitcoin Chat</p>
              <div className="grid grid-cols-2 gap-3 text-sm text-neutral-400 max-w-xs">
                <div className="border border-[#2a2a2a] px-4 py-4 hover:border-white/30 transition-colors">⚡ Send sats</div>
                <div className="border border-[#2a2a2a] px-4 py-4 hover:border-white/30 transition-colors">🖼️ Share photos</div>
                <div className="border border-[#2a2a2a] px-4 py-4 hover:border-white/30 transition-colors">🔥 Burn messages</div>
                <div className="border border-[#2a2a2a] px-4 py-4 hover:border-white/30 transition-colors">🔒 Zero KYC</div>
              </div>

              {/* Invite & Install */}
              <div className="mt-8 max-w-xs w-full border border-[#1e1e1e] bg-[#070707] px-5 py-4 text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: "var(--accent)" }}>
                  ⚡ Invite &amp; Install
                </p>
                <p className="text-[11px] text-neutral-500 mb-3 leading-relaxed">
                  Know someone who values privacy &amp; Bitcoin?<br/>Send them the link — no sign-up, no KYC.
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText("https://volegram-chat.onrender.com");
                    alert("Link copied! Share it with your Bitcoin friends.");
                  }}
                  className="w-full text-[11px] font-black uppercase tracking-widest py-2.5 mb-2 transition-colors hover:opacity-80"
                  style={{ background: "var(--accent)", color: "var(--accent-text)" }}
                >
                  Copy Invite Link
                </button>
                <p className="text-[9px] text-neutral-700">
                  Install as app: tap browser menu → <strong className="text-neutral-500">Add to Home Screen</strong>
                </p>
              </div>

              <p className="text-xs text-neutral-700 mt-4">
                Tap <span className="text-white font-bold">SWAP</span> in sidebar to browse MICROSWAP listings
              </p>
            </div>
          ) : activeRoom ? (
            <ChatWindow room={activeRoom} user={user}/>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-neutral-700">
              Select a chat or buy a listing →
            </div>
          )}
        </div>

        {/* Swap panel — slides in from right */}
        {showSwap && (
          <div className="w-80 shrink-0 border-l border-[#1a1a1a] flex flex-col">
            <SwapPanel
              onBuy={handleSwapBuy}
              onClose={() => setShowSwap(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
