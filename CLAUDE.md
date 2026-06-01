# CLAUDE.md — orientation for AI sessions

## What this project is
**Agent Intercom** — a countertop voice + screen device that is a *thin, agent-agnostic host*
to AI agents, built on open standards (**MCP** + **MCP Apps**). Read [`README.md`](README.md)
and [`docs/vision.md`](docs/vision.md) first.

## Project phase
**Inception → first code.** Many deliverables are still documents/decisions (ADRs 0001–0010),
but the **backend is real and locally verified**: `agent/` (Cloudflare Worker + Session Durable
Object = gateway+harness) + capabilities `mcp-servers/timer/` and `mcp-servers/weather/` (MCP +
`ui://` apps), proven end-to-end against `wrangler dev`. The **device host (`apps/`) is built and
locally verified** too (ADR 0010: web/TS host = DOM-free core + thin DOM adapter; unit + simulated
e2e). **Cloud staging is now deployed** (Cloudflare creds verified); fleet/OTA still gated on device
identity (Q10); hardware still pending.

**▶ New session? Read the handoff at the top of [`docs/roadmap.md`](docs/roadmap.md) first** — it
says exactly what's built/verified, what's deployed, what's blocked, and what to pick up next.

## How to work here (the dynamic workflow)
See [`docs/workflow.md`](docs/workflow.md). The loop: **Frame → Decide → Spike → Learn**.
- Highest-leverage decisions live in [`docs/open-questions.md`](docs/open-questions.md).
  **Q1 (where the harness runs) + Q2 (display compute) gate almost everything.**
- Resolved decisions become ADRs in [`docs/decisions/`](docs/decisions/) (append-only).
- Provisional system shape: [`docs/architecture/overview.md`](docs/architecture/overview.md).

## The core bets (don't quietly violate these)
1. The client is **agent-agnostic**; capabilities are **MCP tools / MCP Apps**, not bespoke
   features baked into the client.
2. UI is **agent-delivered** via MCP Apps (`ui://` HTML in a sandboxed iframe), not a fixed
   app grid on the device.
3. Two likely *novel* pieces to design: the **hardware-input→MCP App bridge** (soft buttons,
   scroll wheel; Q5) and **ambient persistence/lifecycle** of rendered apps (Q6).

## Workstream directories
`apps/` (client host) · `agent/` (orchestration) · `mcp-servers/` (capabilities) ·
`hardware/` (electronics) · `design/` (Fusion 360 + manufacturing assets).

## Testing & CI (ADR 0009)
Tiered, by functional area, **local-first** then promoted to cloud then fleet:
- **Tier 1 unit** (`vitest`) + **Tier 2 local e2e** (`wrangler dev` + a simulated device) run with
  no cloud creds. Backend: `cd agent && npm test`. Capability: `cd mcp-servers/timer && npm test`.
- Drive it via the Skills `test-backend` · `test-mcp` · `test-client` · `promote`. CI mirrors it in
  [`.github/workflows/`](.github/workflows/) with per-area path filters.
- Hardware-in-the-loop is **manual** (the ✔ tests in `hardware/wiring.html`) and never gates CI.

## Branch
PR #1 (inception + backend + Timer + device host) is **merged to `main`**. Branch new work off
`main`; open PRs as draft.

## Industrial design
Owner authors in Fusion 360. The assistant reviews via **STEP**, **STL/3MF**, **PNG
renders/screenshots**, and dimensioned **PDFs** (it cannot open `.f3d`). See
[`design/README.md`](design/README.md).
