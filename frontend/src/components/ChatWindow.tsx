import { useState, useEffect, useRef, useCallback } from "react";
import { Zap, Paperclip, Mic, Send, Image } from "lucide-react";
import { api, uploadFile } from "../lib/api";
import { vws } from "../lib/ws";
import MessageBubble from "./MessageBubble";
import LightningModal from "./LightningModal";

export default function ChatWindow({ room, user }: { room: any; user: any }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [showLN, setShowLN] = useState(false);
  const [typing, setTyping] = useState(false);
  const [recording, setRecording] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRef  = useRef<MediaRecorder | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.messages(room.id).then(setMessages).catch(() => {});
    vws.join(room.id);

    const handler = (msg: any) => {
      if (msg.type === "message" && msg.message.roomId === room.id) {
        setMessages(prev => [...prev, msg.message]);
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
    vws.sendMessage(room.id, text.trim());
    setText("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); }
    else vws.sendTyping(room.id);
  };

  const sendPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file);
    vws.sendMessage(room.id, "", "image", { fileUrl: url });
    e.target.value = "";
  };

  const toggleRecording = async () => {
    if (recording) {
      mediaRef.current?.stop();
      setRecording(false);
    } else {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      mr.ondataavailable = e => chunks.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], "voice.webm", { type: "audio/webm" });
        const url = await uploadFile(file);
        vws.sendMessage(room.id, "", "voice", { fileUrl: url });
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3 border-b border-[#1a1a1a] bg-[#030303] flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#FF6A00]/20 border border-[#FF6A00]/30 flex items-center justify-center text-xs font-black text-[#FF6A00]">
          {room.type === "group" ? "#" : "D"}
        </div>
        <div>
          <p className="text-sm font-black text-white">{room.name ?? (room.type === "dm" ? "Direct Message" : "Group")}</p>
          <p className="text-[10px] text-neutral-600">{room.type} · end-to-end encrypted</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {messages.map(m => (
          <MessageBubble
            key={m.id}
            msg={{ ...m, sender: m.sender ?? { username: "?", avatarSeed: "" }, isMe: m.senderId === user.id }}
          />
        ))}
        {typing && (
          <div className="flex items-center gap-2 text-xs text-neutral-600 mb-2">
            <span className="animate-pulse">●●●</span> typing…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[#1a1a1a] bg-[#030303]">
        <div className="flex items-end gap-2">
          {/* Actions */}
          <div className="flex gap-1 pb-1">
            <label className="cursor-pointer p-2 text-neutral-600 hover:text-[#FF6A00] transition-colors">
              <Image size={16} />
              <input type="file" accept="image/*" className="hidden" onChange={sendPhoto} />
            </label>
            <button
              onClick={() => setShowLN(true)}
              className="p-2 text-neutral-600 hover:text-[#FF6A00] transition-colors"
            >
              <Zap size={16} />
            </button>
            <button
              onClick={toggleRecording}
              className={`p-2 transition-colors ${recording ? "text-red-500 animate-pulse" : "text-neutral-600 hover:text-[#FF6A00]"}`}
            >
              <Mic size={16} />
            </button>
          </div>

          {/* Text */}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Message…"
            rows={1}
            className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] text-white text-sm px-3 py-2 outline-none focus:border-[#FF6A00] resize-none font-mono placeholder:text-neutral-700 leading-relaxed"
            style={{ maxHeight: "120px" }}
          />

          <button
            onClick={sendText}
            disabled={!text.trim()}
            className="p-2.5 bg-[#FF6A00] text-black hover:bg-[#e55500] disabled:opacity-40 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {showLN && (
        <LightningModal
          roomId={room.id}
          onClose={() => setShowLN(false)}
          onSent={msg => setMessages(prev => [...prev, msg])}
        />
      )}
    </div>
  );
}
