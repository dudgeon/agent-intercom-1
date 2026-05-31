/*
 * Worker entry — the hosted backend (ADR 0005/0006). Routes a device's WebSocket to its
 * per-session Durable Object. The gateway + harness live inside that DO (see session-do.ts).
 */
import { Session, type Env } from "./session-do.js";

export { Session };

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/health") return new Response("ok");
    if (url.pathname === "/device") {
      // Device-affine session for the MVP (Q11-A): one Session DO per device id.
      const device = url.searchParams.get("device") ?? "default";
      const stub = env.SESSION.get(env.SESSION.idFromName(device));
      return stub.fetch(req);
    }
    return new Response("not found", { status: 404 });
  },
};
