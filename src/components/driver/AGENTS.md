# Driver Components

## Purpose

Own the phone-first driver workflow for assigned deliveries.

## Ownership

`DriverDashboard.tsx` reads assigned orders from `AppStore` and records status progress through store actions.

## Local Contracts

- Show only orders assigned to the selected demo driver; preview selection is not authentication.
- Keep the current delivery details, call action, and status update easy to use on a phone.
- Show approximate neighbourhood map points only. Never transmit exact customer addresses or coordinates to map providers.
- Do not describe manual stop order as turn-by-turn directions or imply live driver tracking.

## Verification

Check driver filtering, manual stop ordering, ready-to-out-for-delivery-to-delivered transitions, telephone links, and narrow screen layout.
