# Role Demo Dashboards Design

**Status:** Implemented as a browser-local demo.

## Purpose

Let a presenter preview the main customer and staff experiences through a role selector, with dedicated URLs for staff workflows. This is a browser-local prototype; it does not authenticate users or enforce permissions.

## Entry and routes

- `/demo-login` is a role directory labeled as a demo selector. Actions say “Open view” or “Preview”, not “Sign in”.
- Manager opens `/admin`, reusing the existing overview and complete staff workspace.
- Order and dispatch staff open `/staff/dispatch`, a dedicated phone-first workspace with order preparation and driver stop tabs.
- Stock and promotions staff open `/staff/catalogue`, reusing the catalogue and offers management components.
- Driver opens `/driver`, a phone-first list of that selected demo driver's assigned delivery stops.
- Customer opens `/account`; shopping remains available at `/` and `/shop`.

The selector offers the currently seeded driver identity where available. The driver page can switch between names assigned in local order data so the demo remains usable as assignments change. Deep links remain directly accessible and do not imply authorization.

## Dispatch and driver experience

Put the work list before the map on narrow screens. Make the current stop, order status, landmark, address instructions, contact action, and next status action easy to scan and tap. Keep map display optional/collapsible on phones and clearly label area-center markers as approximate. Dispatch staff can review assigned stops and change the saved manual sequence. The driver can progress an assigned ready order to out for delivery, then delivered. Do not claim turn-by-turn routing, live tracking, or external transmission of customer addresses or coordinates.

## State and boundaries

Continue using `AppStore` for orders, driver assignments, status changes, and manual route sequence. Catalogue and offers views reuse their existing components. The selector only navigates; it does not add a persisted user account or access-control model. Keep the existing storefront as `/`.

## Verification

Check route generation and navigation, the role selector destinations, driver filtering and ordering, status transitions, and narrow viewport layout. Verify maps remain approximate and driver contact uses a telephone link. Run repository typecheck, lint, and build where the environment permits.
