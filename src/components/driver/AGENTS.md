# Driver Components

## Purpose

Own the phone-first driver workflow for assigned deliveries.

## Ownership

`DriverDashboard.tsx` renders the authenticated driver's assigned orders from reactive Convex-backed workspace state and records status progress through authorized Convex mutations.

## Local Contracts

- Show only orders assigned to the authenticated driver; the backend must enforce the same identity and assignment on every status update.
- Keep the current delivery details, call action, and status update easy to use on a phone.
- Use approximate neighbourhood points until a stop is active. For the assigned current stop only, the approved live-tracking flow shares the driver's foreground GPS with that customer and sends driver GPS plus that active destination's coordinates to Google Routes for the route/ETA. Do not send address strings, other stops, or a breadcrumb trail.
- Stop GPS sharing when the active stop ends or the page is hidden. Manual sequence ordering remains distinct from turn-by-turn directions; live tracking applies only to the current `out_for_delivery` stop.

## Verification

Check driver filtering, manual stop ordering, ready-to-out-for-delivery-to-delivered transitions, telephone links, and narrow screen layout.

