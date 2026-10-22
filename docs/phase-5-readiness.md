# Phase 5 Readiness Findings

Reviewed 2026-10-22. This is a development/staging readiness review; it does not deploy or change production configuration.

## Verified in this review (2026-10-22)

- `netlify.toml` still builds with `pnpm build` and publishes `dist/client`.
- The local app responded with HTTP 200 at `http://localhost:7093`.
- Added [development operations runbook](operations-runbook.md) covering triage, recovery boundaries, support escalation, payment/order incidents, and how to record staging acceptance.

## Previously verified (2026-10-11)

- The Convex development deployment has the expected auth and email variable names configured: `AUTH_EMAIL_FROM`, `INITIAL_SUPERADMIN_EMAIL`, `RESEND_API_KEY`, and `SITE_URL`. Only names were inspected; values were not read or displayed.
- Netlify build configuration uses `pnpm build` and publishes `dist/client`, matching the configured TanStack Start Vite adapter output.
- The production build produced the Netlify server function at `.netlify/v1/functions/server.mjs` and client assets under `dist/client`.
- The marketplace Convex test suite passed: 14 tests.
- Development type checking and the application build passed during the preceding implementation verification. The development app responded on port 7093.
- `.env.local` is ignored by Git.

## Launch blockers

- The linked production Convex deployment (`enchanted-aardvark-205`) had no environment variables configured at the 2026-10-11 review. Production auth, email delivery, and site-origin behavior remain unverified; do not copy development credentials into production.
- `allanfdeveloper.space` is Allan's personal portfolio and is used as the verified Resend sending domain for super-admin email. It is not intended to host the marketplace. For development, use `allanfdeveloper@gmail.com` for support and problem reports. Reminder: purchase a separate marketplace domain later and configure it when ready.
- At the 2026-10-11 review, the Netlify CLI account's listed site belonged to a different repository (`arctrd3s/arcflow`), and this workspace was not linked to a REETAPELE Netlify site. Current read-only Netlify status attempts could not refresh that state: the CLI reports an invalid URL and cannot write its update-check config in the user profile. A direct preview request also failed through the configured proxy. No REETAPELE site's `VITE_CONVEX_URL`, deploy settings, or preview integration could be verified.
- Credentials previously exposed in verbose development CLI output have not been rotated. No Resend or Convex account dashboard is connected here, so replacement and revocation could not be completed. Rotate those values before relying on the affected credentials.
- The runbook now documents monitoring and recovery procedures, but dashboard alerts/log streams, backup schedules, recovery exercises, and the support escalation path have not been verified as configured or operational. Confirm these with the deployment and operations owners before launch.
- Partial staging acceptance was reported for PR #3 at head `fad5cc1` on 2026-10-22 ([PR test report](https://github.com/Allanfoulo/local-cart-lesotho/pull/3)): the mobile marketplace, manager checklist/private storefront preview, catalogue search and filters, marketplace links, driver workspace, manager preparation/driver assignment, and driver delivery confirmation passed. Three synthetic development orders were created and all reached Delivered. The complete customer checkout walkthrough did not pass: the committed receipt selector was ambiguous, and after a local selector adjustment the run timed out before staff fulfillment; the test also expected outdated dispatch and delivery labels. This review fixed those test selectors locally and confirmed Playwright test discovery, but did not rerun the full journey against the preview.
- The current preview and PR checks could not be refreshed from this workspace. The preview URL is blocked by the configured proxy, and GitHub CLI reports invalid saved authentication tokens.
- A 2026-10-11 review recorded a passing Netlify status check for `https://deploy-preview-2--local-cart-lesotho.netlify.app`; an unauthenticated request redirected to Netlify Edge Access login. This does not establish the current PR preview's status.
- Payment-provider integration remains deferred as previously agreed. Production payment methods and related customer messaging must reflect the supported methods until a provider is integrated.

## Previously recorded quality gate (2026-10-11)

- `pnpm test`: passed, 14 tests.
- `pnpm lint`: failed because the repository's Prettier checks report 1,368 formatting errors and 14 warnings in maintained files after generated output and nested worktrees are excluded. This is a broad existing formatting baseline; no repository-wide formatting was applied during this review.
- TypeScript check and production build passed during the Phase 3 verification. The Netlify output locations above were confirmed in this review.

The user reported that PR #3 head `fad5cc1` passed 16/16 local Convex tests, the TypeScript check, production build, and Playwright test discovery on 2026-10-22. These checks were not rerun by this review.

## Acceptance walkthrough checklist

Run after production configuration is ready, using non-production test data first:

1. Super admin creates and publishes a store, assigns its first owner, and confirms store health.
2. Store owner invites a manager and staff for preparation, catalogue, dispatch, and driver roles; verify invite expiry, revocation, and acceptance.
3. Verify each role sees only its permitted screens and store data; attempt cross-store reads and role-inappropriate order actions.
4. Place a guest and signed-in customer order, verify server-calculated totals and store-specific order creation, then follow customer-visible status updates.
5. Accept, prepare, assign, dispatch, and complete an order; verify each actor can perform only their allowed transition and a driver sees only assigned delivery details.
6. Exercise rejection, cancellation, duplicate requests, and stale updates; confirm the event history and displayed state remain consistent.
7. Record the result, deployment version, test accounts/roles (without passwords or tokens), and any defects in the operational runbook.

Phase 5 remains open until the correct Netlify site and Convex production settings are verified by their owner, exposed credentials are rotated, operational alerts and recovery are exercised, and the full staging checkout-to-delivery walkthrough passes with the updated test. No production deployment or production configuration was changed during this review.
