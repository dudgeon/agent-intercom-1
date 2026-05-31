/*
 * Timer — capability MCP server (Workers-compatible: no fs/process, HTML embedded).
 *
 * Exposes set_timer / dismiss_timer and the ui://timer/countdown MCP App resource. In the
 * deployed shape this becomes a standalone remote MCP Worker over streamable HTTP shared by the
 * fleet (ADR 0005). For this scaffold it's linked in-process to the Session DO via
 * InMemoryTransport — a transport swap away from remote.   // SEAM: remote streamable-HTTP MCP
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { COUNTDOWN_HTML } from "./countdown.js";

export const UI_COUNTDOWN = "ui://timer/countdown";

type TimerStatus = "running" | "done" | "dismissed";
interface TimerRecord {
  timerId: string; label: string; endTime: number; durationSeconds: number; status: TimerStatus;
}

export class TimerStore {
  private timers = new Map<string, TimerRecord>();
  create(durationSeconds: number, label: string): TimerRecord {
    const timerId = "t_" + Math.random().toString(36).slice(2, 9);
    const rec: TimerRecord = { timerId, label, durationSeconds, endTime: Date.now() + durationSeconds * 1000, status: "running" };
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
  const server = new McpServer({ name: "timer", version: "0.0.1" }, { capabilities: { tools: {}, resources: {} } });

  server.registerResource(
    "countdown", UI_COUNTDOWN,
    { title: "Timer countdown", description: "Live countdown UI (e-ink, 1-bit)", mimeType: "text/html+skybridge" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/html+skybridge", text: COUNTDOWN_HTML }] }),
  );

  server.registerTool(
    "set_timer",
    {
      title: "Set a timer",
      description: "Start a countdown timer that renders a live, dismissible UI.",
      inputSchema: { durationSeconds: z.number().int().positive(), label: z.string().optional() },
      _meta: { ui: { resourceUri: UI_COUNTDOWN } },
    },
    async ({ durationSeconds, label }) => {
      const rec = store.create(durationSeconds, label ?? "Timer");
      return {
        content: [{ type: "text", text: `Timer "${rec.label}" set for ${durationSeconds}s.` }],
        structuredContent: { ...rec } as Record<string, unknown>,
        _meta: { ui: { resourceUri: UI_COUNTDOWN } },
      };
    },
  );

  server.registerTool(
    "dismiss_timer",
    { title: "Dismiss a timer", description: "Cancel/clear a running or finished timer.", inputSchema: { timerId: z.string() } },
    async ({ timerId }) => {
      const rec = store.dismiss(timerId);
      if (!rec) return { isError: true, content: [{ type: "text", text: `No timer ${timerId}` }] };
      return { content: [{ type: "text", text: `Dismissed "${rec.label}".` }], structuredContent: { ...rec } as Record<string, unknown> };
    },
  );

  return { server, store };
}
