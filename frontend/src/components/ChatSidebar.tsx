import { useState } from "react";
import { Plus, LogOut, Coins, Shield, User, MessageCircle, Zap, EyeOff, Link } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

type SideTab = "chats" | "swap";
type NewMode = "dm" | "incognito" | "join";

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
  showSwap, onToggleSwap,
}: Props) {
  const nav = useNavigate();
  const [tab, setTab]       = useState<SideTab>("chats");
  const [newMode, setNew]   = useState<NewMode | null>(null);
  const [dmTarget, setDmT]  = useState("");
  const [icoName, setIcoN]  = useState("");
  const [joinCode, setJoin] = useState("");
  const [invite, setInvite] = useState("");
  const [err, setErr]       = useState("");

  const closeNew = () => { setNew(null); setDmT(""); setIcoN(""); setJoin(""); setInvite(""); setErr(""); };

  const startDM = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    try {
      const { room } = await api.openDM(dmTarget.replace("@","").trim());
      onNewDM(room); closeNew();
    } catch { setErr("User not found"); }
  };

  const startIncognito = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    try {
      const { room, inviteCode } = await api.createIncognito(icoName || undefined);
      setInvite(inviteCode);
      onNewDM(room);
    } catch { setErr("Failed to create room"); }
  };

  const joinRoom = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    try {
      const { room } = await api.joinByCode(joinCode.trim());
      onNewDM(room); closeNew();
    } catch { setErr("Invalid invite code"); }
  };

  const roomIcon = (room: any) => {
    if (room.isIncognito) return <EyeOff size={13} className="text-purple-400"/>;
    if (room.type === "group") return <span className="text-sm font-black text-[#F7931A]">#</span>;
    return <span className="text-sm font-black text-[#F7931A]">D</span>;
  };

  return (
    <div className="w-64 shrink-0 bg-[#030303] border-r border-[#1a1a1a] flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-3 border-b border-[#1a1a1a] bg-[#020202]">
        <div className="flex items-center gap-2">
          <span className="text-[#F7931A] text-2xl">⚡</span>
          <div>
            <p className="font-black text-sm tracking-[0.2em] uppercase text-[#F7931A] leading-none">VBC</p>
            <p className="text-[11px] text-neutral-600 tracking-widest uppercase mt-0.5">Volegram Bitcoin Chat</p>
          </div>
        </div>
      </div>

      {/* User strip */}
      <button onClick={() => nav(`/u/${user.username}`)}
        className="px-4 py-3 border-b border-[#1a1a1a] flex items-center gap-3 hover:bg-white/3 transition-colors text-left group">
        <div className="w-10 h-10 rounded-full border border-[#F7931A]/30 overflow-hidden bg-[#111] shrink-0">
          {user.avatarUrl
            ? <img src={user.avatarUrl} className="w-full h-full object-cover" alt=""/>
            : <div className="w-full h-full flex items-center justify-center text-base font-black text-[#F7931A]">
                {user.username.slice(0,1).toUpperCase()}
              </div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate group-hover:text-[#F7931A] transition-colors">@{user.username}</p>
          <div className="flex items-center gap-1">
            <Coins size={11} className="text-[#F7931A]"/>
            <span className="text-xs text-[#F7931A]">⚡{user.satsBalance?.toLocaleString() ?? 0}</span>
          </div>
        </div>
        <User size={13} className="text-neutral-700 group-hover:text-[#F7931A]"/>
      </button>

      {/* Tabs */}
      <div className="flex border-b border-[#1a1a1a]">
        {[["chats", "Chats", <MessageCircle size={13}/>], ["swap", "Swap", <Zap size={13}/>]].map(([id, label, icon]: any) => (
          <button key={id} onClick={() => { setTab(id); if (id === "swap") onToggleSwap(); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors
              ${(tab === id || (id === "swap" && showSwap)) ? "border-[#F7931A] text-[#F7931A]" : "border-transparent text-neutral-600 hover:text-white"}`}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* New chat options */}
      {tab === "chats" && (
        <div className="px-3 py-2 border-b border-[#1a1a1a] space-y-1">
          {newMode === null && (
            <div className="flex gap-1">
              <button onClick={() => setNew("dm")}
                className="flex-1 flex items-center gap-1 text-[9px] text-neutral-600 hover:text-[#FF6A00] font-bold uppercase transition-colors py-1">
                <Plus size={10}/> DM
              </button>
              <button onClick={() => setNew("incognito")}
                className="flex-1 flex items-center gap-1 text-[9px] text-neutral-600 hover:text-purple-400 font-bold uppercase transition-colors py-1">
                <EyeOff size={10}/> Incognito
              </button>
              <button onClick={() => setNew("join")}
                className="flex-1 flex items-center gap-1 text-[9px] text-neutral-600 hover:text-blue-400 font-bold uppercase transition-colors py-1">
                <Link size={10}/> Join
              </button>
            </div>
          )}

          {newMode === "dm" && (
            <form onSubmit={startDM} className="space-y-1">
              <div className="flex gap-1">
                <input value={dmTarget} onChange={e => setDmT(e.target.value)} placeholder="@username" autoFocus
                  className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] text-white text-[10px] px-2 py-1.5 outline-none focus:border-[#FF6A00] font-mono"/>
                <button type="submit" className="bg-[#FF6A00] text-black text-[10px] px-2 font-black">GO</button>
                <button type="button" onClick={closeNew} className="text-neutral-700 px-1 hover:text-white text-xs">✕</button>
              </div>
              {err && <p className="text-[9px] text-red-500">{err}</p>}
            </form>
          )}

          {newMode === "incognito" && (
            <form onSubmit={startIncognito} className="space-y-1">
              <div className="flex gap-1">
                <input value={icoName} onChange={e => setIcoN(e.target.value)} placeholder="Room name (opt)" autoFocus
                  className="flex-1 bg-[#0a0a0a] border border-purple-900/40 text-white text-[10px] px-2 py-1.5 outline-none focus:border-purple-500 font-mono"/>
                <button type="submit" className="bg-purple-700 text-white text-[10px] px-2 font-black">CREATE</button>
                <button type="button" onClick={closeNew} className="text-neutral-700 px-1 hover:text-white text-xs">✕</button>
              </div>
              {invite && (
                <div className="bg-purple-900/20 border border-purple-900/40 px-2 py-1.5 rounded">
                  <p className="text-[9px] text-purple-400 mb-1">Share invite code:</p>
                  <div className="flex items-center gap-1">
                    <code className="text-[9px] text-white font-mono flex-1">{invite}</code>
                    <button type="button" onClick={() => navigator.clipboard.writeText(invite)}
                      className="text-[9px] text-purple-400 hover:text-white px-1.5 py-0.5 border border-purple-800">COPY</button>
                  </div>
                </div>
              )}
              {err && <p className="text-[9px] text-red-500">{err}</p>}
            </form>
          )}

          {newMode === "join" && (
            <form onSubmit={joinRoom} className="space-y-1">
              <div className="flex gap-1">
                <input value={joinCode} onChange={e => setJoin(e.target.value)} placeholder="Invite code" autoFocus
                  className="flex-1 bg-[#0a0a0a] border border-blue-900/40 text-white text-[10px] px-2 py-1.5 outline-none focus:border-blue-500 font-mono"/>
                <button type="submit" className="bg-blue-700 text-white text-[10px] px-2 font-black">JOIN</button>
                <button type="button" onClick={closeNew} className="text-neutral-700 px-1 hover:text-white text-xs">✕</button>
              </div>
              {err && <p className="text-[9px] text-red-500">{err}</p>}
            </form>
          )}
        </div>
      )}

      {/* Rooms list */}
      {tab === "chats" && (
        <div className="flex-1 overflow-y-auto">
          {rooms.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <MessageCircle size={24} className="text-neutral-800 mx-auto mb-2"/>
              <p className="text-sm text-neutral-600">No chats yet.</p>
            </div>
          ) : rooms.map(room => (
            <button key={room.id} onClick={() => onSelectRoom(room)}
              className={`w-full px-4 py-3.5 text-left flex items-center gap-3 border-b border-[#0d0d0d] transition-colors
                ${activeRoomId === room.id
                  ? room.isIncognito ? "bg-purple-900/10 border-l-2 border-l-purple-600" : "bg-[#F7931A]/10 border-l-2 border-l-[#F7931A]"
                  : "hover:bg-white/3"}`}>
              <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0
                ${room.isIncognito ? "border-purple-800 bg-purple-900/20" : "border-[#2a2a2a] bg-[#1a1a1a]"}`}>
                {roomIcon(room)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold truncate ${room.isIncognito ? "text-purple-300" : "text-white"}`}>
                  {room.name ?? (room.type === "dm" ? "Direct Message" : "Group")}
                </p>
                <p className={`text-xs ${room.isIncognito ? "text-purple-700" : "text-neutral-600"}`}>
                  {room.isIncognito ? "🔒 incognito" : room.type}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {tab === "swap" && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <Zap size={24} className="text-[#FF6A00] mb-2"/>
          <p className="text-xs font-bold text-white mb-1">MICROSWAP is open</p>
          <p className="text-[10px] text-neutral-600">Browse & buy on the right →</p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-[#1a1a1a] px-4 py-3 space-y-2">
        {user.isAdmin && (
          <button onClick={() => nav("/admin")}
            className="w-full flex items-center gap-2 text-xs text-[#F7931A] hover:text-white font-bold uppercase tracking-widest transition-colors">
            <Shield size={13}/> Admin Panel
          </button>
        )}
        <button onClick={() => { api.logout(); onLogout(); }}
          className="w-full flex items-center gap-2 text-xs text-neutral-600 hover:text-red-400 transition-colors">
          <LogOut size={13}/> Sign out
        </button>
      </div>
    </div>
  );
}
