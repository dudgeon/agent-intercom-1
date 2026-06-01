# 0007 — Display is a ~7.5" monochrome e-ink panel, non-touch, rendered on-device at e-ink cadence
- Status: Accepted
- Date: 2026-05-31
- Deciders: Project owner
- Refines: [ADR 0003](0003-display-compute.md) (the SBC + on-device WebView host decision stands)
- Relates to: ADR 0005 / 0006 (relay), open questions Q2, Q5, Q8, Q9

## Context
The owner wants an **e-ink/e-paper** display for a calm, paper-like, low-power, no-glow
countertop device. E-ink cannot smoothly animate, which forces choices about the UI tempo and
the device's render pipeline.

A "server renders the MCP App HTML to a bitmap and ships the image to a thin device" pattern
exists (TRMNL/Inkplate; Cloudflare Browser Rendering could do it on our stack). **The owner
rejected it as over-engineered ("Rube Goldberg").** We therefore keep the ADR 0005/0006 relay
unchanged — **HTML/MCP Apps go over the wire and are rendered on-device** (ADR 0003) — and only
adapt the device's display pipeline and the UI refresh contract to e-ink.

## Decision
- **Panel:** ~**7.5" monochrome (1-bit) e-ink, 800×480, non-touch** — the cheap, ubiquitous,
  best-documented size (SSD16xx-class SPI driver). Grayscale/color and larger IT8951 panels are
  **deferred**, not chosen.
- **Render pipeline:** the on-device WebView (ADR 0003) renders the MCP App and paints the
  e-ink panel via **partial refresh**, with a periodic **full refresh** to clear ghosting.
  **No high-fps animation.** This is *not* server-side image generation.
- **UI refresh contract for MCP Apps:** design for **1-bit, high-contrast, minimal redraw
  regions**; "live" elements update on a **slow cadence** — e.g. **timers refresh ~every 5s**.
  Real-time signaling is **audio** (chimes/TTS), not screen animation.
- **Input:** **no touch.** Interaction is **voice (wake word)** + a **physical mic/wake-word
  switch with a dedicated status LED** (a hard requirement — not drawn on the e-ink panel) +
  **optional** soft buttons and a scroll wheel/encoder (the Q5 bridge — "fun, not locked").

## Consequences
- **Relay/architecture unchanged** (ADR 0005/0006); the relay spike stays valid. Only the UI
  refresh contract and the device's display driver change. The spike's Timer app cadence moves
  from per-second to **~5s** on e-ink.
- We need a **"design for e-ink" guideline** for MCP Apps (1-bit, high contrast, no color/
  animation reliance, small dirty-rect updates). This shapes every capability's UI.
- **Mic/wake state is hardware** (switch + LED), because the panel can't show a reliable
  real-time "listening" cue. Satisfies the privacy affordance (Q8).
- **No touch** → all interaction is voice + physical controls; simplifies the panel/BOM and
  unlocks the well-supported non-touch HATs.
- Tradeoffs accepted: no rich media/video, no smooth motion, monochrome. Gains: calm, readable,
  very low power, no glow — aligned with the vision.

## Alternatives considered
- **Server-render HTML→bitmap→push image** (TRMNL / Cloudflare Browser Rendering): **rejected**
  by the owner as Rube Goldberg; kept only as a fallback if on-device rendering proves too
  heavy for the SBC.
- **Fast partial-refresh e-ink** (e.g. Inkplate 6MOTION, ~11fps): narrows hardware too much for
  a benefit we don't need given audio-first real-time signaling. Rejected.
- **LCD/OLED touchscreen** (ADR 0003's original assumption): rejected in favor of the e-ink
  aesthetic + low power; loses touch (accepted).
- **Grayscale/color or large IT8951 panels**: deferred — slower refresh (color 15-30s) and
  higher cost; revisit if artifacts need more than 1-bit.

## Panels evaluated (and why mono won on refresh)
Color and refresh speed trade directly in e-ink — there is no fast color e-ink today. Confirmed
mono after evaluating, in order of increasing refresh cost:
- **Mono 1-bit (Waveshare 7.5", chosen):** ~1-2s full, **~0.3-0.5s partial** — the only class that
  meets the ~5s tick with headroom.
- **16-level grayscale (Waveshare 7.8"/10.3", IT8951):** still partial-refresh ~1s, no color flash —
  the only "richer than 1-bit" option that keeps refresh fast. Held as the upgrade path.
- **Tri-color b/w/red (Adafruit 6415, 7.5"):** rejected — slowest practical class; vendor advises
  **refresh ≤ once per ~3 min** (red pigment ghosts). Also a bare panel needing a driver board.
- **6-color Spectra (Pimoroni Inky Impression 7.3", 2025):** rejected for the live model — **~12-25s
  full refresh, no partial update**; would force dropping live countdowns to static cards + audio.
  (Nice board otherwise: 4 onboard buttons, Qw/ST, Pi 5 support — reconsider only if we ever choose
  a calm, rarely-updating color surface over refresh.)
