# Order Preparation Checklist Design

**Status:** Design approved; awaiting review of this written spec.

## Goal

Make incoming store orders easier to prepare accurately by showing each ordered product as a visual, quantity-aware checklist and sharing item progress among authorized store staff.

## Existing context

The store dashboard's `DispatchOrdersQueue` currently renders all order item names and quantities in one text line. The app already resolves product photos from its bundled catalogue and falls back to each item's emoji. The existing order workflow includes `preparing` and `ready` states, and Convex is the source of truth for live order data.

## Proposed experience

- Each open order displays a preparation checklist with one row per order item.
- Each row shows the product image, item name, quantity and unit. Use the existing product-image lookup; show the item's emoji if no photo is available.
- Authorized staff can check or uncheck each item as it is prepared. Checklist state is saved with the order and updates live for other staff viewing that order.
- The order's existing status progression remains in place. Staff can move a confirmed order to **Preparing**. Staff can move a preparing order to **Ready** only after every checklist item is checked.
- If a preparation item is unchecked, the **Ready** action is unavailable and the interface explains that all items must be checked first.
- Reopening an order preserves its saved checklist state. Starting preparation or changing an item check does not alter payment, dispatch assignment, or delivery state.

## Data and access

Persist the checked state against each order item in the existing Convex order record. Keep the ordered item snapshot authoritative for product name, quantity, and unit; checklist writes only update preparation state and must not modify price or order totals. Tie each check to its order line, so repeated products on separate lines can be tracked independently.

Use existing membership and order workflow authorization. Only staff already authorized to progress store orders may update preparation checks. A user must have access to the order's store. Superadmins retain their existing management access. Enforce the all-items-checked rule inside the Convex status mutation as well as in the interface, so a stale client or direct mutation cannot move an incomplete order to **Ready**.

## Scope

Included:

- Replace the single-line items summary in the staff order queue with product rows and preparation controls.
- Reuse the existing catalogue image mapping and emoji fallback.
- Persist checklist state in Convex so it is shared and survives reloads.
- Gate the transition from **Preparing** to **Ready** on all items being checked.
- Keep the checklist usable on narrow screens.

Excluded:

- Customer-facing checklist or preparation progress.
- Changes to the order's payment, fulfillment assignment, cancellation, or delivery model.
- Product stock validation or substitutions as part of checking an item.
- New image upload or storage behavior.

## Error handling and live updates

Use Convex mutations and subscriptions already used by the dashboard so checklist changes appear for other authorized staff. If a save fails, restore the last confirmed checkbox state and show a concise error. If the order changes while a staff member has it open, rely on the latest subscribed order state before allowing **Ready**.

## Acceptance criteria

1. Every item in an open order has its own row with an image or emoji fallback, name, quantity, and unit.
2. An authorized staff member can check an item and see that state persist after reload.
3. Another authorized staff member viewing the same order sees the saved update without refreshing.
4. The **Ready** action is disabled until all items are checked; once checked, the existing status transition succeeds.
5. An unauthorized user cannot change checklist state or advance an order outside their existing permissions.
6. The layout remains readable and the controls usable on a phone-sized viewport.

## Implementation outline

1. Extend the Convex order schema and authorized mutations to store and update per-item preparation checks.
2. Update the order mapper/types to expose checklist state without changing the authoritative item snapshot.
3. Replace the queue's inline item summary with a responsive image-and-checklist list.
4. Gate the **Preparing** to **Ready** action on the subscribed checklist state and report mutation failures.
5. Verify the checklist, live sharing, role access and status gate in the app's existing workflow.

