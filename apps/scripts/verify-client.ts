/*
 * Tier-2 SIMULATED e2e for the device host (ADR 0009/0010). No hardware, no browser: boots the
 * real gateway (`wrangler dev` in ../../agent, with a fast tick) and drives the client CORE
 * (GatewayClient + SessionStore) over a real WebSocket, asserting:
 *   A. prompt -> thread.created -> app.render of a ui:// app, mirrored into SessionStore.
 *   B. the DO alarm ticks the countdown; SessionStore tracks remainingMs.
 *   C. a (simulated) soft-button -> appEvent(dismiss_timer) -> app.state "dismissed".
 *   D. concurrent prompts produce side-by-side threads in arrival order.
 * Uses Node 22 global WebSocket/fetch — no extra deps. The iframe/postMessage bridge is covered
 * by the AppBridge unit test; here we exercise the transport + session mirror against the backend.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { GatewayClient } from "../src/core/gateway-client.js";
import { SessionStore } from "../src/core/session-store.js";
import type { ServerMsg } from "../src/core/protocol.js";

const PORT = 8790;
const BASE = `http://127.0.0.1:${PORT}`;
let failures = 0;
const check = (name: string, cond: boolean, detail = "") => {
  console.log(`${cond ? "  PASS" : "  FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!cond) failures++;
};

// consumed-history matcher (handles arrival races), fed by the real GatewayClient
const history: ServerMsg[] = [];
const consumed = new Set<number>();
let listeners: (() => void)[] = [];
function once(pred: (m: ServerMsg) => boolean, timeoutMs = 10000): Promise<any> {
  return new Promise((resolve, reject) => {
    const scan = () => {
      for (let i = 0; i < history.length; i++)
        if (!consumed.has(i) && pred(history[i])) { consumed.add(i); cleanup(); resolve(history[i]); return true; }
      return false;
    };
    const cleanup = () => { clearTimeout(to); listeners = listeners.filter((x) => x !== scan); };
    const to = setTimeout(() => { cleanup(); reject(new Error("timeout")); }, timeoutMs);
    if (!scan()) listeners.push(scan);
  });
}

const store = new SessionStore();
const gw = new GatewayClient(`ws://127.0.0.1:${PORT}/device?device=kitchen`, {
  onMessage: (m) => { history.push(m); store.apply(m); for (const fn of listeners.slice()) fn(); },
});

async function waitHealthy(proc: ChildProcess) {
  for (let i = 0; i < 60; i++) {
    try { if ((await (await fetch(`${BASE}/health`)).text()) === "ok") return; } catch { /* not up */ }
    if (proc.exitCode != null) throw new Error("wrangler exited early");
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("worker never became healthy");
}

const proc = spawn(
  "npx",
  ["--yes", "wrangler@latest", "dev", "--port", String(PORT), "--ip", "127.0.0.1", "--var", "TICK_MS:1000"],
  { cwd: new URL("../../agent", import.meta.url).pathname, stdio: ["ignore", "ignore", "inherit"] },
);

try {
  await waitHealthy(proc);
  console.log("gateway healthy on " + BASE + "\n");

  await gw.connect();
  gw.hello("Kitchen");
  await once((m) => m.t === "ready");

  // A. prompt -> render, mirrored into the store
  gw.prompt("set a 5 second timer for tea");
  const created = await once((m) => m.t === "thread.created");
  const threadId = created.threadId;
  const render = await once((m) => m.t === "app.render" && m.threadId === threadId);
  const th = store.threads.get(threadId)!;
  check("A1 thread mirrored into SessionStore", !!th && store.order.includes(threadId));
  check("A2 ui:// app rendered", typeof render.resourceUri === "string" && render.resourceUri.startsWith("ui://"), render.resourceUri);
  check("A3 app html is sandbox-ready", th.html === render.html && th.html!.length > 0);
  const timerId = th.state.timerId;
  check("A4 timer state present", !!timerId, `timerId=${timerId}`);

  // B. alarm ticks tracked by the store
  const tick = await once((m) => m.t === "app.tick" && m.threadId === threadId);
  check("B1 tick received", typeof tick.remainingMs === "number", `${tick.remainingMs}ms`);
  check("B2 store tracks remainingMs", store.threads.get(threadId)!.state.remainingMs === tick.remainingMs);

  // C. simulated soft-button -> appEvent -> dismissed
  gw.appEvent(threadId, "dismiss_timer", { timerId });
  await once((m) => m.t === "app.state" && m.threadId === threadId && m.state?.status === "dismissed");
  check("C1 store reflects dismissal", store.threads.get(threadId)!.state.status === "dismissed");

  // D. concurrent threads, side-by-side in order
  gw.prompt("set a 3 second timer for pasta");
  const second = await once((m) => m.t === "thread.created" && m.threadId !== threadId);
  await once((m) => m.t === "app.render" && m.threadId === second.threadId);
  const i1 = store.order.indexOf(threadId), i2 = store.order.indexOf(second.threadId);
  check("D1 both threads tracked side-by-side in arrival order", i1 >= 0 && i2 > i1, store.order.join(","));

  gw.close();
} catch (e) {
  check("e2e completed", false, String(e));
} finally {
  proc.kill("SIGTERM");
}

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
