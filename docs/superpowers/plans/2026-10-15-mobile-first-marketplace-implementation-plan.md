# Mobile-First Marketplace and App Implementation Plan

**Design:** [Mobile-First REETAPELE Marketplace and App Design](../specs/2026-10-15-mobile-first-marketplace-app-design.md)

This plan treats the current phase-status document as the baseline: store tenancy/onboarding and order fulfillment are marked complete in development; checkout/payment/customer communications and production readiness remain open. Revalidate completed areas rather than rebuilding them. Payment-provider integration stays deferred until the provider and launch scope are selected.

## Progress snapshot — 2026-10-15

Commit `2358bd9` adds role-based sign-in destinations, a post-sign-in account/staff choice for users with multiple active membership rows, protected-route return destinations, stricter store publish readiness, and a Playwright walkthrough configured for a Netlify Deploy Preview with a development Convex deployment. Phase 2 implementation now covers mobile storefront navigation and product controls, stock and minimum-order warnings in the cart, clearer checkout validation and payment/delivery states, receipt-safe guest account creation, and server-confirmed account/address updates. These are implementation slices; the full customer route and viewport acceptance audit remains open.

The static route/task/role inventory is recorded in [`marketplace-route-baseline.md`](../marketplace-route-baseline.md). The previously referenced responsive captures and performance measurements are not present in this checkout; route-by-route viewport and interaction acceptance remains open. Initial Phase 1 work now includes durable Convex-backed checkout receipts, a session-persisted idempotency key for the unchanged cart, persistent role/store switching, identity-bound projection clearing when auth identity changes, account/guest customer-profile isolation during checkout, driver-only delivery projection, and compact WebP product assets. TypeScript passes. This is partial progress, not completion of Phase 1: live checkout/invitation walkthroughs, payment-state acceptance, authorization denials, and deploy-preview performance measurements remain. The E2E walkthrough has not been run and does not replace the Phase 1 negative authorization matrix.

Phase 4 implementation has started with mobile storefront search, skip navigation, shared 44 px mobile touch targets, long-name wrapping, visible focus, and reduced-motion support. TypeScript, focused ESLint, Prettier, `git diff --check`, and the production build pass; Vite had to run outside the restricted sandbox. One repeat build stalled before Vite startup, but a subsequent direct Vite build completed successfully. Visual viewport acceptance could not be performed because no browser surface is available. The full viewport, contrast, keyboard, screen-reader, and performance matrix remains open.

Phase 5 readiness work on 2026-10-22 confirmed the local app responds on port 7093 and `netlify.toml` still publishes `dist/client`. A development operations runbook now documents triage, support, rollback, backup/restore boundaries, and staging acceptance records. After correcting stale/ambiguous selectors, adding a wait for the cart toast, and extending the full multi-role E2E timeout, the signed-in single-order customer checkout-to-delivery test and public mobile preview smoke passed on PR #3's Deploy Preview. This does not prove multi-store checkout, per-store fees/estimates, independent child-order exceptions, guest checkout, the full owner/admin onboarding and invitation lifecycle, or cross-store/unassigned-driver denial. These, phone acceptance across customer/staff/driver roles, and recovery drills for closed stores, stock changes, uncertain checkout, and failed delivery remain open, along with current production settings, credential rotation, monitoring, and recovery exercise. See [Phase 5 readiness findings](../../phase-5-readiness.md).

## Phase 0 — Baseline and route inventory

1. Reconcile current routes and shared components with the older role-dashboard and browser-local design docs; mark superseded claims so they do not guide implementation.
2. Inventory each route by user, main task, authorization boundary, Convex source, viewport, and current state/error coverage.
3. Capture current app screenshots at phone, tablet, and desktop widths; do not use the existing untracked screenshots as acceptance evidence until confirmed current.
4. Record checkout/catalogue performance on a representative mid-range phone and constrained network. Agree target budgets from the baseline before optimization.

**Exit:** one route/state/role matrix and a prioritized defect list agreed against the product design.

## Phase 1 — Verify and close marketplace workflow gaps

### Identity, workspaces, and onboarding

1. Verify email/password, verification, recovery, optional customer identity, invitation acceptance, invitation expiry/revocation, and account switching. Resolve active membership destinations after sign-in: route single-membership accounts directly to that workspace, offer the account/staff choice for multiple active memberships, and ensure super admins do not default to customer pages.
2. Implement the explicit workspace chooser/switch for multi-role identities. It lists only active memberships and permitted stores; switching clears identity-bound UI/cache state and reloads authorized data.
3. Revalidate store lifecycle and publish requirements. Ensure a store cannot publish without an active owner, valid settings, an active category, and an available product.
4. Walk through owner and manager staff invitations for each allowed role. Confirm the invite lifecycle and failure/retry states.

