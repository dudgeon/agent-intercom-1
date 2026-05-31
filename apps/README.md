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

Stack is **not yet chosen** — see open questions Q2 (display compute) and Q4 (client tech).
Current lean: a web/TypeScript host running in a WebView/kiosk browser on a Linux SBC, which
makes the host *also* a standards-true MCP Apps renderer and lets the same code run on a
desktop for development. The display is **~7.5" monochrome e-ink, non-touch** (ADR 0007), so
the host renders at e-ink cadence (partial refresh; no high-fps animation) and input is voice +
the mic switch + optional buttons/wheel — not touch.

**Keep this shell deliberately thin.** Per the OTA strategy (ADR 0008), the native footprint is
what determines how often we must push device updates. The shell should be a signed, A/B,
health-check-rollback **app bundle** that reports its version + health to the gateway over the
existing WebSocket and pulls updates the gateway offers (bundles in R2); remote access is via
Cloudflare Tunnel. Everything that *can* live in the cloud (capabilities, MCP Apps, harness)
must, so OTA stays rare.

_Empty until ADRs for Q2/Q4 land._
