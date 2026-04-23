import { useState } from "react";
import { MessageCircle, Plus, LogOut, Zap, Coins } from "lucide-react";
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
  const [showDM, setShowDM] = useState(false);
  const [dmTarget, setDmTarget] = useState("");
  const [dmErr, setDmErr] = useState("");

  const startDM = async (e: React.FormEvent) => {
    e.preventDefault();
    setDmErr("");
    try {
      const { room } = await api.openDM(dmTarget.replace("@", "").trim());
      onNewDM(room);
      setShowDM(false);
      setDmTarget("");
    } catch {
      setDmErr("User not found");
    }
  };

  return (
    <div className="w-64 shrink-0 bg-[#030303] border-r border-[#1a1a1a] flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[#FF6A00] text-lg">⚡</span>
          <span className="font-black text-sm tracking-widest uppercase text-[#FF6A00]">VOLEGRAM</span>
        </div>
        <p className="text-[10px] text-neutral-600 truncate">@{user.username}</p>
      </div>

      {/* Rewards strip */}
      <div className="px-4 py-2 flex items-center gap-2 border-b border-[#1a1a1a] bg-[#FF6A00]/5">
        <Coins size={12} className="text-[#FF6A00]" />
        <span className="text-xs text-[#FF6A00] font-bold">⚡ {user.satsBalance?.toLocaleString() ?? 0} sats</span>
      </div>

      {/* New DM button */}
      <div className="px-3 py-3 border-b border-[#1a1a1a]">
        <button
          onClick={() => setShowDM(!showDM)}
          className="w-full flex items-center gap-2 text-xs text-neutral-500 hover:text-[#FF6A00] transition-colors"
        >
          <Plus size={13} />
          New Message
        </button>
        {showDM && (
          <form onSubmit={startDM} className="mt-2 flex gap-1">
            <input
              value={dmTarget}
              onChange={e => setDmTarget(e.target.value)}
              placeholder="@username"
              className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] text-white text-xs px-2 py-1.5 outline-none focus:border-[#FF6A00] font-mono"
            />
            <button type="submit" className="bg-[#FF6A00] text-black text-xs px-2 font-black">GO</button>
          </form>
        )}
        {dmErr && <p className="text-[10px] text-red-500 mt-1">{dmErr}</p>}
      </div>

      {/* Rooms */}
      <div className="flex-1 overflow-y-auto">
        {rooms.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <MessageCircle size={24} className="text-neutral-800 mx-auto mb-2" />
            <p className="text-xs text-neutral-700">No chats yet.<br />Start a new message.</p>
          </div>
        ) : (
          rooms.map(room => (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room)}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 border-b border-[#0d0d0d] transition-colors
                ${activeRoomId === room.id ? "bg-[#FF6A00]/10 border-l-2 border-l-[#FF6A00]" : "hover:bg-white/3"}`}
            >
              <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-xs font-black text-[#FF6A00]">
                {room.type === "group" ? "#" : "D"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {room.name ?? (room.type === "dm" ? "Direct Message" : "Group")}
                </p>
                <p className="text-[10px] text-neutral-600">{room.type}</p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#1a1a1a]">
        <button
          onClick={() => { api.logout(); onLogout(); }}
          className="flex items-center gap-2 text-xs text-neutral-600 hover:text-red-400 transition-colors"
        >
          <LogOut size={12} />
          Sign out
        </button>
      </div>
    </div>
  );
}
