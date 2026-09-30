# Routes

## Purpose

Bind application URLs to page experiences using TanStack Router file-based conventions.

## Ownership

Owns route definitions, route-level loaders, and composition of components into pages. Domain UI should remain in components.

## Local Contracts

- Follow the existing filename-to-path convention and route typing patterns.
- Treat `routeTree.gen.ts` as generated output; do not hand-edit it.
- Keep authorization expectations consistent with the current prototype and do not imply backend-enforced access where none exists.
- The `/admin` screen is a browser-local prototype with no staff authentication; do not describe its edits as synchronized across devices.

## Work Guidance

Use `src/routes/README.md` and neighboring routes when adding a page. Customer account and order routes compose `CustomerAccount`; checkout composes `CheckoutWizard`; order confirmation uses `/order-confirmation/$id`. `/admin` composes the task-first `StaffWorkspace`.

## Verification

Confirm the route URL and generated route tree remain consistent; use the source checks when requested or needed.

## Child DOX Index

No child route areas are indexed yet.
