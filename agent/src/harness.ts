/*
 * Harness — the "brain" boundary (ADR 0006). The Session DO calls handle(prompt) and gets back
 * actions (tool calls) + a spoken line, with no knowledge of transports/MCP. MockHarness keeps
 * the scaffold credential-free; swap for the Agent-SDK-on-Cloudflare loop (or Managed Agents)
 * behind this same interface.
 */
export interface ToolCallAction { type: "callTool"; server: string; tool: string; args: Record<string, unknown>; }
export interface HarnessResult { say: string; actions: ToolCallAction[]; }
export interface Harness { handle(prompt: string): Promise<HarnessResult>; }

export class MockHarness implements Harness {
  async handle(prompt: string): Promise<HarnessResult> {
    const seconds = parseDuration(prompt);
    if (seconds) {
      const label = parseLabel(prompt) ?? "Timer";
      return {
        say: `Okay — a ${humanize(seconds)} timer for ${label}.`,
        actions: [{ type: "callTool", server: "timer", tool: "set_timer", args: { durationSeconds: seconds, label } }],
      };
    }
    return { say: 'This scaffold only knows timers. Try: "set a 5 minute timer for pasta".', actions: [] };
  }
}

function parseDuration(text: string): number | null {
  const m = text.match(/(\d+)\s*(second|sec|s|minute|min|m|hour|hr|h)\b/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const u = m[2].toLowerCase();
  if (u.startsWith("s")) return n;
  if (u.startsWith("h")) return n * 3600;
  return n * 60;
}
function parseLabel(text: string): string | null {
  const m = text.match(/\bfor (?:the |my )?([a-z][a-z ]{1,30})$/i);
  return m ? m[1].trim() : null;
}
function humanize(s: number): string {
  if (s % 3600 === 0) return `${s / 3600} hour`;
  if (s % 60 === 0) return `${s / 60} minute`;
  return `${s} second`;
}
