# Driver Components

## Purpose

Own the phone-first driver workflow for assigned deliveries.

## Ownership

`DriverDashboard.tsx` renders the authenticated driver's assigned orders from reactive Convex-backed workspace state and records status progress through authorized Convex mutations.

## Local Contracts

- Show only orders assigned to the authenticated driver; the backend must enforce the same identity and assignment on every status update.
- Keep the current delivery details, call action, and status update easy to use on a phone.
- Show approximate neighbourhood map points only. Never transmit exact customer addresses or coordinates to map providers.
- Do not describe manual stop order as turn-by-turn directions or imply live driver tracking.

## Verification

Check driver filtering, manual stop ordering, ready-to-out-for-delivery-to-delivered transitions, telephone links, and narrow screen layout.
