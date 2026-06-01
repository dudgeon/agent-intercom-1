# 0004 — Voice pipeline is hybrid: local wake word, cloud STT/TTS with local fallback
- Status: Accepted
- Date: 2026-05-31
- Deciders: Project owner
- Resolves: open question Q3

## Context
The voice pipeline (WAKE → STT → NLP → TTS) can be fully local (privacy, offline), fully
cloud (quality, cheap device), or hybrid (Q3). The device is always-on on a counter, so the
"is it listening" boundary matters (Q8).

## Decision
**Hybrid:** the **wake word always runs on-device** (e.g. microWakeWord / openWakeWord), so
audio is only captured/streamed after a local trigger. **STT and TTS use cloud services when
online**, with a **local fallback** (e.g. Whisper + Piper) where feasible. NLP/agent routing
is the harness (ADR 0002).

## Consequences
- Good response quality with a strong privacy default: no audio leaves the home until the
  on-device wake word fires; that boundary anchors the privacy posture (Q8) and the
  mic-active LED affordance.
- Online dependency for best-quality STT/TTS; the local fallback's quality/compute cost needs
  evaluation (it may be minimal "degraded mode" rather than full parity).
- Pairs cleanly with the SBC (ADR 0003), which can run local fallback models, and with an
  ESP32-S3 front-end later running the wake word at very low power.

## Alternatives considered
- **Fully local:** max privacy/offline, but more compute + setup and lower quality than cloud
  STT/TTS today. Kept as the fallback tier, not the default.
- **Cloud STT/TTS (stream raw audio):** best quality/cheapest device, but weakest privacy and
  fully network-dependent. Rejected as the default; the on-device wake word is the key guard.