### Checkout and order integrity

1. Verify server-side checkout validation for current catalogue price, availability/stock, minimum order, delivery eligibility, fees, promotions, and configured payment methods.
2. Verify one basket with products from two stores creates linked, independently visible store orders with correct customer linkage, per-store subtotals/fees/delivery estimates/payment states, and a correct combined total.
3. Make order submission retry-safe and prevent duplicate orders after latency, double taps, or a lost response.
4. Cancel/reject one child order and exercise an unavailable product without losing or silently cancelling the other store's order. Define whether checkout commits all child orders together or reports a safe retry before any order exists.
5. Show clear supported payment states for cash and manual mobile money in development/staging. Keep provider-backed production payment methods unavailable until server-confirmed status, signed and duplicate-safe callbacks, failure recovery, reconciliation, and refund handling all pass.
6. Verify customer-visible status and notification delivery for acceptance, changes, dispatch, completion, rejection, and cancellation, with each update tied to the correct store order.

### Fulfillment and authorization

1. Revalidate allowed order transitions, assignments, rejection/cancellation, stale updates, concurrency, idempotency, and event/state consistency.
2. Exercise each query and mutation as anonymous, customer, suspended member, wrong role, wrong store, wrong customer, driver with unrelated order, and super admin.
3. Confirm driver projections include only assigned delivery details and never expose customer account identifiers or unrelated orders.
4. Verify workspace access through normal navigation, direct URLs, edited request inputs, and multiple memberships.

**Exit:** a guest and authenticated two-store purchase each reach independently correct customer-visible outcomes; rejection, cancellation, unavailable-product, and retry paths recover without duplicating or obscuring the other store's order; cross-role/store/customer access is denied by Convex.

## Phase 2 — Customer mobile journey

1. Audit and refine storefront home, search, category, product detail, cart, checkout, confirmation, order history/tracking, sign-in/up, account, and password recovery.
2. Keep guest browsing and checkout clear; ask for optional account creation after value is established.
3. Group multi-store cart contents and explain availability, delivery charges, and payment state before final submission.
4. Remove checkout friction: suitable mobile keyboards, concise grouped forms, saved-detail defaults with review, inline validation, clear progress, and a stable primary action.
5. Preserve form/cart state on recoverable errors, show loading/disabled states during asynchronous work, and announce completion accessibly.

**Exit:** a first-time customer can browse, compare store-grouped basket contents, understand per-store fees and delivery estimates, buy, recover from a closed-store/stock-change/failed-submission case, and track all per-store orders using a phone without horizontal scrolling.

## Phase 3 — Store, staff, dispatch, and driver mobile journey

1. Design role landing pages around the next real task rather than generic metrics.
2. Turn owner setup into a progress-based checklist with honest prerequisites and preview before publish.
3. Make invitations easy to create, resend, revoke, and understand on a phone; show the recipient's store and permissions.
4. Convert order queues and dense catalogue tables to responsive task lists/detail views on narrow screens while retaining desktop comparison tools.
5. Put dispatch tasks and assigned-stop details before optional maps on phones. Keep approximate map behavior clearly labeled.
6. Keep driver status actions thumb-friendly, confirm irreversible/problem outcomes, and preserve unsent work during recoverable network errors.

**Exit:** store admin/owner can onboard staff, order staff can prepare, managers can resolve rejection/cancellation/unavailable-item exceptions, dispatchers can assign, and drivers can complete only assigned deliveries from a phone. Tablet and desktop layouts remain efficient for catalogue, manager, and platform-wide work.

## Phase 4 — Whole-app responsive, accessibility, and performance pass

1. Audit every route and overlay at 360/375/390/430 px, 768 px, 1024 px, and 1440 px; include long names, long addresses, empty lists, errors, and large text.
2. Fix horizontal overflow, clipped tables, fixed navigation/safe-area overlap, unreadable text, unreachable controls, and keyboard traps.
3. Verify minimum touch target sizes, focus and screen-reader labels, contrast, non-color status cues, input labels, reduced motion, and browser back behavior.
4. Optimize identified catalogue and checkout bottlenecks from Phase 0 measurements; reserve space for asynchronous content and lazy-load heavy routes where useful.
5. Run focused Convex authorization/workflow tests, route-level interaction tests, typecheck, lint, production build, and manual end-to-end acceptance. Record defects and retest fixes.
6. Run the end-to-end role journey on phone and desktop, including two stores, independent child-order exceptions, closed-store and stock recovery, uncertain-submit duplicate protection, failed delivery, and unassigned-driver denial. Treat the passing single-order checkout walkthrough as partial evidence only.

