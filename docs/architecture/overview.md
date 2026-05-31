# Architecture overview (provisional)

> Provisional — reflects the current leans in `docs/open-questions.md`, not committed
> decisions. Updated as ADRs land.

## The mental model: a 3-layer split that mirrors Managed Agents

Anthropic's Managed Agents decomposes an agent into **session** (event log), **harness**
(the loop), and **sandbox/tools** (the hands). We borrow that split as our system boundary:

```
┌──────────────────────────────────────────────────────────────────────┐
│  DEVICE (countertop unit) — the thin, agent-agnostic HOST              │
│                                                                        │
│   ┌────────────┐   ┌──────────────────────────────────────────────┐   │
│   │ Voice I/O  │   │ Session UI  (side-by-side threads)            │   │
│   │ wake/STT/  │   │  ┌────────────┐ ┌────────────┐                │   │
│   │ TTS, mics, │   │  │ thread A   │ │ thread B   │   each thread  │   │
│   │ speaker,   │   │  │ ┌────────┐ │ │ ┌────────┐ │   can embed an │   │
│   │ LED ring   │   │  │ │MCP App │ │ │ │MCP App │ │   MCP App in a │   │
│   └────────────┘   │  │ │(iframe)│ │ │ │(iframe)│ │   sandboxed    │   │
│                    │  │ └────────┘ │ │ └────────┘ │   iframe       │   │
│   ┌────────────┐   │  └────────────┘ └────────────┘                │   │
│   │ HW controls│──►│  input bridge → postMessage into the iframe   │   │
│   │ soft btns, │   └──────────────────────────────────────────────┘   │
│   │ scroll wheel                                                       │
│   └────────────┘                                                       │
└───────────────┬────────────────────────────────────────────────────────┘
                │  (network)
                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  HARNESS  (Claude Managed Agents  OR  self-hosted Agent SDK)           │
│   - holds the append-only SESSION log                                  │
│   - runs the agent loop, routes prompts to agents/subagents + skills   │
└───────────────┬────────────────────────────────────────────────────────┘
                │  MCP
                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  CAPABILITIES — MCP servers (the "hands")                              │
│   timer · weather · recipe/artifacts · home control · calendar · …     │
│   Each may ship an MCP App (ui:// HTML) rendered up in the device.      │
└──────────────────────────────────────────────────────────────────────┘
```

## Key flows

**Prompt → response:** wake word → STT → text prompt → harness creates/extends a session
thread → agent selects skill/tool → MCP tool runs → returns text and/or an MCP App UI
resource → device opens/updates a thread and renders the app inline → TTS speaks the summary.

**Hardware control → app:** soft button / scroll-wheel event → device input bridge →
synthetic event over `postMessage` into the focused thread's MCP App iframe → app calls
`callServerTool()` if it needs server-side action → UI updates in place.

**Persistence:** each rendered app declares how long it should live (e.g. timer = until
fired; weather = ~30 min). The device's session UI owns the retirement timers and collapse-
to-summary behavior. (Lifecycle semantics: open question — may need an MCP Apps extension.)

## The two things we likely have to invent

1. **Hardware-input → MCP App bridge** (soft buttons, scroll wheel) — see Q5. Candidate to
   propose as an MCP Apps extension so apps stay portable.
2. **Persistence/lifecycle hints** for ambient, self-retiring app UIs — see Q6. Stock MCP
   Apps render inline in a chat; "lives on a counter for 30 minutes then collapses" is our
   ambient twist.

Everything else should be assembled from existing standards: MCP, MCP Apps, the Agent
SDK/Managed Agents, and the Home Assistant voice components.
