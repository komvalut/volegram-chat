import { useState, useEffect, useRef } from "react";
import { Zap, Mic, Send, Image, Flame, X, ArrowLeftRight, Smile, Users, ArrowLeft } from "lucide-react";
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

const EMOJI_GROUPS = [
  { label: "😀", emojis: ["😀","😂","😊","🥰","😎","🤔","😢","😡","🤣","😍","🥳","😴","😮","😱","🤩","🙄","😇","🤗","😬","🫠"] },
  { label: "👍", emojis: ["👍","👎","👏","🙏","💪","🤝","✌️","👋","🫡","🤜","🫶","💅","🤞","🖐️","☝️"] },
  { label: "❤️", emojis: ["❤️","🔥","✅","❌","🎉","💰","⚡","₿","🚀","💯","🎯","🌟","💎","💸","🏆","🎁","🤑","🛡️","⚠️","💬"] },
  { label: "🐶", emojis: ["🐶","🐱","🐸","🦁","🦊","🐺","🦋","🌈","🌙","⭐","🌞","🍕","🍺","☕","🎮","📱","💻","📷","🎵","🏀"] },
];

export default function ChatWindow({
  room, user, onCreateGroup, onBack,
}: { room: any; user: any; onCreateGroup?: () => void; onBack?: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [trades, setTrades]     = useState<Record<number, any>>({});
  const [text, setText]         = useState("");
  const [showLN, setShowLN]     = useState(false);
  const [showTrade, setShowTr]  = useState(false);
  const [showBurn, setShowBurn] = useState(false);
  const [burnSecs, setBurnSecs] = useState(0);
  const [typing, setTyping]     = useState(false);
  const [recording, setRecording] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiTab, setEmojiTab]   = useState(0);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const mediaRef    = useRef<MediaRecorder | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    setShowEmoji(false);
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

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart ?? text.length;
      const end   = el.selectionEnd ?? text.length;
      const newText = text.slice(0, start) + emoji + text.slice(end);
      setText(newText);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setText(t => t + emoji);
    }
  };

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
    <div className="flex flex-col h-full" onClick={() => setShowEmoji(false)}>
      {/* Header */}
      <div className="px-2 py-2 border-b border-neutral-200 bg-white flex items-center gap-2 shrink-0">
        {onBack && (
          <button onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-neutral-100 active:scale-95 transition-transform shrink-0">
            <ArrowLeft size={18} className="text-neutral-700"/>
          </button>
        )}
        <div className={`w-9 h-9 rounded-full border flex items-center justify-center text-sm font-extrabold shrink-0
          ${room.isIncognito ? "border-purple-800 bg-purple-900/20 text-purple-400" : "border-black/20 bg-black/5 text-black"}`}>
          {room.isIncognito ? "🔒" : room.type === "group" ? "#" : (room.name ?? "D").slice(0,1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-extrabold text-black truncate">{room.name ?? (room.type === "dm" ? "Direct Message" : "Group")}</p>
          <p className={`text-[10px] ${room.isIncognito ? "text-purple-500" : "text-neutral-400"}`}>
            {room.isIncognito ? "🔒 Incognito — not saved" : `${room.type} · encrypted`}
          </p>
        </div>
        {burnSecs > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-orange-400 border border-orange-900/40 px-2 py-1 rounded-lg">
            <Flame size={11}/> {activeBurn?.label}
          </div>
        )}
        {onCreateGroup && room.type !== "group" && (
          <button onClick={onCreateGroup} title="Create group"
            className="p-2 text-neutral-400 hover:text-black transition-colors rounded-lg hover:bg-neutral-100">
            <Users size={16}/>
          </button>
        )}
      </div>

      {/* Messages — larger area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 bg-neutral-50">
        {messages.length === 0 && (
          <div className="text-center py-16 text-sm text-neutral-400 select-none">
            <div className="text-3xl mb-2">⚡</div>
            <div className="font-semibold">No messages yet</div>
            <div className="text-xs mt-1 text-neutral-300">Say hello!</div>
          </div>
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
          <div className="flex items-center gap-2 text-sm text-neutral-400 ml-2">
            <span className="animate-pulse tracking-widest text-lg">· · ·</span>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Emoji picker panel */}
      {showEmoji && (
        <div className="border-t border-neutral-200 bg-white shrink-0" onClick={e => e.stopPropagation()}>
          {/* Category tabs */}
          <div className="flex border-b border-neutral-100 px-2 pt-1">
            {EMOJI_GROUPS.map((g, i) => (
              <button key={i} onClick={() => setEmojiTab(i)}
                className={`flex-1 text-base py-1.5 rounded-t-lg transition-colors ${
                  emojiTab === i ? "bg-neutral-100" : "hover:bg-neutral-50"
                }`}>
                {g.label}
              </button>
            ))}
          </div>
          {/* Emoji grid */}
          <div className="p-2 grid grid-cols-10 gap-0.5 max-h-28 overflow-y-auto">
            {EMOJI_GROUPS[emojiTab].emojis.map(emoji => (
              <button key={emoji} onClick={() => insertEmoji(emoji)}
                className="text-xl p-1 rounded hover:bg-neutral-100 transition-colors leading-none">
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Burn timer */}
      {showBurn && (
        <div className="px-4 py-2 border-t border-neutral-200 bg-white flex items-center gap-2 shrink-0">
          <Flame size={12} className="text-orange-400"/>
          <span className="text-xs text-neutral-500 uppercase tracking-wider mr-1">Burn:</span>
          {BURN_OPTIONS.map(o => (
            <button key={o.value} onClick={() => { setBurnSecs(o.value); setShowBurn(false); }}
              className={`text-xs px-2 py-1 rounded-lg border font-bold transition-colors
                ${burnSecs === o.value ? "border-orange-500 text-orange-500 bg-orange-50" : "border-neutral-200 text-neutral-600 hover:border-orange-400"}`}>
              {o.label}
            </button>
          ))}
          <button onClick={() => setShowBurn(false)} className="ml-auto text-neutral-400 hover:text-black"><X size={12}/></button>
        </div>
      )}

      {/* Input bar */}
      <div className="px-3 py-3 border-t border-neutral-200 bg-white shrink-0" onClick={e => e.stopPropagation()}>
        <div className="flex items-end gap-2">
          {/* Left toolbar */}
          <div className="flex gap-0.5 pb-1 shrink-0">
            <button
              onClick={e => { e.stopPropagation(); setShowEmoji(p => !p); setShowBurn(false); }}
              className={`p-2 rounded-xl transition-colors ${showEmoji ? "bg-[#F7931A] text-white" : "text-neutral-500 hover:text-black hover:bg-neutral-100"}`}
              title="Emoji">
              <Smile size={18}/>
            </button>
            <label className="cursor-pointer p-2 rounded-xl text-neutral-500 hover:text-black hover:bg-neutral-100 transition-colors" title="Send image">
              <Image size={18}/>
              <input type="file" accept="image/*" className="hidden" onChange={sendPhoto}/>
            </label>
            <button onClick={() => { setShowLN(true); setShowEmoji(false); }}
              className="p-2 rounded-xl text-neutral-500 hover:text-[#F7931A] hover:bg-orange-50 transition-colors"
              title="Send Lightning invoice">
              <Zap size={18}/>
            </button>
            <button onClick={() => { setShowTr(true); setShowEmoji(false); }}
              className="p-2 rounded-xl text-neutral-500 hover:text-green-600 hover:bg-green-50 transition-colors"
              title="Start P2P trade">
              <ArrowLeftRight size={18}/>
            </button>
            <button onClick={toggleRecording}
              className={`p-2 rounded-xl transition-colors ${recording ? "text-red-500 animate-pulse bg-red-50" : "text-neutral-500 hover:text-black hover:bg-neutral-100"}`}
              title="Voice message">
              <Mic size={18}/>
            </button>
            <button onClick={() => { setShowBurn(p => !p); setShowEmoji(false); }}
              className={`p-2 rounded-xl transition-colors ${burnSecs > 0 ? "text-orange-500 bg-orange-50" : "text-neutral-500 hover:text-orange-400 hover:bg-orange-50"}`}
              title="Burn timer">
              <Flame size={18}/>
            </button>
          </div>

          {/* Text input */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
            onKeyDown={onKeyDown}
            placeholder={burnSecs > 0 ? `Message (burns in ${activeBurn?.label})…` : "Message…"}
            rows={1}
            className={`flex-1 border rounded-2xl text-black text-sm px-3.5 py-2.5 outline-none resize-none leading-relaxed transition-colors bg-neutral-50
              ${burnSecs > 0 ? "border-orange-400 focus:border-orange-500" : "border-neutral-300 focus:border-black"}`}
            style={{ minHeight: "42px", maxHeight: "120px" }}
          />

          {/* Send button */}
          <button
            onClick={sendText}
            disabled={!text.trim()}
            className={`p-2.5 rounded-xl disabled:opacity-30 transition-all shrink-0 ${
              text.trim()
                ? burnSecs > 0
                  ? "bg-orange-500 text-white hover:bg-orange-400 shadow-md"
                  : "bg-black text-white hover:bg-neutral-800 shadow-md"
                : "bg-neutral-200 text-neutral-400"
            }`}
            title="Send">
            <Send size={18}/>
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
