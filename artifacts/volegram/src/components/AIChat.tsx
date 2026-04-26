import { useState, useRef, useEffect } from "react";
import { X, Bot, Send, Loader2, Sparkles } from "lucide-react";
import { api } from "../lib/api";

interface Msg { role: "user" | "assistant"; content: string }

export default function AIChat({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm your VBC AI assistant. I can help you with Bitcoin, Lightning payments, eSIM plans, vouchers, and trading. What would you like to know?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const newMsgs: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    try {
      const { reply } = await api.ai.chat(newMsgs.map(m => ({ role: m.role, content: m.content })));
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex flex-col" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}>
      <div className="flex-1 flex flex-col bg-white max-w-md w-full mx-auto mt-10 mb-0 rounded-t-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100 bg-white shrink-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: "linear-gradient(135deg, #F7931A 0%, #FF6B00 100%)" }}>
            <Bot size={18} className="text-white"/>
          </div>
          <div className="flex-1">
            <p className="font-extrabold text-black text-sm">VBC AI Assistant</p>
            <p className="text-[10px] text-neutral-400 flex items-center gap-1">
              <Sparkles size={9} className="text-[#F7931A]"/> Powered by OpenAI
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-neutral-100">
            <X size={18} className="text-neutral-500"/>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#f8f8f8]">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1"
                     style={{ background: "linear-gradient(135deg, #F7931A 0%, #FF6B00 100%)" }}>
                  <Bot size={13} className="text-white"/>
                </div>
              )}
              <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-black text-white rounded-br-sm"
                  : "bg-white text-black border border-neutral-100 shadow-sm rounded-bl-sm"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2"
                   style={{ background: "linear-gradient(135deg, #F7931A 0%, #FF6B00 100%)" }}>
                <Bot size={13} className="text-white"/>
              </div>
              <div className="bg-white border border-neutral-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <Loader2 size={14} className="text-[#F7931A] animate-spin"/>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div className="px-4 py-4 bg-white border-t border-neutral-100 shrink-0 flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask about Bitcoin, eSIM, vouchers…"
            className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#F7931A]"
          />
          <button onClick={send} disabled={!input.trim() || loading}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-black active:scale-95 transition-transform disabled:opacity-40">
            <Send size={14} className="text-white"/>
          </button>
        </div>
      </div>
    </div>
  );
}
