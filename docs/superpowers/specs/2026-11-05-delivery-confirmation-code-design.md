# Delivery Confirmation Code Design

**Status:** Design approved; awaiting review of this written spec.

## Goal

Require the customer to share a one-time code with the assigned driver before an order can be marked delivered. This gives both people a clear handoff step and prevents the driver dashboard from completing delivery with a single tap.

## Existing context

Customers must sign in to place an order, and their account page displays their orders and delivery status. A driver starts an assigned trip by moving an order from `ready` to `out_for_delivery`; currently the driver can mark it delivered directly from a confirmation dialog. Convex is the source of truth for orders and authorization. The project has no SMS provider for order updates.

## Proposed experience

- When the assigned driver starts the delivery, generate a cryptographically random six-digit numeric code for that store order.
- Show the code in the signed-in customerâ€™s order details only while the order is `out_for_delivery`. The customer reads or shows the code to the driver at handoff.
- Replace the driver's one-tap completion dialog with a numeric code-entry form. A correct code lets the assigned driver mark the order delivered. An incorrect code keeps the order active and shows retry feedback.
- A customer can request a replacement code from that active orderâ€™s details. The replacement immediately invalidates the previous code and is rate limited to one replacement per minute.
- The code is single-use and becomes invalid when the order is delivered or cancelled. Each child order in a multi-store checkout has its own code and delivery confirmation.

No SMS or email delivery is part of this feature. The code is shown only in the existing customer account.

## Data and authorization

Store confirmation codes in a dedicated Convex table associated with the order and customer account. Do not add the raw code to the order document or include it in staff and driver order projections. Only a customer-authenticated query that verifies `customerUserId` ownership and the active delivery status may return the code.

The completion mutation must verify the authenticated driver is the driver assigned to the order, the order is currently `out_for_delivery`, and the submitted code is current and unused. It must mark the code consumed and the order delivered in the same Convex mutation. The existing generic status mutation must not provide a path to mark an order delivered without the code.

Allow at most five incorrect submissions for a code. After that, the driver must use a replacement code requested by the customer. Replacement requests are available only to the signed-in customer who owns the active order and are limited to one per minute.

## Scope

Included:

- Generate and persist a separate code when delivery starts.
- Show the current code in the owning customerâ€™s active order details.
- Add a customer-controlled replacement action with a cooldown.
- Replace direct driver completion with code verification.
- Enforce assigned-driver access, code attempt limits, single use, and invalidation in Convex.
- Keep each store order in a multi-store checkout independently verifiable.

Excluded:

- SMS, email, push notification, or WhatsApp delivery of the code.
- Store staff or administrator override to mark an order delivered without the code.
- Changes to product preparation, payment, driver assignment, or route tracking.

## Error handling and live updates

Return plain-language errors for a wrong, replaced, locked, or already-used code. Invalid submissions must persist the failed-attempt count while returning retry feedback. The driver can retry while the code remains valid. If the attempt limit is reached, prompt the customer to request a replacement in their order details. Convex subscriptions should update the customerâ€™s code state and both partiesâ€™ delivery status after a replacement or successful confirmation.

If the order is cancelled or already delivered, the customer query must not return a code and the driver mutation must refuse completion. Keep the existing driver retry feedback for network or mutation failures without treating an unconfirmed request as delivered.

## Acceptance criteria

1. Starting an assigned delivery creates a six-digit code for that store order.
2. The owning signed-in customer can see the code only while that order is `out_for_delivery`.
3. Store staff and driver order queries do not expose the code.
4. The assigned driver can mark the order delivered only by entering the current code.
5. A wrong code leaves the order active and provides retry feedback; after five failures, a customer-requested replacement is required.
6. A replacement invalidates the old code, is limited to once per minute, and appears to the customer without refreshing.
7. A successful code submission marks the code consumed and the order delivered atomically; replaying it cannot complete another delivery.
8. Cancelled and delivered orders cannot reveal or accept a code.
9. Each store child order in a multi-store checkout has an independent code and verification state.

## Implementation outline

1. Add a dedicated Convex table and code-generation helper with secure random generation and bounded attempt/replacement state.
2. Generate the code when the driver starts an assigned delivery; add a customer-authorized query and replacement mutation.
3. Add an atomic driver verification mutation and block the generic delivered status transition.
4. Show the code and replacement control in the customer's active order details.
5. Replace the driver's completion dialog with code entry, accessible numeric input, and retry/lockout messages.
6. Verify customer ownership, driver assignment, terminal-status invalidation, attempt limits, and live updates through the existing app workflow.

