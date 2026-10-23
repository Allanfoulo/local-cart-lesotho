# Marketplace browser walkthrough

The Playwright suite checks the public Netlify Deploy Preview against the development Convex deployment. It does not target production.

## Marketplace acceptance gate

The marketplace is not accepted as end-to-end ready until the two-store basket walkthrough below passes on a disposable development or staging fixture. The current automated customer-to-driver journey covers one store, so it is not evidence that multi-store checkout and store-scoped fulfillment work together. Record the checkout ID, each child order number, store roles used, and the final state of every child order when the walkthrough is completed.

## Setup

1. Copy `.env.e2e.example` to `.env.e2e.local`.
2. Set `E2E_BASE_URL` to the current PR's `https://deploy-preview-<number>--local-cart-lesotho.netlify.app` URL.
3. Set `E2E_EXPECTED_CONVEX_URL` to the development deployment URL configured for that preview.
4. Set the existing verified customer, store manager, and driver test-account credentials. Set `E2E_DRIVER_NAME` to the exact display name shown in the dispatch assignment list.
5. Install Chromium once with `pnpm test:e2e:install`.

Keep `.env.e2e.local` on the local machine or in a CI secret store. Do not commit it or paste credentials into the repository.

## Run

Run `pnpm test:e2e`. The suite first checks that the preview displays products and connects to the expected development Convex deployment. The currently recorded full walkthrough covers one signed-in customer's order: the store manager advances it through preparation, assigns the driver, the driver completes delivery, and the customer sees the final status. See [Phase 5 readiness](phase-5-readiness.md) for the dated result and its limits.

That passing single-order walkthrough does not prove multi-store checkout or the complete role/recovery matrix. The two-store case is the first required acceptance walkthrough; complete the remaining scenarios before calling the marketplace flow verified:

1. Put available products from two stores in one basket. Confirm checkout and confirmation show each store's items, subtotal, fee, delivery estimate, and payment state, as well as the combined total. Confirm the server creates linked store orders and each store's staff sees only its own child order.
2. Cancel or reject one child order and make an item unavailable in one store. Confirm the customer can identify the affected store/items and next step, the unaffected store order remains visible and fulfillable, and retrying checkout or status actions does not create duplicates.
3. Walk owner/admin through staff onboarding and invitation lifecycle; order staff through preparation; manager through rejection, cancellation, and other exception handling; dispatcher through assignment; and a driver through an assigned delivery. Verify a driver cannot read or update an unassigned delivery and staff cannot cross store boundaries.
4. Repeat customer checkout/tracking, store preparation, and driver delivery at phone viewport widths. Include closed-store, stock-change, uncertain-submit, and failed-delivery recovery states.

Use synthetic data in the development Convex deployment. If the current seeded preview has only one eligible store or cannot safely isolate cancellation/stock scenarios, provision a disposable staging fixture before running these cases; record the setup and clean-up boundary in the acceptance record. Do not count a skipped test as a pass.

The full walkthrough requires active memberships and verified accounts. If any credentials are missing, Playwright skips that workflow while still running the public preview smoke test.

Each full run leaves one completed development order and consumes the purchased stock. It does not clean up records. The driver-stop sequence is adjusted so the test order is the driver's next stop. Failed runs can leave the test order at its last successful status; finish or cancel it from the development workspace before retrying if needed. Any future two-store/exception scenario must check for partially created child orders before a retry and record each child order's terminal state.

Tests reject non-preview Netlify URLs and block HTTP requests to Convex hosts other than the configured development cloud/site pair. Failure screenshots mask form fields. Network traces are disabled so credentials and auth tokens are not written to test artifacts.
