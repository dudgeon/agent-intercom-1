# Vision

A countertop appliance — think a small, well-made kitchen device — that is your spoken (and
glanceable) front door to AI agents. Not a smart speaker that runs one assistant, but a
**thin client to many agents**, where the agents bring their own skills and *bring their own
UI* via open standards.

## Design tenets

1. **Agent-agnostic, standards-first.** The device is a *host*, not an agent. It speaks MCP
   and renders MCP Apps UIs. Swapping or adding an agent backend should not require
   re-building the client.
2. **Voice-first, screen-rich.** Voice is the primary input. The screen is for *glanceable
   state* and *interactive artifacts*, not for being a tablet you tap through.
3. **Persistent, ambient state.** A timer, a weather card, or a "dinner is in the oven"
   countdown should live on-screen for exactly as long as it is useful, then retire itself.
4. **Tangible controls.** Soft buttons (hardware buttons with software-driven labels) and a
   scroll wheel give satisfying, eyes-free-ish control of on-screen UIs and long artifacts.
5. **Multiple live sessions.** Conversations are threads. New prompts open new threads shown
   side-by-side with in-progress ones; nothing is lost mid-task.
6. **Home-trustworthy.** It lives on a counter, always listening for a wake word. Privacy,
   local fallback, and clear "it's listening" affordances are first-class.

## Scenarios (the spec, told as stories)

### S1 — Ask a question
> "What's the weather looking like this afternoon?"

Device wakes on wake word → captures audio → routes to the agent → agent calls a `weather`
MCP tool → the tool returns an **MCP App** weather card. A new thread appears showing my
prompt and the card. The card **persists ~30 min**, then collapses to a one-line summary.

### S2 — Set a timer (persistent, stateful UI)
> "Set a 12-minute timer for the pasta."

Agent calls a `timer` MCP App. A countdown UI renders in a thread and **persists until it
fires**, ticking live. When it ends, the device chimes and the card flips to a "Done —
dismiss?" state I can clear with a soft button.

### S3 — Interactive UI with soft buttons
> "Start my evening shutdown routine."

A routine MCP App renders a checklist. The four soft buttons are labeled by software:
`Lights`, `Lock`, `Thermostat`, `Done`. Pressing a soft button calls back into the server
tool (`callServerTool`) and the UI updates in place.

### S4 — Large scrollable artifact
> "Show me the recipe for the lasagna we made last week."

Agent returns a long HTML artifact (the recipe). I turn the **scroll wheel** to page through
ingredients and steps hands-messy-friendly; a soft button jumps to "Next step."

### S5 — Concurrent threads
While the pasta timer (S2) is still counting down, I ask an unrelated question (S1). The new
thread opens **beside** the timer thread; the timer keeps ticking. The layout reflows to
show both.

## Explicit non-goals (for now)

- Not a general tablet / app launcher. UI is agent-delivered, not a home-screen of icons.
- Not tied to a single cloud assistant brand.
- Not (initially) a multi-room mesh — start with one device, design so it could federate.

## Open tensions to resolve

- **Where does the agent run?** On-device, on a home hub, or in the cloud (e.g. Claude
  Managed Agents)? See [open-questions.md](open-questions.md) Q1.
- **How "thin" is the client really?** MCP Apps assume a host that can run a sandboxed
  iframe (a browser engine). That has hardware implications. See Q2 + Q5.
- **Voice pipeline ownership** — fully local (privacy) vs. cloud (quality)? See Q3.
