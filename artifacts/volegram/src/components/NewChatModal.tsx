import { useState, useEffect, useRef } from "react";
import { X, Search, MessageCircle, Loader, User } from "lucide-react";

interface Props {
  onClose: () => void;
  onRoomCreated: (room: any) => void;
}

export default function NewChatModal({ onClose, onRoomCreated }: Props) {
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = query.trim().replace(/^@/, "");
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    timerRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
        const data = await r.json();
        setResults(Array.isArray(data) ? data : []);
      } catch {}
      setSearching(false);
    }, 350);
  }, [query]);

  const openDM = async (username: string) => {
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/rooms/dm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUsername: username }),
      });
      if (!r.ok) {
        const j = await r.json();
        setError(j.error ?? "Could not open chat");
        return;
      }
      const { room } = await r.json();
      onRoomCreated(room);
    } catch {
      setError("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const q = query.trim();

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
         onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
           onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center">
                <MessageCircle size={15} className="text-[#F7931A]"/>
              </div>
              <span className="font-extrabold text-black text-[15px]">New Chat</span>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-100">
              <X size={16} className="text-neutral-400"/>
            </button>
          </div>

          {/* Search input */}
          <div className="relative">
            {searching
              ? <Loader size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 animate-spin"/>
              : <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"/>
            }
            <input
              autoFocus
              value={query}
              onChange={e => { setQuery(e.target.value); setError(""); }}
              placeholder="Search by username…"
              className="w-full pl-8 pr-4 py-3 border border-neutral-200 rounded-2xl text-sm outline-none focus:border-black bg-neutral-50"
            />
          </div>
          {error && <p className="text-xs text-red-500 font-semibold mt-2 px-1">{error}</p>}
        </div>

        {/* Results */}
        <div className="border-t border-neutral-100 max-h-64 overflow-y-auto">
          {q.length < 2 && (
            <div className="py-8 text-center">
              <User size={20} className="text-neutral-200 mx-auto mb-2"/>
              <p className="text-xs text-neutral-400">Type at least 2 characters to search</p>
            </div>
          )}
          {q.length >= 2 && !searching && results.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-xs text-neutral-400">No users found for "<span className="font-bold">{q}</span>"</p>
            </div>
          )}
          {results.map(u => (
            <button
              key={u.id}
              onClick={() => openDM(u.username)}
              disabled={loading}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-neutral-50 active:bg-neutral-100 transition-colors border-b border-neutral-50 last:border-b-0"
            >
              <div className="w-10 h-10 rounded-2xl bg-black shrink-0 flex items-center justify-center overflow-hidden">
                {u.avatar_url
                  ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover"/>
                  : <span className="text-white font-extrabold text-sm">{u.username[0].toUpperCase()}</span>
                }
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-extrabold text-black text-sm">@{u.username}</p>
                <p className="text-[10px] text-neutral-400 truncate font-mono">{u.lightning_address}</p>
              </div>
              {loading
                ? <Loader size={13} className="text-neutral-400 animate-spin shrink-0"/>
                : <MessageCircle size={13} className="text-neutral-300 shrink-0"/>
              }
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
