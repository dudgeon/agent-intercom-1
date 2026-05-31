# Research 01 — 2026 Landscape

A scan of the building blocks that exist today and how each maps to our requirements.
Captured 2026-05-31. Sources are linked inline and collected at the bottom.

---

## 1. The UI standard: MCP Apps (this changes the architecture)

**MCP Apps** became the *first official MCP extension* (SEP-1865) on **2026-01-26**, built
jointly by MCP maintainers at Anthropic + OpenAI and the MCP-UI community working group. It
is the standardized way for an MCP server to ship an interactive UI that a host renders
inline in a conversation. ([spec][mcpapps-spec], [blog][mcpapps-blog])

How it works:
- A tool declares a UI via `_meta.ui.resourceUri` pointing at a resource using the
  **`ui://` scheme** (e.g. `ui://charts/interactive`).
- The server serves that resource as **bundled HTML/JS**.
- The host renders it in a **sandboxed iframe with restricted permissions**.
- **Bidirectional comms** happen over **JSON-RPC via `postMessage`**. The SDK exposes an
  `App` class with `ontoolresult`, `callServerTool()`, and `updateModelContext()`.
- Shipping clients today: **Claude (web + desktop), Goose, VS Code Insiders, ChatGPT**;
  JetBrains, AWS, Google DeepMind have signaled intent. ([blog][mcpapps-blog])

**Why this is the linchpin for us:** our scenarios (weather card, live timer, soft-button
checklist, scrollable artifact) are *exactly* MCP Apps. It means:
- The **client app's main job is to be a compliant MCP Apps host** — i.e. it needs an
  embedded web/iframe runtime. This is the single biggest hardware/stack constraint.
- We can author each capability (weather, timer, routine, recipe) as an MCP App and it will
  *also* run in Claude desktop/ChatGPT — huge for development and reuse.
- Our hardware affordances (soft buttons, scroll wheel) need to be **bridged into the
  iframe** as input events the UI can subscribe to. That bridge is likely *our* custom
  extension on top of stock MCP Apps. (Open question Q5.)

Predecessors / related: **MCP-UI** (the community project this built on) and the **OpenAI
Apps SDK**. ([mcp-ui][mcpui]) Worth reading both for prior art on lifecycle & state.

> Implication for "thin client": a true MCP Apps host is *not* trivially thin — it needs a
> browser engine. "Thin" here means *agent-agnostic and capability-agnostic*, not
> *resource-light*.

## 2. The agent layer: Claude Agent SDK + Managed Agents

- **Claude Agent SDK** — framework for programmatic agents (agent loop, tool use, subagents,
  skills) outside the Claude Code terminal. **Subagents** run in isolated context windows
  and report back to an orchestrator — a natural fit for routing one prompt to one-or-more
  specialized agents. **Skills** are modular capability packages (instructions + scripts +
  resources) auto-invoked when relevant, each exposing a `/slash-command`. MCP is the
  standard connector to external tools. ([Anthropic engineering][agentsdk], [skills][skills])
- **Claude Managed Agents** — hosted runtime, GA beta **2026-04-08** (`managed-agents-2026-04-01`
  header). Anthropic virtualized the agent into **session** (append-only event log),
  **harness** (the loop calling Claude + routing tool calls), and **sandbox** (execution env)
  — decoupling the "brain" from the "hands" and the "session." Pricing: standard token rates
  **+ $0.08/session-hour**. Multi-agent coordination + self-eval are still research preview.
  ([Anthropic engineering][managed], [docs][managed-docs])

**Why this matters:** the **session/harness/sandbox decoupling mirrors our own architecture
need** — the device holds/display the *session*, something runs the *harness*, tools are the
*hands*. We can either (a) lean on Managed Agents for the harness+sandbox and keep the device
as a session viewer + voice I/O, or (b) run our own harness (Agent SDK) on a home hub. This
is **Q1**, the highest-leverage decision.

## 3. The voice pipeline

The mature open stack is **Home Assistant's Assist pipeline**: `WAKE → STT → NLP → TTS`,
with pluggable components over the **Wyoming protocol**. ([HA pipelines][ha-pipe])
- **Wake word:** `openWakeWord` (general) or `microWakeWord` (runs *on an ESP32-S3*, very
  low power). ([HA wake][ha-wake])
- **STT:** `faster-whisper` (GPU, high quality) or HA's `Speech-to-Phrase` (constrained
  phrases, fast/local). ([HA voice ch.10][ha-ch10])
- **TTS:** **Piper** — fast, natural, local. ([HA voice ch.10][ha-ch10])

**Two viable shapes:**
1. **Local-first:** wake word on-device, STT/TTS on a home hub (Pi/mini-PC, optionally GPU).
   Max privacy, more setup. ([local voice build][local-build])
2. **Cloud-assisted:** on-device wake word + VAD, stream audio to a cloud STT and back to
   cloud TTS. Best quality, lowest device cost, privacy tradeoff.

The HA stack is a strong reference even if we don't adopt HA wholesale — and HA could be one
*backend* the device talks to among others.

## 4. Hardware: countertop device with display + scroll wheel + soft buttons

