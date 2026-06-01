/*
 * Timer — a capability MCP server with an MCP App.
 *
 * In production this is a hosted remote MCP server (Cloudflare McpAgent, streamable HTTP),
 * shared by the whole device fleet (ADR 0005). Here it runs in-process behind an
 * InMemoryTransport so the relay can be verified deterministically; swapping the transport is
 * the only change needed to make it remote.
 *
 * It demonstrates the two MCP Apps primitives:
 *   - a `ui://timer/countdown` RESOURCE that serves the app's HTML bundle, and
 *   - tools whose result links to that resource via `_meta.ui.resourceUri`.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
const COUNTDOWN_HTML = readFileSync(join(__dirname, "ui", "countdown.html"), "utf8");

export const UI_COUNTDOWN = "ui://timer/countdown";

type TimerStatus = "running" | "done" | "dismissed";
interface TimerRecord {
  timerId: string;
  label: string;
  endTime: number; // epoch ms
  durationSeconds: number;
  status: TimerStatus;
}

/** Source of truth for timer existence/cancellation (the "hands"). */
export class TimerStore {
  private timers = new Map<string, TimerRecord>();
  get(id: string) { return this.timers.get(id); }
  create(durationSeconds: number, label: string): TimerRecord {
    const timerId = "t_" + Math.random().toString(36).slice(2, 9);
    const rec: TimerRecord = {
      timerId, label,
      durationSeconds,
      endTime: Date.now() + durationSeconds * 1000,
      status: "running",
    };
    this.timers.set(timerId, rec);
    return rec;
  }
  dismiss(id: string): TimerRecord | undefined {
    const rec = this.timers.get(id);
    if (rec) rec.status = "dismissed";
    return rec;
  }
}

export function buildTimerServer(store = new TimerStore()): { server: McpServer; store: TimerStore } {
  const server = new McpServer(
    { name: "timer", version: "0.0.1" },
    { capabilities: { tools: {}, resources: {} } },
  );

  // The MCP App bundle, served over the ui:// scheme.
  server.registerResource(
    "countdown",
    UI_COUNTDOWN,
    { title: "Timer countdown", description: "Live countdown UI", mimeType: "text/html+skybridge" },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "text/html+skybridge", text: COUNTDOWN_HTML }],
    }),
  );

  // set_timer — declares its UI via _meta.ui.resourceUri (MCP Apps).
  server.registerTool(
    "set_timer",
    {
      title: "Set a timer",
      description: "Start a countdown timer that renders a live, dismissible UI.",
      inputSchema: { durationSeconds: z.number().int().positive(), label: z.string().optional() },
      _meta: { "ui": { "resourceUri": UI_COUNTDOWN } },
    },
    async ({ durationSeconds, label }) => {
      const rec = store.create(durationSeconds, label ?? "Timer");
      return {
        content: [{ type: "text", text: `Timer "${rec.label}" set for ${durationSeconds}s.` }],
        structuredContent: { ...rec } as Record<string, unknown>,
        _meta: { "ui": { "resourceUri": UI_COUNTDOWN } },
      };
    },
  );

  // dismiss_timer — the callServerTool target invoked from the app UI.
  server.registerTool(
    "dismiss_timer",
    {
      title: "Dismiss a timer",
      description: "Cancel/clear a running or finished timer.",
      inputSchema: { timerId: z.string() },
    },
    async ({ timerId }) => {
      const rec = store.dismiss(timerId);
      if (!rec) {
        return { isError: true, content: [{ type: "text", text: `No timer ${timerId}` }] };
      }
      return {
        content: [{ type: "text", text: `Dismissed "${rec.label}".` }],
        structuredContent: { ...rec } as Record<string, unknown>,
      };
    },
  );

  return { server, store };
}

// Allow running as a standalone stdio server too (closer to a remote deployment).
if (process.argv[1] && process.argv[1].endsWith("timer-server.ts")) {
  const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
  const { server } = buildTimerServer();
  await server.connect(new StdioServerTransport());
}
