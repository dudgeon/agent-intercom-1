# apps/ — the client application (device host)

The thin, **agent-agnostic host** that runs on the countertop device. Its jobs:

1. **Voice front-end** — wake word, capture, hand audio to STT; speak TTS responses.
2. **Session UI** — render conversation **threads side-by-side**; create a new thread per
   prompt; keep in-progress threads alive.
3. **MCP Apps host** — render agent-delivered UI resources (`ui://`) inline in a thread in a
   **sandboxed iframe**, with bidirectional `postMessage`/JSON-RPC.
4. **Hardware input bridge** — translate soft-button presses and scroll-wheel motion into
   events the focused MCP App can consume (see open question Q5).
5. **Lifecycle/persistence** — keep ambient app UIs (timer, weather) on-screen for as long as
   appropriate, then collapse/retire them.

Stack is **decided** ([ADR 0010](../docs/decisions/0010-client-tech.md)): a **web/TypeScript**
host, **Vite**, framework-light, running in a kiosk WebView on the Linux SBC and **identically in
a desktop browser** for dev — which makes the host *also* a standards-true MCP Apps renderer. The
display is **~7.5" monochrome e-ink, non-touch** (ADR 0007), so the host renders at e-ink cadence
(no high-fps animation) and input is voice + the mic switch + optional buttons/wheel — not touch.

### Shape (core / adapter split)
- `src/core/` — **DOM-free**, runs in Node *or* a browser:
  - `gateway-client.ts` — WebSocket transport to the Session Gateway (device side of the relay).
  - `session-store.ts` — server-authoritative mirror of the threads the device renders.
  - `app-bridge.ts` — the host↔MCP-App `postMessage` contract (the Q5 bridge):
    host→app `init | tick | state | hw`, app→host `ready | softButtons | callTool`.
  - `protocol.ts` — wire types, kept in lockstep with `agent/src/session-do.ts`.
- `src/dom/` — thin DOM adapter: thread column + one **sandboxed `<iframe>`** per `ui://` app,
  real `postMessage`, plus dev affordances (prompt box, mic toggle, simulated soft-buttons).

### Develop
```bash
npm install
npm run dev          # http://localhost:5173 — append ?gw=ws://127.0.0.1:8788&room=Kitchen
```
Point it at a local gateway: in `../agent` run `npx wrangler dev`, then open the host with that
`?gw=…`.

### Test (ADR 0009 — `test-client` skill)
```bash
npm run typecheck    # tsc --noEmit
npm run test:unit    # vitest — session mirror + host/app bridge contract
npm run verify       # SIMULATED e2e: boots ../agent wrangler dev, drives the client core
npm test             # unit + e2e
```
No hardware, no browser: the simulated e2e drives the DOM-free core against a real `wrangler dev`.
Hardware-in-the-loop is a separate **manual** checklist (never gates CI).

**Keep this shell deliberately thin.** Per the OTA strategy (ADR 0008), the native footprint is
what determines how often we must push device updates. The shell should be a signed, A/B,
health-check-rollback **app bundle** that reports its version + health to the gateway over the
existing WebSocket and pulls updates the gateway offers (bundles in R2); remote access is via
Cloudflare Tunnel. Everything that *can* live in the cloud (capabilities, MCP Apps, harness)
must, so OTA stays rare.
