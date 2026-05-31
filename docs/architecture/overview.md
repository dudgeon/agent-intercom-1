# Architecture overview (provisional)

> Reflects accepted ADRs 0002–0005 plus current leans in `docs/open-questions.md`. Updated as
> ADRs land.

## The shape: a fleet of thin renderers over a shared hosted backend

Multiple countertop devices live around the home (ADR 0005). Each is a thin **MCP Apps
renderer + voice I/O**. Everything shared — sessions, capabilities, and the UI bundles
themselves — is **hosted centrally**. We deliberately split the normally-unified "MCP host"
into a cloud **brain/harness** (ADR 0002) and an on-counter **renderer** (ADR 0003), with a
**Session Gateway** between them.

```
   ROOM A                         ROOM B                        ROOM C
┌───────────┐                 ┌───────────┐                ┌───────────┐
│  DEVICE   │                 │  DEVICE   │                │  DEVICE   │   ← fleet of thin
│ wake word │                 │ wake word │                │ wake word │     WebView hosts
│ mic/spkr  │                 │ mic/spkr  │                │ mic/spkr  │     (ADR 0003)
│ soft btns │                 │ soft btns │                │ soft btns │
│ scrollwhl │                 │ scrollwhl │                │ scrollwhl │
│ ┌───────┐ │                 │ ┌───────┐ │                │ ┌───────┐ │
│ │MCP App│ │  renders only   │ │MCP App│ │                │ │MCP App│ │
│ │iframe │ │                 │ │iframe │ │                │ │iframe │ │
│ └───────┘ │                 │ └───────┘ │                │ └───────┘ │
└─────┬─────┘                 └─────┬─────┘                └─────┬─────┘
      │  streamable HTTP / WS (prompt up; UI-resource refs + events down)
      └───────────────┬───────────────┴───────────────┬──────────────┘
                      ▼                                 
        ┌───────────────────────────────────────────────────────┐
        │  SESSION GATEWAY  — hosted (Cloudflare Worker + DOs)    │   ADR 0005
        │  · device registry / identity / pairing / presence     │
        │  · one Durable Object per SESSION (append-only log,     │
        │    hibernation) = the threads a device renders          │
        │  · drives the harness; RELAYS ui:// refs + tool results │
        │    to the owning device; proxies device input events    │
        │    (soft btn / scroll / callServerTool) to the server   │
        └───────┬───────────────────────────────────┬────────────┘
                │                                     │
                ▼                                     ▼
   ┌─────────────────────────┐        ┌──────────────────────────────────────┐
   │ HARNESS (the "brain")   │  MCP   │ CAPABILITY MCP SERVERS (the "hands")   │
   │ Claude Managed Agents   │◄──────►│ hosted remote MCP (CF McpAgent), each  │
   │ routes prompt → agents/ │        │ serving tools + its ui:// MCP App HTML │
   │ subagents + skills      │        │ timer · weather · recipe · home · …    │
   │   (ADR 0002)            │        │ shared by ALL devices                  │
   └─────────────────────────┘        └──────────────────────────────────────┘
```

Voice (ADR 0004): wake word runs **on each device**; STT/TTS go to cloud services when online,
with a local fallback. Only post-wake audio leaves the device.

## Key flows

**Prompt → response.** Device wake word → STT → prompt text → **gateway** opens/extends a
session (Durable Object) → drives the **harness** → agent picks skill/tool → **capability MCP
server** runs the tool, returns text and/or a `ui://` MCP App reference → gateway **relays**
it to the originating device → device fetches/renders the app inline in a thread → TTS speaks
the summary.

**Hardware control → app.** Soft button / scroll-wheel event on a device → gateway → injected
as a synthetic event into the focused app iframe (the Q5 bridge, now **transport-agnostic**
because of the network hop) → app calls `callServerTool()` → routed back through the gateway to
the MCP server → UI updates in place.

**Persistence.** Ambient lifetime (timer until fired, weather ~30 min) is tracked in the
session Durable Object so it survives a device reboot and could, in principle, follow the
session across devices.

## The pieces we still have to invent (and where they live)

1. **Brain⇄renderer relay** — surfacing a Managed Agents tool result that carries a `ui://`
   reference to an *external* device renderer, and round-tripping `callServerTool` /
   `updateModelContext` through the gateway. Riskiest unknown; spike first (ADR 0005).
2. **Hardware-input → MCP App bridge** (Q5) — now defined as a transport-agnostic event
   contract so it works across the network hop. Candidate to upstream as an MCP Apps extension.
3. **Ambient persistence/lifecycle** (Q6) — session-held, device-independent retirement of
   app UIs.
4. **Multi-device behavior** (Q10 identity/pairing, Q11 session affinity/roaming) — which
   device owns/shows which thread, and whether threads can move or mirror between rooms.

Everything else assembles from existing standards: MCP, MCP Apps, Claude Agent SDK / Managed
Agents, Cloudflare Agents (`McpAgent` + Durable Objects), and the Home Assistant voice
components.
