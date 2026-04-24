import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Login       from "./pages/Login";
import Chat        from "./pages/Chat";
import Profile     from "./pages/Profile";
import Admin       from "./pages/Admin";
import InstallPWA  from "./components/InstallPWA";
import { api }     from "./lib/api";

export default function App() {
  const [user, setUser]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me().then(d => setUser(d.user)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-white relative overflow-hidden">
      <div className="text-center z-10">
        <div className="flex flex-col items-center mb-3 animate-float">
          <span className="text-6xl leading-none animate-vbc-pulse text-black">⚡</span>
          <span className="text-xs font-black tracking-[0.3em] mt-1 animate-vbc-pulse text-black/60">BTC</span>
        </div>
        <p className="text-base font-black tracking-[0.3em] uppercase text-black">Volegram Bitcoin Chat</p>
        <p className="text-xs text-neutral-500 tracking-widest uppercase mt-2">Loading…</p>
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
          ? <Chat user={user} setUser={setUser} onLogout={() => setUser(null)}/>
          : <Navigate to="/login"/>} />
      </Routes>
      <InstallPWA/>
    </>
  );
}
