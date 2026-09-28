# Mabote Fresh completion

Approved direction: finish the existing React/TanStack prototype using the original brief and mockup. Preserve Lovable configuration and published history.

## Experience
Warm neutral canvas, green primary actions, grocery photography, compact retail hero, category shortcuts and responsive product grids. Persistent mobile navigation and cart summary. Desktop storefront header and separate responsive staff sidebar.

## Architecture
File-based routes render reusable storefront, checkout, account and admin components. A single app-store provider owns browser-persisted demo data. Pure commerce functions validate quantities, stock, prices and discounts. Future backend services replace this boundary. Do not represent local demo sessions as secure authentication or mobile-money selection as collected funds.

## Scope and sequence
1. Repair persistence and commerce invariants; connect provider and route shell.
2. Home, catalogue, category, product, cart and multi-step guest checkout.
3. Confirmation, tracking, customer orders, reorder, profile, favourites and addresses.
4. Demo staff access, dashboard, orders and fulfilment, products, categories, stock, customers, delivery assignment, promotions, reporting and settings.
5. Installable app metadata and offline fallback; verify type checking, production build, commerce tests and browser journeys.

## Data behaviour
Orders reserve stock and snapshot prices. Cancellation restores stock once. Reordering uses current prices and available quantities with visible warnings. Checkout validates customer details, delivery area, minimum order and sufficient cash. Disabled payment options cannot be selected. Mobile money remains pending until staff record payment. Totals use two-decimal rounding. Promotions have dates, optional category/product targeting and minimum spend.

## Prototype boundaries
Data persists on this browser and synchronises between its tabs. Guest orders remain accessible locally. Staff access is an explicitly labelled demo gate, not production security. Real accounts, multi-device data, payment provider APIs, notifications and live maps require backend integrations. Geolocation is optional and never replaces the address. No advanced mapping.

## Verification
Test weighted arithmetic, invalid quantity and unavailable stock, promotion validity, cash validation and fulfilment transitions. Exercise browse to order, reload persistence, staff fulfilment and customer tracking. Inspect mobile and desktop for overflow, focus and readable controls.
