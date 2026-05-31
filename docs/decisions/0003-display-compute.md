# 0003 — Device display compute is a Linux SBC + WebView (standards-true MCP Apps host)
- Status: Accepted (display *panel* refined by [ADR 0007](0007-display-eink.md))
- Date: 2026-05-31
- Deciders: Project owner
- Resolves: open question Q2

> **Refined by [ADR 0007](0007-display-eink.md):** the panel is a **~7.5" monochrome e-ink,
> non-touch** display, and the SBC's WebView renders **on-device** at e-ink cadence (no
> server-side image generation). The SBC + on-device WebView decision below **stands and is
> reinforced**; "touchscreen" in the original text is superseded by "non-touch e-ink".

## Context
MCP Apps (our UI standard, ADR-adjacent core bet) render as **sandboxed iframes** and
therefore require a **browser engine**. The device must render agent-delivered HTML UIs
standards-true (Q2). A bare ESP32 cannot host an MCP Apps iframe.

## Decision
The rich-display role runs on a **Linux SBC (e.g. Raspberry Pi 5 / Radxa / mini-PC) driving a
touchscreen, with a WebView/kiosk browser** as the MCP Apps host. This is the prototype
target.

## Consequences
- The device is, in effect, a **purpose-built kiosk browser that is also an MCP Apps host** —
  a clean, demoable mental model that pairs naturally with a web/TypeScript client (Q4) and
  lets the same client run on a desktop for development.
- Higher cost, power draw, boot time, and a larger enclosure than an MCU — fold into the
  industrial-design constraints (Q9) and revisit "instant-on/thermals" in Phase 4.
- Keeps the door open to the **hybrid** path (ESP32-S3 always-on voice/encoder front-end + SBC
  display) as the productization step once the UX is validated — the SBC decision doesn't
  block that, it precedes it.
- The hardware-input→iframe bridge (Q5) is implemented on the SBC/host side.

## Alternatives considered
- **ESP32-S3 + LVGL native UI:** cheap/instant-on/low-power, but cannot host MCP Apps HTML;
  would require a server→LVGL translation layer that breaks the open-standards bet. Rejected.
- **Hybrid now:** best end-state, but two compute domains add integration cost before the core
  experience is proven. Deferred to productization.
