# Browser Tests

## Purpose

Own Playwright tests for commerce behavior and end-to-end customer/staff journeys.

## Ownership

Tests exercise the running application through browser-visible behavior. Application implementation is owned by `src/`.

## Local Contracts

- Keep selectors resilient and assert user-visible outcomes.
- Use the existing Playwright configuration and test fixtures.
- Do not add or run tests unless the task requests testing or verification.

## Work Guidance

Extend the closest relevant spec (`commerce.spec.ts` or `journeys.spec.ts`) when test work is requested.

## Verification

The configured command is `npm test`.

## Child DOX Index

No child test areas are indexed yet.
