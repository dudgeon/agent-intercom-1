# 0009 — Testing & CI/CD: tiered, by functional area, local-first with promotion to cloud then fleet
- Status: Accepted
- Date: 2026-05-31
- Deciders: Project owner
- Relates to: ADR 0005/0006 (hosted backend), 0007 (e-ink device), 0008 (OTA/fleet), workflow.md

## Context
The system spans four functional areas with very different runtimes: the **device host**
(`apps/`), the **backend** (`agent/` — gateway + harness on Cloudflare), the **MCP capabilities**
(`mcp-servers/`), and the **fleet/OTA** plane (ADR 0008). We need a test approach that (a) is
**fast and local** for everyday changes, (b) can run **e2e without cloud or hardware**, and
(c) has a clear, gated **promotion** to real cloud and then real devices. We already proved the
backend is locally verifiable against `wrangler dev` (workerd + Durable Objects + alarms).

## Decision
A test **pyramid** applied **per area**, with promotion gates:

| Tier | What | Where it runs | Gate |
|------|------|---------------|------|
| **1 · Unit** | Pure logic: harness parsing, MCP tool/resource handlers, DO helpers, client reducers. `vitest` (Node, esbuild-TS). | local + every PR | must pass to merge |
| **2 · Local e2e (simulated)** | Whole relay with **no cloud, no hardware**: `wrangler dev` (real workerd + DO + alarms) driven by a **simulated device** over a WebSocket; MCP linked in-process. Client e2e = the host run headless against the local gateway. | local + every PR | must pass to merge |
| **3 · Cloud staging** | Deploy to a **staging** Cloudflare env; run the *same* e2e suite against the deployed URL + a real (test) remote MCP. | on merge to `main` | must pass to promote |
| **4 · Fleet / canary** | N **simulated devices** + **one real device** against staging; exercise OTA (signed bundle → health-check → rollback, ADR 0008) and multi-device behavior (Q10/Q11); **canary one unit** before fleet-wide. | manual / scheduled | must pass before prod OTA |

**By functional area** (CI runs only the affected areas, via path filters):
- **`agent/` (backend):** unit (harness, DO helpers) + Tier-2 local e2e (`npm run verify`).
- **`mcp-servers/`:** unit (tool logic + `ui://` resource) + **MCP-protocol e2e** via an in-memory
  client (a capability is correct iff it speaks MCP correctly — also runnable in any MCP host).
- **`apps/` (client):** unit (host logic) + Tier-2 **simulated** e2e against a local gateway.
  **Hardware-in-the-loop** is a separate **manual** tier (the per-step tests in `hardware/wiring.html`),
  never gating CI.
- **Fleet/OTA:** Tier-4 only.

**Promotion path:** PR → (Tier 1+2 green) → merge → deploy **staging** → (Tier 3 green) →
**canary** device → (Tier 4 green) → production deploy + fleet OTA rollout.

**Execution surface:** `vitest` for unit; `wrangler dev` + a Node WebSocket client for local e2e;
GitHub Actions for CI with **`dorny/paths-filter`** so each area's jobs run only when it changes;
`wrangler deploy` (with `CLOUDFLARE_API_TOKEN`) for staging/prod. AI sessions drive these through
**Skills** (`.claude/skills/test-backend|test-mcp|test-client|promote`).

## Consequences
- Everyday loop stays **fully local and credential-free** (Tiers 1–2); cloud creds are needed
  only at the promotion gate (Tier 3+), keeping PRs cheap and safe.
- The **simulated device** is a first-class artifact (already exists as `agent/scripts/verify-backend.ts`);
  client work can be validated long before hardware or the enclosure exist.
- Hardware tests are explicitly **out of the CI gate** (manual, checklist-driven) — they can't be
  faked and shouldn't block software merges.
- Tier 4 + OTA can't be exercised until device identity/pairing (Q10) and a staging env land;
  the structure is in place so they slot in without rework.

## Alternatives considered
- **One monolithic e2e suite for everything:** slow, and forces cloud creds into every PR. Rejected
  in favor of local-first Tiers 1–2 + gated Tier 3.
- **Mock the Workers runtime for e2e instead of `wrangler dev`:** cheaper to start but wouldn't
  exercise real Durable Object alarms/hibernation — the exact things our relay depends on. Rejected;
  workerd-local is the right fidelity.
- **Hardware-in-the-loop in CI:** infeasible/flaky and gates software on physical units. Kept manual.
