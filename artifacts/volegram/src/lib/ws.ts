import { playSound, getNotifSound } from "./sounds";

const proto = window.location.protocol === "https:" ? "wss" : "ws";
const WS_URL = import.meta.env.VITE_WS_URL ?? `${proto}://${window.location.host}/ws`;

type Handler = (msg: any) => void;

class VolegramWS {
  private ws: WebSocket | null = null;
  private handlers: Handler[] = [];
  private userId: number | null = null;
  private activeRoomId: number | null = null;
  private joined = new Set<number>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  connect(userId: number) {
    this.userId = userId;
    this._open();
  }

  /** Tell WS which room the user is currently viewing (won't play sound for that room) */
  setActiveRoom(roomId: number | null) {
    this.activeRoomId = roomId;
  }

  private _open() {
    if (!this.userId) return;
    const url = `${WS_URL}?userId=${this.userId}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.joined.forEach(roomId => {
        this.ws?.send(JSON.stringify({ type: "join", roomId }));
      });
    };

    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        // Play notification sound for new messages NOT in the active room
        if (msg.type === "message" && msg.senderId !== this.userId) {
          const inActiveRoom = this.activeRoomId === msg.roomId;
          if (!inActiveRoom) {
            playSound(getNotifSound());
            // Browser notification if permission granted
            if (Notification.permission === "granted") {
              new Notification("VBC ⚡ Nova poruka", {
                body: msg.content ? msg.content.slice(0, 80) : "Nova poruka",
                icon: "/icons/icon-192.png",
                silent: true,
              });
            }
          }
        }

        this.handlers.forEach(h => h(msg));
      } catch {}
    };

    this.ws.onclose = () => {
      if (this.userId) {
        this.reconnectTimer = setTimeout(() => this._open(), 2000);
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  join(roomId: number) {
    this.joined.add(roomId);
    this._send({ type: "join", roomId });
  }

  sendMessage(roomId: number, content: string, msgType = "text", extra?: object) {
    this._send({ type: "message", roomId, content, msgType, ...extra });
  }

  sendTyping(roomId: number) {
    this._send({ type: "typing", roomId });
  }

  private _send(data: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  on(handler: Handler) { this.handlers.push(handler); }
  off(handler: Handler) { this.handlers = this.handlers.filter(h => h !== handler); }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.userId = null;
    this.joined.clear();
    this.activeRoomId = null;
  }
}

export const vws = new VolegramWS();

/** Request browser notification permission on first interaction */
export function requestNotifPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}
