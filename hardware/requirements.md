# Device functional requirements (living spec)

Assistant-maintained **functional** requirements for the countertop unit. The owner owns
industrial design / aesthetics; this file captures *what the device must do and contain*, not
how it looks. Sourced from the design intake + ADRs. **[confirmed]** = owner-decided;
**[proposed]** = recommended default, not yet confirmed.

## Display
- **[confirmed]** ~**7.5" monochrome (1-bit) e-ink**, **800×480**, **non-touch** (ADR 0007).
- **[confirmed]** Rendered **on-device** (WebView per ADR 0003) and painted to e-ink via
  **partial refresh**; periodic **full refresh** to clear ghosting. No high-fps animation.
- **[confirmed]** "Live" UI updates on a slow cadence — **timers refresh ~every 5s**.
- **[confirmed]** **No server-side image generation** — HTML/MCP Apps relayed and rendered
  locally (keeps the ADR 0005/0006 relay).

## Input & controls
- **[confirmed]** **No touch.** Primary input is **voice** (wake word).
- **[confirmed]** **Physical mic / wake-word switch** with a **dedicated status LED** showing
  mic / listening state (not drawn on the e-ink panel). Hard requirement (privacy, Q8).
- **[confirmed, tentative]** **Soft buttons + scroll wheel/encoder** as the Q5 hardware→MCP-App
  bridge — "fun, not locked." Count/placement TBD; design to allow them.

## Audio
- **[proposed]** **Far-field mic array** (2–4 mics, e.g. INMP441/ICS-43434 class) for reliable
  across-room wake-word.
- **[proposed]** **Front-firing speaker** in a small sealed chamber — clear voice + chimes; this
  is the **real-time signal** channel that the e-ink screen can't be (alerts, "listening" tone).

## Compute
- **[confirmed]** **Linux SBC + WebView** as the MCP Apps host (ADR 0003) — e.g. Raspberry Pi
  5-class — also drives the e-ink panel (SPI) and the audio + GPIO (switch, LED, buttons,
  encoder). Hybrid ESP32-S3 always-on front-end remains a productization option, not v1.

## Form, power, mounting (functional aspects only)
- **[confirmed]** **Angled wedge / clock-radio** stance — screen tilted back for counter
  viewing; speaker + SBC + connectors in the base.
- **[proposed]** **Always-plugged, USB-C powered** (always-on counter unit; no battery).
- **[proposed]** **Countertop free-standing** for v1; reserve a boss pattern so a wall/under-
  cabinet mount could be added later.
- **[proposed]** **No camera** (strongest privacy/trust story; simplest enclosure).

## Open / needs owner input
- Camera: confirm **none** vs. camera-with-shutter vs. a camera-ready knockout.
- Exact 7.5" panel module (vendor, driver board, ribbon exit) → seeds the screen cutout.
- SBC choice + thermal solution (passive vs. fan) → internal volume & vents.
- Speaker driver size/amp + target acoustic quality (voice vs. light media).
- Soft-button count/placement and encoder vs. wheel.

## Derived starting envelope (for the owner's first CAD sketch)
7.5" 800×480 panel (~**170×110 mm** glass, ~**165×100 mm** active) + a Pi-class SBC + small
sealed speaker, in an angled wedge:
- Front face ~**185×130 mm**; lower bezel band (~20–25 mm) holds the mic switch + status LED
  (and optional soft buttons).
- Wedge depth/footprint ~**110–130 mm**; screen tilted back ~15–20°.
- Rough bounding box ~**185 W × 120 D × 130 H mm**. Side cutout for the encoder/wheel; rear
  USB-C inlet + mic-mute reach; top/edge mic ports away from the speaker.
