import { useState } from "react";
import { X, Copy, Check, MessageSquare, Loader2, ArrowRight, AlertCircle } from "lucide-react";
import QRCode from "qrcode";
import { useEffect } from "react";

interface Listing {
  id: number;
  title: string;
  description?: string;
  asset: string;
  asset_amount?: number;
  price_sats: number;
  currency: string;
  payment_method: string;
  receiving_address: string;
  seller_username: string;
  seller_id: number;
}

interface Props {
  listing: Listing;
  user: any;
  onClose: () => void;
  onOpenChat: (room: any) => void;
}

const ASSET_ICONS: Record<string, string> = {
  ETH: "⟠", BTC: "₿", USDT: "₮", EUR: "€", USD: "$",
  RSD: "дин", BAM: "KM", SOL: "◎", BNB: "⬡", ADA: "₳",
  XMR: "ɱ", TRX: "T", MATIC: "⬡", DOT: "●",
};

export default function PaymentModal({ listing, user, onClose, onOpenChat }: Props) {
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [qrDataUrl, setQrDataUrl]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]             = useState(false);
  const [chatOpening, setChatOpening] = useState(false);

  const addr = listing.receiving_address ?? "";
  const icon = ASSET_ICONS[listing.asset] ?? "🪙";

  useEffect(() => {
    if (!addr) return;
    QRCode.toDataURL(addr, { margin: 2, width: 220, color: { dark: "#000", light: "#fff" } })
      .then(setQrDataUrl).catch(() => {});
  }, [addr]);

  const copy = () => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  const markPaid = async () => {
    setSubmitting(true);
    try {
      const r = await fetch(`/api/market/listings/${listing.id}/buy`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markedPaid: true }),
      });
      const d = await r.json();
      if (d.room) { setDone(true); setTimeout(() => { onOpenChat(d.room); onClose(); }, 1200); }
    } catch {}
    setSubmitting(false);
  };

  const openChat = async () => {
    setChatOpening(true);
    try {
      const r = await fetch(`/api/market/listings/${listing.id}/contact`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const d = await r.json();
      if (d.room) { onOpenChat(d.room); onClose(); }
    } catch {}
    setChatOpening(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center"
         onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-neutral-100">
          <div className="w-11 h-11 rounded-2xl bg-neutral-900 flex items-center justify-center text-xl shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-black text-sm leading-tight">{listing.title}</p>
            <p className="text-[10px] text-neutral-400 mt-0.5">
              @{listing.seller_username} · {listing.payment_method}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-100">
            <X size={16} className="text-neutral-400"/>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {done ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check size={24} className="text-green-600"/>
              </div>
              <p className="font-extrabold text-black">Obavešteno prodavcu!</p>
              <p className="text-xs text-neutral-400 mt-1">Otvaramo chat za potvrdu…</p>
            </div>
          ) : (
            <>
              {/* Price summary */}
              <div className="flex items-center justify-between bg-neutral-50 rounded-2xl px-4 py-3">
                <div>
                  <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold mb-0.5">Plaćaš</p>
                  <p className="font-extrabold text-black text-lg">
                    ⚡ {Number(listing.price_sats).toLocaleString()} sats
                  </p>
                </div>
                <ArrowRight size={18} className="text-neutral-300"/>
                <div className="text-right">
                  <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold mb-0.5">Dobijaš</p>
                  <p className="font-extrabold text-black text-lg">
                    {listing.asset_amount ? `${listing.asset_amount} ` : ""}
                    <span>{icon} {listing.asset}</span>
                  </p>
                </div>
              </div>

              {listing.description && (
                <p className="text-xs text-neutral-500 leading-relaxed">{listing.description}</p>
              )}

              {addr ? (
                <>
                  <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                      Send to seller's address
                    </p>

                    {qrDataUrl && (
                      <div className="flex justify-center mb-3">
                        <div className="p-3 bg-white border-2 border-neutral-100 rounded-2xl">
                          <img src={qrDataUrl} alt="Address QR" className="w-48 h-48 rounded-xl"/>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 items-center bg-neutral-50 rounded-xl px-3 py-2.5 border border-neutral-100">
                      <span className="text-xs font-mono text-black flex-1 break-all leading-relaxed">{addr}</span>
                      <button onClick={copy}
                        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-neutral-200 active:scale-95 transition-transform">
                        {copiedAddr
                          ? <Check size={14} className="text-green-600"/>
                          : <Copy size={14} className="text-neutral-500"/>
                        }
                      </button>
                    </div>
                    {copiedAddr && <p className="text-[10px] text-green-600 font-bold mt-1 text-center">✓ Copied!</p>}
                  </div>

                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                    <AlertCircle size={13} className="text-amber-600 mt-0.5 shrink-0"/>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Nakon što pošalješ, klikni <strong>"Plaćeno"</strong> da obavestiš prodavca i otvoriš chat za potvrdu.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={markPaid} disabled={submitting}
                      className="flex-1 flex items-center justify-center gap-2 bg-black text-white font-extrabold py-3 rounded-xl text-sm active:scale-[0.98] transition-all disabled:opacity-50">
                      {submitting
                        ? <Loader2 size={15} className="animate-spin"/>
                        : <Check size={15}/>
                      }
                      {submitting ? "Šaljem…" : "Plaćeno — otvori chat"}
                    </button>
                  </div>
                </>
              ) : (
                /* No address — just contact seller */
                <div className="bg-neutral-50 rounded-2xl p-4 text-center">
                  <p className="text-sm text-neutral-600 mb-3">
                    Prodavac nije ostavio adresu. Kontaktiraj ga u chatu radi plaćanja.
                  </p>
                  <button onClick={openChat} disabled={chatOpening}
                    className="flex items-center gap-2 mx-auto bg-black text-white font-extrabold px-5 py-2.5 rounded-xl text-sm">
                    {chatOpening ? <Loader2 size={14} className="animate-spin"/> : <MessageSquare size={14}/>}
                    Kontaktiraj prodavca
                  </button>
                </div>
              )}

              <button onClick={openChat} disabled={chatOpening}
                className="w-full flex items-center justify-center gap-2 border border-neutral-200 text-neutral-600 font-bold py-2.5 rounded-xl text-xs active:scale-[0.98] transition-all">
                {chatOpening ? <Loader2 size={13} className="animate-spin"/> : <MessageSquare size={13}/>}
                Pitaj prodavca pre plaćanja
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
