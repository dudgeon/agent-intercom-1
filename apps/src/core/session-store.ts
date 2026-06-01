// Server-authoritative session mirror: applies relay messages into an ordered set of threads the
// DOM renders side-by-side (vision: concurrent threads). No DOM here — pure, unit-testable.
import type { ServerMsg } from "./protocol.js";

export interface ClientThread {
  threadId: string;
  prompt: string;
  resourceUri?: string;
  html?: string;
  state: Record<string, any>; // { timerId, label, endTime, status, remainingMs, ... }
}

export type ThreadChange = "created" | "render" | "tick" | "state";

export class SessionStore {
  readonly threads = new Map<string, ClientThread>();
  readonly order: string[] = [];
  constructor(private onChange?: (t: ClientThread, kind: ThreadChange) => void) {}

  apply(m: ServerMsg) {
    switch (m.t) {
      case "thread.created": {
        const t: ClientThread = { threadId: m.threadId, prompt: m.prompt, state: {} };
        this.threads.set(m.threadId, t);
        this.order.push(m.threadId);
        this.onChange?.(t, "created");
        break;
      }
      case "app.render": {
        const t = this.ensure(m.threadId);
        t.resourceUri = m.resourceUri;
        t.html = m.html;
        t.state = { ...t.state, ...m.state };
        this.onChange?.(t, "render");
        break;
      }
      case "app.tick": {
        const t = this.threads.get(m.threadId);
        if (t) { t.state = { ...t.state, remainingMs: m.remainingMs }; this.onChange?.(t, "tick"); }
        break;
      }
      case "app.state": {
        const t = this.threads.get(m.threadId);
        if (t) { t.state = { ...t.state, ...m.state }; this.onChange?.(t, "state"); }
        break;
      }
    }
  }

  private ensure(id: string): ClientThread {
    let t = this.threads.get(id);
    if (!t) { t = { threadId: id, prompt: "", state: {} }; this.threads.set(id, t); this.order.push(id); }
    return t;
  }
}
