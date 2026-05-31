# mcp-servers/ — capabilities as MCP tools & MCP Apps

Every device capability is an **MCP server**. Where a capability has a UI, the server also
ships an **MCP App**: a `ui://` resource (bundled HTML/JS) declared on a tool via
`_meta.ui.resourceUri`, rendered by the host in a sandboxed iframe, communicating back over
`postMessage`/JSON-RPC (`ontoolresult`, `callServerTool`, `updateModelContext`).

Bonus: because these follow the open MCP Apps standard, each app also runs in **Claude
desktop, ChatGPT, Goose, VS Code** — a free development/test surface before it ever touches
the hardware.

Planned first servers (open question Q7), chosen to exercise the full UI spectrum:
- **timer** — stateful, live-ticking, self-retiring; dismiss via soft button. *(first build)*
- **weather** — fetch + timed-persistence card.
- **recipe / artifact** — large scrollable HTML; scroll wheel + "next step" soft button.

Later: home control, calendar, lists/notes, and bridges to existing servers (the owner
already has Notion, Google Calendar, Gmail, Drive MCP servers connected).

## Conventions (to formalize in an ADR)
- One directory per server.
- Co-locate the tool implementation and its `ui://` app bundle.
- Document each app's **persistence policy** and which **hardware-input events** it consumes.

_Empty until Q7 / first build._
