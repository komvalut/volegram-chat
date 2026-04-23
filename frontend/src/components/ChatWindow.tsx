import { useState, useEffect, useRef } from "react";
import { Zap, Mic, Send, Image, Flame, X, ArrowLeftRight } from "lucide-react";
import { api, uploadFile } from "../lib/api";
import { vws } from "../lib/ws";
import MessageBubble from "./MessageBubble";
import LightningModal from "./LightningModal";
import TradeCard from "./TradeCard";
import TradeModal from "./TradeModal";

const BURN_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "1h",  value: 3600 },
  { label: "24h", value: 86400 },
  { label: "7d",  value: 604800 },
];

export default function ChatWindow({ room, user }: { room: any; user: any }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [trades, setTrades]     = useState<Record<number, any>>({});
  const [text, setText]         = useState("");
  const [showLN, setShowLN]     = useState(false);
  const [showTrade, setShowTr]  = useState(false);
  const [showBurn, setShowBurn] = useState(false);
  const [burnSecs, setBurnSecs] = useState(0);
  const [typing, setTyping]     = useState(false);
  const [recording, setRecording] = useState(false);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const mediaRef    = useRef<MediaRecorder | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMessages([]);
    api.messages(room.id).then((msgs: any[]) => {
      const visible = msgs.filter(m =>
        !m.isDeleted && (!m.expiresAt || new Date(m.expiresAt) > new Date())
      );
      setMessages(visible);
    }).catch(() => {});
    vws.join(room.id);

    const handler = (msg: any) => {
      if (msg.type === "message" && msg.message.roomId === room.id && !msg.message.isDeleted) {
        setMessages(prev => [...prev, msg.message]);
      }
      if (msg.type === "trade_update") {
        setTrades(prev => ({ ...prev, [msg.trade.id]: msg.trade }));
      }
      if (msg.type === "typing" && msg.roomId === room.id && msg.userId !== user.id) {
        setTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 2000);
      }
    };
    vws.on(handler);
    return () => vws.off(handler);
  }, [room.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendText = () => {
    if (!text.trim()) return;
    vws.sendMessage(room.id, text.trim(), "text", burnSecs > 0 ? { burnSecs } : undefined);
    setText("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); }
    else vws.sendTyping(room.id);
  };

  const sendPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const url  = await uploadFile(file);
    vws.sendMessage(room.id, "", "image", { fileUrl: url });
    e.target.value = "";
  };

  const toggleRecording = async () => {
    if (recording) { mediaRef.current?.stop(); setRecording(false); return; }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    mr.ondataavailable = e => chunks.push(e.data);
    mr.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const url  = await uploadFile(new File([blob], "voice.webm", { type: "audio/webm" }));
      vws.sendMessage(room.id, "", "voice", { fileUrl: url });
      stream.getTracks().forEach(t => t.stop());
    };
    mr.start(); mediaRef.current = mr; setRecording(true);
  };

  // When a trade is created, inject a special "trade message" into the chat
  const handleTradeSent = (trade: any) => {
    setTrades(prev => ({ ...prev, [trade.id]: trade }));
    setMessages(prev => [...prev, {
      id: `trade-${trade.id}`, roomId: room.id,
      senderId: user.id, type: "__trade__",
      tradeId: trade.id, createdAt: new Date().toISOString(),
      sender: { username: user.username },
    }]);
  };

  const activeBurn = BURN_OPTIONS.find(o => o.value === burnSecs);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3 border-b border-[#1a1a1a] bg-[#030303] flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-black shrink-0
          ${room.isIncognito ? "border-purple-800 bg-purple-900/20 text-purple-400" : "border-[#FF6A00]/30 bg-[#FF6A00]/10 text-[#FF6A00]"}`}>
          {room.isIncognito ? "🔒" : room.type === "group" ? "#" : "D"}
        </div>
        <div className="flex-1">
          <p className="text-sm font-black text-white">{room.name ?? (room.type === "dm" ? "Direct Message" : "Group")}</p>
          <p className={`text-[10px] ${room.isIncognito ? "text-purple-600" : "text-neutral-600"}`}>
            {room.isIncognito ? "🔒 Incognito — messages not saved" : `${room.type} · encrypted`}
          </p>
        </div>
        {burnSecs > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-orange-400 border border-orange-900/40 px-2 py-1">
            <Flame size={10}/> {activeBurn?.label} burn
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="text-center py-10 text-[10px] text-neutral-700">No messages yet ⚡</div>
        )}

        {messages.map(m => {
          if (m.type === "__trade__" && m.tradeId) {
            const trade = trades[m.tradeId];
            if (!trade) return null;
            return (
              <div key={m.id} className={`flex mb-3 ${m.senderId === user.id ? "justify-end" : "justify-start"}`}>
                <TradeCard
                  trade={trade}
                  currentUserId={user.id}
                  onUpdate={t => setTrades(prev => ({ ...prev, [t.id]: t }))}
                />
              </div>
            );
          }
          return (
            <MessageBubble key={m.id}
              msg={{ ...m, sender: m.sender ?? { username: "?", avatarSeed: "" }, isMe: m.senderId === user.id }}
            />
          );
        })}

        {typing && (
          <div className="flex items-center gap-2 text-[10px] text-neutral-600 ml-9">
            <span className="animate-pulse tracking-widest">● ● ●</span>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Burn timer */}
      {showBurn && (
        <div className="px-4 py-2 border-t border-[#1a1a1a] bg-[#030303] flex items-center gap-2">
          <Flame size={12} className="text-orange-400"/>
          <span className="text-[10px] text-neutral-500 uppercase tracking-wider mr-1">Burn:</span>
          {BURN_OPTIONS.map(o => (
            <button key={o.value} onClick={() => { setBurnSecs(o.value); setShowBurn(false); }}
              className={`text-[10px] px-2 py-1 border font-bold transition-colors
                ${burnSecs === o.value ? "border-orange-600 text-orange-400 bg-orange-900/20" : "border-[#1a1a1a] text-neutral-600 hover:border-orange-700"}`}>
              {o.label}
            </button>
          ))}
          <button onClick={() => setShowBurn(false)} className="ml-auto text-neutral-700 hover:text-white"><X size={12}/></button>
        </div>
      )}

      {/* Input bar */}
      <div className="px-4 py-3 border-t border-[#1a1a1a] bg-[#030303]">
        <div className="flex items-end gap-2">
          <div className="flex gap-0.5 pb-1">
            <label className="cursor-pointer p-1.5 text-neutral-600 hover:text-[#FF6A00] transition-colors" title="Send image">
              <Image size={15}/>
              <input type="file" accept="image/*" className="hidden" onChange={sendPhoto}/>
            </label>
            <button onClick={() => setShowLN(true)} className="p-1.5 text-neutral-600 hover:text-[#FF6A00] transition-colors" title="Send Lightning invoice">
              <Zap size={15}/>
            </button>
            <button onClick={() => setShowTr(true)} className="p-1.5 text-neutral-600 hover:text-green-400 transition-colors" title="Start P2P trade">
              <ArrowLeftRight size={15}/>
            </button>
            <button onClick={toggleRecording}
              className={`p-1.5 transition-colors ${recording ? "text-red-500 animate-pulse" : "text-neutral-600 hover:text-[#FF6A00]"}`}
              title="Voice message">
              <Mic size={15}/>
            </button>
            <button onClick={() => setShowBurn(p => !p)}
              className={`p-1.5 transition-colors ${burnSecs > 0 ? "text-orange-400" : "text-neutral-600 hover:text-orange-400"}`}
              title="Burn timer">
              <Flame size={15}/>
            </button>
          </div>

          <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={onKeyDown}
            placeholder={burnSecs > 0 ? `Message (burns in ${activeBurn?.label})…` : "Message…"}
            rows={1}
            className={`flex-1 bg-[#0a0a0a] border text-white text-sm px-3 py-2 outline-none resize-none font-mono placeholder:text-neutral-700 leading-relaxed transition-colors
              ${burnSecs > 0 ? "border-orange-900/60 focus:border-orange-600" : "border-[#1a1a1a] focus:border-[#FF6A00]"}`}
            style={{ maxHeight: "120px" }}
          />

          <button onClick={sendText} disabled={!text.trim()}
            className={`p-2.5 text-black disabled:opacity-40 transition-colors
              ${burnSecs > 0 ? "bg-orange-600 hover:bg-orange-500" : "bg-[#FF6A00] hover:bg-[#e55500]"}`}>
            <Send size={15}/>
          </button>
        </div>
      </div>

      {showLN && (
        <LightningModal roomId={room.id} onClose={() => setShowLN(false)}
          onSent={msg => setMessages(prev => [...prev, msg])}/>
      )}
      {showTrade && (
        <TradeModal
          roomId={room.id}
          onClose={() => setShowTr(false)}
          onSent={handleTradeSent}
        />
      )}
    </div>
  );
}
