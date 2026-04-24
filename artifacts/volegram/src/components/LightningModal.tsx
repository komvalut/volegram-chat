import { useState } from "react";
import { Zap, X } from "lucide-react";
import { api } from "../lib/api";

export default function LightningModal({
  roomId, onClose, onSent,
}: { roomId: number; onClose: () => void; onSent: (msg: any) => void }) {
  const [sats, setSats] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const presets = [1000, 5000, 10000, 21000];

  const send = async () => {
    const amount = parseInt(sats);
    if (!amount || amount < 1) return;
    setLoading(true);
    try {
      const { message } = await api.sendInvoice(roomId, amount, note || `⚡ ${amount} sats`);
      onSent(message);
      onClose();
    } catch {
      alert("Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-neutral-900 border border-neutral-200 w-full max-w-sm p-6 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-neutral-600 hover:text-black">
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 mb-5">
          <Zap size={18} className="text-black" />
          <h2 className="font-black uppercase tracking-widest text-sm text-black">Send Lightning</h2>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {presets.map(p => (
            <button key={p}
              onClick={() => setSats(String(p))}
              className={`text-xs py-2 border transition-colors ${sats === String(p) ? "border-black text-black bg-black/5" : "border-neutral-200 text-neutral-500 hover:border-black/25"}`}
            >
              {p >= 1000 ? `${p / 1000}k` : p}
            </button>
          ))}
        </div>

        <input
          type="number"
          value={sats}
          onChange={e => setSats(e.target.value)}
          placeholder="Amount in sats"
          className="w-full bg-neutral-50 border border-neutral-200 text-black text-sm px-3 py-2.5 mb-3 outline-none focus:border-black font-mono"
        />
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="w-full bg-neutral-50 border border-neutral-200 text-black text-sm px-3 py-2.5 mb-4 outline-none focus:border-black font-mono"
        />

        <button
          onClick={send}
          disabled={loading || !sats}
          className="w-full bg-black text-white font-black uppercase tracking-widest text-sm py-3 hover:bg-neutral-800 disabled:opacity-40 transition-colors"
        >
          {loading ? "CREATING…" : `CREATE INVOICE ⚡`}
        </button>
      </div>
    </div>
  );
}
