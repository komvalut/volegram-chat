import { useEffect, useState } from "react";
import { Plus, X, RefreshCw, ShoppingCart, Tag, ChevronDown } from "lucide-react";
import SwapPanel from "./SwapPanel";
import PaymentModal from "./PaymentModal";

interface Props {
  user: any;
  onBuy: (listingId: number) => Promise<void>;
  onClose: () => void;
  onContactRoom: (room: any) => void;
}

const ASSETS = ["BTC", "ETH", "USDT", "EUR", "USD", "RSD", "BAM", "SOL", "BNB", "ADA", "XMR", "TRX", "MATIC", "DOT"];
const ASSET_ICONS: Record<string, string> = {
  ETH: "⟠", BTC: "₿", USDT: "₮", EUR: "€", USD: "$",
  RSD: "дин", BAM: "KM", SOL: "◎", BNB: "⬡", ADA: "₳",
  XMR: "ɱ", TRX: "T", MATIC: "⬡", DOT: "●",
};
const PAYMENT_METHODS: Record<string, string> = {
  ETH: "ETH Wallet", BTC: "On-chain BTC", USDT: "USDT (TRC20/ERC20)",
  EUR: "IBAN / bank transfer", USD: "IBAN / bank transfer",
  RSD: "Gotovina / banka", BAM: "Gotovina / banka",
  SOL: "SOL Wallet", BNB: "BSC Wallet", ADA: "Cardano Wallet",
  XMR: "Monero Wallet", TRX: "TRON Wallet", MATIC: "Polygon Wallet", DOT: "Polkadot Wallet",
};

const DEFAULT_FORM = {
  title: "", description: "",
  asset: "ETH", assetAmount: "",
  priceSats: "", receivingAddress: "",
};

