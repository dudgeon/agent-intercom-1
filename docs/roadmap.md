# Roadmap (living)

Phased, but the phases are *bets to validate*, not a fixed schedule. Reorder freely as
decisions land. Checkboxes track reality.

---

## ▶ Where to pick up next (handoff — updated 2026-06-01)

**Built & locally verified (no cloud creds, no hardware):**
- `agent/` — Session Gateway (Cloudflare Worker + Session Durable Object = gateway+harness).
  Unit + Tier-2 e2e against real `wrangler dev` (`cd agent && npm test`).
- `mcp-servers/timer/` — Timer MCP + `ui://` countdown App. Unit + MCP-protocol e2e
  (`cd mcp-servers/timer && npm test`).
- `mcp-servers/weather/` — Weather MCP + `ui://` ambient card (Q6 timed-persistence). Real Open-Meteo
  fetch (injectable; tests hermetic). Unit + MCP-protocol e2e (`cd mcp-servers/weather && npm test`, 8/8).
- `apps/` — device host (ADR 0010): DOM-free core (`GatewayClient`/`SessionStore`/`AppBridge`)
  + thin DOM adapter. Unit + **simulated** e2e drives prompt→render→tick→dismiss against the live
  gateway (`cd apps && npm test`). Realizes most of the Q5 input bridge.
- Decisions: **ADRs 0001–0010**. CI mirrors the tiered tests per-area (`.github/workflows/ci.yml`).

**Cloud staging — LIVE (Gate 3, ADR 0009):**
- Cloudflare creds **verified** (2026-06-01): `wrangler whoami` + `/user/tokens/verify` (active);
  egress to `api.cloudflare.com` works.
- **Deployed** `agent-intercom-backend-staging` →
  `https://agent-intercom-backend-staging.dudgeon.workers.dev` (version `f89251f3`; confirmed via CF API).
- ⚠️ **Runtime verify blocked from the web sandbox:** the env network policy allowlists
  `api.cloudflare.com` but **not `*.workers.dev`**, so `/health` + the relay contract can't run
  against the deployed Worker from here (`Host not in allowlist`, 403). ➜ Add the staging host to the
  allowlist (or run the smoke from CI / outside) to finish Gate 3's functional check.
- **Gate 4 (canary device → fleet) still blocked by Q10** (device identity/pairing) + no hardware.

**Highest-leverage work that needs NO creds (pick up immediately):**
1. ✅ **Weather MCP App** — built (`mcp-servers/weather/`); timed persistence / lifecycle (Q6).
2. **Recipe MCP App** — large scrollable artifact + scroll-wheel + "next step" (exercises the
   `hw` bridge end-to-end).
3. Optionally split **Timer into a standalone remote MCP Worker** (today it's bundled by the
   backend e2e) — makes it faithful to ADR 0005.
4. Formalize **Q5** (input-bridge event vocabulary) and **Q6** (ambient persistence) as ADRs.
5. Add a **`verify:staging`** smoke (relay contract vs the deployed Worker) so Gate 3 has a real
   functional check — needs the staging host in the network allowlist to run.

**Owner decisions still open:** Q8 (privacy / data-boundary policy), Q9 (industrial-design
functional details), Q10/Q11 (device identity, pairing, session affinity) before any fleet rollout.

**Housekeeping:** PR **#1** is **merged to `main`** (inception + backend + Timer + device host). New
work branches off `main`; open PRs as draft.

## Phase 0 — Inception *(now)*
- [x] Vision + scenarios written (`docs/vision.md`)
- [x] 2026 landscape research with sources (`docs/research/01-landscape.md`)
- [x] Open-question / decision framework (`docs/open-questions.md`)
- [x] Workspace scaffold + workflow (`docs/workflow.md`, workstream dirs)
- [x] **Resolve Q1 (harness) + Q2 (display) + Q3 (voice)** → ADRs 0002, 0003, 0004
- [x] **Fleet topology + hosted backend** (multi-device) → ADR 0005 (resolves Q6; raises Q10/Q11)
- [x] **Resolve Q4 (client tech)** → ADR 0010 (web/TS host, core split from DOM)
- [x] Harness-on-Cloudflare (0006), e-ink panel (0007), OTA (0008), testing/CI-CD (0009)
- [ ] Gather Q9 industrial-design constraints from owner

## Phase 1 — Prove the core experience (one device, one app, real backend)
*Goal: speak → agent → a single MCP App renders on a device and responds to a soft button,
served from the hosted backend.*
- [x] **Spike the brain⇄renderer relay** (ADR 0005 risk): gateway surfaces a `ui://` tool
      result to an external renderer and round-trips `callServerTool` → **verified** in
      [`spike/relay-timer/`](../spike/relay-timer/) (`npm run verify`, 11/11 checks)
- [x] Stand up the **Session Gateway** (Cloudflare Worker + Session Durable Object) — built +
      locally verified (`agent/`)
- [x] Build the **Timer** as an MCP server + `ui://` MCP App (`mcp-servers/timer/`) — built +
      verified (still *bundled* by the backend e2e; standalone-remote split pending)
- [x] Stand up the client app as an MCP Apps host (Q4/ADR 0010) — built + **simulated** e2e
      (real dev hardware still pending)
- [ ] Wire the **harness** end-to-end with **real voice in/out** (ADR 0004) — harness loop exists;
      STT/TTS integration not yet wired
- [x] **Hardware→iframe input bridge** (Q5): soft button dismisses timer — spiked in
      [`spike/relay-timer/`](../spike/relay-timer/) and now realized in the host `AppBridge`
- [x] Decision: ADR for client tech (Q4 → 0010). Q5 input-bridge **vocabulary** ADR still to write

## Phase 2 — The UI spectrum + multi-thread
- [x] **Weather** MCP App (timed persistence / lifecycle) — built (`mcp-servers/weather/`)
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
