// WebSocket transport to the Session Gateway. Uses the global WebSocket — present in the browser
// (WebView) and in Node 22 — so the same code runs on-device and in the headless e2e.
import type { ServerMsg } from "./protocol.js";

export interface GatewayHandlers {
  onMessage: (m: ServerMsg) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export class GatewayClient {
  private ws?: WebSocket;
  constructor(private url: string, private h: GatewayHandlers) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      this.ws = ws;
      ws.addEventListener("open", () => { this.h.onOpen?.(); resolve(); });
      ws.addEventListener("message", (e: MessageEvent) => {
        try { this.h.onMessage(JSON.parse(typeof e.data === "string" ? e.data : "")); } catch { /* ignore */ }
      });
      ws.addEventListener("close", () => this.h.onClose?.());
      ws.addEventListener("error", (e) => reject(e));
    });
  }

  private send(m: unknown) { this.ws?.send(JSON.stringify(m)); }
  hello(room: string) { this.send({ t: "hello", room }); }
  prompt(text: string) { this.send({ t: "prompt", text }); }
  appEvent(threadId: string, tool: string, args: Record<string, unknown>) {
    this.send({ t: "appEvent", threadId, tool, args });
  }
  close() { this.ws?.close(); }
}
