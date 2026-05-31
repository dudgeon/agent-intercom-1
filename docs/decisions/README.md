# Architecture Decision Records (ADRs)

Each significant decision gets a short, append-only record here. We **supersede** rather than
edit: a decision that changes gets a new ADR that references the old one.

## Format

```
# NNNN — <title>
- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD
- Deciders: <who>

## Context
What's the situation / forces? (link the open question, e.g. Q1)

## Decision
What we chose.

## Consequences
What becomes easier, harder, or constrained as a result.

## Alternatives considered
A / B / C and why not.
```

## Index

| # | Title | Status |
|---|-------|--------|
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions with ADRs | Accepted |
| [0002](0002-harness-location.md) | Harness in cloud (Managed Agents) for MVP, self-host path | Superseded by 0006 |
| [0003](0003-display-compute.md) | Device display compute: Linux SBC + WebView | Accepted (panel refined by 0007) |
| [0004](0004-voice-pipeline.md) | Voice: local wake word, cloud STT/TTS with local fallback | Accepted |
| [0005](0005-fleet-topology-hosted-backend.md) | Fleet of thin clients + hosted backend (gateway + remote MCP) | Accepted |
| [0006](0006-harness-on-cloudflare.md) | Run the agent loop on Cloudflare, co-located with the gateway | Accepted |
| [0007](0007-display-eink.md) | Display = ~7.5" monochrome e-ink, non-touch, rendered on-device | Accepted |
| [0008](0008-ota-strategy.md) | OTA = thin-shell + signed A/B app updater, Cloudflare control plane | Accepted |

> Decisions still pending in [`../open-questions.md`](../open-questions.md): Q4 (client tech),
> Q5 (input bridge), Q7 (first apps), Q8 (privacy), Q9 (industrial-design functional details),
> Q10 (device identity/pairing — *OTA portion decided in 0008*), Q11 (session affinity/roaming).
