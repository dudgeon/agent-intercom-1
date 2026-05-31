# Spike: brain→renderer relay + Timer MCP App

> **Disposable spike** (per [`docs/workflow.md`](../../docs/workflow.md)). It exists to *prove
> one risky idea*, not to be the product. The Timer here graduates to `mcp-servers/` once the
> stack is chosen.

## What it de-risks

[ADR 0005](../../docs/decisions/0005-fleet-topology-hosted-backend.md) splits the normally-
unified MCP "host" across the network: the agent **brain/harness** runs server-side (it is the
MCP client) while the **renderer** is a separate device on the counter. Nothing off-the-shelf
does that hand-off. This spike proves it end-to-end, over a real WebSocket:

1. **prompt → harness → MCP tool** — `set_timer` runs on a real MCP server; its result carries
   `_meta.ui.resourceUri` (the MCP Apps way of attaching a UI).
2. **relay** — the gateway reads the `ui://timer/countdown` resource and relays the HTML +
   state to the device, which renders it in a sandboxed iframe.
3. **gateway-owned lifecycle** — the countdown ticks live and **self-retires** on expiry
   (the ambient-persistence idea, open question Q6).
4. **hardware → callServerTool** — a soft-button "Dismiss" press is injected into the app
   (the Q5 hardware-input bridge) and round-trips `dismiss_timer` back to the MCP server,
   which is the source of truth.

## Run it

```bash
cd spike/relay-timer
npm install

# Automated, headless end-to-end proof (no browser needed):
npm run verify        # -> "✅ RELAY VERIFIED — all checks passed"

# Human demo:
npm run gateway       # terminal 1: ws://localhost:8787
npx serve src/device/web   # terminal 2, then open the printed URL
#   type: "set a 1 minute timer for the eggs"  -> watch it render, tick, and Dismiss
```

## Layout

```
src/mcp/timer-server.ts   real MCP server: set_timer / dismiss_timer + ui:// resource
src/mcp/ui/countdown.html the MCP App + the candidate app-side hardware-bridge lib (Q5)
src/gateway/harness.ts    the "brain" interface + MockHarness (+ Managed-Agents swap sketch)
src/gateway/session.ts    in-memory stand-in for the per-session Durable Object
src/gateway/server.ts     THE RELAY — drives harness, reads ui://, relays, ticks, proxies events
src/device/headless-device.ts  renderer stand-in that emulates the app bridge (for verify)
src/device/web/index.html      browser renderer (WebView stand-in) for the human demo
scripts/verify-relay.ts   asserts the whole relay; exits non-zero on any failure
```

## How this maps to production (nothing here is load-bearing infra)

| Spike piece | Production (per ADRs) |
|---|---|
| `InMemoryTransport` MCP link | remote MCP over **streamable HTTP** (Cloudflare `McpAgent`) |
| `SessionStore` (in-memory) | one **Durable Object** per session (ADR 0005) |
| `MockHarness` | **Managed Agents** *or* **Agent SDK on Cloudflare** (see ADR 0002 — under review) |
| `ws` server | Cloudflare **Worker** WebSocket / streamable HTTP |
| headless/web renderer | the **device WebView** MCP Apps host |

## What it deliberately does NOT cover

- Real voice (wake word / STT / TTS), real auth, device pairing/identity (Q10).
- Multi-device routing / session roaming (Q11) — single device only.
- The MCP App UI lifecycle as a *standard* — persistence is gateway-side here; whether to
  propose hardware-input + lifecycle as an MCP Apps extension is still open (Q5/Q6).
