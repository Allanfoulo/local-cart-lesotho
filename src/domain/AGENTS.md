# Domain

## Purpose

Own framework-independent business concepts and deterministic rules.

## Contracts

- Do not import React, TanStack, Convex, database clients, or external APIs.
- Validate business invariants with pure functions and explicit input/output types.
- Keep money in LSL and apply the domain's two-decimal rounding rule consistently.
- Add versioned event contracts only for meaningful business changes with a durable history or consumer.

## Child DOX Index

- [orders/AGENTS.md](orders/AGENTS.md) - checkout pricing and order event contracts.
