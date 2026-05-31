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

> Decisions pending in [`../open-questions.md`](../open-questions.md): Q1 (harness location),
> Q2 (display compute), Q3 (voice), Q4 (client tech), Q5 (input bridge), Q6 (session model).
