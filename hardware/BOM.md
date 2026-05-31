# hardware/BOM.md — bill of materials (prototype, v0)

Shopping list for **one** countertop unit, derived from the functional requirements
([`requirements.md`](requirements.md)) and ADR 0003/0007. Prices are **approximate USD (2026)**
— verify at purchase. Links point at the canonical product/source, not a specific reseller.

> Two constraints shaped this list:
> 1. **Pi 5 has no analog audio jack** → sound needs an **I²S amp** (or USB audio).
> 2. **The 7.5" e-ink is a 40-pin HAT** → the mic/amp/switch/encoder share GPIO via a
>    **stacking header** (or wire the panel through its driver board with jumpers).

## Core — the definite needs

| ✓ | Item | Why / spec | Qty | ~$ | Source |
|---|------|-----------|-----|----|--------|
| ☐ | **Raspberry Pi 5 (4 GB)** | The SBC + WebView host (ADR 0003). 4 GB is plenty for a kiosk browser + e-ink; 8 GB (~$80) for headroom. | 1 | 60 | [raspberrypi.com](https://www.raspberrypi.com/products/raspberry-pi-5/) |
| ☐ | **Official 27 W USB-C PSU** | Pi 5 wants the 5.1 V/5 A supply; always-plugged unit. | 1 | 14 | [raspberrypi.com](https://www.raspberrypi.com/products/27w-power-supply/) |
| ☐ | **Pi 5 Active Cooler** | Pi 5 runs warm under a sustained browser; near-mandatory. | 1 | 5 | [raspberrypi.com](https://www.raspberrypi.com/products/raspberry-pi-5/) |
| ☐ | **microSD 32 GB (A2)** | Boot/OS. (NVMe is an optional upgrade later.) | 1 | 9 | — |
| ☐ | **Waveshare 7.5" e-Paper HAT — mono, 800×480, SPI** | The display (ADR 0007). Get the **black/white** version (not the (B)/(H) tri-color or 880×528 HD). | 1 | 55 | [waveshare.com](https://www.waveshare.com/7.5inch-e-paper-hat.htm) · [wiki](https://www.waveshare.com/wiki/7.5inch_e-Paper_HAT) |
| ☐ | **ReSpeaker USB Mic Array (XVF3000, 4-mic)** | Far-field (5 m) wake-word with onboard beamforming/AEC/noise-suppression; **USB** so it doesn't fight the e-ink HAT. Has a 3.5 mm out + 12 RGB LEDs. | 1 | 69 | [seeedstudio](https://www.seeedstudio.com/ReSpeaker-USB-Mic-Array-p-4247.html) |
| ☐ | **MAX98357A I²S amp breakout** | Speaker output for chimes/TTS (the real-time channel e-ink can't be). | 1 | 6 | [Adafruit guide](https://learn.adafruit.com/adafruit-max98357-i2s-class-d-mono-amp/raspberry-pi-usage) |
| ☐ | **Speaker, 4 Ω 3 W (≈40–50 mm)** | Pairs with the amp. | 1 | 4 | — |
| ☐ | **Mic/wake switch — latching SPDT toggle or slide** | The firm physical mic control (ADR 0007 / Q8). Wired to a Pi GPIO. | 1 | 2 | — |
| ☐ | **Status LED — WS2812 (or LED + 330 Ω)** | The "is it listening" indicator beside the switch (can't live on e-ink). WS2812 gives color states. | 1 | 2 | — |
| ☐ | **GPIO stacking header (2×20, extra-tall)** | Lets the amp/switch/LED/encoder tap GPIO while the e-ink HAT is seated. | 1 | 3 | — |
| ☐ | **Jumper wires + small perfboard** | Wiring the amp/switch/LED/encoder. | 1 | 6 | — |
| | | | | **~$235** | **core subtotal** |

## Optional — the "fun, not locked" inputs (ADR 0007) + upgrades

| ✓ | Item | Why | ~$ |
|---|------|-----|----|
| ☐ | **EC11 rotary encoder + knob** | The scroll wheel for paging artifacts (Q5 bridge). | 3 |
| ☐ | **Tactile buttons ×4 + caps** | Soft buttons for routine UI / "next step". | 3 |
| ☐ | **NVMe Base + SSD** | Faster/ more durable than microSD; later. | 40+ |
| ☐ | **Cheaper mic alt — ReSpeaker 2-Mics Pi HAT** | ~$13, but it's a *HAT* (collides with the e-ink HAT) and only near-field. Only if going USB-mic-free. | 13 |

## Build notes / gotchas

- **e-ink + other peripherals share the 40-pin.** The panel uses SPI0 + a few GPIO
  (RST/DC/CS/BUSY); I²S pins, I²C, and many GPIO remain free for the amp/switch/LED/encoder —
  reachable via the **stacking header** (or wire the panel through its driver board with
  jumpers instead of seating it as a HAT).
- **I²S audio on Pi 5:** `dtoverlay=max98357a`. Note a reported quirk where I²S works on
  **Bookworm** but not yet on **Trixie** — pin the OS accordingly. ([Pi forum](https://forums.raspberrypi.com/viewtopic.php?t=395006))
- **Audio-out alternative:** the ReSpeaker array has a **3.5 mm output**, so a small *powered*
  speaker into that jack avoids the I²S amp entirely. The MAX98357A path gives a cleaner
  integrated build; pick one.
- **Hardware mic-mute caveat (trust):** a USB mic array can't be power-cut by a simple switch,
  so the prototype switch drives a GPIO + software mute + the status LED. A *true* hardware
  cutoff (ideal for the Q8 privacy story) would need an analog-mic path or an inline USB power
  switch — revisit at productization.
- **No RTC needed:** the unit is networked → NTP. (Add a small RTC only if offline clocking
  matters.)

_Sources above. v0 — refine once the panel module and enclosure internals (Q9) are fixed._
