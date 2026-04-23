import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Login   from "./pages/Login";
import Chat    from "./pages/Chat";
import Profile from "./pages/Profile";
import Admin   from "./pages/Admin";
import { api } from "./lib/api";

export default function App() {
  const [user, setUser]       = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me().then(d => setUser(d.user)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="text-4xl mb-3">⚡</div>
        <p className="text-[#FF6A00] text-xs font-mono tracking-widest animate-pulse uppercase">VBC Loading…</p>
      </div>
    </div>
  );

  return (
    <Routes>
      <Route path="/login"         element={!user ? <Login onLogin={setUser} /> : <Navigate to="/" />} />
      <Route path="/admin"         element={user?.isAdmin ? <Admin user={user} /> : <Navigate to="/" />} />
      <Route path="/u/:username"   element={<Profile currentUser={user} />} />
      <Route path="/*"             element={user ? <Chat user={user} setUser={setUser} onLogout={() => setUser(null)} /> : <Navigate to="/login" />} />
    </Routes>
  );
}
