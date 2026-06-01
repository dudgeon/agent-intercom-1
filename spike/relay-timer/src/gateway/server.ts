/*
 * Session Gateway — the middle tier of ADR 0005 and the de-risking target of this spike.
 *
 * It does the thing that has no off-the-shelf pattern: the agent "brain" (harness) runs server
 * side and is the MCP client, but the RENDERER is a separate device on the network. So the
 * gateway must:
 *   1. accept a prompt from a device,
 *   2. drive the harness and call the capability MCP server's tools,
 *   3. when a tool result carries an MCP App (`_meta.ui.resourceUri`), READ that ui:// resource
 *      and RELAY the HTML + state to the owning device,
 *   4. own the ambient lifecycle (tick the countdown, retire on expiry),
 *   5. proxy device-originated app events (the callServerTool from the iframe, itself often
 *      triggered by a hardware soft button) back to the MCP server.
 *
 * Production mapping: this class is a Cloudflare Worker; each Session is a Durable Object; the
 * MCP link is streamable HTTP instead of InMemoryTransport; the harness is Managed Agents.
 */
import { WebSocketServer, WebSocket } from "ws";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildTimerServer } from "../mcp/timer-server.js";
import { MockHarness, type Harness } from "./harness.js";
import { SessionStore, type Session, type AppThread } from "./session.js";

const TICK_MS = 250;

interface DeviceMsg {
  t: "hello" | "prompt" | "appEvent";
  deviceId?: string; room?: string;
  text?: string;
  threadId?: string; tool?: string; args?: Record<string, unknown>;
}

export class Gateway {
  private wss?: WebSocketServer;
  private capabilities = new Map<string, Client>();
  private sessions = new SessionStore();
  private socketSession = new WeakMap<WebSocket, Session>();
  port = 0;

  constructor(private harness: Harness = new MockHarness()) {}

  /** Connect to the capability MCP servers (here: timer, in-process over InMemoryTransport). */
  private async connectCapabilities() {
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    const { server } = buildTimerServer();
    await server.connect(serverT);
    const client = new Client({ name: "gateway", version: "0.0.1" });
    await client.connect(clientT);
    this.capabilities.set("timer", client);
  }

  async start(port = 0): Promise<number> {
    await this.connectCapabilities();
    await new Promise<void>((resolve) => {
      this.wss = new WebSocketServer({ port }, resolve);
    });
    this.port = (this.wss!.address() as { port: number }).port;
    this.wss!.on("connection", (ws) => this.onConnection(ws));
    return this.port;
  }

  async stop() {
    this.wss?.close();
    for (const c of this.capabilities.values()) await c.close();
  }

  private onConnection(ws: WebSocket) {
    ws.on("message", (raw) => {
      let msg: DeviceMsg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      this.onMessage(ws, msg).catch((err) => this.send(ws, { t: "error", message: String(err) }));
    });
  }

  private async onMessage(ws: WebSocket, msg: DeviceMsg) {
    switch (msg.t) {
      case "hello": {
        const session = this.sessions.getOrCreate(msg.deviceId ?? "dev", msg.room ?? "unknown");
        this.socketSession.set(ws, session);
        this.send(ws, { t: "ready", room: session.room });
        return;
      }
      case "prompt": {
        const session = this.socketSession.get(ws);
        if (!session) return this.send(ws, { t: "error", message: "no session; send hello first" });
        await this.handlePrompt(ws, session, msg.text ?? "");
        return;
      }
      case "appEvent": {
        // The iframe's callServerTool (often fired by a hardware soft button) — proxy to MCP.
        await this.handleAppEvent(ws, msg);
        return;
      }
    }
  }

  private async handlePrompt(ws: WebSocket, session: Session, text: string) {
    const result = await this.harness.handle(text);
    for (const action of result.actions) {
      if (action.type !== "callTool") continue;
      const client = this.capabilities.get(action.server);
      if (!client) continue;

      const toolResult: any = await client.callTool({ name: action.tool, arguments: action.args });
      const thread = this.sessions.newThread(session, text);
      thread.state = toolResult.structuredContent ?? {};

      // Create the thread on the device immediately (shows the prompt).
      this.send(ws, { t: "thread.created", threadId: thread.threadId, prompt: text });

      // MCP Apps: if the tool linked a ui:// resource, read it and relay the HTML to render.
      const resourceUri = toolResult?._meta?.ui?.resourceUri as string | undefined;
      if (resourceUri && client) {
        const res: any = await client.readResource({ uri: resourceUri });
        const html = res?.contents?.[0]?.text ?? "";
        thread.resourceUri = resourceUri;
        this.send(ws, {
          t: "app.render",
          threadId: thread.threadId,
          resourceUri,
          html,
          state: thread.state,
        });
        this.startTick(ws, thread);
      }
    }
    this.send(ws, { t: "say", text: result.say });
  }

  /** Gateway-owned ambient lifecycle: tick the countdown, retire on expiry (Q6). */
  private startTick(ws: WebSocket, thread: AppThread) {
    const endTime = Number(thread.state.endTime);
    if (!endTime) return;
    thread.tick = setInterval(() => {
      const remainingMs = endTime - Date.now();
      if (remainingMs <= 0) {
        clearInterval(thread.tick);
        thread.tick = undefined;
        thread.state.status = "done";
        this.send(ws, { t: "app.state", threadId: thread.threadId, state: { status: "done" } });
        this.send(ws, { t: "say", text: `${thread.state.label ?? "Timer"} is done.` });
        return;
      }
      this.send(ws, { t: "app.tick", threadId: thread.threadId, remainingMs });
    }, TICK_MS);
  }

  private async handleAppEvent(ws: WebSocket, msg: DeviceMsg) {
    const client = this.capabilities.get("timer");
    if (!client || !msg.tool) return;
    const toolResult: any = await client.callTool({ name: msg.tool, arguments: msg.args ?? {} });
    const session = this.socketSession.get(ws);
    const thread = session?.threads.get(msg.threadId ?? "");
    if (thread?.tick) { clearInterval(thread.tick); thread.tick = undefined; }
    const state = toolResult.structuredContent ?? { status: "dismissed" };
    if (thread) thread.state = { ...thread.state, ...state };
    this.send(ws, { t: "app.state", threadId: msg.threadId, state });
  }

  private send(ws: WebSocket, obj: Record<string, unknown>) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
  }
}

// Standalone runner.
if (process.argv[1] && process.argv[1].endsWith("server.ts")) {
  const gw = new Gateway();
  const port = await gw.start(Number(process.env.PORT) || 8787);
  console.log(`[gateway] listening on ws://localhost:${port}`);
}
