# Routes

## Purpose

Bind application URLs to page experiences using TanStack Router file-based conventions.

## Ownership

Owns route definitions, route-level loaders, and composition of components into pages. Domain UI should remain in components.

## Local Contracts

- Follow the existing filename-to-path convention and route typing patterns.
- Treat `routeTree.gen.ts` as generated output; do not hand-edit it.
- Protect staff and driver routes with `RequireMembership`; Convex functions remain the authority for every read and write.
- Do not imply that a role directory or client-side role choice grants access.

## Work Guidance

Use `src/routes/README.md` and neighboring routes when adding a page. Customer account and order routes compose `CustomerAccount`; checkout composes `CheckoutWizard`; order confirmation uses `/order-confirmation/$id`. `/admin` composes the task-first `StaffWorkspace`; `/demo-login` is a public directory linking to protected workspaces; `/staff/dispatch` supports order preparation staff and dispatch roles, `/staff/catalogue` supports catalogue roles, and `/driver` requires an active driver membership. Convex remains the authorization boundary.

## Verification

Confirm the route URL and generated route tree remain consistent; use the source checks when requested or needed.

## Child DOX Index

No child route areas are indexed yet.
