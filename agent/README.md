# agent/ — agent orchestration & routing

Turns a prompt into the right agent/skill/tool calls and manages the session.

Responsibilities:
- Accept a prompt (text from STT) and **route to one or more agents/subagents**.
- Select the correct **skill** and invoke **MCP tools / MCP Apps**.
- Own (or proxy) the **session** — the append-only log the device renders as threads.

Harness home (ADR 0002): **Claude Managed Agents** for the MVP, behind an adapter so it can
later swap to a **self-hosted Claude Agent SDK** on a home hub.

In the fleet topology (ADR 0005) the harness sits behind the **Session Gateway** (Cloudflare
Worker + Durable Objects), which holds per-session state and relays UI-resource refs/events
between the device fleet and the hosted capability MCP servers. This `agent/` workstream
covers the harness adapter + the gateway's agent-driving logic, plus agent/skill definitions,
routing config, and prompt/skill assets.

_Empty until the Q4 ADR + Phase-1 gateway spike._
