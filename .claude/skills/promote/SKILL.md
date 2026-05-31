---
name: promote
description: Promote backend/MCP changes along the ADR 0009 path — local → cloud staging → canary device → production/fleet. Use when asked to deploy, release, ship to staging/prod, or roll out an OTA update. Requires Cloudflare credentials for the cloud tiers.
---

# Promote a change (local → staging → fleet)

Drives the ADR 0009 promotion gates. **Never skip a gate.** Each tier must be green before the next.

## Preconditions
- Local gates green first: run `test-backend` and `test-mcp` (and `test-client` if `apps/` changed).
- Cloud tiers need repo secrets `CLOUDFLARE_API_TOKEN` (+ `CLOUDFLARE_ACCOUNT_ID`). If absent,
  **stop** and tell the user — do not attempt to deploy.

## Gate 3 — Cloud staging
1. Deploy: `cd agent && npx wrangler deploy --env staging` (CI also does this via
   `.github/workflows/deploy-staging.yml` on merge to `main`).
2. Re-run the e2e **contract** against the deployed Worker (not a local dev server). Today the CI
   step does a `/health` smoke check; extend `verify-backend.ts` to accept a `STAGING_URL` so the
   full relay suite runs against staging.
3. Proceed only if green.

## Gate 4 — Canary device, then fleet (couples to ADR 0008 + Q10)
1. Point **one** real/simulated device at staging; verify a live session end-to-end.
2. For an OTA change: publish the **signed** bundle, let the **canary** device pull it, and confirm
   the **health-check + auto-rollback** path (a deliberately-bad bundle must roll back).
3. Only after the canary is healthy: production deploy (`wrangler deploy`) and **staged fleet OTA
   rollout** via the device registry. Watch versions/health reported over the gateway WebSocket.

## Guardrails
- Blocked until device identity/pairing (Q10) exists for anything touching real fleet OTA — flag
  this rather than improvising auth.
- If any gate fails, **halt** and report which gate + the failure; do not force-promote.
