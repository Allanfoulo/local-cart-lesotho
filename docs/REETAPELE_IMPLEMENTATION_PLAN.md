# REETAPELE Implementation Plan

**Status:** Sequenced plan based on the 2026-11-18 repository audit.  
**Base plan:** [Marketplace phased plan](marketplace-phased-plan.md). This plan extends that phased work; it does not replace the first-party store model.

Complexity is relative effort (`S` small, `M` medium, `L` large), not calendar commitment. Dependencies and acceptance evidence determine when work is done.

## Stage 0 — Repository and deployment audit (complete; preserve as baseline)

- [x] Inspect current source, existing plan/runbook, Convex schema/functions/auth, customer/staff/driver UIs, tests, package and Netlify config.
- [x] Query remote default branch, branches, open PRs and head SHA.
- [x] Identify implemented behavior separately from UI-only or simulated capability.
- [ ] Recheck latest deploy-preview SHA, current CI, production Convex/Netlify configuration and owner-dashboard operational settings immediately before pilot sign-off; they are time-sensitive and were not verified in this code audit.

Deliverables: [feature audit](REETAPELE_FEATURE_AUDIT.md), this plan, [completion PRD](REETAPELE_COMPLETION_PRD.md), [pilot readiness](REETAPELE_PILOT_READINESS.md), [weekly baskets spec](REETAPELE_WEEKLY_BASKETS_SPEC.md).

## Stage 1 — Pilot-critical corrections (P0)

### 1A. Service area and store operations — M

1. Confirm whether the pilot covers Ha-Matala Phase I, Phase II or both; record the operator-approved address/landmark rule, opening hours, delivery fees and minimum order. Do not code guessed boundaries.
2. Extend store settings from plain strings/single fee to independently configurable, enabled area records with explicit fee and serviceability policy. Keep configuration editable by authorized store management and platform support.
3. Enforce active area, current store operating state, minimum order and payment-method support in the server checkout mutation; surface clear localized failures.
4. Keep the first-party store the only enabled operational pilot. Add configuration migrations/defaults without replacing existing store/catalogue records.

**Verify:** Phase I-only, Phase II-only, both, disabled area, unsupported area, closed store, wrong fee and multi-store common-area cases against synthetic data. Store owner can change configuration without redeploy.

### 1B. Checkout/payment/inventory hardening — M/L

1. Walk the latest preview through account creation/email verification and existing-account checkout; preserve cart and details.
2. Confirm authoritative price/discount/fee/stock checks and checkout idempotency under double-click and uncertain network response.
3. Verify mobile money is explicitly pending until staff verification; verify cash owed/change and staff permission to record payment.
4. Add auditable stock adjustments (actor, reason, timestamp, before/after) and low-stock staff attention; retain existing atomic stock decrement.
5. Make unavailable items and closed/failed store checkout recovery actionable without silently altering another store's child order.
6. Keep card disabled. Provider integration remains a separately gated project with signed callback, idempotency, failure recovery, reconciliation and refund evidence.

**Verify:** backend tests for manipulated totals, concurrent/insufficient inventory, duplicate submissions, unsupported methods, duplicate verification and cross-store stock/order access; browser retry and staff payment walkthrough.

### 1C. Fulfilment, delivery and recovery — M

1. Preserve current state machine, preparation photo checklist, assignment and delivery-code flows; fix only gaps found by acceptance.
2. Add/confirm auditable preparation and assignment/payment events with actor/time, plus failure reason and authorized support completion route.
3. Verify assigned driver-only access, GPS/network denial, stale tracking, code attempts, customer unavailable, wrong address, damaged/missing item, cancellation and rejection.
4. Verify two-store child orders remain independently fulfillable and the customer's linked history is coherent.

**Verify:** complete role matrix plus wrong-role/wrong-store/unassigned-driver denials; recovery walkthroughs; phone and desktop checks.

### 1D. Customer updates and operational support — M

1. Define which events use in-app status, email, SMS or staff contact; choose provider only after pilot channel/cost/consent decision.
2. Add durable send outcome (`queued/sent/failed`) and retry/alert behavior; never show sent before provider acknowledgment.
3. Translate customer messages; expose support contact and report issue for missing/damaged/incorrect goods.
4. Update README architecture description and ensure help/contact details are pilot-specific.

**Verify:** successful and failed provider cases, duplicate callback/retry behavior if applicable, localization, and support response drill.

## Stage 2 — English and Sesotho localization (P0)

**Complexity: L.** Apply a maintainable React i18n layer after inventory of all user-visible strings. Keep product descriptions as localized content fields with a clear fallback; do not scatter language conditionals.

