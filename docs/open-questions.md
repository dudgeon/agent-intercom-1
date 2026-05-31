# Open Questions — narrowing the option set

These are the decisions that, once made, collapse most of the downstream choices. They're
ordered by **leverage** (how much each one constrains the rest). Each has options, the
tradeoff, and a recommendation to react to. Resolved questions graduate into an ADR in
[`docs/decisions/`](decisions/).

Legend: ⭐ = my current lean.

---

## Q1 — Where does the agent harness run? *(highest leverage)* — ✅ RESOLVED → [ADR 0002](decisions/0002-harness-location.md)

> **Decided: Start cloud (Claude Managed Agents) for the MVP, with a clean adapter so the
> harness can later be swapped for a self-hosted Agent SDK on a home hub.**

The "brain + harness" can live in three places, and this decision drives latency, privacy,
cost, offline behavior, and how thin the device is.

- **A. Cloud-hosted (Claude Managed Agents).** Offload harness + sandbox. Device = voice I/O
  + session viewer. *+* least to build, scales, multi-agent built-in. *−* per-session-hour
  cost ($0.08/hr), network-dependent, data leaves home. ⭐ *for the MVP* — fastest path to a
  working end-to-end demo.
- **B. Home hub (self-hosted Agent SDK).** A mini-PC/Pi5 runs the harness. *+* private, no
  per-hour fee, local tools fast. *−* you operate it, no managed multi-agent, scaling is on
  you.
- **C. On-device.** Everything on the countertop unit. *+* fully self-contained. *−* needs a
  beefy SBC, hardest, worst model quality/thermals.

> Decision also sets the **offline story**: what still works with no internet?

## Q2 — Display/compute architecture of the device? *(drives hardware + UI)* — ✅ RESOLVED → [ADR 0003](decisions/0003-display-compute.md)

> **Decided: Linux SBC + touchscreen + WebView for the prototype (standards-true MCP Apps
> host). Hybrid (ESP32-S3 front-end + SBC) kept as the productization path.**

Because **MCP Apps require a browser engine**, this is really "how do we render
agent-delivered HTML UIs."

- **A. Linux SBC + touchscreen + WebView.** (Pi 5 / Radxa / mini-PC.) Renders MCP Apps
  *natively & standards-true*. *−* cost, power, boot time, bigger enclosure. ⭐
- **B. ESP32-S3 + LVGL native UI.** Cheap, instant-on, low power. *−* **cannot host MCP Apps
  HTML** — we'd need a server→LVGL translation layer (big custom effort, breaks "standards").
- **C. Hybrid:** ESP32-S3 always-on voice/encoder front-end + SBC for display. *+* best of
  both. *−* two compute domains to integrate.

> Recommendation: **A for the prototype** (prove the standards-true experience), keep **C**
> as the productization path once the UX is validated.

## Q3 — Voice pipeline: local vs. cloud? — ✅ RESOLVED → [ADR 0004](decisions/0004-voice-pipeline.md)

> **Decided: Hybrid — wake word always on-device; cloud STT/TTS when online with a local
> fallback.**

- **A. Local-first** (microWakeWord on-device, Whisper + Piper on hub). Private, no STT/TTS
  fees, works offline. *−* quality + setup effort, needs compute.
- **B. Cloud STT/TTS** (on-device wake/VAD, stream to cloud). Best quality, cheap device.
  *−* privacy, latency, network dependency.
- **C. Hybrid:** local wake word always; cloud STT/TTS when online, local fallback. ⭐

## Q4 — Client app technology?

The host that renders sessions + MCP Apps and bridges hardware input.

- **A. Web stack in a WebView/Electron-like kiosk** (TS/React). *+* same code as MCP Apps,
  huge ecosystem, easy to also run on a desktop for dev. ⭐
- **B. Flutter / native.** *+* perf, hardware integration. *−* second rendering path for the
  embedded MCP-App iframes anyway.
- **C. Embedded GUI (LVGL).** Only viable in the ESP32-only world (couples to Q2-B).

> If Q2 = A and Q4 = A, the device is essentially a **purpose-built kiosk browser** that is
> *also* an MCP Apps host. That's a clean, demoable mental model.

## Q5 — How do hardware controls reach the MCP App UI? *(novel design work)*

Soft buttons + scroll wheel must drive UIs that are sandboxed iframes. Stock MCP Apps don't
define hardware-input events.

