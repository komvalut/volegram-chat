import { useEffect, useState } from "react";
import { Search, Zap, ShoppingCart, X, ExternalLink, RefreshCw } from "lucide-react";

interface Props {
  onBuy: (listingId: number) => Promise<void>;
  onClose: () => void;
}

const CATEGORIES = [
  "All", "Bitcoin", "Lightning", "Ethereum", "Stablecoins",
  "Altcoins", "NFTs", "Privacy", "DeFi", "Memes",
];

export default function SwapPanel({ onBuy, onClose }: Props) {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState("");
  const [cat, setCat]           = useState("All");
  const [buying, setBuying]     = useState<number | null>(null);
  const [bought, setBought]     = useState<number | null>(null);
  const [err, setErr]           = useState("");

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const qs = new URLSearchParams();
      if (cat !== "All") qs.set("category", cat);
      if (search) qs.set("search", search);
      const r = await fetch(`/api/swap/listings${qs.toString() ? "?" + qs : ""}`, { credentials: "include" });
      if (!r.ok) throw new Error("unavailable");
      const d = await r.json();
      setListings(Array.isArray(d) ? d : d.listings ?? []);
    } catch {
      setErr("Cannot reach MICROSWAP — try again");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [cat]);

  const handleBuy = async (id: number) => {
    setBuying(id); setErr("");
    try {
      await onBuy(id);
      setBought(id);
      setTimeout(() => setBought(null), 3000);
    } catch {
      setErr("Buy failed — try again");
    } finally { setBuying(null); }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-neutral-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-200 flex items-center gap-3">
        <Zap size={14} className="text-black"/>
        <div className="flex-1">
          <p className="text-xs font-black uppercase tracking-widest text-black">MICROSWAP</p>
          <p className="text-xs text-neutral-500">P2P market — buy without leaving chat</p>
        </div>
        <button onClick={load} className="text-neutral-500 hover:text-black transition-colors">
          <RefreshCw size={12}/>
        </button>
        <button onClick={onClose} className="text-neutral-500 hover:text-black transition-colors">
          <X size={14}/>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-neutral-200">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500"/>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load()}
            placeholder="Search listings…"
            className="w-full bg-neutral-50 border border-neutral-200 text-black text-xs pl-8 pr-3 py-1.5 outline-none focus:border-black font-mono"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-1 px-3 py-2 overflow-x-auto border-b border-neutral-200 scrollbar-none">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)}
            className={`shrink-0 text-xs px-2.5 py-1 font-bold uppercase tracking-wider border transition-colors
              ${cat === c ? "border-black text-black bg-black/5" : "border-neutral-200 text-neutral-600 hover:border-black/25"}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Listings */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <span className="text-black text-xs animate-pulse">Loading MICROSWAP…</span>
          </div>
        )}

        {err && (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-red-500 mb-2">{err}</p>
            <button onClick={load} className="text-xs text-black hover:underline">Retry</button>
          </div>
        )}

        {!loading && !err && listings.length === 0 && (
          <div className="px-4 py-10 text-center text-xs text-neutral-500">No listings found.</div>
        )}

        {!loading && listings.map(l => (
          <div key={l.id} className="px-3 py-3 border-b border-neutral-100 hover:bg-black/2 transition-colors">
            <div className="flex items-start gap-2">
              {l.imageUrl && (
                <img src={l.imageUrl} alt="" className="w-10 h-10 object-cover border border-neutral-200 shrink-0"/>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-black truncate">{l.title}</p>
                <p className="text-xs text-neutral-600 truncate mt-0.5">{l.description?.slice(0, 60)}{l.description?.length > 60 ? "…" : ""}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-black text-xs font-black">⚡{(l.priceSats ?? l.price_sats ?? 0).toLocaleString()}</span>
                  <span className="text-xs text-neutral-500">sats</span>
                  {l.category && (
                    <span className="text-xs bg-black/5 text-neutral-600 px-1.5 py-0.5">{l.category}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-1.5 mt-2">
              <button
                onClick={() => handleBuy(l.id)}
                disabled={buying === l.id}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-black py-1.5 transition-colors
                  ${bought === l.id
                    ? "bg-green-700 text-white"
                    : "bg-black text-white hover:bg-neutral-800 disabled:opacity-40"}`}
              >
                {buying === l.id ? (
                  <span className="animate-pulse">OPENING CHAT…</span>
                ) : bought === l.id ? (
                  "✓ INVOICE IN CHAT"
                ) : (
                  <><ShoppingCart size={10}/>BUY IN CHAT</>
                )}
              </button>
              <a href={`#listing-${l.id}`} target="_blank" rel="noreferrer"
                className="px-2 py-1.5 border border-neutral-200 text-neutral-600 hover:text-black hover:border-black/25 transition-colors">
                <ExternalLink size={10}/>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
