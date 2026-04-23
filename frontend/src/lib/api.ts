const BASE = import.meta.env.VITE_API_URL ?? "";

async function req(method: string, path: string, body?: object) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export const api = {
  login:       (lightningAddress: string) => req("POST", "/api/auth/login", { lightningAddress }),
  me:          () => req("GET", "/api/auth/me"),
  logout:      () => req("POST", "/api/auth/logout"),
  rooms:       () => req("GET", "/api/rooms"),
  openDM:      (targetUsername: string) => req("POST", "/api/rooms/dm", { targetUsername }),
  messages:    (roomId: number) => req("GET", `/api/rooms/${roomId}/messages`),
  sendInvoice: (roomId: number, sats: number, note: string) =>
    req("POST", `/api/rooms/${roomId}/invoice`, { sats, note }),
};

export async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${BASE}/api/upload`, { method: "POST", credentials: "include", body: fd });
  const d = await r.json();
  return d.url as string;
}
