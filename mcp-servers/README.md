# mcp-servers/ — capabilities as MCP tools & MCP Apps

Every device capability is an **MCP server**. Where a capability has a UI, the server also
ships an **MCP App**: a `ui://` resource (bundled HTML/JS) declared on a tool via
`_meta.ui.resourceUri`, rendered by the host in a sandboxed iframe, communicating back over
`postMessage`/JSON-RPC (`ontoolresult`, `callServerTool`, `updateModelContext`).

**These run hosted in the cloud, shared by the whole device fleet** (ADR 0005) — not on each
device. Default runtime: **remote MCP servers on Cloudflare Workers (`McpAgent` + Durable
Objects**, streamable-HTTP transport, per-session state, hibernation). Adding a capability =
deploying/upgrading one hosted server; every room gets it at once.

Bonus: because these follow the open MCP Apps standard, each app also runs in **Claude
desktop, ChatGPT, Goose, VS Code** — a free development/test surface before it ever touches
the hardware.

Planned first servers (open question Q7), chosen to exercise the full UI spectrum:
- **timer** — ✅ built (`timer/`): `set_timer`/`dismiss_timer` + `ui://timer/countdown` MCP App
  (e-ink, 1-bit). Verified end-to-end through the backend (`agent/`). Coarse-refresh on e-ink
  (ADR 0007); dismiss via soft button → `callServerTool`. Still in-process to the Session DO;
  splitting it into a standalone remote streamable-HTTP MCP Worker is the next step.
- **weather** — fetch + timed-persistence card.
- **recipe / artifact** — large scrollable HTML; scroll wheel + "next step" soft button.

Later: home control, calendar, lists/notes, and bridges to existing servers (the owner
already has Notion, Google Calendar, Gmail, Drive MCP servers connected).

## Conventions (to formalize in an ADR)
- One directory per server.
- Co-locate the tool implementation and its `ui://` app bundle.
- Document each app's **persistence policy** and which **hardware-input events** it consumes.

_Empty until Q7 / first build._
