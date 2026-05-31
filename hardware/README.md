# hardware/ — electronics & firmware

Board selection, bill of materials, wiring, and firmware notes for the countertop unit.

The device likely has **two compute roles** (open question Q2):
- **Always-on voice/encoder front-end** — ESP32-S3 class: I²S mic(s) (INMP441 / ICS-43434),
  I²S amp (MAX98357A) + speaker, rotary **scroll wheel** (encoder + push), **soft buttons**,
  WS2812B LED ring for "listening" feedback. microWakeWord can run here on-device.
- **Rich display/host** — a Linux SBC (Pi 5 / Radxa / mini-PC) driving the touchscreen and
  running the MCP Apps host (a browser engine). May be merged with the front-end or kept
  separate (hybrid).

Reference boards under evaluation:
- **MaTouch ESP32-S3 Rotary 2.1"** (480×480 round touchscreen + integrated encoder + button).
- **VIEWE ESP32-C3 1.28" knob display** (smaller, round).
- SBC + standalone touchscreen for the standards-true MCP Apps path.

## To capture here as decisions land
- `BOM.md` — parts, links, prices, quantities.
- `wiring.md` — pinouts, I²S/encoder/button mapping, power budget.
- `firmware/` — ESPHome config or custom firmware for the front-end.
- Power (USB-C PD vs. barrel), thermals, boot-time/instant-on notes.

_Empty until Q2 ADR + Phase 1 hardware spike._
