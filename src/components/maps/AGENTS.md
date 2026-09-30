# Maps

## Purpose

Provide map display shared by customer coverage/tracking and staff dispatch.

## Ownership

Owns map rendering, markers, attribution, and map-specific visual fallbacks. Caller code owns which locations are shown and why.

## Local Contracts

- Show OpenStreetMap attribution whenever its tiles are displayed.
- Show neighborhood centers only on the public basemap; exact customer pins can reveal location through tile requests.
- Avoid external geocoding or routing requests containing customer locations unless the user explicitly approves the provider and data transfer.
- Keep non-map status and address information available if tiles fail.

## Work Guidance

Use the shared `DeliveryMap` component; map points and area metadata are defined in `src/lib/delivery-map.ts`.

## Verification

Inspect tile attribution, map sizing, approximate-location labels, and the tile-error fallback.

## Child DOX Index

No child map component areas are indexed yet.
