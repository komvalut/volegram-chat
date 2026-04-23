import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { vws } from "../lib/ws";
import ChatSidebar from "../components/ChatSidebar";
import ChatWindow  from "../components/ChatWindow";

export default function Chat({
  user, setUser, onLogout,
}: { user: any; setUser: (u: any) => void; onLogout: () => void }) {
  const [rooms, setRooms]       = useState<any[]>([]);
  const [activeRoom, setActive] = useState<any>(null);

  useEffect(() => {
    vws.connect(user.id);
    api.rooms().then(setRooms).catch(() => {});
    return () => vws.disconnect();
  }, [user.id]);

  const addRoom = (room: any) => {
    setRooms(prev => prev.find(r => r.id === room.id) ? prev : [...prev, room]);
    setActive(room);
  };

  return (
    <div className="h-full flex bg-black">
      <ChatSidebar
        user={user}
        rooms={rooms}
        activeRoomId={activeRoom?.id ?? null}
        onSelectRoom={setActive}
        onNewDM={addRoom}
        onLogout={onLogout}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {activeRoom ? (
          <ChatWindow room={activeRoom} user={user} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="mb-5">
              <span className="text-5xl">⚡</span>
            </div>
            <h2 className="text-xl font-black uppercase tracking-[0.2em] text-[#FF6A00] mb-1">VBC</h2>
            <p className="text-[10px] tracking-widest text-neutral-600 uppercase mb-6">Volegram Bitcoin Chat</p>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-neutral-700 max-w-xs">
              <div className="border border-[#1a1a1a] px-4 py-3">⚡ Send sats</div>
              <div className="border border-[#1a1a1a] px-4 py-3">🖼️ Share photos</div>
              <div className="border border-[#1a1a1a] px-4 py-3">🎤 Voice messages</div>
              <div className="border border-[#1a1a1a] px-4 py-3">🔒 Zero KYC</div>
            </div>
            <p className="text-[10px] text-neutral-700 mt-6">Select a chat or start a new message →</p>
          </div>
        )}
      </div>
    </div>
  );
}
