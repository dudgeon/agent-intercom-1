---
name: test-mcp
description: Test an MCP capability under mcp-servers/ (e.g. timer). Runs Tier-1 unit tests plus MCP-protocol e2e via an in-memory client — verifying tools, structured results, and ui:// MCP App resources. Use after changing anything under mcp-servers/.
---

# Test an MCP capability (`mcp-servers/<name>`)

Implements ADR 0009 for the capability layer. A capability is correct iff it **speaks MCP
correctly**, so the e2e drives the server through a real MCP `Client` over an in-memory transport
(the same shape any MCP host — Claude, ChatGPT, our gateway — uses).

## Steps
1. Install + test the changed capability (timer shown):
   ```bash
   cd mcp-servers/timer && (npm ci || npm install) && npm test
   ```
2. For a new capability, mirror `timer/`'s layout:
   - `src/server.ts` — `buildXServer()` returning `{ server }`, with `registerTool` + a
     `registerResource` for any `ui://` MCP App. **Keep it Workers-compatible** (no `fs`/`process`;
     embed HTML as a string module, see `timer/src/countdown.ts`).
   - `test/server.test.ts` — unit tests for the pure store/logic, **plus** protocol e2e:
     connect a `Client` via `InMemoryTransport`, `callTool`, and `readResource` the `ui://` app.
   - its own `package.json` with `"test": "vitest run"`.

## What the e2e must assert
- Each tool returns the expected `structuredContent` and, for UI tools, `_meta.ui.resourceUri`.
- The `ui://` resource is served with mimeType `text/html+skybridge` and contains the app bridge
  (`intercom-app`) so the host can render + round-trip events.
- Error paths return `isError: true` (e.g. dismissing an unknown id).

## Done when
`vitest` reports all unit + protocol-e2e tests passing for the capability.
