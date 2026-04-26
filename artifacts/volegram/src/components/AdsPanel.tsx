import { useEffect, useState } from "react";
import { X, Megaphone, Plus, Clock, Check, ExternalLink, Loader, ChevronRight, AlertCircle } from "lucide-react";
import { api, uploadFile } from "../lib/api";

interface Ad {
  id: number;
  title: string;
  description: string;
  contact: string | null;
  link: string | null;
  image_url: string | null;
  status: string;
  paid_sats: number;
  duration_days: number;
  expires_at: string;
  created_at: string;
  poster_username?: string;
}

const DURATION_OPTIONS = [
  { days: 1,  label: "1 dan",    mult: 1   },
  { days: 7,  label: "7 dana",   mult: 7   },
  { days: 30, label: "30 dana",  mult: 30  },
];

export default function AdsPanel({ user, onClose }: { user: any; onClose: () => void }) {
  const [tab, setTab]           = useState<"browse"|"create"|"mine">("browse");
  const [ads, setAds]           = useState<Ad[]>([]);
  const [myAds, setMyAds]       = useState<Ad[]>([]);
  const [pricePerDay, setPpd]   = useState(1000);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubm]   = useState(false);
  const [success, setSuccess]   = useState("");
  const [error, setError]       = useState("");

  // Create form
  const [title, setTitle]       = useState("");
  const [desc, setDesc]         = useState("");
  const [contact, setContact]   = useState("");
  const [link, setLink]         = useState("");
  const [imgUrl, setImgUrl]     = useState("");
  const [imgPrev, setImgPrev]   = useState("");
  const [days, setDays]         = useState(7);

  const totalCost = pricePerDay * days;

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [a, p] = await Promise.all([api.ads.list(), api.ads.pricing()]);
      setAds(a.ads ?? []);
      setPpd(p.price_per_day ?? 1000);
      if (user) {
        const m = await api.ads.mine().catch(() => ({ ads: [] }));
        setMyAds(m.ads ?? []);
      }
    } catch {}
    setLoading(false);
  };

  const handleImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setImgPrev(URL.createObjectURL(f));
    const url = await uploadFile(f).catch(() => "");
    setImgUrl(url);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !desc.trim()) { setError("Title and description required"); return; }
    if ((user.sats_balance ?? 0) < totalCost) {
      setError(`Insufficient balance. Need ${totalCost.toLocaleString()} sats.`);
      return;
    }
    setSubm(true); setError("");
    try {
      await api.ads.create({ title, description: desc, contact, link, image_url: imgUrl, duration_days: days });
      setSuccess("Ad submitted! Admin will review and activate it shortly.");
      setTitle(""); setDesc(""); setContact(""); setLink(""); setImgUrl(""); setImgPrev(""); setDays(7);
      loadAll();
      setTimeout(() => { setTab("mine"); setSuccess(""); }, 2000);
    } catch (err: any) {
      setError(err.message || "Submission failed");
    } finally { setSubm(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
         onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[92vh] shadow-2xl">

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center">
              <Megaphone size={18} className="text-[#F7931A]"/>
            </div>
            <div>
              <h2 className="font-extrabold text-black text-[15px]">VBC Oglasi</h2>
              <p className="text-[10px] text-neutral-400">Plati satsima · Admin aktivira</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-100">
            <X size={16} className="text-neutral-400"/>
          </button>
        </div>

        {/* Price bar */}
        <div className="px-5 py-2 bg-black flex items-center justify-between shrink-0">
          <span className="text-[11px] text-white/50 font-bold uppercase tracking-wider">Cena oglasa</span>
          <span className="text-sm font-extrabold text-[#F7931A]">⚡ {pricePerDay.toLocaleString()} sats/dan</span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-100 shrink-0 px-1">
          {[
            { k: "browse", label: "Svi oglasi" },
            { k: "create", label: "Postavi oglas" },
            { k: "mine",   label: "Moji oglasi" },
          ].map(t => (
            <button key={t.k} onClick={() => { setTab(t.k as any); setError(""); setSuccess(""); }}
              className={`flex-1 py-3 text-xs font-bold transition-colors ${
                tab === t.k ? "text-black border-b-2 border-black" : "text-neutral-400"
              }`}>{t.label}</button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader size={22} className="animate-spin text-neutral-300"/>
            </div>
          ) : null}

          {/* ── Browse ── */}
          {!loading && tab === "browse" && (
            <div className="px-4 py-3 space-y-3 pb-6">
              {ads.length === 0 ? (
                <div className="text-center py-12">
                  <Megaphone size={28} className="text-neutral-200 mx-auto mb-3"/>
                  <p className="text-sm text-neutral-400">Nema aktivnih oglasa</p>
                  <p className="text-[10px] text-neutral-300 mt-1">Budi prvi — postavi oglas za 1000 sats/dan</p>
                  <button onClick={() => setTab("create")}
                    className="mt-3 text-xs font-bold px-4 py-2 rounded-xl bg-black text-white hover:bg-neutral-800">
                    Postavi oglas
                  </button>
                </div>
              ) : ads.map(ad => <AdCard key={ad.id} ad={ad}/>)}
            </div>
          )}

          {/* ── Create ── */}
          {tab === "create" && (
            <form onSubmit={handleCreate} className="px-4 py-4 space-y-3 pb-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle size={13} className="mt-0.5 shrink-0"/>
                <span>Tvoje stanje: ⚡ <strong>{(user.sats_balance ?? 0).toLocaleString()}</strong> sats · Oglas ide na pregled admin-a pre aktivacije.</span>
              </div>

              {error && <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
              {success && (
                <div className="rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800 flex items-center gap-2">
                  <Check size={14}/> {success}
                </div>
              )}

              <div>
                <label className="field-label">Naslov <span className="text-neutral-300">({title.length}/80)</span></label>
                <input value={title} onChange={e => setTitle(e.target.value.slice(0,80))}
                  placeholder="Prodajem laptop, nudim usluge, tražim saradnike…"
                  className="input-modern text-sm w-full"/>
              </div>
              <div>
                <label className="field-label">Opis <span className="text-neutral-300">({desc.length}/300)</span></label>
                <textarea value={desc} onChange={e => setDesc(e.target.value.slice(0,300))}
                  rows={3} placeholder="Detalji oglasa…"
                  className="input-modern text-sm w-full resize-none"/>
              </div>
              <div>
                <label className="field-label">Kontakt (WhatsApp/Telegram/email — opciono)</label>
                <input value={contact} onChange={e => setContact(e.target.value)}
                  placeholder="+381 60 000 0000 ili @username"
                  className="input-modern text-sm w-full"/>
              </div>
              <div>
                <label className="field-label">Link (opciono)</label>
                <input value={link} onChange={e => setLink(e.target.value)} type="url"
                  placeholder="https://…" className="input-modern text-sm w-full"/>
              </div>

              {/* Image */}
              <div>
                <label className="field-label">Slika (opciono)</label>
                <label className="block cursor-pointer">
                  {imgPrev ? (
                    <img src={imgPrev} alt="" className="w-full h-32 object-cover rounded-xl border border-neutral-200"/>
                  ) : (
                    <div className="w-full h-24 border-2 border-dashed border-neutral-200 rounded-xl flex items-center justify-center text-neutral-400 text-xs">
                      Tapni da dodaš sliku
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImg}/>
                </label>
              </div>

              {/* Duration */}
              <div>
                <label className="field-label">Trajanje</label>
                <div className="flex gap-2">
                  {DURATION_OPTIONS.map(opt => (
                    <button key={opt.days} type="button" onClick={() => setDays(opt.days)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        days === opt.days ? "bg-black text-white border-black" : "bg-white text-neutral-600 border-neutral-200"
                      }`}>
                      <div>{opt.label}</div>
                      <div className={`text-[9px] mt-0.5 ${days === opt.days ? "text-[#F7931A]" : "text-neutral-400"}`}>
                        ⚡ {(pricePerDay * opt.days).toLocaleString()} sats
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-black rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Ukupno</p>
                  <p className="text-lg font-extrabold text-[#F7931A]">⚡ {totalCost.toLocaleString()} sats</p>
                </div>
                <button type="submit" disabled={submitting || !title.trim() || !desc.trim()}
                  className="flex items-center gap-2 bg-[#F7931A] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-[#e07f10] disabled:opacity-50 active:scale-95 transition-all">
                  {submitting ? <Loader size={13} className="animate-spin"/> : <Megaphone size={13}/>}
                  {submitting ? "Šaljem…" : "Postavi"}
                </button>
              </div>
            </form>
          )}

          {/* ── My Ads ── */}
          {tab === "mine" && (
            <div className="px-4 py-3 space-y-3 pb-6">
              {myAds.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-neutral-400">Nemaš oglasa</p>
                  <button onClick={() => setTab("create")}
                    className="mt-3 text-xs font-bold px-4 py-2 rounded-xl bg-black text-white">Postavi oglas</button>
                </div>
              ) : myAds.map(ad => <AdCard key={ad.id} ad={ad} showStatus/>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdCard({ ad, showStatus }: { ad: Ad; showStatus?: boolean }) {
  const daysLeft = Math.max(0, Math.ceil((new Date(ad.expires_at).getTime() - Date.now()) / 86400000));
  return (
    <div className="bg-white border border-neutral-100 rounded-2xl overflow-hidden">
      {ad.image_url && (
        <img src={ad.image_url} alt="" className="w-full h-36 object-cover"/>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-extrabold text-black text-sm leading-tight">{ad.title}</h3>
          {showStatus && (
            <span className={`shrink-0 text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
              ad.status === "active"   ? "bg-green-100 text-green-800" :
              ad.status === "pending"  ? "bg-amber-100 text-amber-800" :
              ad.status === "rejected" ? "bg-red-100 text-red-700"     :
              "bg-neutral-100 text-neutral-600"
            }`}>{ad.status}</span>
          )}
        </div>
        <p className="text-xs text-neutral-600 mb-3 leading-relaxed">{ad.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {ad.contact && (
              <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                📞 {ad.contact}
              </span>
            )}
            <span className="text-[10px] text-neutral-400 flex items-center gap-0.5">
              <Clock size={10}/> {daysLeft}d
            </span>
          </div>
          {ad.link && (
            <a href={ad.link} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1 text-[10px] font-bold text-[#F7931A] hover:underline">
              <ExternalLink size={10}/> Otvori
            </a>
          )}
        </div>
        {ad.poster_username && (
          <p className="text-[9px] text-neutral-300 mt-1.5">@{ad.poster_username}</p>
        )}
      </div>
    </div>
  );
}
