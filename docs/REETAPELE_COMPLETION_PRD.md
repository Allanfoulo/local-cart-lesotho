# REETAPELE Product Completion PRD

**Status:** Requirements for review and delivery planning  
**Product:** REETAPELE — neighbourhood marketplace for everyday essentials  
**Pilot:** First-party grocery store, Ha-Matala Phase I and/or Phase II, Maseru; exact coverage is undecided.  
**Operating constraint:** Prove one store's dependable operations before activating independent merchants.

## 1. Product outcome

A customer can understand the catalogue and supported area, place an order with an accurate total, receive meaningful updates, and get the correct items delivered. Store staff can accept, prepare and dispatch that order with role-appropriate access. A driver can complete only assigned deliveries and records a verifiable handoff. English and Sesotho customers can complete the same journey.

The platform remains ready for future merchants, but the pilot runs through the REETAPELE-owned store. Marketplace settlements and automatic recurring orders are explicitly outside the pilot.

## 2. Primary journeys

### Customer

1. Open the storefront and choose English or Sesotho before sign-in; preference persists across visits.
2. Browse real products with price, unit/weight options, stock state and localized description.
3. Add and adjust items; cart preserves quantities through registration/sign-in.
4. Enter/select an address and landmark. The server validates it against currently active pilot zones.
5. Review item totals, delivery fee, payment instructions and final Maloti total.
6. Place once; retries return the same checkout receipt. The server rechecks price, availability, minimums and stock.
7. See order state and clear next steps for accepted, delayed, rejected, changed, dispatched, delivered or failed orders. Request support from a visible contact path.
8. View order history and, after P0 validation, add a past order or named saved basket to cart for review.

### Store operations

1. Owner/manager maintains actual operating hours, active areas, fee rules, catalogue and available stock.
2. Store-scoped staff see their eligible queue. Manager assigns preparation staff and dispatcher assigns an active store driver.
3. Order staff check items and quantities against a photo-backed checklist; only complete eligible orders advance to ready.
4. Driver sees assigned deliveries and necessary address/instructions, updates dispatch state and records failed attempts.
5. Delivery completes only after the assigned driver enters the customer's confirmation code or an authorized, documented support recovery is performed.
6. Staff can find the order's event history and follow a documented recovery path without creating duplicate orders.

### Platform operator

1. Keep the first-party store as a first-class store with its own identity, products, staff and financial records.
2. Later, review merchant applications and activate separate merchant identities, permissions, financial ledgers and storefronts.
3. No merchant payout or provider-backed payment becomes available until its policy, integration and reconciliation gates pass.

## 3. Functional requirements

### Pilot P0

- **Localization:** `en-LS` and `st-LS`; pre-auth visible switcher; persisted selection; structured messages and fallback; translated dynamic errors, statuses, checkout/payment instructions and customer notifications; fluent-speaker review required.
- **Delivery zones:** separate configurable Phase I and Phase II entries; enable/disable without code deployment; store and (if needed) area-level fees; serviceability rule must be explicit (verified named-area list or operationally validated boundary). Never infer a customer's supported status from an unverified map point alone.
- **Checkout:** server-authoritative totals and stock; authenticated customer ownership; stable retry behavior; clear pending mobile-money status; cash change details; no card option without an integration.
- **Fulfilment:** role- and store-scoped allowed transitions; photo-backed preparation; timestamps/actor history; independent handling of linked child orders; clear rejection, cancellation, unavailable-item and failed-delivery procedures.
- **Inventory:** store-specific stock; available quantity validation; atomic decrement; auditable corrections with actor/reason; low-stock threshold and staff-visible attention state.
- **Delivery:** assigned driver only; necessary customer address data only; protected coordinates; network/GPS fallback; confirmation code; failed-delivery report; timestamped completion and support override record.
- **Customer updates/support:** message state should say sent only after provider acknowledgment; failed send remains visible for retry/escalation; English/Sesotho messages; contact/report path for damaged, missing or incorrect items.
- **Readiness:** phone/desktop acceptance, production environment separation, operational contact, monitoring/backups and incident procedures verified before go-live.

### P1 retention / marketplace preparation

- Named, editable multiple saved baskets with current price/availability review; past-order reorder; merchant association retained.
- Merchant application/approval and store lifecycle that does not replace the first-party REETAPELE store.
- Merchant dashboard with store isolation and product/order/staff/operating data.
- Multi-store checkout only after two-store customer comprehension and independent fulfilment is accepted. Keep store-specific subtotals, fees, availability, statuses and child orders visible.
- Merchant ledger/commissions/settlement design only after legal/business rules and payment integration are reviewed; no payout activation in this phase.

### P2 convenience

- Scheduled delivery windows with real operating capacity and cutoff rules.
- Referral, loyalty and promotional campaigns.
- Automatic recurring order or recurring payment is excluded pending explicit customer authorization and payment requirements.

## 4. Data and permission requirements

- Convex is authoritative for identity, store tenancy, catalogue, stock, checkout, order state and audit history.
- Every merchant-owned record is scoped to a store; public storefront reads expose only enabled/available catalog data. Customer private data is limited to the owning customer and staff/driver roles that need it for fulfillment.
- Use current persisted product/merchant associations for basket preview, but never silently move a saved item to another merchant. If the original store or listing is inactive, surface the exception.
- Order line snapshots preserve product name, selected unit/weight, quantity, price, merchant and totals as placed; later catalogue changes must not rewrite history.
- Checkout, stock decrement and child-order creation remain atomic and idempotent. Payment callback handling must be idempotent if a provider is later integrated.
- Record actor and time for inventory changes, payment decisions, assignment, status transition and delivery exception. Do not put secret credentials or full sensitive payment details in events/logs.
- Driver projections expose only assigned route/order details. Location collection is limited to active delivery and stops on completion/cancellation; UI must handle permission denial and stale/no-network state.

## 5. Non-functional requirements

- Mobile-first, keyboard/screen-reader operable, readable in sunlight, tolerant of intermittent network.
- Maintain current REETAPELE visual identity: glossy green bicycle mark, emerald/forest-green, cream/warm neutrals, orange accent and established typography.
- Keep business rules in domain/backend layers; do not add dependencies or infrastructure without a demonstrated need.
- Loading, empty, error, retry and offline/uncertain-submit states are designed for customer and staff journeys.
- Netlify deploy previews use non-production Convex and synthetic data; production data is never used for E2E.

## 6. Acceptance gates

1. A customer completes browsing → account gate → supported area → payment choice → order confirmation in both locales.
2. Repeated submit/network retry creates one checkout; manipulated totals and insufficient stock are rejected server-side.
3. Staff and driver roles complete the full order with no cross-store, wrong-role or unassigned-driver access.
4. Two-store test, if marketplace checkout stays enabled, shows exact per-store totals/fees and isolated child order outcomes.
5. Customer receives accurate status updates and can reach support; failed sends do not claim success.
6. A real pilot order is completed and reconciled by store staff using the approved payment and delivery process.
7. Owner signs off on service boundaries, staff training, recovery, support, monitoring, backup and incident arrangements.

## 7. Out of scope until separately approved

Card processing, automatic mobile money verification, merchant payouts, automatic recurring orders/payments, unverified delivery boundaries, nationwide service, and new visual brand work.
