# Shared Library

## Purpose

Own shared domain types, client state, seeded data, and framework-independent helpers.

## Ownership

`types.ts` defines shared records, `app-store.tsx` persists app state, and focused modules provide domain operations and formatting.

## Local Contracts

- Keep domain helpers deterministic and avoid network side effects unless explicitly designed and approved.
- Persist newly introduced app state through the established store pattern.
- Keep approximate map reference data clearly distinct from customer-provided coordinates.
- Keep customer coordinates out of map requests by default. The user-approved live-tracking path may send only the active order's destination coordinates and the assigned driver's current GPS to Google Routes while `out_for_delivery`; never send address strings or data for queued stops.
- Store staff-curated delivery place aliases with verified coordinates in the app store; never infer pins from a name or transmit these coordinates externally without approval.
- Copy a selected landmark's canonical name and coordinates onto the delivery address so later catalog edits do not move an existing order's destination.
- Keep authenticated order ownership tied to the Convex user identity and allow guest orders to retain their customer contact snapshot. Keep cart and harmless presentation preferences local; operational state belongs in Convex. Require staff payment verification rather than inferring payment from delivery status.

## Work Guidance

Avoid adding UI dependencies or component markup here. Update callers when changing shared types.

## Verification

Check types and state initialization/persistence together for new state fields.

## Child DOX Index

No child library areas are indexed yet.

