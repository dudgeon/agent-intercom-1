# How we work — the dynamic workflow

This is a multi-domain project (software, agents, electronics, industrial design) explored
incrementally. The workflow is *dynamic*: we don't lock a 12-month plan up front; we keep a
living set of documents, make decisions explicitly, and let the next step fall out of the
last one.

## The loop

```
   ┌─ 1. Frame ──────────────────────────────────────────────┐
   │  Capture the goal/scenario in docs/. Surface the open    │
   │  questions that block progress (docs/open-questions.md). │
   └──────────────────────────────────────────────────────────┘
                              │
   ┌─ 2. Decide ─────────────────────────────────────────────┐
   │  Resolve the highest-leverage open question. Record it   │
   │  as an ADR in docs/decisions/. This narrows the options. │
   └──────────────────────────────────────────────────────────┘
                              │
   ┌─ 3. Spike / Build ──────────────────────────────────────┐
   │  Smallest thing that proves or kills the decision — a    │
   │  prototype, a BOM, a CAD block-out, a single MCP App.    │
   └──────────────────────────────────────────────────────────┘
                              │
   ┌─ 4. Learn & re-frame ───────────────────────────────────┐
   │  Fold results back into docs/. New questions emerge.     │
   │  Update the roadmap. Repeat.                             │
   └──────────────────────────────────────────────────────────┘
```

## Where things live

- **Truth about *why*** → `docs/decisions/` (ADRs). Append-only; supersede, don't rewrite.
- **Truth about *what's next*** → `docs/open-questions.md` + `docs/roadmap.md`.
- **Truth about *how it works*** → `docs/architecture/` and per-workstream `README.md`s.
- **Truth about *the thing itself*** → code in `apps/ agent/ mcp-servers/`, electronics in
  `hardware/`, CAD in `design/`.

## Conventions

- Every non-trivial choice gets an ADR (even "we chose A over B because X"). Cheap to write,
  invaluable later.
- Research notes are dated and **cite sources** (see `docs/research/`).
- Prototypes are disposable and labeled as such; don't let a spike masquerade as the product.
- Keep the client **agent-agnostic** and capabilities behind **MCP**: if a feature can be an
  MCP tool / MCP App, it should be — that's the project's core bet.

## Cadence with Fusion 360 (industrial design)

You author in Fusion 360; this repo holds the **exported, manufacturable assets** (STEP for
interchange, STL/3MF for printing) plus a `design/CHANGELOG.md`. When you share a new export
or screenshots, the assistant reads them, critiques fit/manufacturability against the
hardware BOM, and proposes the next iteration. Native `.f3d` archives can be committed too
(they're binary; see `design/README.md` for the LFS note).
