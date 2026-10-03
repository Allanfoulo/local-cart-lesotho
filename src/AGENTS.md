# Application Source

## Purpose

Own the TanStack Start and React application, its route structure, UI, and client-side domain state.

## Ownership

Application code under `src/`. Product-facing behavior is primarily composed in `components/`; route files bind URLs to those experiences; `lib/` owns shared types and domain helpers.

## Local Contracts

- Preserve existing TanStack Router file-route conventions and generated route tree workflow.
- Keep data changes compatible with `AppStore` persistence and the seed data unless backend integration is part of the task.
- Do not transmit customer addresses or coordinates to external services without explicit approval.
- Keep maps usable on narrow screens and include required map attribution.

## Work Guidance

Prefer existing components and utilities; add shared behavior to `lib/` only when it is genuinely domain-wide.

## Verification

Available checks are `npm run typecheck`, `npm run lint`, and `npm run build`. Run only checks requested or needed by the task.

## Child DOX Index

- [components/AGENTS.md](components/AGENTS.md) — reusable and workflow-specific UI.
- [lib/AGENTS.md](lib/AGENTS.md) — shared types, state, and domain helpers.
- [routes/AGENTS.md](routes/AGENTS.md) — URL and page composition.
