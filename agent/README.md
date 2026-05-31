# agent/ — agent orchestration & routing

Turns a prompt into the right agent/skill/tool calls and manages the session.

Responsibilities:
- Accept a prompt (text from STT) and **route to one or more agents/subagents**.
- Select the correct **skill** and invoke **MCP tools / MCP Apps**.
- Own (or proxy) the **session** — the append-only log the device renders as threads.

Harness home (ADR 0006, supersedes 0002): **run the agent loop ourselves on Cloudflare**
(Claude Agent SDK / Cloudflare Agents SDK + Durable Objects), **co-located with the Session
Gateway** (ADR 0005). This keeps tool round-trips intra-cloud and lets model tokens stream
straight through to TTS — optimizing runtime latency and the dev loop. **Managed Agents** stays
a drop-in behind the `Harness` interface (proven in the relay spike) for any future need
(hosted multi-agent coordination, sandboxed code execution).

In practice the gateway and harness largely **merge into one Worker/Durable Object**. This
`agent/` workstream covers that loop + routing, agent/skill definitions, and prompt/skill
assets. Capabilities stay as **MCP servers** (`mcp-servers/`), not logic baked into the harness.

_Empty until the Q4 ADR + Phase-1 build (the relay is already proven in `spike/relay-timer/`)._
