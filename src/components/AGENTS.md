# Components

## Purpose

Own reusable UI and the customer, staff, driver, and operations experiences.

## Ownership

Components consume route and shared-library state; shared domain rules belong in `src/lib/`.

## Local Contracts

- Follow the established responsive visual system and accessible interaction patterns.
- Keep workflow-specific UI in its owning area rather than growing a generic component without a concrete reuse case.
- UI primitives in `ui/` should remain low-level and broadly reusable.

## Work Guidance

Check sibling components for established app-store and formatting patterns before adding new ones.

## Verification

Use the source-level checks listed in `src/AGENTS.md` when requested or needed.

## Child DOX Index

- [admin/AGENTS.md](admin/AGENTS.md) — staff catalogue, order, and fulfilment workflows.
- [maps/AGENTS.md](maps/AGENTS.md) — shared delivery-map rendering.
- [shop/AGENTS.md](shop/AGENTS.md) — storefront, checkout, account, and tracking.
