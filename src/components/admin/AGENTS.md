# Admin Components

## Purpose

Own staff-facing catalogue, settings, order, and fulfilment interfaces.

## Ownership

Admin pages render shared workspace state through `AppStore`, whose operational queries and mutations are backed by Convex. Driver-facing workflows live under `components/driver/`.

## Local Contracts

- Keep order assignment and stop sequencing explicit and reviewable by staff.
- Treat area centers as approximate context, never as exact customer destinations or delivery boundaries.
- Public basemap views must not be centered on customer-provided coordinates; show the exact address in staff order details instead.
- Do not automatically transmit customer addresses or coordinates to third-party routing services.
- Keep the shared delivery-place directory limited to names and aliases staff have matched with verified coordinates and a configured service area.

## Work Guidance

`StaffWorkspace.tsx` is the task-first staff entry point and owns overview, order, customer, and report sections. `CatalogueManagement.tsx` owns product and stock edits; `OffersManagement.tsx` owns category and promotion edits. Keep these workflows, order actions, shop settings, and verified delivery places connected to Convex through AppStore actions and reactive workspace queries. Reuse the shared map component for dispatch visualization; keep manual ordering available independently of road-routing integrations.

## Verification

Check order status and assignment flows, customer-to-order matching, report date windows, and payment totals against `src/lib/types.ts` and app-store records.

## Child DOX Index

- [orders/AGENTS.md](orders/AGENTS.md) — order management, dispatch visualization, and manual stop order.
