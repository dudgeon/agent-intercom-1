# agent/ — agent orchestration & routing

Turns a prompt into the right agent/skill/tool calls and manages the session.

Responsibilities:
- Accept a prompt (text from STT) and **route to one or more agents/subagents**.
- Select the correct **skill** and invoke **MCP tools / MCP Apps**.
- Own (or proxy) the **session** — the append-only log the device renders as threads.

Two candidate homes for the harness (open question Q1):
- **Claude Managed Agents** (hosted; session/harness/sandbox provided) — current MVP lean.
- **Self-hosted Claude Agent SDK** on a home hub — more private, more ops.

Likely contents over time: agent/skill definitions, routing config, the harness adapter that
the `apps/` client talks to, and prompt/skill assets.

_Empty until the Q1 ADR lands._