**Exit:** all routes pass the agreed mobile/tablet/desktop and accessibility matrix; two-store and all-role workflows plus listed recovery paths pass end to end; core workflow tests and production build pass; performance meets measured targets.

## Phase 5 — Operational readiness and staging acceptance

1. Verify the correct REETAPELE Netlify site, build output, preview configuration, and frontend Convex URL using the site owner account.
2. Configure and verify the production Convex deployment's auth origin, email sender, app origin, and required secrets; keep development and production secrets separate.
3. Rotate credentials exposed in previous CLI output. Configure a dedicated marketplace domain and support contact when available; continue using the agreed development support address until then.
4. Document monitoring, alerts, backup/recovery, deployment rollback, support escalation, and payment/order incident procedures; exercise failed deploy, uncertain checkout, closed-store, unavailable-item, cancellation/rejection, and failed-delivery recovery using non-production data.
5. Run and record the full customer/admin/manager/order-staff/dispatcher/driver acceptance matrix on staging using non-production accounts and two-store test orders. Record pass/fail/not-run for each case; a skipped scenario is not a pass.
6. Keep provider payments as a hard launch gate: confirm provider status server-side, validate signed callbacks and duplicate protection, verify pending/failed recovery, reconcile provider and order records, and demonstrate refund handling before production method enablement.

**Exit:** staging users can complete the recorded two-store, multi-role journey through delivery and recovery; operational owners can identify and resolve failures; provider payment gates and production environment readiness are passed before production release; no critical security or data-integrity defects remain.

## Phase 6 — One app-store listing (after web marketplace acceptance)

1. Start the packaging feasibility spike after the Phase 1 two-store/role acceptance and Phase 4 responsive/accessibility pass. Compare packaging the existing React/TanStack application for iOS and Android with a shared native client. Evaluate Convex Auth session storage, verification/deep links, secure credential handling, push notifications, app lifecycle, and accessibility before selecting a route.
2. Keep one listing and one role-aware sign-in/workspace model. Create signed development builds for physical Android and iOS devices.
3. Verify customer, invitation, password recovery, order, and driver deep links; role-aware landing and workspace switching; foreground/background session behavior; push permission timing and delivery; network loss/retry; and assigned-driver-only access.
4. Prepare required store metadata, privacy disclosures, support/deletion path, screenshots, and release/review process based on the final implementation and actual data practices.
5. Submit only after staging acceptance, device acceptance, production environment readiness, and payment-method disclosures agree.

**Exit:** a single published app listing gives all roles access only to their authorized workspaces and completes the tested core journeys on supported iOS and Android devices.

## Dependencies and sequencing

- Phase 0 informs all responsive and performance work.
- Phase 1 must pass before the app is presented as an operational marketplace.
- Phases 2 and 3 share the same state/security contracts and can proceed in small route groups after Phase 1.
- Phase 4 depends on the main routes stabilizing; run its checks throughout, then complete the cross-app pass.
- Phase 5 staging and operational readiness precede production release.
- Phase 6 packaging discovery follows recorded web marketplace acceptance and the Phase 4 responsive/accessibility pass; signed store builds and submission depend on Phases 1, 4, and 5.

## Release gates

1. **Workflow gate:** two-store orders show correct per-store totals/fees/estimates and independent outcomes; every role's allowed fulfillment transition passes end to end.
2. **Security gate:** direct-link and Convex authorization checks reject cross-store, wrong-role, wrong-customer, and suspended access.
3. **Mobile gate:** all routes work at narrow widths with no obscured actions or horizontal page overflow.
4. **Recovery gate:** closed-store, stock-change, uncertain-submit, rejection/cancellation, and failed-delivery cases pass staging with clear customer/staff actions and duplicate-safe recovery.
5. **Operational gate:** production settings, credential rotation, monitoring, recovery, support, and full staff acceptance are verified.
6. **Payment gate:** provider-backed production payments require server-confirmed status, signed and duplicate-safe callbacks, failure recovery, reconciliation, and refunds; development cash/manual mobile money does not satisfy this gate.
7. **App-store gate:** after web acceptance, signed device builds validate role-aware navigation, deep links, and notifications; store disclosures match actual UX, data collection, permissions, and payment behavior.
