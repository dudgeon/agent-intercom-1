# hardware/ — electronics & firmware

Board selection, bill of materials, wiring, and firmware notes for the countertop unit.
**Functional requirements live in [`requirements.md`](requirements.md)** — read that first.

Compute & display (ADR 0003 + **0007**):
- **Linux SBC + WebView host** — a Pi 5-class SBC runs the MCP Apps host (a browser engine),
  drives a **~7.5" monochrome e-ink panel, non-touch** (800×480, SPI / SSD16xx-class) via
  **partial refresh**, and owns audio + GPIO. Renders **on-device** (no server-side images).
- **Always-on voice front-end** — optional hybrid ESP32-S3 (productization, not v1): I²S mic
  array (INMP441 / ICS-43434), I²S amp (MAX98357A) + speaker; microWakeWord on-device.

Firm input/feedback hardware (ADR 0007):
- **Physical mic / wake-word switch + dedicated status LED** (state can't live on e-ink).
- **Optional** soft buttons + **scroll wheel/encoder** (Q5 bridge — "fun, not locked").

Reference parts under evaluation:
- A well-documented **7.5" 800×480 e-ink panel** (Waveshare-class SSD driver) on the SBC's SPI.
- Far-field I²S mic array + MAX98357A amp + small sealed speaker.
- (Hybrid path only) ESP32-S3 front-end board.

## To capture here as decisions land
- `BOM.md` — ✅ v0 core shopping list (Pi 5, 7.5" e-ink HAT, ReSpeaker USB array, I²S amp +
  speaker, mic switch + status LED). Parts, links, prices, gotchas.
- `wiring.html` — ✅ rich wiring + setup guide: SVG system diagram + GPIO pin map, per-peripheral
  tables, and step-by-step setup with a checklist + a pass/fail test per step. Open in a browser.
- `wiring.md` — pinouts, SPI/e-ink, I²S, switch/LED/encoder/button mapping, power budget.
- `firmware/` — e-ink driver + GPIO bridge; optional ESP32-S3 front-end config.
- Power (USB-C), thermals, e-ink refresh strategy (partial vs. full).

_Requirements captured in `requirements.md`; BOM/wiring empty until the Phase 1 hardware spike._
