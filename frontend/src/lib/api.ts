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
  login:            (email: string) => req("POST", "/api/auth/login", { email }),
  me:               () => req("GET", "/api/auth/me"),
  logout:           () => req("POST", "/api/auth/logout"),
  deleteAccount:    () => req("DELETE", "/api/auth/account"),
  updateProfile:    (data: object) => req("PUT", "/api/profile/me/update", data),
  getProfile:       (username: string) => req("GET", `/api/profile/${username}`),
  report:           (targetId: number, reason: string) => req("POST", "/api/profile/report", { targetId, reason }),
  rooms:            () => req("GET", "/api/rooms"),
  openDM:           (targetUsername: string) => req("POST", "/api/rooms/dm", { targetUsername }),
  createIncognito:  (name?: string) => req("POST", "/api/rooms/incognito", { name }),
  joinByCode:       (code: string) => req("POST", `/api/rooms/join/${code}`),
  messages:         (roomId: number) => req("GET", `/api/rooms/${roomId}/messages`),
  sendInvoice:      (roomId: number, sats: number, note: string) =>
    req("POST", `/api/rooms/${roomId}/invoice`, { sats, note }),
  admin: {
    users:          () => req("GET",  "/api/admin/users"),
    block:          (id: number) => req("POST", `/api/admin/block/${id}`),
    unblock:        (id: number) => req("POST", `/api/admin/unblock/${id}`),
    reports:        () => req("GET",  "/api/admin/reports"),
    resolveReport:  (id: number) => req("POST", `/api/admin/reports/${id}/resolve`),
    deleteMessage:  (id: number) => req("POST", `/api/admin/delete-message/${id}`),
  },
};

export async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${BASE}/api/upload`, { method: "POST", credentials: "include", body: fd });
  const d = await r.json();
  return d.url as string;
}
