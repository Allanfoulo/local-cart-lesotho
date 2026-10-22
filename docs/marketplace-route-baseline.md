# Marketplace Route Baseline

**Updated:** 2026-10-19  
**Method:** Static review of TanStack file routes and their current page components. This records the route/task/authorization baseline; it does not claim visual acceptance at every viewport.

## Route and state inventory

| Route                     | Audience and primary task                                                        | Access boundary / data                                                                                 | States to inspect                                                                     |
| ------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `/`                       | Guest or customer discovers stores, categories, and products                     | Public catalogue from the shared app store, synchronized with Convex                                   | Empty/paused catalogue, long store names, narrow category rail                        |
| `/shop`                   | Browse, search, filter, and sort the marketplace                                 | Public catalogue; URL search state                                                                     | No results, long category names, store filter, narrow product grid                    |
| `/products/$slug`         | Review a product, choose quantity, add it, or save it                            | Public catalogue and cart; customer favourites when signed in                                          | Missing/unavailable product, long title/description, quantity controls                |
| `/cart`                   | Review quantities, per-store minimums, fees, and checkout readiness              | Public cart and current catalogue/stock                                                                | Empty cart, unavailable item, multiple stores, long names                             |
| `/checkout`               | Enter delivery details and select supported payment method                       | Guest or authenticated; checkout mutation validates and creates orders in Convex                       | Validation, submission/loading, retry, multi-store review, keyboard and sticky action |
| `/order-confirmation/$id` | Review the durable checkout receipt and continue shopping or view account orders | Receipt-backed data; guest receipt access is separate from account access                              | Missing receipt, multiple stores, long address/instructions, narrow totals            |
| `/orders`                 | Track signed-in customer orders                                                  | Authenticated customer; Convex customer projection                                                     | Loading, no orders, errors, several linked store orders                               |
| `/account`                | Manage customer profile, addresses, preferences, and saved products              | Authenticated customer; Convex profile and address data                                                | Loading, empty sections, validation/save errors, long address details                 |
| `/sign-in`                | Sign in, create a customer account, verify email, or recover access              | Convex Auth                                                                                            | Sign-in errors, verification-code entry, recovery, keyboard and mobile form behavior  |
| `/admin/sign-in`          | Sign in to an invited staff or super-admin account                               | Convex Auth; workspace permissions remain server-enforced                                              | Sign-in errors, verification and recovery states                                      |
| `/admin`                  | Manage a store workspace or platform-wide stores                                 | Authenticated active membership; owner/manager and super-admin boundaries enforced by route and Convex | Loading/error, empty setup, dense order/report sections, store switching              |
| `/staff/dispatch`         | Prepare orders or assign and sequence delivery stops                             | Active owner, manager, dispatcher, or order-preparation membership; Convex scoped data                 | Empty orders, no active drivers, long customer/location text, update errors           |
| `/staff/catalogue`        | Manage products, stock, categories, and promotions                               | Active owner, manager, or catalogue membership; Convex scoped data                                     | Empty catalogue/categories, long names, save errors, narrow forms                     |
| `/staff/accept-invite`    | Accept an invitation and establish the invited account                           | Invitation token and Convex Auth; accepted role/store are invitation-scoped                            | Invalid/expired/revoked invitation, verification and retry                            |
| `/driver`                 | Review assigned stops and confirm delivery or report a problem                   | Active driver membership; Convex returns assigned delivery projection only                             | No assigned stops, update/loading/retry errors, long directions, safe-area controls   |
| `/demo-login`             | Find the sign-in and role workspace entry points                                 | Public directory; it does not grant access                                                             | Narrow directory layout and clear boundary explanation                                |
| Any not-found/error route | Recover from an invalid route or failed page load                                | Root route boundary                                                                                    | Keyboard recovery actions, small-screen wrapping, error readability                   |

## Responsive and accessibility findings

### Fixed in this pass

- Storefront search is available on mobile, with an explicit submit action.
- The storefront has a keyboard-visible skip link and a named mobile navigation landmark.
- Cart item count is included in the cart link's accessible name; decorative count text is hidden from assistive technology.
- Delivery-area, cart, search, and shared form controls meet a 44 px minimum target on narrow screens; shared buttons, inputs, select triggers/menu items, and staff order selectors follow the same mobile target rule.
- Store branding and product titles now constrain or wrap long content so it does not push the cart or product actions off-screen.
- A global keyboard focus indicator and reduced-motion preference are defined.

### Still needs visual or interaction review

- Capture each route at 360, 375, 390, 430, 768, 1024, and 1440 px, including long content, empty and error states, and larger text.
- Verify fixed/sticky controls and safe-area behavior on a real narrow viewport, especially checkout and driver actions.
- Check contrast of status colors and text, keyboard order, dialogs/drawers, browser back behavior, and screen-reader announcements through manual interaction.
- Establish catalogue/checkout performance measurements on a representative phone and constrained network before optimizing.

The current environment has no available browser surface for visual review. The production build passed when Vite ran outside the restricted sandbox. One repeat stalled before Vite startup; a subsequent direct Vite build completed successfully. The sandbox itself denies a Vite subprocess spawn with `spawn EPERM`.
