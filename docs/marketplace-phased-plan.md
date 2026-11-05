# REETAPELE Marketplace Delivery Plan

This plan follows the approved marketplace authentication, membership, and events design. Convex remains authoritative for identity, tenancy, orders, and operational state. Delivery is development-first; no remote push or production deployment is included.

## Phase 1 — Store tenancy and staff access

**Status: core implementation complete in development; marketplace acceptance gaps remain**

- Enforce active, store-scoped roles for every privileged Convex query and mutation.
- Keep the platform super admin separate from store memberships and prevent accidental platform lockout.
- Let a store owner onboard managers; let owners and managers onboard order preparation staff, catalogue staff, dispatchers, and drivers.
- After sign-in, resolve active store memberships before choosing a workspace: route a single-membership user directly to that workspace and offer the account/staff choice to users with multiple active memberships. Verify super admins never land in a customer workspace by default.
- Make invitation acceptance single-use, email-verified, expiry-aware, and revocation-aware.
- Protect invitation resend and revocation with the same role authority as invitation creation.
- Cover anonymous, suspended, wrong-store, wrong-role, duplicate, revoked, expired, and self-lockout cases.
- Keep staff access screens driven by authorized Convex membership queries.

**Exit criteria:** no account can gain access by changing client input or reusing an old invitation; sign-in lands in a workspace authorized by active memberships; store members cannot read or change another store's staff or operations; an active super admin always remains available.

## Phase 2 — Store onboarding and configuration

**Status: complete in development**

- Give the super admin a complete store lifecycle: create, enable/disable, assign the first store owner, and inspect store health. New stores start unpublished and can be published only after an active owner, settings, active category, and available product exist.
- Give store owners control of their profile, operating hours, delivery areas, fees, minimum order, and payment options.
- Make catalogue, promotions, settings, staff, and dispatch workspaces select only stores the signed-in member may access.
- Ensure role-specific navigation reflects backend permissions without using UI visibility as a security boundary.

**Exit criteria:** a new store can be onboarded and operated without editing seed data or granting broad platform access.

## Phase 3 — Order fulfillment workflows

**Status: core implementation complete in development; two-store and exception acceptance remains open**

- Complete the customer order timeline from placement through store acceptance, preparation, ready, dispatch, delivery, rejection, and cancellation.
- Define allowed transitions by staff role in backend-agnostic domain rules and enforce them in Convex mutations. Repeated status requests are idempotent; invalid or stale transitions fail without changing the order or event history.
- Ensure each fulfillment order belongs to exactly one store, while a multi-store basket creates linked store orders with server-calculated per-store item totals, fees, delivery estimates, payment states, and a consistent basket total.
- Make linked store orders independently fulfillable: each store sees only its child order; a store-level cancellation or rejection does not cancel the other store's child order; a stock or availability change identifies the affected store and items and gives the customer a clear next action.
- Give staff store-scoped queues and give drivers only their assigned deliveries and required delivery details. Driver projections omit customer account identifiers, email, and exact coordinates.
- Let managers assign preparation work to named order staff, and show each person only the work assigned to them.
- Record actor, time, and versioned domain events atomically with each committed status or assignment change; keep reactive screens consistent.
- Handle retries and concurrent updates without duplicate orders or invalid transitions.

**Exit criteria:** a two-store basket produces correctly linked, store-scoped work with understandable per-store charges and estimates. A cancellation, rejection, or unavailable item in one child order leaves the other child order's status and fulfillment intact. Customer, store admin/owner, manager, order staff, dispatcher, and assigned driver see authoritative status and only their permitted actions; after delivery the customer can confirm the correct child order's delivered state. Unassigned drivers and staff from another store cannot access that work.

## Phase 4 — Checkout, payment, and customer communication

- Verify addresses, delivery area eligibility, store hours, minimum order, stock, promotions, coupon rules, and per-store fees at checkout on the server.
- At discovery and checkout, group items by store and show each store's availability, fees, and delivery estimate, plus the combined amount. Cover closed stores and stock changes between browsing and submission; preserve unaffected store items and explain whether the customer must retry or remove only the affected items.
- Define and verify the partial-failure policy for linked store orders, including whether checkout creates all eligible child orders together or reports a retryable failure before any order is created. Never leave an ambiguous duplicate or silently charge for unavailable items.
- Clarify payment states for cash on delivery and manual mobile money, including staff verification and customer-visible status.
- Treat payment-provider integration as a production release gate: before enabling provider-backed payments, confirm payment status server-side, verify signed callbacks, make callbacks and retries idempotent, recover from failed/pending payments, reconcile provider records against orders, and support and record refunds. Until then, development/staging may use cash and manual mobile money with explicit pending/verification states; do not display an unconfirmed payment as paid.
- Send reliable customer updates for acceptance, changes, dispatch, delivery, and cancellation, with a support path for exceptions.
- Preserve guest checkout and optional customer accounts with customer-owned order/address access.

**Exit criteria:** per-store and combined totals are server-authoritative; partial failures and retry behavior are unambiguous; each supported development payment method has clear successful, failed, and pending outcomes. Provider-backed production payment methods remain disabled until every payment release gate above passes.

## Phase 5 — Operational readiness and launch

**Status: readiness review complete; launch blockers remain**

- Complete authorization and workflow tests, including cross-store isolation and role escalation attempts.
- Run the complete staging acceptance matrix on synthetic data: multi-store customer checkout and per-store summaries; independent child-order cancellation and unavailable-item recovery; owner/admin staff onboarding and invitation lifecycle; order staff preparation; manager exception handling; dispatcher assignment; assigned-driver delivery; and denials for other-store staff, wrong roles, and unassigned drivers.
- Repeat customer, manager, and driver tasks at phone widths, including loading, empty, error, and recoverable network states. Record outcomes by role and viewport in the staging acceptance record.
- Exercise customer and staff recovery paths for a closed store, stock exhaustion after browsing, uncertain checkout response, rejected/cancelled store order, and failed delivery. Each case must show the current authoritative status, a next action, and a support/escalation route; retries must not create duplicates.
- Keep provider payments as a separate hard production gate. Staging acceptance of cash/manual mobile money does not satisfy provider confirmation, callback security/idempotency, reconciliation, failure recovery, or refund criteria.
- Verify development and production Convex environment variables, auth email, domain, and site origins without exposing secrets.
- Rotate any credentials exposed in prior verbose CLI output before using them again.
- Confirm Netlify output, environment configuration, monitoring, backup/recovery, and support procedures.
- Run a staff acceptance walkthrough for store onboarding, checkout, fulfillment, and delivery.

See [Phase 5 readiness findings](phase-5-readiness.md) for the development checks and outstanding production actions.

**Exit criteria:** the recorded staging matrix passes across stores, roles, recovery cases, and phone layouts; critical failures are observable and staff know the recovery/escalation path. Production payment methods remain limited to those whose payment gate has passed. Production environment and operational readiness must also pass before release.
