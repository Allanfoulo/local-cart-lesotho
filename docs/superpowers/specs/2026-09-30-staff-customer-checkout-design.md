# Staff, Customer Account, and Checkout Design

**Status:** Approved for specification; implementation awaits the user's review of this document.

## Context

REETAPELE is a mobile-first grocery storefront built with TanStack Start, React, and TypeScript. The current customer cart and product pages use a shared `AppStore` backed by browser `localStorage`. The `/admin`, `/account`, `/checkout`, and `/orders` routes are placeholders. The store already has seeded products, categories, customers, orders, promotions, delivery areas, payment options, and client-side actions for most staff and shopping operations.

This work completes the staff workspace, customer account, order history, and checkout while keeping the prototype's current client-side architecture and REETAPELE visual language.

## Goals

- Give shop staff a useful home screen and working catalogue, inventory, promotion, shop, and order tools.
- Give a customer a clear place to manage their profile and addresses, see their orders, revisit favourites, and control notification preferences.
- Let a customer complete and review an order on a phone, then see the created order in both customer and staff views.
- Keep prices in Maloti, use the existing store configuration, and preserve responsive patterns and accessibility.

## Non-goals

- Backend, database, multi-device synchronization, staff authentication, or role-based permissions.
- Real EcoCash, M-Pesa, card, or other payment processing.
- Coupon code entry or redemption; catalogue promotional prices remain reflected in cart line prices.
- External geocoding, routing, or transmission of a customer's exact location.
- A new customer identity system or support for multiple signed-in customer profiles in this prototype.
- Product image uploads or new staff modules beyond the daily workflows below.

## Experience and information architecture

### Architecture decision

The recommended approach is to complete the three areas as distinct routes and workflow components backed by the existing shared `AppStore`. This keeps customer checkout and staff order handling on one consistent client-side record set, with little new infrastructure. A collection of static mock screens would be quicker but would not complete the order workflow. Adding a backend and payment provider would support shared real users and payment confirmation, but it is outside the current demo architecture and requires separate integration decisions. The shared-store approach is selected for this scope.

### Staff workspace

Use a task-first home at `/admin`. The home puts work needing attention at the top: incoming or active orders, low-stock products, and a concise sales/order summary based on the orders already in the local store. Staff can move from the summary directly to the relevant queue or product.

The staff area will provide these sections:

- **Overview:** order counts by actionable status, low-stock count, and a recent sales summary. Labels must describe the local demo data accurately.
- **Orders:** searchable/filterable order queue with customer, items, totals, delivery notes, payment state, status history, and status actions. Staff can progress an order through the existing `OrderStatus` values, enter or change a driver assignment, and record a manually verified payment as paid or unpaid.
- **Products and stock:** edit product details, price, availability, category, and stock; create or remove products using the existing store actions. Highlight low and out-of-stock items.
- **Categories and promotions:** edit enabled categories and their order; create or update promotions with the existing promotion model.
- **Shop settings:** edit contact details, opening hours, delivery areas, delivery fee, minimum order, and enabled payment choices.

Staff navigation should work on desktop and narrow screens. Use an obvious section navigation, compact mobile treatment, and focused screens for editing records. This is a demo workspace without a login or enforced access control; customer-facing language must not imply otherwise.

### Customer account

Use the selected section-first pattern at `/account`. Make distinct account sections for:

- **Profile:** edit the current demo customer's name, phone, and optional email. The demo account uses a stable customer ID so profile edits do not break order ownership.
- **Addresses:** list saved delivery addresses, add or edit an address, select its area, and remove saved addresses. Preserve landmarks and driver directions as entered.
- **Orders:** show orders belonging to the current demo customer, newest first, with totals, payment state, current status, and status timeline. Associate orders with a stable local customer identity so editing contact details does not hide order history. Offer reorder through the existing `reorder` action and report unavailable or repriced products.
- **Favourites:** show saved products and allow removal or adding them to the cart.
- **Preferences:** toggle the existing notification preferences.

Keep the sections easy to reach on mobile, with clear active states and a direct path back to shopping. If no matching orders or favourites exist, show useful empty states.

### Checkout

Use the selected guided flow with three steps: **Delivery**, **Payment**, and **Review**. Show progress and allow returning to an earlier step without losing entered values.

1. **Delivery:** collect required customer name and phone, optional email, delivery area, house or street description, nearby landmark, and optional driver instructions. A customer may start from a saved address, edit it for this order, and opt to save the new address. Use the existing `LocationPicker` for area and address entry. A location pin remains optional and local to the app.
2. **Payment:** offer only methods enabled in the shop configuration. For mobile money, let the customer choose an existing provider option; record the method and provider with `pending` status. For cash on delivery, allow exact change or an optional cash amount and show the calculated change; reject a cash amount below the order total. Card remains unavailable while disabled in shop settings.
3. **Review:** show items and quantities at their current cart prices, subtotal, delivery fee, and final Maloti total. Catalogue promotional prices are already reflected in cart line prices; coupon entry is outside this scope. Require an explicit place-order action. Confirm the order number, estimated delivery, payment state, and delivery area after creation, with links to the order list and shopping.

Checkout validates customer contact and required address fields, configured delivery areas, payment availability, non-empty cart, minimum order, product availability, and current stock before placing an order. This is a local check at order submission, not a stock reservation. If the cart changes or any item is no longer available, explain the issue and let the customer fix it before retrying.

## Shared state and behavior

Keep the `AppStore` as the only integration boundary. Customer, checkout, and staff views must read the same local products, orders, customers, shop settings, addresses, favourites, and preferences. Add narrow store actions only where the current store lacks an operation, such as updating the current account profile, editing an existing saved address, associating new orders with the stable demo customer ID, or recording staff payment verification. Existing seed orders should receive the matching seed-customer ID; older local orders can be associated by matching their stored phone to a seeded customer during migration. Do not duplicate order totals, payment methods, or status rules in page components.

Placing an order uses the current cart and shop settings, creates a local order through the store, clears the cart only after successful creation, and routes to a confirmation view. The resulting order must be visible in customer order history and the staff order queue. Mobile money records an order request only; no charge is attempted. Inventory remains staff-managed in this demo and is not decremented or reserved automatically at checkout.

All demo data remains in browser storage. The interface should make demo behavior clear where it affects expectations, especially the local staff workspace and pending mobile-money payment. No account information, delivery address, or precise coordinates are sent to an external service.

## Visual direction

Preserve the established REETAPELE system: warm cream page surfaces, white cards, dark readable type, grocery green primary actions, restrained orange promotion accents, rounded corners, generous spacing, and strong product photography. Staff screens may use denser tables on wide screens, but must remain usable on mobile. Customer and checkout screens remain mobile-first and keep prices, delivery cost, and order status easy to scan.

## Failure and empty states

- Keep checkout on the current step when validation fails and associate messages with the relevant fields.
- Explain when the cart falls below the minimum, an item is unavailable, an area is invalid, or a selected payment option has been disabled.
- Do not clear the cart or navigate to confirmation when order creation fails.
- Provide empty states for no orders, favourites, addresses, active promotions, and staff work queues.
- Show mobile-money payment as pending until staff manually verify it in the order controls; do not imply a successful external payment.

## Verification

Run the repository's TypeScript check and production build after implementation. Manually verify the customer delivery-to-confirmation flow, that its new order appears in both customer and staff screens, and the staff order/product/settings updates in the client-side store. Do not add automated test dependencies or backend services as part of this scope.
