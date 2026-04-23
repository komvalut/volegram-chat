import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Chat from "./pages/Chat";
import { api } from "./lib/api";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me().then(d => setUser(d.user)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-black">
      <span className="text-[#FF6A00] text-xs font-mono animate-pulse neon-text">VOLEGRAM ⚡</span>
    </div>
  );

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login onLogin={setUser} /> : <Navigate to="/" />} />
      <Route path="/*"     element={user  ? <Chat user={user} onLogout={() => setUser(null)} /> : <Navigate to="/login" />} />
    </Routes>
  );
}
