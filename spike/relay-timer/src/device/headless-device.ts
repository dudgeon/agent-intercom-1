/*
 * Headless device — a renderer stand-in for automated verification.
 *
 * The real device is a WebView that renders the ui:// HTML in a sandboxed iframe and bridges
 * hardware (soft buttons, scroll wheel) into it. Here we EMULATE that app-bridge contract in
 * Node (no DOM) so the relay can be verified headlessly. The emulation mirrors
 * src/mcp/ui/countdown.html exactly: on render it learns the timerId + soft-button labels; a
 * simulated "Dismiss" hardware press triggers the app's callServerTool back to the gateway.
 */
import { WebSocket } from "ws";

interface AppInstance {
  threadId: string;
  timerId?: string;
  label?: string;
  status: string;
  softButtons: string[];
  lastRemainingMs?: number;
  ticks: number;
}

export class HeadlessDevice {
  private ws!: WebSocket;
  private listeners: (() => void)[] = [];
  private history: any[] = [];
  private consumed = new Set<number>();
  apps = new Map<string, AppInstance>();
  log: string[] = [];

  constructor(public deviceId: string, public room: string, private url: string) {}

  connect(): Promise<void> {
    this.ws = new WebSocket(this.url);
    this.ws.on("message", (raw) => this.onMessage(JSON.parse(raw.toString())));
    return new Promise((resolve, reject) => {
      this.ws.on("open", () => this.send({ t: "hello", deviceId: this.deviceId, room: this.room }));
      this.ws.on("error", reject);
      this.once((m) => m.t === "ready").then(() => resolve());
    });
  }

  private onMessage(m: any) {
    // Emulate the device/app behaviour for each relayed frame.
    if (m.t === "app.render") {
      // The app boots from the rendered HTML's bridge: capture state + declared soft buttons.
      const app: AppInstance = {
        threadId: m.threadId,
        timerId: (m.state ?? {}).timerId,
        label: (m.state ?? {}).label,
        status: "running",
        softButtons: ["Dismiss"], // countdown.html posts these to the host on init
        ticks: 0,
      };
      this.apps.set(m.threadId, app);
      this.log.push(`render thread=${m.threadId} timer=${app.timerId} label=${app.label} buttons=[${app.softButtons}] htmlBytes=${(m.html ?? "").length}`);
    } else if (m.t === "app.tick") {
      const app = this.apps.get(m.threadId);
      if (app) { app.lastRemainingMs = m.remainingMs; app.ticks++; }
    } else if (m.t === "app.state") {
      const app = this.apps.get(m.threadId);
      if (app) app.status = m.state?.status ?? app.status;
      this.log.push(`state thread=${m.threadId} -> ${m.state?.status}`);
    } else if (m.t === "say") {
      this.log.push(`say "${m.text}"`);
    }
    this.history.push(m);
    for (const notify of this.listeners.slice()) notify();
  }

  // ---- device actions ----
  prompt(text: string) { this.log.push(`prompt "${text}"`); this.send({ t: "prompt", text }); }

  /** Simulate a hardware soft-button press, routed through the app's bridge logic. */
  pressSoftButton(threadId: string, label: string) {
    const app = this.apps.get(threadId);
    if (!app) throw new Error(`no app for ${threadId}`);
    if (!app.softButtons.includes(label)) throw new Error(`button "${label}" not offered`);
    this.log.push(`hw softbutton "${label}" thread=${threadId}`);
    // countdown.html: dismiss() -> callTool dismiss_timer({timerId})
    if (label === "Dismiss") {
      this.send({ t: "appEvent", threadId, tool: "dismiss_timer", args: { timerId: app.timerId } });
    }
  }

  /** Simulate the scroll wheel (no-op server-side in this app; proves the event path exists). */
  scroll(threadId: string, delta: number) { this.log.push(`hw scroll ${delta} thread=${threadId}`); }

  // ---- async helpers (scan past + future messages, consuming each match once) ----
  /** Resolve with the next unconsumed message matching `pred`, scanning history first. */
  once(pred: (m: any) => boolean, timeoutMs = 4000): Promise<any> {
    return new Promise((resolve, reject) => {
      const scan = () => {
        for (let i = 0; i < this.history.length; i++) {
          if (!this.consumed.has(i) && pred(this.history[i])) {
            this.consumed.add(i); cleanup(); resolve(this.history[i]); return true;
          }
        }
        return false;
      };
      const cleanup = () => { clearTimeout(to); this.listeners = this.listeners.filter((x) => x !== scan); };
      const to = setTimeout(() => { cleanup(); reject(new Error("timeout waiting for message")); }, timeoutMs);
      if (!scan()) this.listeners.push(scan);
    });
  }
  /** Wait for `n` distinct ticks on a thread; returns their remaining-ms values in order. */
  async waitForTicks(threadId: string, n: number, timeoutMs = 6000): Promise<number[]> {
    const seen: number[] = [];
    while (seen.length < n) {
      const m = await this.once((x) => x.t === "app.tick" && x.threadId === threadId, timeoutMs);
      seen.push(m.remainingMs);
    }
    return seen;
  }
  /** Total tick frames seen for a thread (used to assert ticking stopped). */
  tickCount(threadId: string): number {
    return this.history.filter((m) => m.t === "app.tick" && m.threadId === threadId).length;
  }
  close() { this.ws.close(); }
  private send(o: any) { this.ws.send(JSON.stringify(o)); }
}
