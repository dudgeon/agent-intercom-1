# CLAUDE.md — orientation for AI sessions

## What this project is
**Agent Intercom** — a countertop voice + screen device that is a *thin, agent-agnostic host*
to AI agents, built on open standards (**MCP** + **MCP Apps**). Read [`README.md`](README.md)
and [`docs/vision.md`](docs/vision.md) first.

## Project phase
**Inception.** No application code yet. We are *narrowing the option set* via an explicit
decision process before committing to a stack. The deliverables so far are documents.

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

## Branch
Develop on `claude/voice-ai-home-assistant-ZPQaA`. Push there; open PRs as draft.

## Industrial design
Owner authors in Fusion 360. The assistant reviews via **STEP**, **STL/3MF**, **PNG
renders/screenshots**, and dimensioned **PDFs** (it cannot open `.f3d`). See
[`design/README.md`](design/README.md).
