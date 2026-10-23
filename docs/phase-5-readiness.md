# Phase 5 Readiness Findings

Reviewed 2026-10-22. This is a development/staging readiness review; it does not deploy or change production configuration.

## Verified in this review (2026-10-22)

- `netlify.toml` still builds with `pnpm build` and publishes `dist/client`.
- The local app responded with HTTP 200 at `http://localhost:7093`.
- Convex CLI confirmed the development deployment has the auth/email variable names configured; the production deployment `enchanted-aardvark-205` currently has no environment variables. Only variable names were read; secret values were not displayed.
- Added [development operations runbook](operations-runbook.md) covering triage, recovery boundaries, support escalation, payment/order incidents, and how to record staging acceptance.

## Previously verified (2026-10-11)

- The Convex development deployment has the expected auth and email variable names configured: `AUTH_EMAIL_FROM`, `INITIAL_SUPERADMIN_EMAIL`, `RESEND_API_KEY`, and `SITE_URL`. Only names were inspected; values were not read or displayed.
- Netlify build configuration uses `pnpm build` and publishes `dist/client`, matching the configured TanStack Start Vite adapter output.
- The production build produced the Netlify server function at `.netlify/v1/functions/server.mjs` and client assets under `dist/client`.
- The marketplace Convex test suite passed: 14 tests.
- Development type checking and the application build passed during the preceding implementation verification. The development app responded on port 7093.
- `.env.local` is ignored by Git.

## Launch blockers

- The linked production Convex deployment (`enchanted-aardvark-205`) currently has no environment variables configured. Production auth, email delivery, and site-origin behavior remain unverified; do not copy development credentials into production.
- `allanfdeveloper.space` is Allan's personal portfolio and is used as the verified Resend sending domain for super-admin email. It is not intended to host the marketplace. For development, use `allanfdeveloper@gmail.com` for support and problem reports. Reminder: purchase a separate marketplace domain later and configure it when ready.
- At the 2026-10-11 review, the Netlify CLI account's listed site belonged to a different repository (`arctrd3s/arcflow`), and this workspace was not linked to a REETAPELE Netlify site. The current PR #3 preview is reachable and returns HTTP 200; the E2E deployment guard verified it connects to the configured development Convex host. The Netlify CLI still cannot refresh account/site status (invalid URL and user-profile update-config access error), so production site's `VITE_CONVEX_URL` and deploy settings remain unverified.
- Credentials previously exposed in verbose development CLI output have not been rotated. No Resend or Convex account dashboard is connected here, so replacement and revocation could not be completed. Rotate those values before relying on the affected credentials.
- The runbook now documents monitoring and recovery procedures, but dashboard alerts/log streams, backup schedules, recovery exercises, and the support escalation path have not been verified as configured or operational. Confirm these with the deployment and operations owners before launch.
- Partial staging acceptance was first reported for PR #3 head `fad5cc1` on 2026-10-22 ([PR test report](https://github.com/Allanfoulo/local-cart-lesotho/pull/3)): the mobile marketplace, manager checklist/private storefront preview, catalogue search and filters, marketplace links, driver workspace, manager preparation/driver assignment, and driver delivery confirmation passed. Three synthetic development orders were created and all reached Delivered.
- The checkout E2E selectors and toast timing were corrected, the test timeout was adjusted for the multi-role workflow, and the full signed-in customer checkout-to-delivery test then passed against the PR #3 Deploy Preview and expected development Convex deployment on 2026-10-22. The public mobile preview smoke also passed. One interrupted synthetic order was completed through the driver workspace. The complete admin/owner onboarding and invitation lifecycle, guest checkout, and cross-store denial walkthrough were not part of this run.
- The new PR commits were pushed as `22de57f`, `fbd7d13`, and `38ded3d`. GitHub CLI still reports invalid saved authentication tokens, so the PR's CI and Netlify check status could not be refreshed from this workspace.
- The 2026-10-22 passing checkout-to-delivery E2E is evidence for the signed-in single-order path only. It does not establish two-store basket totals/estimates, independent child-order cancellation or stock recovery, guest checkout, full owner/admin invitation onboarding, manager exception coverage, unassigned-driver denial, or a cross-role phone acceptance matrix. Keep these open until each is recorded as passed; skipped or unconfigured scenarios are not passes.
- Payment-provider integration remains deferred as previously agreed. Production payment methods and related customer messaging must reflect the supported methods until a provider is integrated.

## Previously recorded quality gate (2026-10-11)

- `pnpm test`: passed, 14 tests.
- `pnpm lint`: failed because the repository's Prettier checks report 1,368 formatting errors and 14 warnings in maintained files after generated output and nested worktrees are excluded. This is a broad existing formatting baseline; no repository-wide formatting was applied during this review.
- TypeScript check and production build passed during the Phase 3 verification. The Netlify output locations above were confirmed in this review.

The user reported that PR #3 head `fad5cc1` passed 16/16 local Convex tests, the TypeScript check, production build, and Playwright test discovery on 2026-10-22. These checks were not rerun by this review.

## Acceptance walkthrough checklist

Run after production configuration is ready, using non-production test data first:

1. Super admin creates and publishes two eligible stores, assigns their first owners, and confirms store health.
2. Store owners/admins invite managers and staff for preparation, catalogue, dispatch, and driver roles; verify invite expiry, revocation, acceptance, and phone usability.
3. Place a basket with available products from both stores. Confirm discovery, cart, checkout, and receipt group products by store and show per-store subtotal, delivery fee, estimate, and payment state plus a correct combined amount.
4. Confirm checkout creates linked store orders with correct server-calculated totals. Verify each store's admin, manager, order staff, and dispatcher can see only their own work; verify the driver sees only assigned delivery details and cannot access an unassigned delivery.
5. Accept, prepare, assign, dispatch, and complete the child orders. Check role-specific actions at phone widths and verify customer-visible status updates for both stores.
6. Reject or cancel one store's child order and make a product unavailable after browsing. Confirm the customer sees which store/items are affected and what to do, the other child order remains visible and fulfillable, and totals/payment state are not falsely presented as settled or charged.
7. Exercise a closed store, uncertain checkout response, duplicate request, stale update, and failed delivery. Confirm staff can find the authoritative order/event history, customers see a next step/support route, and safe retries do not duplicate orders.
8. Record each scenario as pass/fail/not run, date, preview URL, commit SHA, Convex deployment name, viewport, synthetic roles, created child order references, recovery actions, and defects. Never record passwords, OTPs, tokens, or payment credentials.

Phase 5 remains open until the complete staging matrix above is recorded and the correct production Netlify/Convex settings are verified by their owner, exposed credentials are rotated, monitoring/backups and recovery are exercised, and support escalation is confirmed. The signed-in single-order checkout-to-delivery flow and public mobile preview smoke now pass on staging; they do not prove the two-store and exception scenarios above. Provider-backed payment methods remain a separate production gate requiring confirmed status, signed/idempotent callbacks, failure recovery, reconciliation, and refunds. No production deployment or production configuration was changed during this review.
