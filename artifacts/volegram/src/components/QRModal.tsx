import { X, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

export default function QRModal({ value, label, onClose }: {
  value: string;
  label: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl flex flex-col items-center gap-4"
      >
        <div className="w-full flex items-center justify-between">
          <span className="font-extrabold text-black text-sm">{label}</span>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-neutral-100">
            <X size={16} className="text-neutral-500"/>
          </button>
        </div>

        <div className="p-4 rounded-2xl border-2 border-neutral-100 bg-white">
          <QRCodeSVG
            value={value}
            size={200}
            bgColor="#ffffff"
            fgColor="#000000"
            level="M"
            includeMargin={false}
          />
        </div>

        <div className="w-full bg-neutral-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
          <p className="flex-1 text-[11px] font-mono text-neutral-600 truncate">{value}</p>
          <button onClick={copy} className="shrink-0 p-1.5 rounded-lg active:bg-neutral-200 transition-colors">
            {copied ? <Check size={14} className="text-green-600"/> : <Copy size={14} className="text-neutral-500"/>}
          </button>
        </div>

        <button
          onClick={copy}
          className="w-full bg-black text-white font-extrabold py-3 rounded-2xl text-sm active:scale-[0.98] transition-transform"
        >
          {copied ? "Copied!" : "Copy Address"}
        </button>
      </div>
    </div>
  );
}
