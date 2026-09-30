# Admin Orders

## Purpose

Own staff order management and delivery dispatch views.

## Ownership

`DispatchBoard.tsx` contains the staff dispatch map and persisted manual stop sequence. The parent `StaffWorkspace.tsx` owns the order queue. Shared records and persistence are owned by `src/lib/`.

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
