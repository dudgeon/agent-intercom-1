# 0001 — Record architecture decisions with ADRs
- Status: Accepted
- Date: 2026-05-31
- Deciders: Project owner

## Context
This is a long-running, multi-domain project (software, agents, electronics, industrial
design) with many interdependent choices made over time. We need a durable record of *why*
each choice was made so later contributors (and future us) don't re-litigate settled ground
or lose the reasoning behind a constraint.

## Decision
Record every significant decision as a numbered ADR in `docs/decisions/`, using the template
in the README. ADRs are append-only; a changed decision is captured as a new, superseding
ADR.

## Consequences
- Cheap, searchable history of intent; onboarding and reversals are well-grounded.
- Small per-decision overhead (a few minutes to write).
- The open-question set (`docs/open-questions.md`) is the staging ground; resolved questions
  graduate into ADRs.

## Alternatives considered
- **Inline comments / commit messages only** — too scattered, lost over time.
- **A single growing design doc** — hard to see what changed and why; edits erase history.
