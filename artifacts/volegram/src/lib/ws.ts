const WS_URL = import.meta.env.VITE_WS_URL ?? `ws://${window.location.host}/ws`;

type Handler = (msg: any) => void;

class VolegramWS {
  private ws: WebSocket | null = null;
  private handlers: Handler[] = [];
  private userId: number | null = null;
  private joined = new Set<number>();

  connect(userId: number) {
    this.userId = userId;
    const url = `${WS_URL}?userId=${userId}`;
    this.ws = new WebSocket(url);

    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        this.handlers.forEach(h => h(msg));
      } catch {}
    };

    this.ws.onclose = () => {
      setTimeout(() => this.userId && this.connect(this.userId), 2000);
    };
  }

  join(roomId: number) {
    if (this.joined.has(roomId)) return;
    this.joined.add(roomId);
    this.send({ type: "join", roomId });
  }

  sendMessage(roomId: number, content: string, msgType = "text", extra?: object) {
    this.send({ type: "message", roomId, content, msgType, ...extra });
  }

  sendTyping(roomId: number) {
    this.send({ type: "typing", roomId });
  }

  private send(data: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  on(handler: Handler) { this.handlers.push(handler); }
  off(handler: Handler) { this.handlers = this.handlers.filter(h => h !== handler); }
  disconnect() { this.ws?.close(); this.ws = null; this.userId = null; this.joined.clear(); }
}

export const vws = new VolegramWS();
