import { useEffect, useState } from "react";
import { Plus, X, RefreshCw, Tag, TrendingUp, TrendingDown } from "lucide-react";
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
  RSD: "Cash / bank", BAM: "Cash / bank",
  SOL: "SOL Wallet", BNB: "BSC Wallet", ADA: "Cardano Wallet",
  XMR: "Monero Wallet", TRX: "TRON Wallet", MATIC: "Polygon Wallet", DOT: "Polkadot Wallet",
};

const DEFAULT_FORM = {
  listingType: "sell" as "sell" | "buy",
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
    if (!form.title.trim()) return setFormErr("Title is required");
    const sats = parseInt(form.priceSats);
    if (!sats || sats < 1) return setFormErr("Enter a price in sats (minimum 1)");
    if (!form.receivingAddress.trim()) return setFormErr("Enter your receiving address so buyers can send funds");
    setSubmitting(true);
    try {
      const autoTitle = form.title.trim() ||
        `${form.listingType === "sell" ? "Selling" : "Buying"} ${form.assetAmount || ""} ${form.asset}`;
      const r = await fetch("/api/market/listings", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: autoTitle,
          description: form.description.trim(),
          priceSats: sats,
          currency: form.asset,
          paymentMethod,
          asset: form.asset,
          assetAmount: form.assetAmount ? parseFloat(form.assetAmount) : null,
          receivingAddress: form.receivingAddress.trim(),
          listingType: form.listingType,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to post listing");
      setCreating(false);
      setForm(DEFAULT_FORM);
      loadListings();
    } catch (e: any) {
      setFormErr(e.message || "Failed to post listing — try again");
    }
    setSubmitting(false);
  };

  const cancelListing = async (id: number) => {
    setCancelling(id);
    await fetch(`/api/market/listings/${id}`, { method: "DELETE", credentials: "include" });
    loadListings();
    setCancelling(null);
  };

  const assetIcon = (asset: string) => ASSET_ICONS[asset] ?? "🪙";

  const handleContact = async (listingId: number) => {
    try {
      const d = await fetch(`/api/market/listings/${listingId}/contact`, {
        method: "POST", credentials: "include",
      }).then(r => r.json());
      if (d.room) onContactRoom(d.room);
    } catch {}
  };

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
            <div className="bg-white border-b border-neutral-100 p-4 shrink-0 overflow-y-auto max-h-[80vh]">
              <div className="flex items-center justify-between mb-4">
                <span className="font-extrabold text-black text-sm">New Listing</span>
                <button onClick={() => { setCreating(false); setForm(DEFAULT_FORM); setFormErr(""); }}>
                  <X size={16} className="text-neutral-400"/>
                </button>
              </div>

              <div className="space-y-3">
                {/* Buy or Sell type */}
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">I want to…</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setForm(f => ({ ...f, listingType: "sell" }))}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-extrabold transition-all ${
                        form.listingType === "sell"
                          ? "bg-black text-white border-black"
                          : "bg-white text-neutral-600 border-neutral-200"
                      }`}
                    >
                      <TrendingDown size={14}/> SELL
                    </button>
                    <button
                      onClick={() => setForm(f => ({ ...f, listingType: "buy" }))}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-extrabold transition-all ${
                        form.listingType === "buy"
                          ? "bg-[#F7931A] text-white border-[#F7931A]"
                          : "bg-white text-neutral-600 border-neutral-200"
                      }`}
                    >
                      <TrendingUp size={14}/> BUY
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">
                    {form.listingType === "sell"
                      ? "You are selling crypto/assets — buyer pays you in sats."
                      : "You want to buy crypto/assets — you pay in sats."}
                  </p>
                </div>

                {/* Asset selector */}
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                    {form.listingType === "sell" ? "What are you selling?" : "What do you want to buy?"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ASSETS.map(a => (
                      <button
                        key={a}
                        onClick={() => setForm(f => ({ ...f, asset: a }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                          form.asset === a ? "bg-black text-white" : "bg-neutral-100 text-neutral-600"
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
                    Amount of {form.asset} (optional)
                  </p>
                  <input
                    type="number" step="any"
                    value={form.assetAmount}
                    onChange={e => setForm(f => ({ ...f, assetAmount: e.target.value }))}
                    placeholder={`e.g. 0.1 (${form.asset})`}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                {/* Price in sats */}
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Price in sats ⚡
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F7931A] font-extrabold text-sm">⚡</span>
                    <input
                      type="number"
                      value={form.priceSats}
                      onChange={e => setForm(f => ({ ...f, priceSats: e.target.value }))}
                      placeholder="e.g. 50000 sats"
                      className="w-full border border-neutral-200 rounded-xl pl-8 pr-3 py-2.5 text-sm outline-none focus:border-black"
                    />
                  </div>
                </div>

                {/* Receiving address */}
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                    {form.listingType === "sell"
                      ? `Your ${form.asset} address (buyer sends here)`
                      : `Your Lightning address / IBAN (you receive sats here)`}
                  </p>
                  <textarea
                    value={form.receivingAddress}
                    onChange={e => setForm(f => ({ ...f, receivingAddress: e.target.value }))}
                    placeholder={
                      form.asset === "EUR" || form.asset === "USD" || form.asset === "RSD" || form.asset === "BAM"
                        ? "IBAN / bank account number"
                        : `${form.asset} wallet address`
                    }
                    rows={2}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-black resize-none font-mono"
                  />
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    Buyer will see this address with a QR code.
                  </p>
                </div>

                {/* Title */}
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Listing Title</p>
                  <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder={`e.g. ${form.listingType === "sell" ? "Selling" : "Buying"} ${form.assetAmount || "0.1"} ${form.asset}`}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                {/* Description */}
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Notes (optional) — terms, delivery time…"
                  rows={2}
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-black resize-none"
                />

                {formErr && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 font-bold">
                    ⚠ {formErr}
                  </div>
                )}

                <button
                  onClick={createListing}
                  disabled={submitting}
                  className="w-full bg-black text-white font-extrabold py-3 rounded-xl text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  {submitting ? "Posting…" : "Post Listing"}
                </button>
              </div>
            </div>
          )}

          {/* Toolbar */}
          {!creating && (
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-100 shrink-0">
              <span className="text-xs font-bold text-neutral-400">
                {listings.length} listing{listings.length !== 1 ? "s" : ""}
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
                  <Plus size={13}/> Post Ad
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
                  <p className="text-xs text-neutral-400">Loading listings…</p>
                </div>
              </div>
            )}

            {!loading && listings.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                  <Tag size={22} className="text-neutral-300"/>
                </div>
                <p className="font-extrabold text-neutral-700 mb-1">No listings yet</p>
                <p className="text-sm text-neutral-400 mb-5">
                  Be the first — buy or sell crypto for sats
                </p>
                <button
                  onClick={() => setCreating(true)}
                  className="bg-black text-white font-extrabold px-5 py-2.5 rounded-xl text-sm active:scale-95 transition-transform"
                >
                  <Plus size={14} className="inline mr-1.5 -mt-0.5"/> Post Listing
                </button>
              </div>
            )}

            {!loading && listings.map((l: any) => {
              const isOwn = l.seller_id === user.id;
              const icon  = assetIcon(l.asset ?? l.currency);
              const isBuy = l.listing_type === "buy";
              return (
                <div key={l.id} className="bg-white mx-4 mt-3 rounded-2xl border border-neutral-100 p-4 shadow-sm">
                  {/* Type badge + asset + title */}
                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center text-sm shrink-0">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                          isBuy ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                        }`}>
                          {isBuy ? "BUYING" : "SELLING"}
                        </span>
                        <span className="text-[10px] text-neutral-400">@{l.seller_username}</span>
                      </div>
                      <p className="font-extrabold text-black text-sm leading-tight truncate">{l.title}</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">{l.payment_method ?? ""}</p>
                    </div>
                  </div>

                  {l.description && (
                    <p className="text-xs text-neutral-500 mb-2 leading-relaxed">{l.description}</p>
                  )}

                  {/* Price + amount */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-[#F7931A] font-extrabold text-base">
                        ⚡ {Number(l.price_sats).toLocaleString()} sats
                      </span>
                      {l.asset_amount && (
                        <span className="ml-2 text-xs text-neutral-500">
                          for {l.asset_amount} {l.asset ?? l.currency}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {isOwn ? (
                    <button
                      onClick={() => cancelListing(l.id)}
                      disabled={cancelling === l.id}
                      className="w-full border border-red-200 text-red-500 text-xs font-bold py-2 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {cancelling === l.id ? "Removing…" : "Remove Listing"}
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBuyTarget(l)}
                        className="flex-1 bg-black text-white text-xs font-extrabold py-2.5 rounded-xl active:scale-[0.98] transition-transform"
                      >
                        {isBuy ? "Contact Buyer" : "Buy with ⚡ sats"}
                      </button>
                      <button
                        onClick={() => handleContact(l.id)}
                        className="px-3 py-2.5 border border-neutral-200 text-neutral-600 text-xs font-bold rounded-xl hover:border-black transition-colors"
                      >
                        Chat
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="h-4"/>
          </div>
        </div>
      )}

      {buyTarget && (
        <PaymentModal
          listing={buyTarget}
          onClose={() => setBuyTarget(null)}
          onPaid={() => { setBuyTarget(null); loadListings(); }}
        />
      )}
    </div>
  );
}
