# Shop Components

## Purpose

Own customer storefront, checkout, account, and order-tracking experiences.

## Ownership

Shop components present customer workflows and use the shared app store for cart, order, and delivery state.

## Local Contracts

- Treat familiar place names and landmarks as valid delivery location details; street numbers are not required. Preserve former business names and customer directions as entered.
- Explain delivery fees, served areas, and location precision clearly before order placement.
- Treat a customer-confirmed location as optional. Keep exact coordinates out of external map and routing requests until an approved provider and data transfer are in scope.
- Let customers search staff-curated delivery place names and aliases locally; selecting one carries its verified area and coordinates into the order without a geocoding request.
- Order tracking reflects the persisted order status; do not imply live driver location unless that feature exists.
- Use approximate area points for map display; exact customer coordinates must not be sent through public basemap requests.

## Work Guidance

`CustomerAccount.tsx` owns the section-first profile, address, order, favourite, and preference views. `CheckoutWizard.tsx` owns delivery, payment, and review steps. Keep checkout and post-checkout tracking accessible on mobile; reuse shared map and status components.

## Verification

Review checkout and account order flows alongside the relevant route files and app-store state.

## Child DOX Index

No child shop component areas are indexed yet.
