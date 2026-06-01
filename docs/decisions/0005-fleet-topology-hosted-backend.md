# 0005 — Fleet of thin clients sharing a hosted backend; capabilities + UI served from the cloud
- Status: Accepted
- Date: 2026-05-31
- Deciders: Project owner
- Relates to: ADR 0002 (harness location), ADR 0003 (display compute)
- Resolves: open question Q6 (revised); raises Q10, Q11

## Context
The owner intends to run **multiple hardware clients in different rooms** of one home. So the
device is one of *N* thin renderers, not a singleton. Nothing room-specific or shared should
live only on a device: the **MCP servers and the MCP App UI bundles must be hosted centrally**
so every client renders the same capabilities, and so a device can be re-flashed/replaced
without losing state.

This fits MCP Apps cleanly: `ui://` resources are **served by the MCP server**, and any
compliant **host merely renders** them. The device is a renderer; the UI lives in the cloud.

But splitting an MCP host across the network exposes a subtlety. Normally one "host" (e.g.
Claude desktop) *both* drives the model/harness *and* renders UI. We are decoupling them:
- **Brain/harness** = Claude Managed Agents, in the cloud (ADR 0002).
- **Renderer** = the on-counter WebView (ADR 0003).
So we need a middle tier that holds the **session**, drives the harness, and **relays** tool
results — including UI-resource references — to the right device, and proxies the device's
hardware/`postMessage` events back to the MCP server.

## Decision
Adopt a **three-tier fleet topology**:

1. **Devices (fleet)** — thin WebView MCP-Apps *renderers* + voice I/O. Stateless beyond
   local wake word, identity/credentials, and presence. Replaceable.
2. **Session Gateway** — a **hosted service (Cloudflare Worker + Durable Objects)**:
   - device registry / identity / pairing / presence,
   - **one Durable Object per session** (state, hibernation), which is the append-only log
     the device renders as threads,
   - drives the **harness** (Managed Agents) and **relays** UI-resource refs + tool results
     to the owning device; proxies device input events (soft buttons, scroll, `callServerTool`)
     back to the capability server. This is the "harness adapter" promised in ADR 0002.
3. **Capability MCP servers (hosted)** — tools + their `ui://` MCP App bundles, deployed as
   remote MCP servers (Cloudflare `McpAgent`, streamable HTTP). Shared by all devices.

Cloudflare Workers/Durable Objects is the **default** for tiers 2–3 (per-session DO state,
hibernation, streamable-HTTP transport, edge latency). Not locked in — the gateway is an
interface; any hosted runtime that speaks the same contract qualifies.

## Consequences
- Add one new client capability → deploy/upgrade one hosted MCP server; **all rooms get it**
  at once. No per-device deploys for capabilities.
- Devices become cheap and disposable; reflashing one loses nothing (state is in the gateway).
- New surface area to design/operate: **device identity & pairing**, gateway auth, and the
  relay protocol between device ⇄ gateway ⇄ MCP server. The hardware-input bridge (Q5) now has
  a **network hop**, so its event contract must be transport-agnostic.
- New product questions about **multi-device behavior** (below) that single-device designs
  dodge.
- A hard dependency on the gateway being up; define degraded/offline behavior per ADR 0004's
  local fallback.

### To validate (spikes)
- Confirm the exact path by which a **Managed Agents** tool result carrying an MCP App
  `ui://` reference is surfaced to an *external* renderer (the device), and how `callServerTool`
  / `updateModelContext` round-trips through the gateway. This brain⇄renderer relay is the
  riskiest unknown; prototype it before committing the protocol.

## Alternatives considered
- **Per-device MCP servers / UI on the client:** breaks fleet consistency, multiplies deploys,
  loses state on reflash. Rejected (this is exactly what the owner ruled out).
- **Self-hosted gateway on a home hub (instead of Cloudflare):** viable and more private;
  becomes attractive alongside the ADR-0002 self-host path. Kept as the swap target behind the
  same gateway interface.
- **Devices as direct MCP clients of capability servers (no gateway):** would force each device
  to also be the harness/brain — contradicts ADR 0002 and duplicates session state per device.
  Rejected.
