# REETAPELE Feature Audit

**Audit date:** 2026-11-18  
**Repository:** `Allanfoulo/local-cart-lesotho`  
**Audited line:** `feat/playwright-marketplace-e2e`, PR #3 head `e284aa68d6af6428d1d5465b134980f678ccc5b7`  
**Default branch:** `main` at `206a9164852f7620970fa2dd6641ad1c12f133ae`  
**Method:** Read the current workspace sources and project instructions, inspected README/plans/runbook/schema/backend/UI/tests, and queried GitHub for refs and PR metadata. No source changes or test runs were part of this audit.

## Remote state

- `main` points at `206a916` (merge of PR #2, the Convex marketplace foundation).
- PR [#3: Mobile marketplace and staff workflows](https://github.com/Allanfoulo/local-cart-lesotho/pull/3) is open, targets `main`, and points at `e284aa6`. GitHub reports it mergeable. Its description asks for checkout account-gate and two-store preview verification; those checks are not evidence of a full launch acceptance run.
- GitHub lists `main`, `backend-dev`, `feat/marketplace-convex-marketplace`, `feat/playwright-marketplace-e2e`, and `feature/staff-customer-checkout`. PR #3 is the only open PR returned by the repository-scoped open-PR search.
- The PR preview convention is `https://deploy-preview-3--local-cart-lesotho.netlify.app/`. The older supplied `deploy-preview-2` points to a different PR generation and should not be treated as the latest feature preview without checking its deployed commit.
- GitHub's commit status for `e284aa6` reports the Netlify deploy-preview context as `success`; the three ancillary Netlify rules/pages check-runs are neutral. This confirms preview deployment status, not full marketplace acceptance.
- The local workspace is on `feat/playwright-marketplace-e2e`; its README and dated readiness notes describe a development-first Convex setup. Production Netlify/Convex configuration and real pilot data were not verified during this read-only code audit.

## Feature matrix

| Feature | Existing implementation | Status | Missing work / evidence | Priority |
|---|---|---|---|---|
| Customer storefront | Convex-backed store/catalogue browsing, search, product pages, cart, account and responsive layouts. Seed data and product assets exist. | Partial | Seed content is demo-like; verify real catalogue, prices, photos, stock and one-store operating model. README still describes browser storage and a future backend, which no longer matches current architecture. | P0 |
| Checkout | Authenticated account gate, preserved client cart, server-side catalogue/price/stock/fee/minimum/payment validation, checkout idempotency key, linked child orders per store and atomic mutation writes. | Partial | Run current registration/email verification and two-store cases against latest preview. Address failure/retry UX and the pilot's final service-area policy. `checkoutReceipt` uses a high-entropy client checkout ID as a bearer capability; keep it unlogged and review exposure policy. | P0 |
| Payments | Cash on delivery creates `unpaid`; manual mobile money creates `pending`; authorized staff can change payment status. Card is explicitly rejected/disabled. | Partial | No payment provider, signed callback, automatic verification, reconciliation or refund workflow. Seeded historical/demo orders include paid states, which must not imply a real integration. Keep production options limited to operationally verified methods. | P0 |
| Delivery zones | Store settings keep delivery area names, a default area, a single store-wide fee and minimum. Checkout rejects an area not listed by every store in a multi-store cart. | Partial | No active/inactive per-zone configuration, Phase I/II controls, per-area fees, radius/polygon checks, or verified address geocoding. Current seed areas are Ha-Mabote and other areas, not Ha-Matala. Store opening hours are text and are not an enforced checkout schedule. Do not invent boundaries. | P0 |
| English/Sesotho localization | No locale framework, language switcher, structured translation resources or locale preference was found. Most customer-facing UI is literal English. | Missing | Implement `en-LS` and `st-LS`, persistent pre-auth switching, translated errors/status/notifications and localized product descriptions; obtain fluent-speaker review before production. | P0 |
| Order management | Convex order lifecycle, store-scoped staff queue, status mutation authorization, assignment, preparation checklist with product images, event history, cancellation/rejection, payment status and dispatch board. | Partial | Latest full negative-role and recovery matrix not recorded. Order event history is narrower than a complete audit: assignment/payment domain events exist separately; item checklist changes are not individually represented in the customer timeline. Confirm exception procedures and customer-facing next actions. | P0 |
| Driver workflows | Assigned-driver query, driver-specific delivery view, dispatch assignment, live GPS updates, route/ETA request, and six-digit customer confirmation code with attempt cap; only assigned driver can confirm. | Partial | GPS/Maps are optional integrations and can fail; preserve status/address fallback. Verify current network-loss, GPS-denied, failed-delivery and phone acceptance cases. Confirmation code is persisted as plaintext in its own table and exposed to the authenticated customer; review storage/access controls and abuse limits before real deliveries. | P0 |
| Repeat weekly baskets | Current working tree now includes authenticated Convex baskets, save from cart/order, rename/edit/delete, current pricing/stock checks, merchant-preserving snapshots, and server-backed reorder from order history. Backend tests cover owner isolation, price/stock changes, deleted products, weight quantities and store reassignment. | Implemented locally; preview walkthrough pending | Run the signed-in browser journey against a deploy preview from this branch, with multi-store items, cart merge, changed stock/price and checkout revalidation. UI is English-only until the P0 localization work is complete. | P1 (after P0 stability) |
| Merchant onboarding | Platform superadmin can create stores, configure and enable them, and assign/invite store roles; owner setup checklist gates publication. | Partial | This is platform-managed setup, not a merchant application/approval journey. Preserve Reetapele's first-party store as the pilot anchor; add independent merchant application only after pilot validation. | P1 / marketplace phase |
| Merchant management dashboard | Store-scoped catalogue, products, stock fields, offers, orders, staff invitations, delivery settings and dispatch are present. Server functions use store membership checks. | Partial | Verify coverage and cross-store denial tests. Sales view is operational summary, not a complete merchant business/reporting dashboard. No independent settlement views. | P1 / marketplace phase |
| Marketplace transactions/settlement | Order records preserve store-specific item and delivery totals; multi-store basket creates store-specific child orders. | Missing | No commission ledger, merchant balance, settlement batch, payout, refund/reversal or reconciliation records. Design financial rules before activation; no payout should be enabled now. | P2 / marketplace phase |
| Multi-store checkout | Server groups items by current store, validates each store and writes linked orders/checkouts atomically; staff queues are store-scoped. | Partial | Current E2E record is not proof of latest two-store acceptance. Confirm store-specific subtotal/fees, common serviceability, sibling-order independence, unavailable items and combined customer history. Per-store delivery estimates are currently a generic two-hour timestamp, not a validated promise. | P0 acceptance; future public expansion P1 |
| Scheduled deliveries | No customer delivery-window or capacity model found. | Missing | Add only when pilot capacity/cutoffs and operating hours are confirmed; do not display unsupported delivery promises. | P2 |
| Promotions and loyalty | Store promotion/coupon management and product favourites exist. | Partial | No referral programme, loyalty points/rewards, first-order incentives or campaign delivery. Keep retention campaigns behind reliable fulfilment. | P2 |

## Security and reliability findings

### Implemented safeguards

- Convex derives identity from authenticated requests and uses active store memberships for privileged operations; store and driver order projections are scoped server-side.
- Checkout recalculates prices and totals from current database records, checks stock and configured delivery areas, decrements inventory and writes order/checkout/event records inside a mutation transaction.
- Checkout idempotency uses a client-generated random checkout ID and returns the existing receipt on retry.
- Direct `delivered` transitions are blocked; the assigned active driver must use the confirmation-code mutation. Invalid code attempts are capped at five.
- The README instructions require pnpm and Netlify publishes `dist/client`, consistent with `netlify.toml`.

### Pilot risks to close

1. **Service-area mismatch:** seeded configuration does not match the proposed Ha-Matala pilot. Final Phase I/II availability, boundaries, delivery fee and landmark process remain business decisions.
2. **Payment is manual:** mobile money status depends on staff verification. There is no provider-backed proof, webhook protection, reconciliation or refund support.
3. **Customer communications are not delivered:** order state is reactive in-app; customer notification preference UI/seed data does not itself send order SMS/email. Email is wired for authentication/invitation flows, not a complete order notification service.
4. **Unverified production environment:** dated `docs/phase-5-readiness.md` records missing/unverified production Convex/Netlify configuration, monitoring/backups and support escalation. Recheck these in the owner dashboards before launch; do not assume the dated entries remain current.
5. **Inventory operational controls:** checkout stock decrement is transactional, but the audit did not find a dedicated stock-adjustment ledger with actor/reason or a complete low-stock alert process. Validate the current catalogue and staff stock workflow.
6. **Delivery-code hardening:** the six-digit code is stored as plaintext; its attempt cap is per code, while broader per-driver/order rate limiting and operational fallback for a customer who cannot access the code need explicit review.
7. **Audit completeness:** critical order transitions are recorded, but item preparation changes and complete assignment/payment history are not uniformly shown in the customer order timeline.
8. **Documentation drift:** `README.md` says the demo uses browser storage and a future API/database, while current source uses Convex. Update user-facing project documentation as a small P0 trust/operations task.

## Tests and verification found

- `convex/marketplace.test.ts` covers authorization, checkout idempotency, inventory/availability recovery, multi-store orders, staff/driver assignment and delivery confirmation cases.
- `tests/e2e/marketplace.spec.ts` contains the browser marketplace walkthrough. `docs/e2e-testing.md` says the recorded full path is a signed-in customer order through manager fulfillment and driver delivery; it also cautions that runs consume stock and leave records.
- `docs/phase-5-readiness.md` records a successful signed-in single-order E2E on PR #3 head `fad5cc1` in October, but explicitly lists email verification, cross-store denials, invitation lifecycle, current account gate and the full role/phone matrix as not covered in that run. PR #3 itself asks to verify email verification and a two-store basket at its current head.
- No tests, builds or live deploy walkthrough were run as part of this audit. Test strategy and required evidence are in `REETAPELE_IMPLEMENTATION_PLAN.md` and `REETAPELE_PILOT_READINESS.md`.

## Product maturity summary

The repository is beyond a static prototype: the core shopping, account gate, Convex-backed order placement, store-role workflows, stock validation, dispatch, delivery tracking and code-confirmed completion are implemented. It is **not yet pilot-ready** because the service area and real catalogue are unconfirmed, English-only UX excludes the Sesotho requirement, order notifications and live payment verification are absent, and the current PR head lacks a recorded complete acceptance matrix for the current workflows. The first-party store can remain the only active merchant while those gaps are closed.

## Planning links

- [Existing marketplace phased plan](marketplace-phased-plan.md)
- [Completion PRD](REETAPELE_COMPLETION_PRD.md)
- [Implementation plan](REETAPELE_IMPLEMENTATION_PLAN.md)
- [Pilot readiness checklist](REETAPELE_PILOT_READINESS.md)
- [Weekly baskets specification](REETAPELE_WEEKLY_BASKETS_SPEC.md)
