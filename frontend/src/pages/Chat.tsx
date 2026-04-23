import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { api } from "../lib/api";
import { vws } from "../lib/ws";
import ChatSidebar from "../components/ChatSidebar";
import ChatWindow from "../components/ChatWindow";

export default function Chat({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<any>(null);

  useEffect(() => {
    vws.connect(user.id);
    api.rooms().then(setRooms).catch(() => {});
    return () => vws.disconnect();
  }, [user.id]);

  const addRoom = (room: any) => {
    setRooms(prev => prev.find(r => r.id === room.id) ? prev : [...prev, room]);
    setActiveRoom(room);
  };

  return (
    <div className="h-full flex bg-black">
      <ChatSidebar
        user={user}
        rooms={rooms}
        activeRoomId={activeRoom?.id ?? null}
        onSelectRoom={setActiveRoom}
        onNewDM={addRoom}
        onLogout={onLogout}
      />

      <div className="flex-1 flex flex-col">
        {activeRoom ? (
          <ChatWindow room={activeRoom} user={user} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="text-5xl mb-4">⚡</div>
            <h2 className="text-lg font-black uppercase tracking-widest text-[#FF6A00] neon-text mb-2">VOLEGRAM</h2>
            <p className="text-xs text-neutral-600 max-w-xs leading-relaxed">
              Select a conversation or start a new one.<br/>
              Send sats directly in chat with Lightning.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-neutral-700">
              <div className="border border-[#1a1a1a] px-4 py-3">⚡ Send sats</div>
              <div className="border border-[#1a1a1a] px-4 py-3">🖼️ Share photos</div>
              <div className="border border-[#1a1a1a] px-4 py-3">🎤 Voice messages</div>
              <div className="border border-[#1a1a1a] px-4 py-3">🔒 Zero KYC</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
