# 0006 — Run the agent loop ourselves on Cloudflare (Agent SDK / CF Agents), co-located with the gateway
- Status: Accepted
- Date: 2026-05-31
- Deciders: Project owner
- Supersedes: [ADR 0002](0002-harness-location.md)
- Relates to: ADR 0003 (display), ADR 0005 (fleet topology)

## Context
ADR 0002 chose Managed Agents for the MVP largely to minimize what we operate. ADR 0005 then
put the **Session Gateway and the capability MCP servers on Cloudflare**. With the backend
already on Cloudflare, the harness choice was reopened.

The owner set the optimization criteria explicitly: **optimize for end-to-end runtime CX /
latency and for ease of the dev/test/iterate loop; cost is not the deciding factor**
(Managed Agents' ~$0.08/session-hour, billed by the second, is acceptable). The owner was also
open to putting tool logic inside Managed Agents.

Key technical facts (researched 2026-05-31):
- Cloudflare supports **both** patterns: self-run agents (CF Agents SDK / `McpAgent` + Durable
  Objects, purpose-built for stateful agents, WebSockets, voice agents, MCP) *and* an official
  **Managed Agents on Cloudflare** integration where Anthropic runs the loop and CF provides
  the sandbox/tools.
- Managed Agents' headline capability is a **sandbox that executes arbitrary code/bash**. Our
  capabilities are **MCP tools/MCP Apps, not code execution**, so that feature is largely
  unused for us.

## Decision
**Run the agent loop ourselves on Cloudflare** (Claude Agent SDK / Cloudflare Agents SDK on
Workers + Durable Objects), **co-located with the Session Gateway and the capability MCP
servers**. Reaffirm the core bet: **capabilities stay as MCP servers + MCP Apps**, not logic
baked into the harness. Keep the `Harness` interface (proven in the relay spike) so Managed
Agents remains a drop-in for specific future needs.

### Why this wins on the stated criteria
- **Runtime latency / CX:** the device's WebSocket terminates on the same Worker that runs the
  loop and calls the MCP servers → tool round-trips are intra-cloud, and model tokens stream
  straight through the gateway to TTS with **no second cross-cloud leg per turn**. Managed
  Agents adds an Anthropic↔Cloudflare hop on every turn and every tool round-trip.
- **Dev/test loop:** capabilities-as-MCP-Apps run in **Claude Desktop / ChatGPT today** (test a
  tool + its UI with no device/gateway/harness); the loop iterates locally via `wrangler dev`.
- **One platform / one bill / full control** over the hot path; CF Agents SDK is purpose-built
  for stateful, hibernating, WebSocket/voice agents.

## Consequences
- We **operate the loop** (scaling, retries, prompt/skill/routing logic). Acceptable given the
  control/latency/dev-loop upside and that CF's Agents SDK does the heavy lifting.
- No hosted multi-agent coordination / self-eval out of the box (Managed Agents' previews). If
  needed later, swap the `Harness` implementation for Managed Agents for those flows.
- No hosted code-execution sandbox. We don't need one for MCP-tool capabilities; revisit only
  if a capability genuinely requires running arbitrary code.
- The "gateway" and "harness" largely **merge into one Worker/Durable Object** — simplifies the
  architecture diagram (ADR 0005's middle tier now also runs the brain).
- Reaffirming MCP-servers-for-capabilities protects the agent-agnostic core bet *and* the dev
  loop; we explicitly do **not** put tool logic inside the harness.

## Alternatives considered
- **Managed Agents (ADR 0002):** least to operate, cost acceptable — but extra cross-cloud hops
  on the latency hot path and a slower harness iteration loop; its sandbox feature is unused.
  Kept as a swappable option behind the `Harness` interface.
- **Tool logic inside the harness:** rejected — breaks the agent-agnostic bet and the
  "test each MCP App in Claude Desktop" dev loop, with no offsetting latency win.
- **Self-host on a home hub:** more private but worse latency for a cloud model and more ops
  than Cloudflare; not aligned with the fleet/hosted direction of ADR 0005.
