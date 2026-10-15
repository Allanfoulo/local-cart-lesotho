# Docs

## Purpose

Store durable product decisions, implementation specs, and operational documentation.

## Ownership

Owns files under `docs/`. Product specs describe intended behavior; deployment notes describe the current hosting setup.

## Local Contracts

- Keep dated design specs as decision records; update them only when the accepted scope changes.
- Separate future ideas from implemented behavior.
- Do not place secrets or real customer data in documentation.

## Work Guidance

Prefer concise, actionable guidance with links to the relevant app area.

## Verification

Check links and claims against the current repository before changing operational docs.

## Child DOX Index

No child documentation areas are indexed yet.

## Current product design

- [Mobile-first marketplace and app](superpowers/specs/2026-10-15-mobile-first-marketplace-app-design.md) — approved single-app direction, role workspaces, customer and staff journeys, mobile behavior, and app-store acceptance. See the [implementation plan](superpowers/plans/2026-10-15-mobile-first-marketplace-implementation-plan.md) for delivery phases.
- [Marketplace authentication and data flow](superpowers/specs/2026-10-10-marketplace-auth-membership-events-design.md) — Convex identity, store tenancy, authorization, and event boundaries.

## Earlier product design records

- [Role demo dashboards](superpowers/specs/2026-10-01-role-demo-dashboards-design.md) — approved role selector and phone-first dispatch and driver scope.

- [Staff, customer account, and checkout](superpowers/specs/2026-09-30-staff-customer-checkout-design.md) — earlier browser-local prototype scope; use the current marketplace design and phase plan for Convex-backed production behavior.
- [User roles and dashboards](user-roles-and-dashboards.md) — initial role and viewport exploration.
