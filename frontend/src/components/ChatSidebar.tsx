import { useState } from "react";
import { Plus, LogOut, Zap, Coins, Shield, User, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

interface Props {
  user: any;
  rooms: any[];
  activeRoomId: number | null;
  onSelectRoom: (room: any) => void;
  onNewDM: (room: any) => void;
  onLogout: () => void;
}

export default function ChatSidebar({ user, rooms, activeRoomId, onSelectRoom, onNewDM, onLogout }: Props) {
  const nav = useNavigate();
  const [showDM, setShowDM] = useState(false);
  const [dmTarget, setDmTarget] = useState("");
  const [dmErr, setDmErr]   = useState("");

  const startDM = async (e: React.FormEvent) => {
    e.preventDefault(); setDmErr("");
    try {
      const { room } = await api.openDM(dmTarget.replace("@","").trim());
      onNewDM(room); setShowDM(false); setDmTarget("");
    } catch { setDmErr("User not found"); }
  };

  return (
    <div className="w-64 shrink-0 bg-[#030303] border-r border-[#1a1a1a] flex flex-col h-full">
      {/* Header / Brand */}
      <div className="px-4 py-4 border-b border-[#1a1a1a] bg-[#020202]">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[#FF6A00] text-xl">⚡</span>
          <div>
            <p className="font-black text-[11px] tracking-[0.2em] uppercase text-[#FF6A00] leading-none">VBC</p>
            <p className="text-[8px] text-neutral-700 tracking-widest uppercase leading-none mt-0.5">Volegram Bitcoin Chat</p>
          </div>
        </div>
      </div>

      {/* User strip */}
      <button onClick={() => nav(`/u/${user.username}`)}
        className="px-4 py-3 border-b border-[#1a1a1a] flex items-center gap-3 hover:bg-white/3 transition-colors text-left group">
        <div className="w-9 h-9 rounded-full border border-[#FF6A00]/30 overflow-hidden bg-[#111] shrink-0">
          {user.avatarUrl
            ? <img src={user.avatarUrl} className="w-full h-full object-cover" alt=""/>
            : <div className="w-full h-full flex items-center justify-center text-sm font-black text-[#FF6A00]">
                {user.username.slice(0,1).toUpperCase()}
              </div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white truncate group-hover:text-[#FF6A00] transition-colors">@{user.username}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Coins size={9} className="text-[#FF6A00]"/>
            <span className="text-[10px] text-[#FF6A00]">⚡{user.satsBalance?.toLocaleString() ?? 0}</span>
          </div>
        </div>
        <User size={12} className="text-neutral-700 group-hover:text-[#FF6A00] transition-colors"/>
      </button>

      {/* New DM */}
      <div className="px-3 py-3 border-b border-[#1a1a1a]">
        <button onClick={() => setShowDM(!showDM)}
          className="w-full flex items-center gap-2 text-[11px] text-neutral-500 hover:text-[#FF6A00] transition-colors font-bold uppercase tracking-wider">
          <Plus size={12}/> New Message
        </button>
        {showDM && (
          <form onSubmit={startDM} className="mt-2 flex gap-1">
            <input value={dmTarget} onChange={e => setDmTarget(e.target.value)} placeholder="@username"
              className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] text-white text-xs px-2 py-1.5 outline-none focus:border-[#FF6A00] font-mono"/>
            <button type="submit" className="bg-[#FF6A00] text-black text-xs px-2 font-black">GO</button>
          </form>
        )}
        {dmErr && <p className="text-[10px] text-red-500 mt-1">{dmErr}</p>}
      </div>

      {/* Rooms */}
      <div className="flex-1 overflow-y-auto">
        {rooms.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <MessageCircle size={22} className="text-neutral-800 mx-auto mb-2"/>
            <p className="text-[10px] text-neutral-700">No chats yet.<br/>Start a new message.</p>
          </div>
        ) : rooms.map(room => (
          <button key={room.id} onClick={() => onSelectRoom(room)}
            className={`w-full px-4 py-3 text-left flex items-center gap-3 border-b border-[#0d0d0d] transition-colors
              ${activeRoomId === room.id ? "bg-[#FF6A00]/10 border-l-2 border-l-[#FF6A00]" : "hover:bg-white/3"}`}>
            <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-xs font-black text-[#FF6A00] shrink-0">
              {room.type === "group" ? "#" : "D"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {room.name ?? (room.type === "dm" ? "Direct Message" : "Group")}
              </p>
              <p className="text-[10px] text-neutral-700">{room.type}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-[#1a1a1a] px-4 py-3 space-y-2">
        {user.isAdmin && (
          <button onClick={() => nav("/admin")}
            className="w-full flex items-center gap-2 text-[10px] text-[#FF6A00] hover:text-white transition-colors font-bold uppercase tracking-widest">
            <Shield size={11}/> Admin Panel
          </button>
        )}
        <button onClick={() => { api.logout(); onLogout(); }}
          className="w-full flex items-center gap-2 text-[10px] text-neutral-700 hover:text-red-400 transition-colors">
          <LogOut size={11}/> Sign out
        </button>
      </div>
    </div>
  );
}
