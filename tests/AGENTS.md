# Browser Tests

## Purpose

Own Playwright tests for commerce behavior and end-to-end customer/staff journeys.

## Ownership

Tests exercise the running application through browser-visible behavior. Application implementation is owned by `src/`.

## Local Contracts

- Keep selectors resilient and assert user-visible outcomes.
- Browser tests live under `tests/e2e/` and use `playwright.config.ts`.
- Keep credentials in `.env.e2e.local` or a CI secret store; never commit them or print their values.
- E2E tests are limited to the Netlify Deploy Preview and the explicitly expected development Convex deployment.
- Do not capture network traces for authenticated tests because request headers or bodies may contain credentials or session tokens. Failure screenshots mask form fields.
- Do not add or run tests unless the task requests testing or verification.

## Work Guidance

Extend the closest relevant browser journey spec when test work is requested.

## Verification

Install Chromium once with `pnpm test:e2e:install`, then run `pnpm test:e2e` with `.env.e2e.local` configured.

## Child DOX Index

No child test areas are indexed yet.
