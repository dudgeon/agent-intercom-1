/*
 * Session — the per-session Durable Object (ADR 0005), which also runs the harness loop
 * (ADR 0006). One instance per device/session. It:
 *   - terminates the device's hibernatable WebSocket,
 *   - drives the (mock) harness and calls the Timer capability over MCP,
 *   - relays ui:// MCP App resources + tool results to the device (the proven relay),
 *   - owns the ambient lifecycle via a storage ALARM ticking at e-ink cadence (~5s, ADR 0007),
 *   - proxies device app events (callServerTool) back to the capability,
 *   - persists thread state so a reconnecting device re-syncs (server-authoritative session).
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildTimerServer } from "../../mcp-servers/timer/src/server.js";
import { MockHarness, type Harness } from "./harness.js";

export interface Env {
  SESSION: DurableObjectNamespace;
  TICK_MS?: string;
}

interface Thread {
  threadId: string;
  prompt: string;
  resourceUri?: string;
  state: Record<string, any>; // { timerId, label, endTime, durationSeconds, status }
}

export class Session {
  private threads = new Map<string, Thread>();
  private harness: Harness = new MockHarness();
  private mcp?: Client;

  constructor(private state: DurableObjectState, private env: Env) {
    state.blockConcurrencyWhile(async () => {
      const stored = await state.storage.get<Record<string, Thread>>("threads");
      if (stored) this.threads = new Map(Object.entries(stored));
    });
  }

  private get tickMs() { return Number(this.env.TICK_MS) || 5000; }

  /** Connect to the Timer capability. In-process for the scaffold; remote MCP in production. */
  private async ensureMcp(): Promise<Client> {
    if (this.mcp) return this.mcp;
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    const { server } = buildTimerServer();
    await server.connect(serverT);
    const client = new Client({ name: "gateway", version: "0.0.1" });
    await client.connect(clientT);
    this.mcp = client;
    return client;
  }

  private async persist() {
    await this.state.storage.put("threads", Object.fromEntries(this.threads));
  }

  private send(obj: Record<string, unknown>) {
    const s = JSON.stringify(obj);
    for (const ws of this.state.getWebSockets()) { try { ws.send(s); } catch { /* closed */ } }
  }

  // ---- WebSocket lifecycle (hibernatable) ----
  async fetch(req: Request): Promise<Response> {
    if (req.headers.get("Upgrade") !== "websocket") return new Response("expected websocket", { status: 426 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    this.state.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(_ws: WebSocket, raw: string | ArrayBuffer) {
    let msg: any;
    try { msg = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw)); } catch { return; }
    try { await this.onMessage(msg); }
    catch (e) { this.send({ t: "error", message: String(e) }); }
  }
  async webSocketClose(ws: WebSocket) { try { ws.close(); } catch { /* */ } }

  private async onMessage(msg: any) {
    switch (msg.t) {
      case "hello": return this.onHello(msg);
      case "prompt": return this.handlePrompt(String(msg.text ?? ""));
      case "appEvent": return this.handleAppEvent(msg);
    }
  }

  private async onHello(msg: any) {
    this.send({ t: "ready", room: msg.room ?? "unknown" });
    // Server-authoritative session: re-render any still-running threads to the (re)connecting device.
    for (const thread of this.threads.values()) {
      if (thread.state.status === "running" && thread.resourceUri) {
        const mcp = await this.ensureMcp();
        const res: any = await mcp.readResource({ uri: thread.resourceUri });
        this.send({ t: "app.render", threadId: thread.threadId, resourceUri: thread.resourceUri, html: res?.contents?.[0]?.text ?? "", state: thread.state });
      }
    }
  }

  private async handlePrompt(text: string) {
    const result = await this.harness.handle(text);
    for (const action of result.actions) {
      if (action.type !== "callTool") continue;
      const mcp = await this.ensureMcp();
      const tr: any = await mcp.callTool({ name: action.tool, arguments: action.args });
      const threadId = "th_" + Math.random().toString(36).slice(2, 9);
      const thread: Thread = { threadId, prompt: text, state: tr.structuredContent ?? {} };
      this.threads.set(threadId, thread);
      this.send({ t: "thread.created", threadId, prompt: text });

      const resourceUri = tr?._meta?.ui?.resourceUri as string | undefined;
      if (resourceUri) {
        const res: any = await mcp.readResource({ uri: resourceUri });
        thread.resourceUri = resourceUri;
        this.send({ t: "app.render", threadId, resourceUri, html: res?.contents?.[0]?.text ?? "", state: thread.state });
        await this.scheduleTick();
      }
      await this.persist();
    }
    this.send({ t: "say", text: result.say });
  }

  private async handleAppEvent(msg: any) {
    const mcp = await this.ensureMcp();
    const tr: any = await mcp.callTool({ name: msg.tool, arguments: msg.args ?? {} });
    const thread = this.threads.get(msg.threadId);
    // DO is the session authority: mark dismissed even if a restarted in-process store lost the timer.
    const state = tr.structuredContent ?? { ...(thread?.state ?? {}), status: "dismissed" };
    if (thread) thread.state = { ...thread.state, ...state };
    await this.persist();
    this.send({ t: "app.state", threadId: msg.threadId, state });
  }

  // ---- ambient lifecycle: alarm-driven tick at e-ink cadence (ADR 0007) ----
  private async scheduleTick() {
    if ((await this.state.storage.getAlarm()) == null) {
      await this.state.storage.setAlarm(Date.now() + this.tickMs);
    }
  }

  async alarm() {
    const now = Date.now();
    let anyRunning = false;
    for (const thread of this.threads.values()) {
      if (thread.state.status !== "running") continue;
      const remaining = Number(thread.state.endTime) - now;
      if (remaining <= 0) {
        thread.state.status = "done";
        this.send({ t: "app.state", threadId: thread.threadId, state: { status: "done" } });
        this.send({ t: "say", text: `${thread.state.label ?? "Timer"} is done.` });
      } else {
        anyRunning = true;
        this.send({ t: "app.tick", threadId: thread.threadId, remainingMs: remaining });
      }
    }
    await this.persist();
    if (anyRunning) await this.state.storage.setAlarm(Date.now() + this.tickMs);
  }
}
