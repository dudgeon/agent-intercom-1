# Agent Intercom

A countertop **voice + screen device** for the home that acts as a thin, agent-agnostic
*intercom* to one or more AI agents. You speak (or type) a prompt; a client application
routes it to the right agent/skill; the agent responds in a session thread on-screen; and
where it makes sense, a skill renders a **persistent, interactive UI** in that thread —
a weather card, a running timer, a soft-button menu, or a large scrollable HTML artifact
you page through with a hardware scroll wheel.

> Status: **Inception → first code.** The stack is now decided (ADRs 0001–0009) and the
> **backend is built and locally verified**: a Cloudflare Worker + Session Durable Object
> (gateway + harness) relays an MCP App to a simulated device — proven end-to-end against
> `wrangler dev`. The device host (`apps/`) is the next build, pending the client-tech ADR (Q4).

## The outcome we want

- As a home user, I can ask a voice AI assistant a question or give a tool-using prompt from
  a physical countertop device.
- A client application accepts the prompt, creates a new **session thread** (showing my
  prompt), and displays it **side-by-side** with any in-progress threads.
- The agent responds in the UI via the correct skill / prompt / tool.
- Where the skill allows, an action renders a **UI that persists as long as appropriate**
  (weather card with a timeout, a timer until it ends, etc.).
- Some skills render **interactive UI driven by soft buttons** (hardware buttons with
  software labels) or **large HTML artifacts** scrolled with a hardware scroll wheel.
- The client is a **thin-ish, agent-agnostic** host built on **open standards** (MCP +
  MCP Apps). Application capabilities are exposed as **MCP tools / MCP Apps**.

We will tackle every layer: MCP tools, agent framework, client app, hardware stack, and the
physical industrial design of the countertop device (authored in Fusion 360, with
manufacturing assets committed here).

## Decisions so far ([ADRs](docs/decisions/))

| # | Decision |
|---|----------|
| [0005](docs/decisions/0005-fleet-topology-hosted-backend.md) | A fleet of **thin client devices** over a **hosted backend** (Session Gateway + remote MCP). |
| [0006](docs/decisions/0006-harness-on-cloudflare.md) | Run the **agent loop on Cloudflare**, co-located with the gateway (Worker + Durable Objects). |
| [0003](docs/decisions/0003-display-compute.md) · [0007](docs/decisions/0007-display-eink.md) | Device = **Linux SBC + WebView**, with a **~7.5″ monochrome e-ink, non-touch** display rendered on-device. |
| [0004](docs/decisions/0004-voice-pipeline.md) | Voice: **on-device wake word**, cloud STT/TTS with a local fallback. |
| [0008](docs/decisions/0008-ota-strategy.md) | OTA = **thin-shell + signed A/B app updater**, Cloudflare as the control plane. |
| [0009](docs/decisions/0009-testing-and-cicd.md) | Testing/CI-CD = **tiered, by functional area**, local-first → cloud → fleet. |

Full set and rationale in [`docs/decisions/`](docs/decisions/); the still-open calls (client
tech Q4, input bridge Q5, privacy Q8, device identity Q10/Q11) live in
[`docs/open-questions.md`](docs/open-questions.md).

## What's built

- **Backend** ([`agent/`](agent/)) — a deploy-ready Cloudflare Worker + **Session Durable
  Object** that is the gateway *and* harness: hibernatable-WebSocket relay to the device,
  **alarm-driven UI ticks** at e-ink cadence, `callServerTool` round-trips, and reconnect
  re-sync from Durable Object storage. **Verified end-to-end against `wrangler dev`** (12/12).
- **Timer capability** ([`mcp-servers/timer/`](mcp-servers/timer/)) — an MCP server with
  `set_timer` / `dismiss_timer` and a `ui://timer/countdown` **MCP App** (e-ink, 1-bit).
- **Hardware** ([`hardware/`](hardware/)) — a v0 [bill of materials](hardware/BOM.md) and a rich
  [wiring + setup guide](hardware/wiring.html) (SVG diagrams, per-step checklists and tests).
- **Tests & CI** — unit + local-e2e tiers (ADR 0009), GitHub Actions per functional area, and
  `test-backend` / `test-mcp` / `test-client` / `promote` skills.
- **Not yet built:** the device host ([`apps/`](apps/), pending Q4) and remaining capabilities.

## Try the backend locally

No cloud credentials needed — it runs on a local `wrangler dev` (workerd + Durable Objects):

```bash
cd mcp-servers/timer && npm install      # the capability the backend bundles
cd ../../agent && npm install
npm test                                 # unit tests + local e2e (boots wrangler dev, drives a simulated device)
```

## Repository map

| Path | Workstream | Status | What lives here |
|------|-----------|--------|-----------------|
| [`docs/`](docs/) | Planning | ongoing | Vision, research, decisions (ADRs), open questions, roadmap, workflow |
| [`agent/`](agent/) | Agent layer | **built + verified** | Cloudflare Worker + Session Durable Object (gateway + harness); local e2e |
| [`mcp-servers/`](mcp-servers/) | Tools | **timer built** | MCP tool servers and MCP Apps (UI-bearing) servers |
| [`hardware/`](hardware/) | Electronics | BOM + wiring | Board selection, [BOM](hardware/BOM.md), [wiring guide](hardware/wiring.html), firmware notes |
| [`apps/`](apps/) | Client app | pending Q4 | The thin host that renders sessions + MCP Apps UIs on-device |
| [`design/`](design/) | Industrial design | owner-authored | Fusion 360 sources + exported manufacturing assets (STEP/STL) |

## Start here

1. [`docs/vision.md`](docs/vision.md) — the target experience, written as scenarios.
2. [`docs/architecture/overview.md`](docs/architecture/overview.md) — the system shape as built (fleet → gateway → harness → MCP).
3. [`docs/decisions/`](docs/decisions/) — the ADRs (what's decided and why).
4. [`docs/open-questions.md`](docs/open-questions.md) — **the decisions still to make** (Q4 client tech is next).
5. [`docs/roadmap.md`](docs/roadmap.md) · [`docs/workflow.md`](docs/workflow.md) — phased plan + how we work (the "dynamic workflow").
