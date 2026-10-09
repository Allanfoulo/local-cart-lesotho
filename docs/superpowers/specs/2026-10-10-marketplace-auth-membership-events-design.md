# Marketplace Authentication, Membership, and Data Flow Design

## Goal

Give every REETAPELE user a clear, role-appropriate workspace, with Convex as the authority for identity-linked access, marketplace data, and operational updates. Preserve guest checkout and multi-store checkout.

## Current context

- Convex Auth email/password authentication and Resend verification are configured for the initial super admin, and the initial super-admin membership is active.
- `memberships` currently supports only the platform `superadmin` role.
- The marketplace catalogue reads from Convex, and guest checkout writes orders to Convex.
- Customer account, admin, store staff, dispatch, and driver workflows still read and write browser-local `AppStore` state.
- Staff and driver routes are not yet protected by backend authorization. Convex records `OrderPlaced`, but not subsequent order or membership changes.
- The marketplace supports multiple stores in one checkout, with a separate order created for each store.

## Domain concepts

- **Authentication user:** Convex Auth identity and credentials. Credentials and verification codes never enter application membership data.
- **Customer profile:** business contact details and order aggregates, optionally linked to an authenticated user. Guest orders remain supported.
- **Membership:** authorization grant, independent from authentication identity. Platform membership is separate from store-scoped membership.
- **Platform role:** `superadmin`.
- **Store roles:** `store_owner`, `store_manager`, `catalogue_staff`, `dispatcher`, and `driver`; each is scoped to exactly one store.
- **Membership status:** `active` or `suspended`.
- **Order:** authoritative current state for one store within a possibly multi-store checkout.
- **Domain event:** immutable, versioned fact recording a meaningful committed state change.

## Use cases

- Customer signup, sign-in, email verification, password recovery, optional authenticated account, and guest checkout.
- One-time initial super-admin setup; subsequent admin management of users, store records, and platform access.
- Store-owner invitation and acceptance for store-scoped staff roles; suspension and revocation of memberships.
- Store-scoped catalogue, inventory, offer, and setting updates.
- Authorized order status changes, driver assignment, and delivery updates.
- Driver view of assigned work and authorized status updates.
- Customer view of their own eligible orders and saved customer details.
- Staff view of workspace data authorized by active membership and store scope.

Every command validates the caller and scope in Convex. The client never grants itself a role by submitting a role, user ID, or store ID without server-side membership checks.

## Events and data propagation

Persist versioned facts in the same Convex transaction as the state change:

| Event | Published when | Consumers |
| --- | --- | --- |
| `MembershipGranted` | An authorized invitation or initial setup grants a role | Audit history; access UI refreshes from membership queries |
| `MembershipSuspended` | An authorized owner or superadmin suspends a grant | Audit history; authorization immediately denies access |
| `ProductChanged` | A product, availability, stock, or price change commits | Storefront and catalogue screens through reactive queries |
| `OrderPlaced` | A checkout creates a per-store order | Order history and staff queues through reactive queries |
| `OrderStatusChanged` | An allowed order transition commits | Customer, staff, and driver screens through reactive queries |
| `DriverAssigned` | An authorized staff member assigns an order | Dispatch and driver screens through reactive queries |

Each event has `eventType`, `version`, `aggregateId`, `occurredAt`, `actorId`, `scope`, and the minimal business data needed by consumers. Events exclude passwords, verification codes, customer contact details, and delivery coordinates. Current Convex records remain authoritative for UI state; reactive queries deliver current state. Event records provide audit history and a stable extension point, not event-sourced state reconstruction.

## Jobs

Do not add a general-purpose broker. Staff invitations need a tracked record with pending/sent/failed/accepted/expired lifecycle and an asynchronous Resend action with bounded, idempotent retry. Keep Convex Auth verification and reset delivery on its existing email path. Email failure must not grant a membership.

## Responsibility split

