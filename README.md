# Agent Intercom

A countertop **voice + screen device** for the home that acts as a thin, agent-agnostic
*intercom* to one or more AI agents. You speak (or type) a prompt; a client application
routes it to the right agent/skill; the agent responds in a session thread on-screen; and
where it makes sense, a skill renders a **persistent, interactive UI** in that thread —
a weather card, a running timer, a soft-button menu, or a large scrollable HTML artifact
you page through with a hardware scroll wheel.

> Status: **Inception.** This repo currently holds the vision, research, an open-question
> set, and a workspace scaffold. No application code yet — we are narrowing the option set
> before committing to a stack.

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

## Repository map

| Path | Workstream | What lives here |
|------|-----------|-----------------|
| [`docs/`](docs/) | Planning | Vision, research, decisions, open questions, roadmap, workflow |
| [`apps/`](apps/) | Client app | The thin host that renders sessions + MCP Apps UIs on-device |
| [`agent/`](agent/) | Agent layer | Orchestration / routing to agents + skills |
| [`mcp-servers/`](mcp-servers/) | Tools | MCP tool servers and MCP Apps (UI-bearing) servers |
| [`hardware/`](hardware/) | Electronics | Board selection, BOM, wiring, firmware notes |
| [`design/`](design/) | Industrial design | Fusion 360 sources + exported manufacturing assets (STEP/STL) |

## Start here

1. [`docs/vision.md`](docs/vision.md) — the target experience, written as scenarios.
2. [`docs/research/01-landscape.md`](docs/research/01-landscape.md) — what exists in 2026 and how it maps to our needs.
3. [`docs/open-questions.md`](docs/open-questions.md) — **the decisions to make next** to narrow the stack.
4. [`docs/roadmap.md`](docs/roadmap.md) — phased plan across all workstreams.
5. [`docs/workflow.md`](docs/workflow.md) — how we work in this repo (the "dynamic workflow").
