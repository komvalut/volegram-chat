import { Zap, Image, Mic, Check } from "lucide-react";

interface Msg {
  id: number;
  type: "text" | "image" | "lightning" | "voice";
  content?: string;
  fileUrl?: string;
  invoicePr?: string;
  invoicePaid?: boolean;
  sats?: number;
  sender: { username: string; avatarSeed: string };
  createdAt: string;
  isMe: boolean;
}

export default function MessageBubble({ msg }: { msg: Msg }) {
  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`flex gap-2 mb-3 ${msg.isMe ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-[#FF6A00]/20 border border-[#FF6A00]/30 flex items-center justify-center text-xs font-black text-[#FF6A00] shrink-0 mt-auto">
        {msg.sender.username.slice(0, 1).toUpperCase()}
      </div>

      <div className={`max-w-[72%] ${msg.isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
        {!msg.isMe && (
          <span className="text-[10px] text-neutral-600 px-1">@{msg.sender.username}</span>
        )}

        {/* Text */}
        {msg.type === "text" && (
          <div className={`px-3 py-2 text-sm leading-relaxed ${msg.isMe ? "msg-bubble-me" : "msg-bubble-them"}`}>
            {msg.content}
          </div>
        )}

        {/* Image */}
        {msg.type === "image" && msg.fileUrl && (
          <div className={`overflow-hidden rounded-lg ${msg.isMe ? "rounded-tr-sm" : "rounded-tl-sm"}`}>
            <img src={msg.fileUrl} alt="img" className="max-w-[260px] max-h-[200px] object-cover" />
          </div>
        )}

        {/* Voice */}
        {msg.type === "voice" && msg.fileUrl && (
          <div className={`px-3 py-2 flex items-center gap-2 ${msg.isMe ? "msg-bubble-me" : "msg-bubble-them"}`}>
            <Mic size={14} />
            <audio src={msg.fileUrl} controls className="h-7 w-40" />
          </div>
        )}

        {/* Lightning */}
        {msg.type === "lightning" && (
          <div className="lightning-bubble px-4 py-3 min-w-[180px]">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-[#FF6A00]" />
              <span className="text-xs font-black text-[#FF6A00] uppercase tracking-wider">Lightning Invoice</span>
            </div>
            <div className="text-xl font-black text-white mb-1">⚡ {msg.sats?.toLocaleString()} sats</div>
            {msg.content && <p className="text-xs text-neutral-500 mb-2">{msg.content}</p>}
            {msg.invoicePaid ? (
              <div className="flex items-center gap-1 text-xs text-green-400 font-bold">
                <Check size={12} /> PAID
              </div>
            ) : (
              <button
                onClick={() => navigator.clipboard.writeText(msg.invoicePr ?? "")}
                className="w-full mt-1 text-xs bg-[#FF6A00] text-black font-black py-1.5 hover:bg-[#e55500] transition-colors"
              >
                COPY INVOICE
              </button>
            )}
          </div>
        )}

        <span className={`text-[10px] text-neutral-700 px-1 ${msg.isMe ? "text-right" : "text-left"}`}>{time}</span>
      </div>
    </div>
  );
}