- **UI:** forms, navigation, role-appropriate rendering, loading/error states, and calling typed Convex functions.
- **Domain:** deterministic role/scope rules and order transition rules, independent from React and Convex.
- **Convex application layer:** authorization, input validation, state transitions, transactional writes, event recording, and authorized queries.
- **Infrastructure:** Convex persistence and reactive subscriptions; Resend delivery.
- **Browser-local state:** cart and harmless presentation preferences only; never operational or authorization state.

## Coupling analysis

- **Operational:** email delivery is outside the membership transaction; an invitation can be retried without blocking existing screens.
- **Developmental:** feature hooks and query DTOs shield UI components from database document layout.
- **Semantic:** one canonical role vocabulary and order status transition model is shared across backend and UI.
- **Functional:** Convex owns permissions, pricing, stock, and workflow transitions; the browser cannot create alternate authoritative paths.
- **Incidental:** routes and visible controls never imply security. Backend queries and mutations enforce identity, active membership, role, and store scope.

## Message contracts

Use validated commands such as `acceptStaffInvite`, `updateProduct`, `transitionOrder`, and `assignDriver`. Public queries return only the caller's profile, active memberships, allowed stores, and authorized workspace data. Event records use the versioned envelope defined above. Invitation delivery inputs contain an invitation ID and a short-lived, single-use acceptance token; do not persist plaintext credentials or email verification codes.

## Refactor plan

1. Expand the schema for platform and store-scoped memberships, customer identity linkage, staff invitations, and versioned events. Preserve the existing active super-admin membership.
2. Add authorization helpers for platform roles, store roles, ownership, and customer-owned data; make all checks fail closed.
3. Add invitation lifecycle and customer authentication flows with role-appropriate enrollment policies.
4. Add protected route/workspace composition driven by a reactive current-access query.
5. Move catalogue, order operations, dispatch, driver, customer account, and order-history reads/writes from `AppStore` to authorized Convex queries and mutations. Preserve guest and multi-store checkout.
6. Record events in the same mutation as each meaningful state transition; use reactive queries to update screens.
7. Remove operational demo writes from local storage. Keep cart and non-sensitive display preferences local.

## Practical module structure

```text
convex/
  memberships.ts
  invitations.ts
  catalog.ts
  orders.ts
  customers.ts
  lib/authorization.ts
  lib/events.ts
src/domain/
  memberships/
  catalog/
  orders/
src/features/
  auth/
  catalog/
  orders/
  dispatch/
  customer/
```

Keep the current Convex deployment as a modular application. Do not add an external message broker without a concrete consumer and delivery requirement.

## Acceptance criteria

- Anonymous users can continue guest checkout across multiple stores.
- Customers can optionally register and only see their own authenticated account data and eligible orders.
- Internal accounts are invitation-only, scoped to a store, and cannot grant or elevate their own roles.
- The super admin remains platform-scoped; store roles never imply platform access.
- All privileged routes and every sensitive Convex query/mutation enforce authorization on the server.
- Catalogue, order, dispatch, driver, membership, and customer workflows use Convex as their operational source of truth.
- Meaningful mutations store an event atomically with the changed state; realtime screens derive current values from authorized Convex subscriptions.
- No verification code, password, secret, or sensitive customer/delivery detail appears in event history or client-only authorization state.
- Existing multi-store checkout and the active initial super-admin membership continue to work.

## Testing strategy

Cover pure role and order transition rules; server permission denial for anonymous, suspended, wrong-role, wrong-store, and wrong-customer access; invitation expiry and single-use behavior; event/state transaction consistency; customer data isolation; and multi-store checkout. Run the project type-check/build and focused Convex tests during implementation.

## Final recommendation

Use a modular Convex application with explicit memberships and server-enforced scope. Let reactive queries propagate current state to each authorized workspace, and store append-only versioned events for audit and future consumers. Avoid a second source of operational truth in `localStorage` and avoid a broker until the application has an actual cross-process consumer.
