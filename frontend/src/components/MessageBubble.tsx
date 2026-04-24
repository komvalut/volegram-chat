import { Zap, Mic, Check } from "lucide-react";

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
    <div className={`flex gap-3 mb-4 ${msg.isMe ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-sm font-black text-white shrink-0 mt-auto">
        {msg.sender.username.slice(0, 1).toUpperCase()}
      </div>

      <div className={`max-w-[72%] ${msg.isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {!msg.isMe && (
          <span className="text-xs text-neutral-500 px-1 font-bold">@{msg.sender.username}</span>
        )}

        {/* Text */}
        {msg.type === "text" && (
          <div className={`px-4 py-2.5 text-base leading-relaxed ${msg.isMe ? "msg-bubble-me" : "msg-bubble-them"}`}>
            {msg.content}
          </div>
        )}

        {/* Image */}
        {msg.type === "image" && msg.fileUrl && (
          <div className={`overflow-hidden rounded-xl ${msg.isMe ? "rounded-tr-sm" : "rounded-tl-sm"}`}>
            <img src={msg.fileUrl} alt="img" className="max-w-[280px] max-h-[220px] object-cover" />
          </div>
        )}

        {/* Voice */}
        {msg.type === "voice" && msg.fileUrl && (
          <div className={`px-4 py-3 flex items-center gap-2 ${msg.isMe ? "msg-bubble-me" : "msg-bubble-them"}`}>
            <Mic size={16} className="text-neutral-400"/>
            <audio src={msg.fileUrl} controls className="h-8 w-44" />
          </div>
        )}

        {/* Lightning */}
        {msg.type === "lightning" && (
          <div className="lightning-bubble px-4 py-3 min-w-[200px]">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-white" />
              <span className="text-sm font-black text-white uppercase tracking-wider">Lightning Invoice</span>
            </div>
            <div className="text-2xl font-black text-white mb-1">⚡ {msg.sats?.toLocaleString()} sats</div>
            {msg.content && <p className="text-sm text-neutral-400 mb-2">{msg.content}</p>}
            {msg.invoicePaid ? (
              <div className="flex items-center gap-1 text-sm text-green-400 font-bold">
                <Check size={14} /> PAID
              </div>
            ) : (
              <button
                onClick={() => navigator.clipboard.writeText(msg.invoicePr ?? "")}
                className="w-full mt-1 text-sm bg-white text-black font-black py-2 hover:bg-neutral-200 transition-colors"
              >
                COPY INVOICE
              </button>
            )}
          </div>
        )}

        <span className={`text-xs text-neutral-600 px-1 ${msg.isMe ? "text-right" : "text-left"}`}>{time}</span>
      </div>
    </div>
  );
}
