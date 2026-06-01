# 0010 — Client/device host is a web/TypeScript app (Vite, framework-light), core split from DOM
- Status: Accepted
- Date: 2026-06-01
- Deciders: Project owner
- Resolves: open question Q4 · realizes much of Q5 · relates to ADR 0003 / 0007 / 0005 / 0009

## Context
ADR 0003 put the rich-display role on a **Linux SBC + WebView**, because MCP Apps render as
**sandboxed iframes** and need a browser engine. We want to **build and test the host before any
hardware exists**, and to keep the device shell **thin** (ADR 0008). The display is **e-ink,
non-touch** (ADR 0007), so input is voice + a mic switch + optional buttons/wheel, and rendering
must be calm (no animation).

## Decision
The host is a **web app in TypeScript**, bundled with **Vite**, **framework-light** (vanilla TS
shell; add a micro view-lib only if the thread UI ever demands it). It runs fullscreen in a
**kiosk Chromium** on the SBC (painting to e-ink via the OS framebuffer, ADR 0007) and
**identically in a desktop browser** for development.

**Core / adapter split (the load-bearing decision):**
- A DOM-free **core** — `GatewayClient` (WebSocket transport), `SessionStore` (threads/state),
  `AppBridge` (the host↔app contract) — that runs in Node *or* a browser.
- A thin **DOM adapter** that renders the thread column and one **sandboxed `<iframe>` per
  `ui://` app**, and wires real `postMessage` to the core.
- Result: the core is **unit-testable in Node** and **drivable headless** for the Tier-2
  simulated e2e (ADR 0009) — no hardware, no browser.

**MCP Apps host contract (the Q5 bridge lives here):** per-app sandboxed iframe; JSON-RPC-ish
`postMessage` between host (`intercom-host`) and app (`intercom-app`):
- host → app: `init` | `tick` | `state` | `hw`
- app → host: `ready` | `softButtons` | `callTool`

Hardware events (mic switch, soft buttons, scroll wheel) are injected to the **focused** app as
synthetic `hw` messages; an app's `callTool` is forwarded to the gateway as an `appEvent`.

**Rendering discipline (e-ink):** high-contrast, 1-bit-friendly, **no animation/transitions**,
coarse/throttled re-render; real-time signalling is **audio** (`say`), not motion.

## Consequences
- **Same code on device and desktop** → fast dev loop; the client is built and tested long before
  the enclosure or panel exist.
- The core/adapter split makes **`test-client` a real tier today** (unit + simulated e2e against
  `wrangler dev`).
- Confirms ADR 0003/0007: the device is "a kiosk browser that is also an MCP Apps host."
- **Q5** (hardware-input bridge) is largely realized here; a later ADR can formalize the exact
  event vocabulary (button counts, wheel semantics) once hardware is in hand.

## Alternatives considered
- **Native UI (LVGL/Qt):** cannot host MCP Apps HTML — breaks the open-standards bet (rejected
  in 0003).
- **Heavy SPA framework (React/Angular):** unnecessary weight for what is mostly an iframe host;
  start framework-light and only add a view layer if needed.
- **Electron:** redundant on the SBC — the kiosk WebView already *is* the runtime; Electron only
  adds bulk.
