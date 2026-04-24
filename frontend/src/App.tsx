import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Login      from "./pages/Login";
import Chat       from "./pages/Chat";
import Profile    from "./pages/Profile";
import Admin      from "./pages/Admin";
import InstallPWA from "./components/InstallPWA";
import { api }    from "./lib/api";

export default function App() {
  const [user, setUser]       = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me().then(d => setUser(d.user)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-black relative overflow-hidden btc-grid-bg">
      <div className="text-center z-10">
        <div className="text-6xl mb-4 btc-glow animate-btc-pulse">⚡</div>
        <p className="text-[10px] font-black tracking-[0.4em] uppercase mb-1"
           style={{ color: "#F7931A" }}>Volegram Bitcoin Chat</p>
        <p className="text-[8px] text-neutral-700 tracking-widest uppercase">Loading…</p>
      </div>
      <div className="btc-watermark">₿</div>
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
