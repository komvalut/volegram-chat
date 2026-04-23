import { useState } from "react";
import { Plus, LogOut, Coins, Shield, User, MessageCircle, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

type SideTab = "chats" | "swap";

interface Props {
  user: any;
  rooms: any[];
  activeRoomId: number | null;
  onSelectRoom: (room: any) => void;
  onNewDM: (room: any) => void;
  onLogout: () => void;
  onSwapBuy: (listingId: number) => Promise<void>;
  showSwap: boolean;
  onToggleSwap: () => void;
}

export default function ChatSidebar({
  user, rooms, activeRoomId, onSelectRoom, onNewDM, onLogout,
  onSwapBuy, showSwap, onToggleSwap,
}: Props) {
  const nav = useNavigate();
  const [tab, setTab]       = useState<SideTab>("chats");
  const [showDM, setShowDM] = useState(false);
  const [dmTarget, setDmT]  = useState("");
  const [dmErr, setDmErr]   = useState("");

  const startDM = async (e: React.FormEvent) => {
    e.preventDefault(); setDmErr("");
    try {
      const { room } = await api.openDM(dmTarget.replace("@","").trim());
      onNewDM(room); setShowDM(false); setDmT("");
    } catch { setDmErr("User not found"); }
  };

  return (
    <div className="w-64 shrink-0 bg-[#030303] border-r border-[#1a1a1a] flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-3 border-b border-[#1a1a1a] bg-[#020202]">
        <div className="flex items-center gap-2">
          <span className="text-[#FF6A00] text-xl">⚡</span>
          <div>
            <p className="font-black text-[11px] tracking-[0.2em] uppercase text-[#FF6A00] leading-none">VBC</p>
            <p className="text-[8px] text-neutral-700 tracking-widest uppercase mt-0.5">Volegram Bitcoin Chat</p>
          </div>
        </div>
      </div>

      {/* User strip */}
      <button onClick={() => nav(`/u/${user.username}`)}
        className="px-4 py-2.5 border-b border-[#1a1a1a] flex items-center gap-3 hover:bg-white/3 transition-colors text-left group">
        <div className="w-8 h-8 rounded-full border border-[#FF6A00]/30 overflow-hidden bg-[#111] shrink-0">
          {user.avatarUrl
            ? <img src={user.avatarUrl} className="w-full h-full object-cover" alt=""/>
            : <div className="w-full h-full flex items-center justify-center text-sm font-black text-[#FF6A00]">
                {user.username.slice(0,1).toUpperCase()}
              </div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white truncate group-hover:text-[#FF6A00] transition-colors">@{user.username}</p>
          <div className="flex items-center gap-1">
            <Coins size={9} className="text-[#FF6A00]"/>
            <span className="text-[10px] text-[#FF6A00]">⚡{user.satsBalance?.toLocaleString() ?? 0} sats</span>
          </div>
        </div>
        <User size={11} className="text-neutral-700 group-hover:text-[#FF6A00]"/>
      </button>

      {/* Tabs: Chats / Swap */}
      <div className="flex border-b border-[#1a1a1a]">
        <button onClick={() => setTab("chats")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors
            ${tab === "chats" ? "border-[#FF6A00] text-[#FF6A00]" : "border-transparent text-neutral-600 hover:text-white"}`}>
          <MessageCircle size={11}/> Chats
        </button>
        <button onClick={() => { setTab("swap"); onToggleSwap(); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors
            ${tab === "swap" || showSwap ? "border-[#FF6A00] text-[#FF6A00]" : "border-transparent text-neutral-600 hover:text-white"}`}>
          <Zap size={11}/> Swap
        </button>
      </div>

      {/* New DM (only in chats tab) */}
      {tab === "chats" && (
        <div className="px-3 py-2.5 border-b border-[#1a1a1a]">
          <button onClick={() => setShowDM(!showDM)}
            className="w-full flex items-center gap-1.5 text-[10px] text-neutral-600 hover:text-[#FF6A00] font-bold uppercase tracking-widest transition-colors">
            <Plus size={11}/> New Message
          </button>
          {showDM && (
            <form onSubmit={startDM} className="mt-2 flex gap-1">
              <input value={dmTarget} onChange={e => setDmT(e.target.value)} placeholder="@username"
                className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] text-white text-xs px-2 py-1.5 outline-none focus:border-[#FF6A00] font-mono"/>
              <button type="submit" className="bg-[#FF6A00] text-black text-xs px-2 font-black">GO</button>
            </form>
          )}
          {dmErr && <p className="text-[10px] text-red-500 mt-1">{dmErr}</p>}
        </div>
      )}

      {/* Rooms list (chats tab) */}
      {tab === "chats" && (
        <div className="flex-1 overflow-y-auto">
          {rooms.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <MessageCircle size={20} className="text-neutral-800 mx-auto mb-2"/>
              <p className="text-[10px] text-neutral-700">No chats yet.<br/>Start a new message.</p>
            </div>
          ) : rooms.map(room => (
            <button key={room.id} onClick={() => onSelectRoom(room)}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 border-b border-[#0d0d0d] transition-colors
                ${activeRoomId === room.id ? "bg-[#FF6A00]/10 border-l-2 border-l-[#FF6A00]" : "hover:bg-white/3"}`}>
              <div className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[10px] font-black text-[#FF6A00] shrink-0">
                {room.type === "group" ? "#" : "D"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {room.name ?? (room.type === "dm" ? "Direct Message" : "Group")}
                </p>
                <p className="text-[9px] text-neutral-700">{room.type}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Swap hint (swap tab) */}
      {tab === "swap" && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <Zap size={28} className="text-[#FF6A00] mb-3"/>
          <p className="text-xs font-bold text-white mb-1">MICROSWAP panel is open</p>
          <p className="text-[10px] text-neutral-600">Browse listings on the right →<br/>Buy without leaving VBC.</p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-[#1a1a1a] px-4 py-3 space-y-2">
        {user.isAdmin && (
          <button onClick={() => nav("/admin")}
            className="w-full flex items-center gap-2 text-[10px] text-[#FF6A00] hover:text-white font-bold uppercase tracking-widest transition-colors">
            <Shield size={10}/> Admin Panel
          </button>
        )}
        <button onClick={() => { api.logout(); onLogout(); }}
          className="w-full flex items-center gap-2 text-[10px] text-neutral-700 hover:text-red-400 transition-colors">
          <LogOut size={10}/> Sign out
        </button>
      </div>
    </div>
  );
}
