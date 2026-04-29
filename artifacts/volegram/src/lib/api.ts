const BASE = import.meta.env.VITE_API_URL ?? "";

async function req(method: string, path: string, body?: object) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    let msg = await r.text();
    try { msg = JSON.parse(msg).error ?? msg; } catch {}
    throw new Error(msg);
  }
  return r.json();
}

export const api = {
  login:            (identifier: string) => req("POST", "/api/auth/login", { identifier }),
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

  // OTP login
  otpRequest:       (identifier: string) => req("POST", "/api/auth/otp/request", { identifier }),
  otpVerify:        (identifier: string, code: string) => req("POST", "/api/auth/otp/verify", { identifier, code }),

  // Vouchers
  voucherCurrencies: () => req("GET", "/api/vouchers/currencies"),
  voucherCreate:     (data: { amount: number; currency: string; paymentMethod: string; recipientUsername?: string; message?: string }) =>
    req("POST", "/api/vouchers", data),
  voucherList:       () => req("GET", "/api/vouchers"),
  voucherSend:       (id: number, recipientUsername: string, message?: string) =>
    req("POST", `/api/vouchers/${id}/send`, { recipientUsername, message }),
  voucherRedeem:     (code: string) => req("POST", "/api/vouchers/redeem", { code }),

  // Rates
  rates:             () => req("GET", "/api/rates"),

  // Public settings
  publicSettings:    () => req("GET", "/api/settings/public"),

  admin: {
    users:          () => req("GET",  "/api/admin/users"),
    block:          (id: number) => req("POST", `/api/admin/block/${id}`),
    unblock:        (id: number) => req("POST", `/api/admin/unblock/${id}`),
    reports:        () => req("GET",  "/api/admin/reports"),
    resolveReport:  (id: number) => req("POST", `/api/admin/reports/${id}/resolve`),
    deleteMessage:  (id: number) => req("POST", `/api/admin/delete-message/${id}`),
    // New admin endpoints
    settingsList:   () => req("GET",  "/api/settings"),
    setSetting:     (key: string, value: string) => req("POST", "/api/settings", { key, value }),
    usersAdmin:     () => req("GET",  "/api/settings/users"),
    promoteUser:    (id: number) => req("POST", `/api/settings/users/${id}/promote`),
    demoteUser:     (id: number) => req("POST", `/api/settings/users/${id}/demote`),
    blockUser:      (id: number) => req("POST", `/api/settings/users/${id}/block`),
    unblockUser:    (id: number) => req("POST", `/api/settings/users/${id}/unblock`),
    adjustBalance:  (id: number, delta: number) => req("POST", `/api/settings/users/${id}/balance`, { delta }),
    deleteUser:     (id: number) => req("DELETE", `/api/settings/users/${id}`),
    voucherListAll: () => req("GET", "/api/vouchers/admin/all"),
    voucherConfirm: (id: number) => req("POST", `/api/vouchers/${id}/confirm-payment`),
    voucherVoid:    (id: number) => req("DELETE", `/api/vouchers/${id}`),
    esimList:       () => req("GET", "/api/esim/admin/all"),
    esimOrders:     () => req("GET", "/api/esim/admin/orders"),
    esimCreate:     (d: any) => req("POST", "/api/esim/admin/create", d),
    esimUpdate:     (id: number, d: any) => req("PUT", `/api/esim/admin/${id}`, d),
    esimDelete:     (id: number) => req("DELETE", `/api/esim/admin/${id}`),
    esimOrderStatus:(id: number, status: string) => req("PUT", `/api/esim/admin/order/${id}/status`, { status }),
  },

  esim: {
    list:    () => req("GET", "/api/esim"),
    buy:     (id: number) => req("POST", `/api/esim/buy/${id}`),
    orders:  () => req("GET", "/api/esim/orders"),
  },

  ai: {
    chat: (messages: { role: string; content: string }[]) => req("POST", "/api/ai/chat", { messages }),
  },

  ads: {
    list:      () => req("GET",  "/api/ads"),
    pricing:   () => req("GET",  "/api/ads/pricing"),
    create:    (d: any) => req("POST", "/api/ads", d),
    mine:      () => req("GET",  "/api/ads/mine"),
    admin: {
      listAll:   () => req("GET",    "/api/ads/admin/all"),
      setStatus: (id: number, status: string) => req("PUT", `/api/ads/admin/${id}`, { status }),
      remove:    (id: number) => req("DELETE", `/api/ads/admin/${id}`),
      setPrice:  (price_per_day: number) => req("PUT", "/api/ads/admin/settings/price", { price_per_day }),
    },
  },

  p2p: {
    list:        () => req("GET", "/api/p2pvouchers"),
    buy:         (id: number) => req("POST", `/api/p2pvouchers/buy/${id}`),
    myOrders:    () => req("GET", "/api/p2pvouchers/orders"),
    userMarket:  () => req("GET", "/api/p2pvouchers/user-market"),
    myListings:  () => req("GET", "/api/p2pvouchers/my-listings"),
    sell:        (d: any) => req("POST", "/api/p2pvouchers/sell", d),
    cancelListing: (id: number) => req("DELETE", `/api/p2pvouchers/my-listings/${id}`),
    buyFromUser: (id: number) => req("POST", `/api/p2pvouchers/user-market/${id}/buy`),

    admin: {
      listAll:     () => req("GET",  "/api/p2pvouchers/admin/all"),
      listOrders:  () => req("GET",  "/api/p2pvouchers/admin/orders"),
      create:      (d: any) => req("POST",   "/api/p2pvouchers/admin/create", d),
      update:      (id: number, d: any) => req("PUT", `/api/p2pvouchers/admin/${id}`, d),
      remove:      (id: number) => req("DELETE", `/api/p2pvouchers/admin/${id}`),
      deliver:     (orderId: number, code: string) => req("POST", `/api/p2pvouchers/admin/orders/${orderId}/deliver`, { code }),
    },
  },
};

export async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${BASE}/api/upload`, { method: "POST", credentials: "include", body: fd });
  const d = await r.json();
  return d.url as string;
}
