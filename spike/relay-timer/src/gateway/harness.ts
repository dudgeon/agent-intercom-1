/*
 * Harness — the "brain" boundary (ADR 0002).
 *
 * The gateway calls Harness.handle(prompt) and gets back a list of ACTIONS (tool calls to run
 * + a spoken line). The harness does NOT know about transports or MCP servers — that keeps the
 * brain decoupled from the hands, so we can swap MockHarness for a real Managed Agents adapter
 * without touching the gateway's relay code.
 */

export interface ToolCallAction {
  type: "callTool";
  server: string;            // logical capability name, e.g. "timer"
  tool: string;              // e.g. "set_timer"
  args: Record<string, unknown>;
}
export interface HarnessResult {
  say: string;               // line for TTS
  actions: ToolCallAction[];
}
export interface Harness {
  handle(prompt: string): Promise<HarnessResult>;
}

/** Tiny intent router so the spike runs with zero external dependencies/credentials. */
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
    return { say: "This spike only knows how to set timers. Try: \"set a 5 minute timer for pasta\".", actions: [] };
  }
}

/*
 * Drop-in replacement once we wire the real backend (ADR 0002). Sketch only — left unimplemented
 * so the spike needs no API key. The real adapter would POST to the Managed Agents API with the
 * `managed-agents-2026-04-01` beta header, register the capability MCP servers, run the agent
 * loop, and translate its tool-call events into ToolCallAction[].
 *
 *   export class ManagedAgentsHarness implements Harness {
 *     constructor(private apiKey: string, private mcpServers: McpServerRef[]) {}
 *     async handle(prompt: string) { ...call Managed Agents, map tool calls to actions... }
 *   }
 */

function parseDuration(text: string): number | null {
  const m = text.match(/(\d+)\s*(second|sec|s|minute|min|m|hour|hr|h)\b/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  if (unit.startsWith("s")) return n;
  if (unit.startsWith("h")) return n * 3600;
  return n * 60; // minutes
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
