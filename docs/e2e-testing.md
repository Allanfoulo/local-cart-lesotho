# Marketplace browser walkthrough

The Playwright suite checks the public Netlify Deploy Preview against the development Convex deployment. It does not target production.

## Setup

1. Copy `.env.e2e.example` to `.env.e2e.local`.
2. Set `E2E_BASE_URL` to the current PR's `https://deploy-preview-<number>--local-cart-lesotho.netlify.app` URL.
3. Set `E2E_EXPECTED_CONVEX_URL` to the development deployment URL configured for that preview.
4. Set the existing verified customer, store manager, and driver test-account credentials. Set `E2E_DRIVER_NAME` to the exact display name shown in the dispatch assignment list.
5. Install Chromium once with `pnpm test:e2e:install`.

Keep `.env.e2e.local` on the local machine or in a CI secret store. Do not commit it or paste credentials into the repository.

## Run

Run `pnpm test:e2e`. The suite first checks that the preview displays products and connects to the expected development Convex deployment. The full walkthrough then places an order as the test customer, advances it through preparation as the store manager, assigns the driver, completes delivery, and checks the final customer-visible status.

The full walkthrough requires active memberships and verified accounts. If any credentials are missing, Playwright skips that workflow while still running the public preview smoke test.

Each full run leaves one completed development order and consumes the purchased stock. It does not clean up records. The driver-stop sequence is adjusted so the test order is the driver's next stop. Failed runs can leave the test order at its last successful status; finish or cancel it from the development workspace before retrying if needed.

Tests reject non-preview Netlify URLs and block HTTP requests to Convex hosts other than the configured development cloud/site pair. Failure screenshots mask form fields. Network traces are disabled so credentials and auth tokens are not written to test artifacts.