DIY/maker ecosystem is rich and converging on **ESP32-S3** for the *audio/wake* role:
- All-in-one boards with **round touchscreen + integrated rotary encoder + center button**,
  e.g. **MaTouch ESP32-S3 Rotary 2.1" (480×480)** and VIEWE **ESP32-C3 1.28" knob**
  displays. ([MaTouch review][matouch], [VIEWE knob][viewe])
- Audio: **MAX98357A** I²S amp + **INMP441 / ICS-43434** I²S mics; **WS2812B** LED ring for
  "listening" feedback. ESPHome has first-class `rotary_encoder` + voice components.
  ([ESPHome rotary][esphome-rot], [ESP32 voice gist][esp-voice])

**The catch for us:** an ESP32 **cannot host an MCP Apps iframe** (no browser engine). So the
hardware likely splits into two camps (Q2):
- **Camp A — Embedded/MCU:** ESP32-S3 class. Cheap, low-power, instant-on. But UI must be
  *native-drawn* (LVGL), so MCP Apps HTML would need a translation layer or be off the table.
- **Camp B — Linux SBC + display:** Raspberry Pi / Radxa / mini-PC driving a touchscreen,
  running a real browser engine (Chromium/WebView) → renders MCP Apps natively. Higher cost,
  power, boot time, but **standards-true**.

A hybrid (ESP32-S3 as the always-on voice/encoder front-end + an SBC for the rich display)
is plausible but adds complexity.

---

## How the pieces line up against our scenarios

| Requirement | Best-fit building block | Confidence |
|---|---|---|
| Persistent, interactive in-thread UI | **MCP Apps** (`ui://`, sandboxed iframe, postMessage) | High |
| Soft buttons / scroll wheel into the UI | Custom **input bridge** layered on MCP Apps | Med — needs design |
| Agent routing to one-or-more agents/skills | **Claude Agent SDK** subagents + skills | High |
| Hosted harness/sandbox (offload from device) | **Claude Managed Agents** | Med — pricing/latency TBD |
| Wake word / STT / TTS | **HA Assist** stack (openWakeWord/microWakeWord, Whisper/Piper) | High |
| Always-on voice front-end | **ESP32-S3** + I²S mic/amp + encoder | High |
| Rich MCP Apps display | **Linux SBC + WebView** (browser engine) | High |
| Capabilities (weather, timer, routine, recipe) | **MCP tools + MCP Apps servers** | High |

---

## Sources

- MCP Apps blog (launch): [blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps][mcpapps-blog]
- MCP Apps spec repo: [github.com/modelcontextprotocol/ext-apps][mcpapps-spec]
- MCP-UI project: [mcpui.dev][mcpui]
- Claude Agent SDK (Anthropic engineering): [anthropic.com/engineering/building-agents-with-the-claude-agent-sdk][agentsdk]
- Agent Skills docs: [platform.claude.com/docs/en/agents-and-tools/agent-skills/overview][skills]
- Managed Agents (Anthropic engineering): [anthropic.com/engineering/managed-agents][managed]
- Managed Agents docs: [platform.claude.com/docs/en/managed-agents/overview][managed-docs]
- HA Assist pipelines: [developers.home-assistant.io/docs/voice/pipelines][ha-pipe]
- HA wake words: [home-assistant.io/voice_control/about_wake_word][ha-wake]
- HA Voice chapter 10: [home-assistant.io/blog/2025/06/25/voice-chapter-10][ha-ch10]
- Local voice build writeup: [joekarlsson.com/blog/local-voice-ai-home-assistant-gpu][local-build]
- MaTouch ESP32-S3 Rotary 2.1": [makerfabs.com][matouch]
- VIEWE ESP32-C3 knob display: [community.home-assistant.io][viewe]
- ESPHome rotary encoder: [esphome.io/components/sensor/rotary_encoder][esphome-rot]
- ESP32 + ESPHome voice assistant gist: [gist.github.com/EverythingSmartHome][esp-voice]

[mcpapps-blog]: https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/
[mcpapps-spec]: https://github.com/modelcontextprotocol/ext-apps
[mcpui]: https://mcpui.dev/
[agentsdk]: https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk
[skills]: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
[managed]: https://www.anthropic.com/engineering/managed-agents
[managed-docs]: https://platform.claude.com/docs/en/managed-agents/overview
[ha-pipe]: https://developers.home-assistant.io/docs/voice/pipelines/
[ha-wake]: https://www.home-assistant.io/voice_control/about_wake_word/
[ha-ch10]: https://www.home-assistant.io/blog/2025/06/25/voice-chapter-10/
[local-build]: https://www.joekarlsson.com/blog/local-voice-ai-home-assistant-gpu/
[matouch]: https://www.makerfabs.com/blog/post/project-review-diy-home-assistant-controller-with-matouch-esp32-s3-rotary-21
[viewe]: https://community.home-assistant.io/t/1-28-inch-240-240-esp32c3-round-display-with-rotary-knob-uedx24240013-md50e-by-viewe-company/786687
[esphome-rot]: https://esphome.io/components/sensor/rotary_encoder/
[esp-voice]: https://gist.github.com/EverythingSmartHome/055fbdde31a607ef9d695d5cac780e94
