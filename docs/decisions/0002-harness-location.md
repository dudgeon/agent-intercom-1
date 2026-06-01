# 0002 — Agent harness runs in the cloud (Claude Managed Agents) for the MVP, with a self-host path
- Status: **Superseded by [ADR 0006](0006-harness-on-cloudflare.md)**
- Date: 2026-05-31
- Deciders: Project owner
- Resolves: open question Q1

> **Superseded.** Once ADR 0005 placed the gateway + MCP servers on Cloudflare, the harness was
> moved onto Cloudflare too (self-run, co-located) to optimize runtime latency and the dev
> loop. See [ADR 0006](0006-harness-on-cloudflare.md). The original record is kept below.
> Managed Agents remains a drop-in option behind the `Harness` interface.

## Context
The agent "brain + harness" can run cloud-hosted, on a home hub, or fully on-device (Q1).
This is the highest-leverage decision — it sets latency, privacy, cost, offline behavior, and
how thin the device is. We want the fastest credible path to a working end-to-end experience
without foreclosing privacy/self-hosting later.

Claude Managed Agents (GA beta 2026-04-08) already virtualizes the agent into **session**
(append-only log), **harness** (the loop), and **sandbox** (execution) — the exact split our
architecture wants — for standard token rates + $0.08/session-hour.

## Decision
Use **Claude Managed Agents** as the harness/session/sandbox for the MVP. The device is a
voice I/O front-end + session viewer. Design the `apps/`↔harness boundary as an **adapter**
so the harness can later be swapped for a **self-hosted Claude Agent SDK** on a home hub
without touching the client.

## Consequences
- Fastest route to a working demo; built-in session log to render as threads (supports Q6-A);
  multi-agent coordination available as it matures.
- Recurring cost ($0.08/session-hr) and a hard network dependency online; voice/text data
  leaves the home — must be addressed in the privacy posture (Q8).
- Obliges a clean harness adapter abstraction now, so self-hosting (the stated end-state) is a
  config swap, not a rewrite.
- The **offline story** is limited in the MVP: define what (if anything) works with no
  internet (likely: nothing beyond local wake-word + "I'm offline" feedback) — revisit when
  self-hosting lands.

## Alternatives considered
- **Home hub now (self-host Agent SDK):** more private and no per-hour fee, but more to build
  and operate before we've validated the experience.
- **On-device:** needs a beefy SBC, hardest, worst model quality/thermals — premature.
