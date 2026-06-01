---
name: test-client
description: Test the apps/ device host (the on-counter MCP Apps renderer + voice/hardware bridge). Runs client unit tests and a SIMULATED local e2e against a local gateway — no hardware. Hardware-in-the-loop is a separate manual checklist. Use after changing anything under apps/.
---

# Test the client / device host (`apps/`)

Implements ADR 0009 for the client (host built per ADR 0010: a DOM-free core + a thin DOM adapter).

## Run it
```bash
cd apps
npm install          # first time
npm run typecheck    # tsc --noEmit (includes the DOM adapter)
npm run test:unit    # Tier 1 — vitest: SessionStore mirror + AppBridge host/app contract
npm run verify       # Tier 2 — SIMULATED e2e (no hardware/browser)
npm test             # unit + e2e
```

1. **Tier 1 — unit:** pure-TS core, no browser/hardware — the server-authoritative `SessionStore`
   and the host↔MCP-App `postMessage` bridge (`init|tick|state|hw` ↔ `ready|softButtons|callTool`).
2. **Tier 2 — simulated e2e (`scripts/verify-client.ts`):** boots the real gateway (`wrangler dev`
   in `../agent`, fast tick) and drives the client core over a real WebSocket — asserts
   prompt → `thread.created` → `ui://` `app.render`, `app.tick`/`app.state` tracking, a simulated
   soft-button → `appEvent(dismiss_timer)` → dismissed, and side-by-side threads in arrival order.
   No real pins, no browser; the iframe/postMessage path is covered by the AppBridge unit test.

## Hardware-in-the-loop (MANUAL — never gates CI)
Use the per-step **✔ tests** in `hardware/wiring.html` (e-ink demo, speaker, USB mic, switch+LED,
encoder/buttons, integration smoke test). These can't be faked and must not block software merges.

## Done when
Client unit tests pass and the simulated e2e drives a full prompt → render → input round-trip
against the local gateway. (Until `apps/` exists, this skill just reports "not yet scaffolded".)
