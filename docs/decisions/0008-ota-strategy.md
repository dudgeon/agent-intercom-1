# 0008 — OTA: thin-shell + signed A/B app updater, Cloudflare as control plane
- Status: Accepted
- Date: 2026-05-31
- Deciders: Project owner
- Relates to: ADR 0003/0007 (device), ADR 0005/0006 (hosted backend), open question Q10

## Context
We need to update a fleet of countertop devices safely. The owner wants **minimal effort now**,
**remote access & diagnostics**, and **brick-safety & rollback** — three goals that normally
conflict (true brick-safety implies heavyweight atomic A/B *OS* images).

The thin-client bet (ADR 0005) shrinks the OTA surface decisively: **capabilities, MCP Apps,
and the harness are all hosted** — updating a feature is `wrangler deploy`, never a device OTA.
Device OTA only ever touches the **host shell** (kiosk WebView + WS client + hardware bridge +
e-ink driver + voice front-end), which changes rarely if we keep it deliberately thin.

## Decision
Adopt a **thin-shell + signed app-bundle updater**, with **Cloudflare as the control plane**,
splitting brick-safety into two layers so all three goals are met without the heavy build:

- **App layer (changes often) — A/B bundles + health-checked auto-rollback.** The updater
  verifies a **signature** (ed25519; public key baked into the image), stages the bundle to the
  **inactive slot**, flips a symlink, restarts the host service, then **health-probes** (boots +
  reconnects to the gateway within N seconds). On failure it reverts to the previous slot. This
  is cheap and gives rollback where change actually happens.
- **OS layer (changes rarely) — resilient, not yet atomic.** Read-only root + writable overlay;
  physical SD reflash is the acceptable in-home recovery for now.
- **Control plane = the gateway we already have.** Each device reports `version`/health over its
  existing Session-DO WebSocket on connect; the gateway replies with `{update: url, signature}`
  when a target version differs. Bundles live in **R2**, served by a Worker with signed URLs.
  The ADR 0005 device registry tracks current/target version + last-update result per device.
- **Remote access & diagnostics = Cloudflare Tunnel** (`cloudflared` on the device → Zero
  Trust) for on-demand SSH/logs, plus structured health telemetry (version, uptime, wake-word
  state, last update) over the existing WS.
- **Signing from day one** — even unranked, a compromised CDN must not be able to push code.

## Consequences
- Reuses our existing transport + backend; **no separate OTA infrastructure** to stand up.
- Brick-safety is real at the **app layer now**; full **OS atomic A/B (Mender/RAUC) or a
  managed platform (Balena)** is the explicit **graduation gate before any unit ships somewhere
  physically hard to reach.** Honest tradeoff: a bad *OS* update on an in-home unit may need a
  manual reflash until then.
- OTA couples to device identity/keys (Q10): the same per-device key that authenticates the
  WebSocket anchors update trust. Q10's identity/pairing design must land alongside first OTA.
- Keeping the native shell minimal is now a **standing requirement**, not just a nicety — it is
  what keeps OTA rare and low-risk.

## Alternatives considered
- **Managed platform (Balena):** great fleet ops/rollback/remote access out of the box, but a
  heavier on-device runtime and some lock-in. Reasonable later graduation; more than the
  prototype needs.
- **Atomic A/B OS images now (Mender/RAUC):** most brick-safe, but the most to build up front —
  deferred to the productization/remote-deployment gate.
- **Naïve in-place app update (git pull / unsigned tarball):** simplest, but no rollback and no
  trust — rejected.