1. Add `en-LS` and `st-LS` resource namespaces for storefront, account/auth, cart, checkout, orders, payment, status, errors and support.
2. Add a visible pre-auth switcher in mobile and desktop navigation; persist locale across device sessions according to privacy/product policy.
3. Localize currency/date/number presentation and dynamic messages from typed keys/parameters.
4. Define missing translation fallback and CI/test detection of untranslated keys.
5. Review checkout, money, delivery and support terms with a fluent Sesotho speaker; record approval before production.

**Verify:** switch before authentication, persist after refresh/sign-in, fallback for missing keys, all customer acceptance journeys in both locales, localized checkout failures and notifications. Staff workspace localization can follow if it is not required for the pilot staff cohort; customer completion cannot depend on English.

## Stage 3 — Operational validation (P0 release gate)

**Complexity: M.** Extend existing Vitest/Convex and Playwright coverage rather than replacing existing test infrastructure.

1. Build a synthetic-data acceptance matrix for customer, manager, order staff, dispatcher, driver and support/operator roles.
2. Cover account gate, both locales, service areas, checkout idempotency, stock races, payment pending/verification, full fulfillment, delivery confirmation, failures and two-store isolation.
3. Add security tests for unauthorized store reads, cross-store mutations, wrong driver, manipulated amounts, duplicate payment confirmation and unauthorized completion.
4. Run phone and desktop browser walkthroughs with loading/empty/error/retry and reduced network/GPS permission states.
5. Complete at least one controlled real-world end-to-end pilot order after synthetic tests; reconcile catalogue, payment, picking, delivery and customer feedback.
6. Record environment, preview SHA, test account labels, result, defect and retest. Never run write E2E against production.

## Stage 4 — Repeat Weekly Baskets (P1, after P0 core journey is stable)

**Complexity: M. Status: implemented in the current worktree; browser walkthrough pending.** The [weekly baskets specification](REETAPELE_WEEKLY_BASKETS_SPEC.md) now has authenticated Convex storage, create from cart/order, editing and deletion, current-price and stock checks, merchant-preserving items, add-to-cart review, and server-backed reorder from order history. Reorders keep the original store, report unavailable items and changed prices, and avoid exceeding stock already in the cart. No scheduled or automatic orders are created.

**Verification evidence:** TypeScript, 22 unit/backend tests, and Playwright test discovery pass; the local customer route responds on port 7093. Still verify the full signed-in customer journey against a preview built from this branch, including multiple stores, weight products, mobile layout and checkout revalidation. The pilot remains gated by P0 readiness and localization review.

## Stage 5 — Marketplace expansion (P1 after pilot validation)

1. Merchant application, review and activation lifecycle; first-party REETAPELE remains distinct and active.
2. Merchant dashboard for catalog, inventory, store config, orders, staff and performance.
3. Confirm strict store isolation and linked multi-store cart/child-order operations.
4. Design commission, transaction ledger, refund/reversal and settlement reconciliation with business/legal/accounting review.
5. Integrate provider payment and payout only after compliance, callbacks, failure handling, dispute/refund and reconciliation are proven. Do not enable payouts as part of onboarding UI alone.

**Verify:** per-store role denial tests, two-store acceptance, settlement calculations against reconciled sample transactions, reversal and audit history. Merchant payouts remain disabled until sign-off.

## Stage 6 — Advanced convenience (P2)

- Scheduled delivery windows after capacity, cutoff, reschedule and cancellation policy are operational.
- Loyalty, referrals and promotional campaigns after reliable normal-order fulfilment.
- Shopping reminders and recommendations as opt-in features.
- Automatic repeat orders/payments remain out of scope until consent, cancellation, price change and payment authorization are explicitly designed and approved.

## Dependency map

| Work | Depends on |
|---|---|
| Configurable Ha-Matala serviceability | Operator confirms Phase I/II policy, fees, opening hours and landmark rules |
| Customer notification delivery | Channel/provider choice, consent, support ownership, bilingual message approval |
| Localization release | Resource coverage, product copy, fluent Sesotho review |
| Pilot go/no-go | Stages 1–3 plus operational readiness evidence |
| Weekly baskets | Stable product/store IDs, current catalogue validation, P0 checkout |
| Merchant onboarding/settlement | Successful first-party pilot, merchant business rules, financial/compliance review |
| Scheduled deliveries | Confirmed operating windows, staff/driver capacity and cutoff policy |

## Existing plan integration

Keep [Phase 1 tenancy/staff access] and [Phase 3 fulfillment] as the source for current backend work. Expand existing Phase 2 configuration with explicit delivery zones/hours; expand Phase 4 with verified notification delivery, stock ledger and provider gate; make Phase 5 a true go/no-go checklist using this plan's acceptance matrix. Attach Stage 2 localization before pilot release. Stage 4 repeat baskets follows successful core order validation. Stages 5–6 stay behind pilot evidence.
