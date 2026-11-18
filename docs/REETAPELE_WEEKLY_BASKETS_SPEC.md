# REETAPELE Weekly Baskets Specification

**Status:** Implemented in the current worktree; signed-in browser walkthrough remains pending. Release is still sequenced after P0 pilot-critical work.  
**Scope:** Customer-managed grocery lists that rebuild a cart for review. This does not create a scheduled order or payment.

## 1. Customer outcome

A returning customer can save a basket such as “Weekly Essentials,” edit its items and quantities, add it to the active cart, see today's prices and availability, resolve unavailable products, and then use the normal checkout. A customer can keep several lists and reorder a previous purchase. Every item retains its original merchant association.

## 2. User journeys

### Save and manage

1. From cart, completed order or basket screen, choose **Save basket**.
2. Enter a required name; create several baskets.
3. Open a basket to add/remove products and edit quantities/weight options; rename or delete it.
4. Basket screen displays current catalogue price estimates in Maloti and store groupings.

### Add to cart

1. Choose **Add available items to cart**.
2. Server-backed preview resolves each saved item against its original store/listing, current price, availability, stock, unit/options and any store status change.
3. Show changed price, insufficient quantity, unavailable/discontinued listing or inactive original store with a clear choice to remove the item or leave the basket unchanged.
4. Never silently substitute a different product or merchant. A customer can adjust/remove flagged entries and try again.
5. Add valid items to the current cart with today's price and continue to checkout for a final authoritative stock/price check.

### Reorder an order

1. Order history offers **Order these again**.
2. Rebuild from current products/prices but retain the historical product/store link and ordered quantity/unit.
3. Report unavailable items and price changes; let the customer review before checkout.
4. Offer to save the eligible/reviewed set as a named basket.

## 3. Data model proposal

Use bounded parent/child documents rather than an unbounded array on the customer profile.

### `savedBaskets`

- `ownerUserId: Id<"users">` — owner derived from auth on every mutation/query.
- `name: string` — trimmed, non-empty, length-limited.
- `createdAt`, `updatedAt` timestamps.
- Optional `sourceOrderId` for provenance only; it does not replace line snapshots.
- Index by customer and updated time; enforce a product-approved per-customer count limit.

### `savedBasketItems`

- `basketId: Id<"savedBaskets">` and `ownerUserId` (owner-scope lookup).
- `storeId: Id<"stores">` and `productId: Id<"products">` as the immutable merchant/listing association at save time.
- Snapshot display fields for graceful unavailable-listing messages: product name, unit and sold-by-weight state.
- `unitPriceAtSave: number` as an informational reference for identifying price changes; basket estimates always use current catalogue pricing.
- `quantity: number` with validation for positive supported precision; retain explicit chosen weight/variant option if catalogue represents it separately.
- `createdAt`, `updatedAt`.
- Index by basket, by owner+basket, and unique basket+product/listing as appropriate.

The snapshot is informational only. At preview/add, resolve the current product by the saved product ID and require the same store ID. Do not update `storeId` to a new merchant if a listing is moved or recreated. Preserve discontinued entries as unavailable until the customer removes them; do not cascade-delete saved-basket history when a product is archived.

Before schema work, inspect current maximums, product variant semantics and Convex schema/index migration guidance. Do not add duplicate state to `customers` or persist calculated totals as if they were order prices.

## 4. Backend operations

- `listMine`: authenticated owner only; bounded/paginated baskets and bounded item lists.
- `createEmpty`, `createFromCart`, `createFromOrder`: authenticated owner, validate name/count and snapshot current or historical item details from server-known product/order records.
- `rename`, `delete`: owner-only; delete child items transactionally/with bounded rules.
- `setItem`, `removeItem`: verify basket owner and positive valid quantity; prevent product from crossing merchant association.
- `listMine`: returns current availability and price comparison by line; `addAvailableToCart` rechecks those conditions before returning accepted and blocked lines. A separate `previewOrderReorder` operation validates ownership and rebuilds a past order from current catalogue data.
- `addAvailableToCart`: revalidate owner and current product/store/availability/stock, return accepted and blocked lines with reason; client merges only accepted lines. Checkout remains the final source of truth and revalidates in its existing transaction.
- `createFromOrder` / `createFromCart`: verify source ownership or product IDs and snapshot store/product/quantity/unit safely.

All public functions use Convex validators and server-side authorization. Never trust client-submitted price, store name, product name or customer ID. Add tests for cross-user basket IDs and cross-store item tampering.

## 5. Pricing, availability and weights

- Basket totals are estimates only and must be labeled “current estimate”; final prices/fees are calculated by checkout.
- Use `promoPrice ?? price` from the current product and existing Maloti/LSL formatting.
- Recompute line estimate from current price, quantity and explicit weight/variant selection using existing commerce rules.
- For measured goods, preserve quantity precision and the selected unit/weight option. Do not silently round to the nearest available size.
- Distinguish unavailable, discontinued/missing listing, inactive store, insufficient stock, and price changed.
- Never automatically substitute another SKU or another merchant.

## 6. UI and accessibility

- Add **Saved baskets** to customer account/navigation with loading, empty, error and retry states.
- Mobile-first cards show basket name, store sections, item count, estimated total and update time.
- Item rows show product image, name, merchant, unit/weight, selected quantity and current estimate.
- Provide accessible quantity controls and explicit remove/save feedback; announce add-to-cart results to assistive technology.
- Make unavailable/price-changed status visible in both English and Sesotho; keep review summary before adding to cart.
- Preserve current brand palette and components.

## 7. Edge cases

- Product unavailable or stock below saved quantity.
- Product deleted, archived, or same product name recreated under a different ID.
- Original merchant disabled or removed from the currently supported delivery area.
- Product price/promotion changes after basket preview.
- Weight/variant options change or disappear.
- Same product already exists in cart; merge only when units and merchant match, with explicit resulting quantity.
- Basket saved while checkout/order is in progress; current cart/order snapshots remain unchanged.
- User signs out, switches accounts or tampers with basket/product identifiers.
- Basket item count/quantity limits and duplicate mutations.

## 8. Acceptance criteria and tests

- Customer creates, renames, edits, deletes and keeps multiple persistent baskets across sessions.
- Customer saves from a prior order and recreates it with current prices, correct weights and original stores.
- Price changes, unavailable stock, missing listing and disabled merchant are shown separately; nothing is silently substituted.
- Valid items can be added to an existing cart; blocked items do not corrupt valid lines.
- Checkout revalidates stock and price and remains idempotent.
- Other users cannot read, modify, preview or add another customer's baskets.
- Two-store basket lines remain grouped by their saved store; changing/removing one store does not reassign or silently discard the other store's items.
- E2E covers English and Sesotho, mobile and desktop, empty/error states, changed price, insufficient stock, weight products and cross-store ownership.

## 9. Explicit exclusions

No automatic weekly order, scheduled checkout, recurring payment, automatic substitution, merchant reassignment, recommendation model or loyalty campaign. These need separate consent, payment, customer support and business-policy design.
