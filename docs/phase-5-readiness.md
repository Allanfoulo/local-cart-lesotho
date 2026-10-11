# Phase 5 Readiness Findings

Reviewed 2026-10-11. This is a development readiness review; it does not deploy or change production configuration.

## Verified

- The Convex development deployment has the expected auth and email variable names configured: `AUTH_EMAIL_FROM`, `INITIAL_SUPERADMIN_EMAIL`, `RESEND_API_KEY`, and `SITE_URL`. Only names were inspected; values were not read or displayed.
- Netlify build configuration uses `pnpm build` and publishes `dist/client`, matching the configured TanStack Start Vite adapter output.
- The production build produced the Netlify server function at `.netlify/v1/functions/server.mjs` and client assets under `dist/client`.
- The marketplace Convex test suite passed: 14 tests.
- Development type checking and the application build passed during the preceding implementation verification. The development app responded on port 7093.
- `.env.local` is ignored by Git.

## Launch blockers

- The linked production Convex deployment (`enchanted-aardvark-205`) has no environment variables configured. Production auth, email delivery, and site-origin behavior are therefore unverified. Do not copy development credentials into production.
- `allanfdeveloper.space` is Allan's personal portfolio and is used as the verified Resend sending domain for super-admin email. It is not intended to host the marketplace. For development, use `allanfdeveloper@gmail.com` for support and problem reports. Reminder: purchase a separate marketplace domain later and configure it when ready.
- The Netlify CLI is authenticated, but to an account whose listed site belongs to a different repository (`arctrd3s/arcflow`). This workspace is not linked to a REETAPELE Netlify site. The file-level build and publish settings are verified, but no REETAPELE site's `VITE_CONVEX_URL`, deploy settings, or preview integration could be verified through that account.
- Credentials previously exposed in verbose development CLI output have not been rotated. No Resend or Convex account dashboard is connected here, so replacement and revocation could not be completed. Rotate those values before relying on the affected credentials.
- Monitoring, backup/recovery, and support procedures have not been demonstrated or documented as operational. Confirm these with the deployment and operations owners before launch.
- A staff acceptance walkthrough has not been run with real store, manager, order staff, dispatcher, and driver accounts.
- A PR can be pushed for review. A Netlify Deploy Preview depends on a Netlify site linked to this GitHub repository and its preview settings; that integration remains unverified.
- Payment-provider integration remains deferred as previously agreed. Production payment methods and related customer messaging must reflect the supported methods until a provider is integrated.

## Local quality gate

- `pnpm test`: passed, 14 tests.
- `pnpm lint`: failed because the repository's Prettier checks report 1,368 formatting errors and 14 warnings in maintained files after generated output and nested worktrees are excluded. This is a broad existing formatting baseline; no repository-wide formatting was applied during this review.
- TypeScript check and production build passed during the Phase 3 verification. The Netlify output locations above were confirmed in this review.

## Acceptance walkthrough checklist

Run after production configuration is ready, using non-production test data first:

1. Super admin creates and publishes a store, assigns its first owner, and confirms store health.
2. Store owner invites a manager and staff for preparation, catalogue, dispatch, and driver roles; verify invite expiry, revocation, and acceptance.
3. Verify each role sees only its permitted screens and store data; attempt cross-store reads and role-inappropriate order actions.
4. Place a guest and signed-in customer order, verify server-calculated totals and store-specific order creation, then follow customer-visible status updates.
5. Accept, prepare, assign, dispatch, and complete an order; verify each actor can perform only their allowed transition and a driver sees only assigned delivery details.
6. Exercise rejection, cancellation, duplicate requests, and stale updates; confirm the event history and displayed state remain consistent.
7. Record the result, deployment version, test accounts/roles (without passwords or tokens), and any defects in the operational runbook.

Phase 5 remains open until production settings are verified, exposed credentials are rotated, critical operational procedures are confirmed, and staff complete this walkthrough.