- **A. Standard-extension bridge:** host injects synthetic events (scroll, button N) into the
  iframe over the MCP Apps `postMessage` channel; UIs opt in via a small client lib we
  publish. ⭐ *(keeps UIs portable; degrades gracefully in Claude desktop/ChatGPT)*
- **B. Map controls to plain DOM events** (wheel → scroll, buttons → focus+enter). *+* zero
  app changes. *−* limited; "soft button labels" need app cooperation anyway.
- **C. Out-of-band control channel** separate from the app iframe. *−* fragments the model.

> This is the most *inventive* part of the project and a candidate to upstream as an MCP Apps
> extension proposal.

## Q6 — Multi-thread session model & where session state lives? — ✅ RESOLVED → [ADR 0005](decisions/0005-fleet-topology-hosted-backend.md)

> **Decided: server-authoritative. Each session is a Durable Object in the hosted gateway;
> devices are renderers of that append-only log.** (Forced by the fleet topology — see Q10/Q11
> for the multi-device consequences.)

Side-by-side threads need a session store. Is the device the source of truth, or a view of a
server-held session (cf. Managed Agents' append-only session log)?

- **A. Server-authoritative session, device renders** (pairs with Q1-A). ⭐ **← chosen**
- **B. Device-authoritative**, syncs out. Better offline; more to build.

## Q7 — What are the first 3 capabilities (MCP Apps) to build?

Pick to exercise the full UI spectrum with minimum scope:
- **Timer** → stateful, self-retiring, live-ticking, soft-button dismiss. (exercises Q5)
- **Weather** → fetch + timed-persistence card. (exercises persistence/lifecycle)
- **Recipe / long artifact** → large scrollable HTML + scroll wheel + "next step" button.
  (exercises scroll wheel + artifacts)

⭐ Start with **Timer** — smallest surface that still forces us to solve the hardware→iframe
bridge (Q5) and persistence (Q6).

## Q8 — Privacy / "is it listening" posture & data boundaries?

Wake-word-only-on-device by default; explicit mic-active LED; define what audio/text leaves
the home and to whom. Tightly coupled to Q1 & Q3. Needs an explicit written policy before any
always-on mic ships.

## Q9 — Physical / industrial design constraints?

Inputs needed from you to start Fusion 360 work: counter footprint budget, screen
size/shape (round vs. rectangular — affects Q2 board choice), number of soft buttons (4?),
scroll-wheel placement (side vs. front), speaker chamber, mic array geometry, power (USB-C
vs. barrel), material/finish intent (kitchen-wipeable), and whether it should look like an
appliance or a gadget.

---

## Q10 — Device identity, pairing & fleet management? *(new — from ADR 0005)*

Multiple devices in different rooms means each needs an identity and a trust relationship with
the gateway.

- How does a new device **pair/enroll** (and get revoked)? QR/code pairing, per-device keys?
- How does the gateway **authenticate** a device on every connection (mutual TLS, signed
  tokens)?
- How are devices **named/located** ("Kitchen", "Office") and updated (OTA) across the fleet?
- Where do **user/account boundaries** sit — is the whole home one tenant?

> Needs a written design before any always-on device ships; couples to privacy (Q8).

## Q11 — Multi-device session behavior: affinity vs. roaming? *(new — from ADR 0005)*

With sessions in the gateway and many renderers, we must define *which device shows what*.

- **A. Device-affine:** a session belongs to the device it started on; other rooms don't see
  it. Simplest. ⭐ *for MVP*
- **B. Roaming/handoff:** "send the timer to the office," or pick up a thread on another device.
- **C. Mirrored/ambient:** some state (a running timer) is visible on **all** devices; most
  threads stay local.

> Decide A for MVP; design the session/Durable-Object model so B/C remain possible (the
> persistence in Q6 already lives server-side, which keeps the door open).

---

## Decision dependency sketch

```
Q1 (harness) ─► Q6 (session authority) ─► Q10 (device identity) ─► Q11 (affinity/roaming)
   │ ✅            │ ✅                        │ new                   │ new
   ▼               ▼                                                  
Q2 (display) ─► Q4 (client tech) ─► Q5 (hw→iframe bridge, networked)
   │ ✅                                  │
   ▼                                     ▼
Q9 (industrial design) ◄── Q3 (voice) ✅   Q7 (first apps)
```

✅ Q1, Q2, Q3, Q6 resolved (ADRs 0002–0005). Next leverage: **Q4** (unblocks code), then the
relay/bridge spike, then **Q10/Q11** before fleet rollout.
