# REETAPELE Marketplace Delivery Plan

This plan follows the approved marketplace authentication, membership, and events design. Convex remains authoritative for identity, tenancy, orders, and operational state. Delivery is development-first; no remote push or production deployment is included.

## Phase 1 — Store tenancy and staff access

**Status: complete in development**

- Enforce active, store-scoped roles for every privileged Convex query and mutation.
- Keep the platform super admin separate from store memberships and prevent accidental platform lockout.
- Let a store owner onboard managers; let owners and managers onboard order preparation staff, catalogue staff, dispatchers, and drivers.
- Make invitation acceptance single-use, email-verified, expiry-aware, and revocation-aware.
- Protect invitation resend and revocation with the same role authority as invitation creation.
- Cover anonymous, suspended, wrong-store, wrong-role, duplicate, revoked, expired, and self-lockout cases.
- Keep staff access screens driven by authorized Convex membership queries.

**Exit criteria:** no account can gain access by changing client input or reusing an old invitation; store members cannot read or change another store's staff or operations; an active super admin always remains available.

## Phase 2 — Store onboarding and configuration

**Status: complete in development**

- Give the super admin a complete store lifecycle: create, enable/disable, assign the first store owner, and inspect store health. New stores start unpublished and can be published only after an active owner, settings, active category, and available product exist.
- Give store owners control of their profile, operating hours, delivery areas, fees, minimum order, and payment options.
- Make catalogue, promotions, settings, staff, and dispatch workspaces select only stores the signed-in member may access.
- Ensure role-specific navigation reflects backend permissions without using UI visibility as a security boundary.

**Exit criteria:** a new store can be onboarded and operated without editing seed data or granting broad platform access.

## Phase 3 — Order fulfillment workflows

**Status: complete in development**

- Complete the customer order timeline from placement through store acceptance, preparation, ready, dispatch, delivery, rejection, and cancellation.
- Define allowed transitions by staff role in backend-agnostic domain rules and enforce them in Convex mutations. Repeated status requests are idempotent; invalid or stale transitions fail without changing the order or event history.
- Ensure each order belongs to exactly one store, while multi-store checkout creates linked store orders with consistent totals.
- Give staff store-scoped queues and give drivers only their assigned deliveries and required delivery details. Driver projections omit customer account identifiers, email, and exact coordinates.
- Let managers assign preparation work to named order staff, and show each person only the work assigned to them.
- Record actor, time, and versioned domain events atomically with each committed status or assignment change; keep reactive screens consistent.
- Handle retries and concurrent updates without duplicate orders or invalid transitions.

**Exit criteria:** customer, manager, order staff, dispatcher, and driver see the same authoritative status and permitted actions.

## Phase 4 — Checkout, payment, and customer communication

- Verify addresses, delivery area eligibility, store hours, minimum order, stock, promotions, coupon rules, and per-store fees at checkout on the server.
- Clarify payment states for cash on delivery and manual mobile money, including staff verification and customer-visible status.
- Integrate a payment provider before enabling card payments; add signed webhook handling, idempotency, refunds, and failure recovery.
- Send reliable customer updates for acceptance, changes, dispatch, delivery, and cancellation, with a support path for exceptions.
- Preserve guest checkout and optional customer accounts with customer-owned order/address access.

**Exit criteria:** totals and payment state cannot be altered by the browser, and every payment path has a clear successful, failed, and pending outcome.

## Phase 5 — Operational readiness and launch

**Status: readiness review complete; launch blockers remain**

- Complete authorization and workflow tests, including cross-store isolation and role escalation attempts.
- Verify development and production Convex environment variables, auth email, domain, and site origins without exposing secrets.
- Rotate any credentials exposed in prior verbose CLI output before using them again.
- Confirm Netlify output, environment configuration, monitoring, backup/recovery, and support procedures.
- Run a staff acceptance walkthrough for store onboarding, checkout, fulfillment, and delivery.

See [Phase 5 readiness findings](phase-5-readiness.md) for the development checks and outstanding production actions.

**Exit criteria:** production settings are verified, critical failures are observable, and staff can complete the core marketplace journey without developer intervention.
