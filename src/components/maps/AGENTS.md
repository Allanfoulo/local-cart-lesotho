# Maps

## Purpose

Provide map display shared by customer coverage/tracking and staff dispatch.

## Ownership

Owns map rendering, markers, attribution, and map-specific visual fallbacks. Caller code owns which locations are shown and why.

## Local Contracts

- Use Google Maps as the basemap and show its built-in attribution. Show OpenStreetMap attribution for OSM-derived neighborhood references.
- Default coverage/dispatch views use approximate neighborhood centers. In approved live-tracking mode, show only the current driver's position and the active order's verified destination to its customer and assigned driver.
- Never send address strings to map providers. The approved active-delivery route request may send driver GPS and that order's exact coordinates to Google Routes; do not include other stops or retain a location trail.
- Keep non-map status and address information available if tiles fail.

## Work Guidance

Use the shared `DeliveryMap` component; map points and area metadata are defined in `src/lib/delivery-map.ts`.

## Verification

Inspect tile attribution, map sizing, approximate-location labels, and the tile-error fallback.

## Child DOX Index

No child map component areas are indexed yet.

