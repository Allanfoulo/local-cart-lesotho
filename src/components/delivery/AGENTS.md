# Delivery Location Components

## Purpose

Capture customer delivery descriptions, optional customer pins, and selections from the staff-curated local place directory.

## Ownership

`LocationPicker.tsx` edits a `DeliveryAddress`; checkout owns saved place search and order submission.

## Local Contracts

- A familiar place name or delivery description can replace a formal street number.
- Selecting a curated place uses its verified area and coordinates; do not geocode or send it to external map or routing services.
- Keep customer directions separate from a selected landmark and preserve them on the order.
- A customer GPS pin is optional and must remain local unless external sharing is explicitly approved.

## Work Guidance

Keep the inputs usable on narrow screens and provide a text entry path when the curated directory has no match.

## Verification

Check manual place entry, alias search, selected coordinates, and the no-match path in checkout.

## Child DOX Index

No child delivery areas are indexed yet.
