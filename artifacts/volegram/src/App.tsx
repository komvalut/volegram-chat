import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Login       from "./pages/Login";
import Chat        from "./pages/Chat";
import Profile     from "./pages/Profile";
import Admin       from "./pages/Admin";
import InstallPWA  from "./components/InstallPWA";
import { api }     from "./lib/api";
import { applyTheme, getStoredTheme, type ThemeId } from "./lib/themes";
import { type LangCode, getStoredLang, setStoredLang, isRTL } from "./lib/i18n";

export default function App() {
  const [user, setUser]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [themeId, setThemeId] = useState<ThemeId>(getStoredTheme);
  const [lang, setLang] = useState<LangCode>(getStoredLang);

  useEffect(() => {
    api.me().then(d => setUser(d.user)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    applyTheme(themeId);
  }, [themeId]);

  useEffect(() => {
    setStoredLang(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir  = isRTL(lang) ? "rtl" : "ltr";
  }, [lang]);

  const changeTheme = (id: ThemeId) => {
    setThemeId(id);
    applyTheme(id);
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center vbc-bg relative overflow-hidden">
      <div className="text-center z-10">
        <div className="flex flex-col items-center mb-3 animate-float">
          <span className="text-6xl leading-none animate-vbc-pulse" style={{ color: "var(--app-accent)" }}>⚡</span>
          <span className="text-xs font-black tracking-[0.3em] mt-1 animate-vbc-pulse vbc-text-dim">BTC</span>
        </div>
        <p className="text-base font-black tracking-[0.3em] uppercase vbc-text">Volegram Bitcoin Chat</p>
        <p className="text-xs tracking-widest uppercase mt-2 vbc-text-sub">Loading…</p>
      </div>
    </div>
  );

  return (
    <>
      <Routes>
        <Route path="/login"       element={!user ? <Login onLogin={setUser}/> : <Navigate to="/"/>} />
        <Route path="/admin"       element={user?.isAdmin ? <Admin user={user}/> : <Navigate to="/"/>} />
        <Route path="/u/:username" element={<Profile currentUser={user}/>} />
        <Route path="/*"           element={user
          ? <Chat
              user={user}
              setUser={setUser}
              onLogout={() => setUser(null)}
              themeId={themeId}
              onThemeChange={changeTheme}
              lang={lang}
              onLangChange={setLang}
            />
          : <Navigate to="/login"/>} />
      </Routes>
      <InstallPWA/>
    </>
  );
}
