import { useEffect, useState } from "react";
import { Plus, X, RefreshCw, MessageSquare, Tag } from "lucide-react";
import SwapPanel from "./SwapPanel";

interface Props {
  user: any;
  onBuy: (listingId: number) => Promise<void>;
  onClose: () => void;
  onContactRoom: (room: any) => void;
}

const CURRENCIES = ["EUR", "USD", "RSD", "BAM", "BTC", "USDT"];

export default function MarketTab({ user, onBuy, onClose, onContactRoom }: Props) {
  const [mTab, setMTab]           = useState<"vbc" | "swap">("vbc");
  const [listings, setListings]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [creating, setCreating]   = useState(false);
  const [contacting, setContacting] = useState<number | null>(null);
  const [form, setForm]           = useState({
    title: "", description: "", priceSats: "",
    currency: "EUR", paymentMethod: "Lightning",
  });
  const [formErr, setFormErr]     = useState("");

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
    if (!sats || sats < 1) return setFormErr("Enter price in sats");
    try {
      const r = await fetch("/api/market/listings", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          priceSats: sats,
          currency: form.currency,
          paymentMethod: form.paymentMethod,
        }),
      });
      if (!r.ok) throw new Error("failed");
      setCreating(false);
      setForm({ title: "", description: "", priceSats: "", currency: "EUR", paymentMethod: "Lightning" });
      loadListings();
    } catch { setFormErr("Could not create listing"); }
  };

  const contactSeller = async (listingId: number) => {
    setContacting(listingId);
    try {
      const d = await fetch(`/api/market/listings/${listingId}/contact`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
      }).then(r => r.json());
      if (d.room) onContactRoom(d.room);
    } catch { }
    finally { setContacting(null); }
  };

  const cancelListing = async (id: number) => {
    await fetch(`/api/market/listings/${id}`, { method: "DELETE", credentials: "include" });
    loadListings();
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
            <div className="bg-white border-b border-neutral-100 p-4 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <span className="font-extrabold text-black text-sm">New Listing</span>
                <button onClick={() => setCreating(false)}>
                  <X size={16} className="text-neutral-400"/>
                </button>
              </div>
              <div className="space-y-2">
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Title (e.g. Selling 50 EUR for sats)"
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-black"
                />
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Description (optional)"
                  rows={2}
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-black resize-none"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={form.priceSats}
                    onChange={e => setForm(f => ({ ...f, priceSats: e.target.value }))}
                    placeholder="Price in sats"
                    className="flex-1 border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                  <select
                    value={form.currency}
                    onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                    className="border border-neutral-200 rounded-xl px-2 py-2.5 text-sm outline-none bg-white"
                  >
                    {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <input
                  value={form.paymentMethod}
                  onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                  placeholder="Payment method (e.g. Lightning, Bank transfer)"
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-black"
                />
                {formErr && <p className="text-red-500 text-xs">{formErr}</p>}
                <button
                  onClick={createListing}
                  className="w-full bg-black text-white font-extrabold py-3 rounded-xl text-sm active:scale-[0.98] transition-transform"
                >
                  Post Listing
                </button>
              </div>
            </div>
          )}

          {/* Toolbar */}
          {!creating && (
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-100 shrink-0">
              <span className="text-xs font-bold text-neutral-400">
                {listings.length} active listing{listings.length !== 1 ? "s" : ""}
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
                  <Plus size={13}/> Sell
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
                  Be the first — post a listing to sell crypto or services for sats
                </p>
                <button
                  onClick={() => setCreating(true)}
                  className="bg-black text-white font-extrabold px-5 py-2.5 rounded-xl text-sm active:scale-95 transition-transform"
                >
                  <Plus size={14} className="inline mr-1.5 -mt-0.5"/>Post Listing
                </button>
              </div>
            )}

            {!loading && listings.map((l: any) => (
              <div key={l.id} className="bg-white mx-4 mt-3 rounded-2xl border border-neutral-100 p-4">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="font-extrabold text-black text-sm flex-1">{l.title}</p>
                  <span className="text-[10px] font-bold text-neutral-500 border border-neutral-200 rounded-full px-2 py-0.5 shrink-0">
                    {l.currency}
                  </span>
                </div>
                {l.description && (
                  <p className="text-xs text-neutral-500 mb-2 leading-relaxed">{l.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-extrabold text-base">
                      <span className="text-[#F7931A]">⚡</span>
                      {Number(l.price_sats).toLocaleString()}
                      <span className="text-xs text-neutral-400 font-semibold ml-1">sats</span>
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      via {l.payment_method} · @{l.seller_username}
                    </p>
                  </div>
                  {l.seller_id === user.id ? (
                    <button
                      onClick={() => cancelListing(l.id)}
                      className="text-xs font-bold text-red-400 border border-red-100 px-3 py-1.5 rounded-xl active:scale-95 transition-transform"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      onClick={() => contactSeller(l.id)}
                      disabled={contacting === l.id}
                      className="flex items-center gap-1.5 bg-black text-white text-xs font-extrabold px-3 py-2 rounded-xl active:scale-95 transition-transform disabled:opacity-50"
                    >
                      {contacting === l.id
                        ? <RefreshCw size={12} className="animate-spin"/>
                        : <MessageSquare size={12}/>
                      }
                      {contacting === l.id ? "Opening…" : "Contact"}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="h-6"/>
          </div>
        </div>
      )}
    </div>
  );
}
