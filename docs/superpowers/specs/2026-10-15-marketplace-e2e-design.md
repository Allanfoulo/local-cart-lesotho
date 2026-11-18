# Marketplace Browser E2E Design

**Status:** Approved; the harness is implemented but has not yet been run against a Deploy Preview.

## Goal

Make the marketplace's customer and fulfillment walkthrough repeatable against a public Netlify Deploy Preview backed only by the development Convex deployment. The checks must exercise the built site through a real browser and use the existing development test accounts.

## Scope

- Add Playwright and a Chromium-based E2E runner with a dedicated configuration and package script.
- Require an explicit Deploy Preview URL and local environment variables for existing customer, store manager, and driver credentials. Keep credentials out of source control and test output.
- Verify the public shopping journey through product selection, checkout, and confirmation; then verify the resulting order progresses through staff preparation, driver assignment, dispatch, and delivery.
- Verify authenticated customer account access and role-scoped workspace access as part of those journeys.
- Capture screenshots on failure with form fields masked. Do not capture network traces because authenticated requests can contain credentials or session tokens.

## Target and safety boundaries

- Tests run only against a Netlify Deploy Preview URL, never production or the local app by default.
- Tests confirm the preview's Convex requests target the explicitly configured development deployment before submitting an order.
- Tests use only existing development test accounts and synthetic catalog/customer data. The flow leaves a completed test order and consumes its purchased stock in the development deployment; it does not attempt destructive cleanup.
- No test-only sign-in bypass, production credential, or production data is introduced.
- Required account roles must already have active memberships and verified email so sign-in does not depend on manual email-code retrieval.

## Test flow

1. Open the preview, browse the seeded shop, add one available item, enter a test delivery address and choose a supported payment method, and place a customer order.
2. Confirm the customer sees the created order and its initial status.
3. Sign in as store management, locate that order, advance it through the allowed preparation steps, and assign the existing driver account.
4. Sign in as the assigned driver, confirm only assigned work is presented, start delivery, and mark the order delivered.
5. Reopen the customer order view and confirm the terminal delivery status is visible.

Tests should use accessible labels and visible outcome assertions. Select products and store context from the data rendered by the preview rather than relying on brittle product names or hard-coded order IDs.

## Configuration and operation

- `E2E_BASE_URL` identifies the current Deploy Preview.
- `E2E_EXPECTED_CONVEX_URL` identifies the development Convex cloud endpoint expected in that preview.
- `E2E_CUSTOMER_EMAIL` / `E2E_CUSTOMER_PASSWORD`, `E2E_MANAGER_EMAIL` / `E2E_MANAGER_PASSWORD`, and `E2E_DRIVER_EMAIL` / `E2E_DRIVER_PASSWORD` provide existing test-account credentials through the local environment or CI secret store.
- `E2E_DRIVER_NAME` identifies the driver's display name in the dispatch assignment list.
- The runner fails before mutation if required configuration is absent, the base URL is not a Deploy Preview host, or Convex traffic does not match the expected development endpoint.
- The documented command is `pnpm test:e2e`; it requires Playwright Chromium to be installed once in the runner environment.

## Acceptance criteria

- The E2E command runs the customer-to-delivery flow in Chromium against the supplied Deploy Preview.
- It fails closed on a non-preview target or unexpected Convex endpoint.
- It reports customer, store staff, and driver-visible outcomes and retains useful artifacts on failure.
- No production endpoint, credentials, or customer data are used.

## Risks and limits

- The run depends on the preview's development Convex URL, seeded storefront data, and active verified test accounts with the required roles.
- A successful run creates a completed order and reduces stock. Repeat runs should use an item with available stock; a dedicated disposable development store may be needed if repeated runs exhaust the catalog.
- Email verification and password reset are outside this end-to-end order walkthrough because they require access to email delivery. They remain separate checks.
