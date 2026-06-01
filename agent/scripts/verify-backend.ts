/*
 * End-to-end verification of the Cloudflare backend against a real `wrangler dev` (local
 * workerd + Durable Objects + alarms). Boots the worker with a fast tick, drives a device over
 * a real WebSocket, and asserts:
 *   A. prompt -> harness -> MCP set_timer -> ui:// resource relayed to the device.
 *   B. DO ALARM ticks the countdown and retires it (status "done").
 *   C. soft-button -> callServerTool(dismiss_timer) round-trip -> dismissed.
 *   D. server-authoritative session: after a reconnect, a running thread is re-rendered.
 * Uses Node 22 global WebSocket/fetch — no extra deps.
 */
import { spawn, type ChildProcess } from "node:child_process";

const PORT = 8788;
const BASE = `http://127.0.0.1:${PORT}`;
let failures = 0;
const check = (name: string, cond: boolean, detail = "") => {
  console.log(`${cond ? "  PASS" : "  FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!cond) failures++;
};

// --- tiny WS device with a consumed-history matcher (handles arrival races) ---
class Device {
  ws!: WebSocket;
  private history: any[] = [];
  private consumed = new Set<number>();
  private listeners: (() => void)[] = [];
  async connect() {
    this.ws = new WebSocket(`ws://127.0.0.1:${PORT}/device?device=kitchen`);
    this.ws.addEventListener("message", (e: any) => {
      this.history.push(JSON.parse(e.data));
      for (const fn of this.listeners.slice()) fn();
    });
    await new Promise<void>((res, rej) => { this.ws.addEventListener("open", () => res()); this.ws.addEventListener("error", rej); });
  }
  send(o: any) { this.ws.send(JSON.stringify(o)); }
  once(pred: (m: any) => boolean, timeoutMs = 8000): Promise<any> {
    return new Promise((resolve, reject) => {
      const scan = () => {
        for (let i = 0; i < this.history.length; i++)
          if (!this.consumed.has(i) && pred(this.history[i])) { this.consumed.add(i); cleanup(); resolve(this.history[i]); return true; }
        return false;
      };
      const cleanup = () => { clearTimeout(to); this.listeners = this.listeners.filter((x) => x !== scan); };
      const to = setTimeout(() => { cleanup(); reject(new Error("timeout")); }, timeoutMs);
      if (!scan()) this.listeners.push(scan);
    });
  }
  async ticks(threadId: string, n: number, timeoutMs = 10000) {
    const out: number[] = [];
    while (out.length < n) out.push((await this.once((m) => m.t === "app.tick" && m.threadId === threadId, timeoutMs)).remainingMs);
    return out;
  }
  close() { this.ws.close(); }
}

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
  { cwd: new URL("..", import.meta.url).pathname, stdio: ["ignore", "ignore", "inherit"] },
);

try {
  await waitHealthy(proc);
  console.log("worker healthy on " + BASE + "\n");

  const dev = new Device();
  await dev.connect();
  dev.send({ t: "hello", room: "Kitchen" });
  await dev.once((m) => m.t === "ready");

  // A + B
  console.log("Scenario A/B — relay + alarm tick + expiry");
  dev.send({ t: "prompt", text: "set a 4 second timer for the tea" });
  const created = await dev.once((m) => m.t === "thread.created");
  check("thread created", created.prompt.includes("tea"));
  const render = await dev.once((m) => m.t === "app.render");
  check("ui:// resource relayed", render.resourceUri === "ui://timer/countdown", render.resourceUri);
  check("e-ink countdown HTML relayed", typeof render.html === "string" && render.html.includes("intercom-app"));
  check("initial state has timerId + endTime", !!render.state.timerId && render.state.endTime > Date.now());
  const ts = await dev.ticks(render.threadId, 3);
  check("DO alarm streams ticks", ts.length >= 3, `remaining(ms): ${ts.join(", ")}`);
  check("ticks count down", ts[0] > ts[ts.length - 1]);
  const done = await dev.once((m) => m.t === "app.state" && m.state?.status === "done", 7000);
  check("timer retires via alarm (done)", done.state.status === "done");

  // C
  console.log("\nScenario C — soft button -> callServerTool(dismiss_timer)");
  dev.send({ t: "prompt", text: "set a 30 minute timer for the laundry" });
  const render2 = await dev.once((m) => m.t === "app.render");
  check("second timer rendered", !!render2.state.timerId, render2.state.label);
  await dev.ticks(render2.threadId, 1);
  dev.send({ t: "appEvent", threadId: render2.threadId, tool: "dismiss_timer", args: { timerId: render2.state.timerId } });
  const dismissed = await dev.once((m) => m.t === "app.state" && m.state?.status === "dismissed");
  check("dismiss round-trips to MCP + DO", dismissed.state.status === "dismissed");

  // D — reconnect resync (server-authoritative session via Durable Object storage)
  console.log("\nScenario D — reconnect re-syncs running threads");
  dev.send({ t: "prompt", text: "set a 20 minute timer for the bread" });
  const render3 = await dev.once((m) => m.t === "app.render");
  check("third timer rendered", render3.state.label === "bread");
  dev.close();
  await new Promise((r) => setTimeout(r, 500));
  const dev2 = new Device();
  await dev2.connect();
  dev2.send({ t: "hello", room: "Kitchen" });
  await dev2.once((m) => m.t === "ready");
  const resync = await dev2.once((m) => m.t === "app.render" && m.state?.label === "bread", 6000);
  check("running thread re-rendered after reconnect", resync.state.timerId === render3.state.timerId);
  dev2.close();

  console.log(`\n${failures === 0 ? "✅ BACKEND VERIFIED — all checks passed" : `❌ ${failures} check(s) failed`}`);
} catch (e) {
  console.error("verify error:", e);
  failures++;
} finally {
  proc.kill("SIGTERM");
  setTimeout(() => proc.kill("SIGKILL"), 2000);
}
setTimeout(() => process.exit(failures === 0 ? 0 : 1), 500);
