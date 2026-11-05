# Convex Backend

## Purpose

Own persistent catalog, checkout, and order history capabilities implemented on Convex.

## Boundaries

- Convex functions are transport/application adapters. Keep deterministic business rules in `src/domain` with no Convex imports.
- Public queries expose only storefront catalog data. Public mutations may accept guest checkout, but must recalculate totals and stock from database records.
- Expose private order details, staff mutations, payment verification, and customer data only through functions that enforce authentication, active membership, role, and store or user scope server-side.
- Keep customer contact details in Convex only; never send customer address strings to map providers. For user-approved live delivery tracking, send only the active order's destination coordinates and assigned driver's current coordinates to Google Routes while the order is `out_for_delivery`; keep only the current fix and clear it when delivery ends.
- Use internal functions for setup and server-only workflows. Store business history as versioned records; do not add a message broker without a concrete consumer.

## Schema Changes

- Define validators for all persisted fields and indexes for each lookup path.
- Snapshot order item names and prices so later catalog edits do not change existing orders.
- Keep order, stock, customer aggregate, and initial event writes in one mutation transaction.
- Run Convex code generation after schema/function changes and keep generated files checked in.

