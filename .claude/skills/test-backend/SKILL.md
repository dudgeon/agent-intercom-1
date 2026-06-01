---
name: test-backend
description: Test the agent/ backend (gateway + Session Durable Object). Runs Tier-1 unit tests and Tier-2 local e2e against real `wrangler dev` (workerd + Durable Objects + alarms). Use after changing anything under agent/ (and re-run when mcp-servers/ changes, since the backend e2e bundles the Timer capability).
---

# Test the backend (`agent/`)

Implements ADR 0009 Tiers 1–2 for the backend. **No cloud credentials needed** — everything runs
locally against `wrangler dev`.

## Steps
1. Ensure deps are installed (the backend e2e bundles the Timer capability, so install both):
   ```bash
   (cd mcp-servers/timer && npm ci || npm install)
   (cd agent && npm ci || npm install)
   ```
2. **Typecheck** (also proves the Worker bundles):
   ```bash
   cd agent && npm run typecheck
   ```
3. **Tier 1 — unit** (pure logic: harness parsing, helpers):
   ```bash
   cd agent && npm run test:unit
   ```
4. **Tier 2 — local e2e** (boots `wrangler dev`, drives a simulated device over a WebSocket, and
   asserts the relay + alarm ticks + dismiss + reconnect-resync):
   ```bash
   cd agent && npm run verify
   ```
   `npm test` runs unit + e2e together.

## Notes & gotchas
- `wrangler dev` here emits harmless `Request.cf`/`Host not in…` warnings (no edge metadata
  offline) — ignore them; success is the `BACKEND VERIFIED` line.
- The e2e self-boots and self-kills `wrangler dev` on port 8788 with a fast `TICK_MS:1000`. If a
  run is interrupted, a stray `wrangler dev` may linger — find and stop it before re-running.
- Add new unit tests under `agent/test/*.test.ts`. Add new e2e assertions in
  `agent/scripts/verify-backend.ts` (extend the `Device` scenarios; reuse the consumed-history matcher).
- Do **not** put Durable-Object/Workers-runtime logic in unit tests — that's what Tier-2 e2e is for.

## Done when
Typecheck passes, unit tests pass, and the e2e prints `✅ BACKEND VERIFIED — all checks passed`.
