---
name: test-client
description: Test the apps/ device host (the on-counter MCP Apps renderer + voice/hardware bridge). Runs client unit tests and a SIMULATED local e2e against a local gateway — no hardware. Hardware-in-the-loop is a separate manual checklist. Use after changing anything under apps/.
---

# Test the client / device host (`apps/`)

Implements ADR 0009 for the client. The host is **not yet scaffolded** (pending the Q4 ADR); this
skill defines how to test it so the harness is ready the moment code lands.

## When `apps/` exists
1. **Tier 1 — unit:** `cd apps && npm test` — host logic with no browser/hardware (thread/session
   reducer, hardware-event → MCP App mapping, e-ink refresh cadence/dirty-rect logic per ADR 0007).
2. **Tier 2 — simulated e2e (no hardware):**
   - Start the backend locally: `cd agent && npm run dev` (or reuse the `test-backend` e2e harness).
   - Run the host **headless** pointed at `ws://127.0.0.1:8788/device?device=<name>`; assert it
     renders a relayed `ui://` app, reflects `app.tick`/`app.state`, and emits `appEvent` on a
     simulated soft-button/switch input.
   - Simulate hardware by injecting synthetic GPIO/switch events (no real pins).

## Hardware-in-the-loop (MANUAL — never gates CI)
Use the per-step **✔ tests** in `hardware/wiring.html` (e-ink demo, speaker, USB mic, switch+LED,
encoder/buttons, integration smoke test). These can't be faked and must not block software merges.

## Done when
Client unit tests pass and the simulated e2e drives a full prompt → render → input round-trip
against the local gateway. (Until `apps/` exists, this skill just reports "not yet scaffolded".)
