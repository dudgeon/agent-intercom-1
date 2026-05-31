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
desktop for development.

_Empty until ADRs for Q2/Q4 land._
