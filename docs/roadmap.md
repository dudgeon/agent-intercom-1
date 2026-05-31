# Roadmap (living)

Phased, but the phases are *bets to validate*, not a fixed schedule. Reorder freely as
decisions land. Checkboxes track reality.

## Phase 0 — Inception *(now)*
- [x] Vision + scenarios written (`docs/vision.md`)
- [x] 2026 landscape research with sources (`docs/research/01-landscape.md`)
- [x] Open-question / decision framework (`docs/open-questions.md`)
- [x] Workspace scaffold + workflow (`docs/workflow.md`, workstream dirs)
- [x] **Resolve Q1 (harness) + Q2 (display) + Q3 (voice)** → ADRs 0002, 0003, 0004
- [x] **Fleet topology + hosted backend** (multi-device) → ADR 0005 (resolves Q6; raises Q10/Q11)
- [ ] Resolve Q4 (client tech) — leaning web/TS in a kiosk WebView (pairs with ADR 0003)
- [ ] Gather Q9 industrial-design constraints from owner

## Phase 1 — Prove the core experience (one device, one app, real backend)
*Goal: speak → agent → a single MCP App renders on a device and responds to a soft button,
served from the hosted backend.*
- [ ] **Spike the brain⇄renderer relay** (ADR 0005 risk): gateway surfaces a `ui://` tool
      result to an external renderer and round-trips `callServerTool`
- [ ] Stand up the **Session Gateway** (Cloudflare Worker + Durable Object) — minimal
- [ ] Build the **Timer** as a hosted remote MCP server + MCP App (`mcp-servers/`)
- [ ] Stand up the client app as an MCP Apps host (per Q4) on dev hardware
- [ ] Wire the **harness** (Managed Agents, ADR 0002) end-to-end with voice in/out (ADR 0004)
- [ ] **Hardware→iframe input bridge** spike (Q5), transport-agnostic: soft button dismisses timer
- [ ] Decision: ADRs for client tech (Q4), input bridge (Q5)

## Phase 2 — The UI spectrum + multi-thread
- [ ] **Weather** MCP App (timed persistence / lifecycle)
- [ ] **Recipe** MCP App (large scrollable artifact + scroll wheel + "next step")
- [ ] Side-by-side multi-thread session model (Q6)
- [ ] Wake word always-on + "listening" LED affordance + privacy posture (Q8)

## Phase 3 — Industrial design v1
- [ ] Fusion 360 block-out matching the chosen board/screen/speaker/mic geometry (Q2, Q9)
- [ ] Export STEP + STL/3MF to `design/`; first printable enclosure
- [ ] Fit-check against the real BOM; iterate

## Phase 4 — Hardening toward a real appliance
- [ ] Power, thermals, boot-time, instant-on (revisit hybrid Q2-C)
- [ ] Offline behavior, failure modes, OTA update story
- [ ] Multi-capability skill routing; "one prompt → many agents"
- [ ] Manufacturing/assembly docs for others to reproduce

## Parallelizable anytime
- Author additional MCP Apps (each runs in Claude desktop/ChatGPT too — free test surface).
- Industrial-design exploration in Fusion 360 (constraints permitting).
- Privacy/security policy writeup (Q8).
