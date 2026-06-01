/*
 * Session store — in-memory stand-in for the per-session Durable Object (ADR 0005).
 *
 * Sessions are device-affine for the MVP (open question Q11-A): a session belongs to the
 * device it started on. State lives server-side so it survives a device reboot and could later
 * roam between devices. In production each Session is one Cloudflare Durable Object.
 */

export interface AppThread {
  threadId: string;
  prompt: string;
  resourceUri?: string;
  state: Record<string, unknown>;   // e.g. { timerId, label, endTime, durationSeconds, status }
  tick?: NodeJS.Timeout;            // gateway-owned lifecycle/persistence (open question Q6)
}

export interface Session {
  deviceId: string;
  room: string;
  threads: Map<string, AppThread>;
}

export class SessionStore {
  private sessions = new Map<string, Session>();

  getOrCreate(deviceId: string, room: string): Session {
    let s = this.sessions.get(deviceId);
    if (!s) {
      s = { deviceId, room, threads: new Map() };
      this.sessions.set(deviceId, s);
    }
    return s;
  }

  newThread(session: Session, prompt: string): AppThread {
    const threadId = "th_" + Math.random().toString(36).slice(2, 9);
    const thread: AppThread = { threadId, prompt, state: {} };
    session.threads.set(threadId, thread);
    return thread;
  }
}