export default function MarketTab({ user, onBuy, onClose, onContactRoom }: Props) {
  const [mTab, setMTab]           = useState<"vbc" | "swap">("vbc");
  const [listings, setListings]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [creating, setCreating]   = useState(false);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [form, setForm]           = useState(DEFAULT_FORM);
  const [formErr, setFormErr]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [buyTarget, setBuyTarget] = useState<any | null>(null);

  const paymentMethod = PAYMENT_METHODS[form.asset] ?? "Wallet / transfer";

  const loadListings = async () => {
    setLoading(true);
    try {
      const d = await fetch("/api/market/listings", { credentials: "include" }).then(r => r.json());
      setListings(d.listings ?? []);
    } catch { setListings([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (mTab === "vbc") loadListings(); }, [mTab]);

  const createListing = async () => {
    setFormErr("");
    if (!form.title.trim()) return setFormErr("Naslov je obavezan");
    const sats = parseInt(form.priceSats);
    if (!sats || sats < 1) return setFormErr("Unesi cenu u satošima");
    if (!form.receivingAddress.trim()) return setFormErr("Unesi adresu primanja (gde kupac šalje)");
    setSubmitting(true);
    try {
      const r = await fetch("/api/market/listings", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          priceSats: sats,
          currency: form.asset,
          paymentMethod,
          asset: form.asset,
          assetAmount: form.assetAmount ? parseFloat(form.assetAmount) : null,
          receivingAddress: form.receivingAddress.trim(),
        }),
      });
      if (!r.ok) throw new Error("failed");
      setCreating(false);
      setForm(DEFAULT_FORM);
      loadListings();
    } catch { setFormErr("Greška pri postavljanju oglasa"); }
    setSubmitting(false);
  };

  const cancelListing = async (id: number) => {
    setCancelling(id);
    await fetch(`/api/market/listings/${id}`, { method: "DELETE", credentials: "include" });
    loadListings();
    setCancelling(null);
  };

  const assetIcon = (asset: string) => ASSET_ICONS[asset] ?? "🪙";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Sub-tab switcher */}
      <div className="flex border-b border-neutral-100 bg-white shrink-0">
        <button onClick={() => setMTab("vbc")}
          className={`flex-1 py-2.5 text-[12px] font-extrabold transition-colors ${
            mTab === "vbc" ? "text-[#F7931A] border-b-2 border-[#F7931A]" : "text-neutral-400"
          }`}>
          VBC P2P Market
        </button>
        <button onClick={() => setMTab("swap")}
          className={`flex-1 py-2.5 text-[12px] font-extrabold transition-colors ${
            mTab === "swap" ? "text-[#F7931A] border-b-2 border-[#F7931A]" : "text-neutral-400"
          }`}>
          MicroSwap
        </button>
      </div>

      {mTab === "swap" ? (
        <div className="flex-1 overflow-hidden">
          <SwapPanel onBuy={onBuy} onClose={onClose}/>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 bg-[#f8f8f8]">

          {/* Create listing form */}
          {creating && (
            <div className="bg-white border-b border-neutral-100 p-4 shrink-0 overflow-y-auto max-h-[75vh]">
              <div className="flex items-center justify-between mb-4">
                <span className="font-extrabold text-black text-sm">Novi oglas</span>
                <button onClick={() => { setCreating(false); setForm(DEFAULT_FORM); setFormErr(""); }}>
                  <X size={16} className="text-neutral-400"/>
                </button>
              </div>
              <div className="space-y-3">
                {/* Asset selector */}
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Šta prodaješ?</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ASSETS.map(a => (
                      <button
                        key={a}
                        onClick={() => setForm(f => ({ ...f, asset: a }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                          form.asset === a
                            ? "bg-black text-white"
                            : "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        {assetIcon(a)} {a}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Asset amount */}
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Koliko {form.asset} prodaješ? (opciono)
                  </p>
                  <input
                    type="number" step="any"
                    value={form.assetAmount}
                    onChange={e => setForm(f => ({ ...f, assetAmount: e.target.value }))}
                    placeholder={`npr. 0.1 (${form.asset})`}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                {/* Price in sats */}
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Cena u satošima (šta kupac plaća tebi)
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F7931A] font-extrabold text-sm">⚡</span>
                    <input
                      type="number"
                      value={form.priceSats}
                      onChange={e => setForm(f => ({ ...f, priceSats: e.target.value }))}
                      placeholder="npr. 50000 sats"
                      className="w-full border border-neutral-200 rounded-xl pl-8 pr-3 py-2.5 text-sm outline-none focus:border-black"
                    />
                  </div>
                </div>

                {/* Receiving address */}
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Tvoja adresa primanja ({paymentMethod})
                  </p>
                  <textarea
                    value={form.receivingAddress}
                    onChange={e => setForm(f => ({ ...f, receivingAddress: e.target.value }))}
                    placeholder={
                      form.asset === "EUR" || form.asset === "USD" || form.asset === "RSD" || form.asset === "BAM"
                        ? "IBAN / broj računa"
                        : `${form.asset} wallet adresa`
                    }
                    rows={2}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-black resize-none font-mono"
                  />
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    Kupac će videti ovu adresu sa QR kodom
                  </p>
                </div>

                {/* Title */}
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Naslov oglasa</p>
                  <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder={`npr. Prodajem ${form.assetAmount || "0.1"} ${form.asset} za sate`}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                {/* Description */}
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Napomena (opciono) — uslovi, rokovi isporuke…"
                  rows={2}
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-black resize-none"
                />

                {formErr && <p className="text-red-500 text-xs font-bold">{formErr}</p>}

                <button
                  onClick={createListing}
                  disabled={submitting}
                  className="w-full bg-black text-white font-extrabold py-3 rounded-xl text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  {submitting ? "Postavljam…" : "Postavi oglas"}
                </button>
              </div>
            </div>
          )}

          {/* Toolbar */}
          {!creating && (
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-100 shrink-0">
              <span className="text-xs font-bold text-neutral-400">
                {listings.length} oglas{listings.length === 1 ? "" : listings.length >= 2 && listings.length <= 4 ? "a" : "a"}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={loadListings}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-neutral-100 active:scale-95 transition-transform"
                >
                  <RefreshCw size={14} className={loading ? "animate-spin text-neutral-400" : "text-neutral-500"}/>
                </button>
                <button
                  onClick={() => setCreating(true)}
                  className="flex items-center gap-1.5 bg-black text-white text-xs font-extrabold px-3 py-2 rounded-xl active:scale-95 transition-transform"
                >
                  <Plus size={13}/> Prodaj
                </button>
              </div>
            </div>
          )}

          {/* Listings */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <RefreshCw size={22} className="animate-spin text-neutral-300 mx-auto mb-2"/>
                  <p className="text-xs text-neutral-400">Učitavam oglase…</p>
                </div>
              </div>
            )}

            {!loading && listings.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                  <Tag size={22} className="text-neutral-300"/>
                </div>
                <p className="font-extrabold text-neutral-700 mb-1">Nema oglasa</p>
                <p className="text-sm text-neutral-400 mb-5">
                  Budi prvi — prodaj kripto ili valute za sate
                </p>
                <button
                  onClick={() => setCreating(true)}
                  className="bg-black text-white font-extrabold px-5 py-2.5 rounded-xl text-sm active:scale-95 transition-transform"
                >
                  <Plus size={14} className="inline mr-1.5 -mt-0.5"/>Postavi oglas
                </button>
              </div>
            )}

            {!loading && listings.map((l: any) => {
              const isOwn = l.seller_id === user.id;
              const icon  = assetIcon(l.asset ?? l.currency);
              return (
                <div key={l.id} className="bg-white mx-4 mt-3 rounded-2xl border border-neutral-100 p-4">
                  {/* Asset badge + title */}
                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center text-sm shrink-0">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-black text-sm leading-tight truncate">{l.title}</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        @{l.seller_username} · {l.payment_method ?? ""}
                      </p>
                    </div>
                  </div>

                  {l.description && (
                    <p className="text-xs text-neutral-500 mb-2 leading-relaxed">{l.description}</p>
                  )}

                  {/* Price row */}
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      {l.asset_amount && (
                        <p className="text-[10px] text-neutral-400 font-bold mb-0.5">
                          {l.asset_amount} {l.asset ?? l.currency}
                        </p>
                      )}
                      <p className="font-extrabold text-base">
                        <span className="text-[#F7931A]">⚡</span>
                        {Number(l.price_sats).toLocaleString()}
                        <span className="text-xs text-neutral-400 font-semibold ml-1">sats</span>
                      </p>
                    </div>

                    {isOwn ? (
                      <button
                        onClick={() => cancelListing(l.id)}
                        disabled={cancelling === l.id}
                        className="text-xs font-bold text-red-400 border border-red-100 px-3 py-1.5 rounded-xl active:scale-95 transition-transform disabled:opacity-50"
                      >
                        {cancelling === l.id ? "…" : "Otkaži"}
                      </button>
                    ) : (
                      <button
                        onClick={() => setBuyTarget(l)}
                        className="flex items-center gap-1.5 bg-[#F7931A] text-white text-xs font-extrabold px-4 py-2 rounded-xl active:scale-95 transition-transform shadow-sm"
                      >
                        <ShoppingCart size={13}/> Kupi
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="h-6"/>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {buyTarget && (
        <PaymentModal
          listing={buyTarget}
          user={user}
          onClose={() => setBuyTarget(null)}
          onOpenChat={room => { onContactRoom(room); setBuyTarget(null); }}
        />
      )}
    </div>
  );
}
