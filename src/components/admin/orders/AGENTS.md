# Admin Orders

## Purpose

Own staff order management and delivery dispatch views.

## Ownership

`DispatchOrdersQueue.tsx` contains phone-first order preparation, status, assignment, and payment checks at `/staff/dispatch`. `DispatchBoard.tsx` contains that route’s driver stop assignment, approximate map, and persisted manual sequence; it is also reused in `/admin`. Shared records and persistence are owned by `src/lib/`.

## Local Contracts

- Stop ordering is a staff-managed sequence and must not be presented as calculated road directions.
- Map a destination precisely only when the customer supplied coordinates; area-center points must be labeled approximate.
- Do not pass customer address or coordinate data to an external provider automatically.

## Work Guidance

Use `DeliveryMap` for staff visualization and `setDeliveryRouteSequence` for persisted ordering by driver.

## Verification

Check driver grouping, eligible order statuses, sequence persistence, and map pin precision.

## Child DOX Index

No child order component areas are indexed yet.
