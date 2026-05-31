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

## What's here (Cloudflare backend scaffold — verified locally)

A deploy-ready Wrangler Worker that ports the proven relay onto the real platform:
- `src/index.ts` — Worker entry; routes a device WebSocket to its per-session Durable Object.
- `src/session-do.ts` — the **`Session` Durable Object** = gateway + harness: drives the
  harness, calls the Timer over MCP, relays `ui://` apps, owns the **alarm-driven tick at
  e-ink cadence (~5s, ADR 0007)**, proxies `callServerTool`, and persists thread state so a
  reconnecting device re-syncs (server-authoritative session).
- `src/harness.ts` — `MockHarness` behind the `Harness` interface (swap point for the real
  Agent-SDK-on-Cloudflare loop).
- Timer capability lives in [`../mcp-servers/timer/`](../mcp-servers/timer/), linked in-process
  via `InMemoryTransport` (a transport swap from remote streamable-HTTP MCP).

```bash
cd agent && npm install
npm run typecheck     # wrangler dry-run bundle
npm run test:unit     # Tier-1 unit tests (vitest) — harness parsing, helpers
npm run verify        # Tier-2 local e2e: wrangler dev (workerd+DOs+alarms) + simulated device
npm test              # unit + e2e together
npm run dev           # local dev server
npm run deploy        # once CLOUDFLARE_API_TOKEN + account id are wired
```

Testing strategy: **ADR 0009** (tiered, by area, local-first → cloud → fleet). AI sessions drive
it via the `test-backend` / `test-mcp` / `test-client` / `promote` skills; CI mirrors it in
`.github/workflows/`.

Not yet done: split Timer into a standalone remote MCP Worker; real WebSocket auth/device
pairing (Q10); the Agent-SDK harness; deploy (needs creds).
