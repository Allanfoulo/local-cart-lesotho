# REETAPELE Marketplace Route and Responsive Baseline

**Captured:** 2026-10-15  
**Branch/commit:** `feat/playwright-marketplace-e2e` / `2358bd9`  
**Purpose:** Phase 0 baseline for the approved mobile-first marketplace plan.

## Route and role inventory

| Route | Main user and task | Data and access boundary | Viewport and state/error coverage |
| --- | --- | --- | --- |
| `/` | Guest/customer discovers stores, categories, and popular products | Reactive public Convex marketplace catalogue; local cart | 390 px captured; tablet/desktop inherited shared storefront shell; loading/error not separately exercised |
| `/shop` | Guest/customer searches and filters products across stores | Reactive public Convex catalogue; search/store/category in URL; cart local | 390, 768, and 1440 px captured; empty search state reviewed in source, not exercised |
| `/products/$slug` | Guest/customer reviews product and adds quantity | Public catalogue; cart local; favourites require customer identity | Responsive two-column source layout; product-not-found and out-of-stock source states; screenshots pending |
| `/cart` | Guest/customer reviews store-grouped items, fees, minimums | Local cart and public store settings | Empty state captured at 390 px; non-empty and below-minimum source states, screenshots pending |
| `/checkout` | Guest/customer enters delivery and payment details, places multi-store order | Public Convex `orders.placeGuestOrder` mutation validates current prices, stock, delivery, minimums, and methods | Empty-cart fallback captured at 390 px; delivery/payment/review/errors source-reviewed, populated journey pending |
| `/order-confirmation/$id` | Guest/customer reviews checkout receipt | Public Convex `orders.checkoutReceipt` looks up the checkout bearer ID and returns a limited receipt projection | Loading, durable success, and unavailable states are implemented; refresh recovery is source-reviewed, browser acceptance pending |
| `/orders` | Signed-in customer tracks own orders | Convex `customers.myOrders` derives identity from auth; guarded in query | Source-reviewed empty/loading/order states; authenticated mobile walkthrough pending |
| `/account` | Signed-in customer manages profile, addresses, favourites, preferences | Convex customer queries/mutations scoped to auth identity | Unauthenticated sign-in prompt source-reviewed; authenticated mobile walkthrough pending |
| `/sign-in` | Customer signs in, registers, verifies email, or recovers password | Convex Auth and `memberships.currentAccess`; protected return path is validated | Initial mobile sign-in captured; verification, reset, error, and workspace-choice states source-reviewed only |
| `/admin/sign-in` | Super admin / staff entry and initial setup | Convex Auth, bootstrap query, active membership checks | Source-reviewed; initial-setup and credentialed states not captured |
| `/staff/accept-invite` | Invitee verifies/signs in and accepts store invitation | Convex Auth and invitation acceptance mutation | Source-reviewed; expired/revoked/already-used invitation states pending |
| `/admin` | Store owner/manager operates a store; super admin manages platform stores | `RequireMembership`; Convex management, orders, customer projections; per-store selector | 390 px unauthenticated guard captured; authenticated tabs, long lists, and errors source-reviewed/pending |
| `/staff/dispatch` | Order staff prepares work; dispatcher assigns and sequences deliveries | `RequireMembership`; Convex role/store-scoped order queries and mutations | 390 px unauthenticated guard captured; dispatcher/order-staff active and empty queues source-reviewed/pending |
| `/staff/catalogue` | Catalogue staff manages products, categories, and offers | `RequireMembership`; Convex catalogue mutations scoped to store membership | Source-reviewed responsive cards/forms; authenticated mobile and empty/error states pending |
| `/driver` | Driver sees assigned deliveries and updates progress | `RequireMembership`; `orders.myAssigned` returns only active assigned stops | 390 px unauthenticated guard captured; current/empty delivery states source-reviewed, signed-in walkthrough pending |
| `/demo-login` | Presenter navigates to demo destinations | Public directory only; destination routes still enforce Convex membership guards | Source-reviewed; responsive screenshot pending; keep labeled as demo tooling |
| Unknown route / root error | Any user recovers from missing or failed route | Router not-found and error boundaries | Source-reviewed; normal shopper shell retained |

## Responsive captures

New screenshots were captured from the local development server and saved under ignored `.playwright-e2e-output/` for review. The pre-existing untracked `artifacts/` screenshots were not used as evidence.

- `/shop`: 390×844, 768×1024, and 1440×1000.
- `/`: 390×844.
- Empty `/cart` and `/checkout`: 390×844.
- `/sign-in`: 390×844.
- Unauthenticated `/admin`, `/staff/dispatch`, and `/driver`: 390×844.

The 390 px storefront has a two-column product grid and fixed five-item bottom navigation. The body width matched the viewport (`scrollWidth = 390`); category chips use a contained horizontal strip. The 768 px and 1440 px layouts change to the desktop header and denser product grids. The sign-in and empty-cart states remain readable and keep their primary action visible. Authenticated staff screenshots and the remaining route-specific form/error states are still needed for Phase 1/3 acceptance.

## Local catalogue performance sample

This is a directional development-server measurement, not a production budget. The profile used Chromium at 390×844, 4× CPU throttling, 150 ms network latency, 1.6 Mbps download, and 750 Kbps upload against the local Vite server and development Convex data.

- Catalogue heading and product actions became available in about 2.5–3.4 seconds across two captures.
- First Contentful Paint measured about 2.3–3.2 seconds.
- At 8.4 seconds, the page had transferred about 268 KB, while visible product photographs were still incomplete and rendered as colored tiles.
- The page showed 48 products and no horizontal body overflow at 390 px.
- LCP was not reliably captured by this one-off observer, so no LCP result is claimed.

The sample identified product imagery as the first mobile performance target. `ProductTile` previously bundled all 48 PNG product photos (83.04 MB of sources) alongside matching JPEGs. Duplicate PNG imports are now excluded; PNG-only images were resized to 720 px and encoded as WebP. Product imagery emitted for the production build is now 2.28 MB across 49 assets (28 JPEGs and 21 WebPs), about 97% smaller than the original PNG set alone. This is an asset-size comparison, not a repeat of the throttled page timing; repeat network measurements against a Deploy Preview before setting release budgets.

## Prioritized gaps

1. **P1 — Receipt acceptance:** `/order-confirmation/$id` now reads a limited durable receipt from Convex using the checkout ID. Verify a real checkout, refresh, and new-device access on development/staging; review the bearer receipt-link privacy trade-off before release.
2. **P1 — Workspace acceptance:** a persistent role/store switcher is implemented in the storefront, owner workspace, dispatch, catalogue, and driver screens. Auth identity changes clear identity-bound local projections; validate with two users and multiple memberships on development/staging.
3. **P1 — Security acceptance:** checkout now isolates registered customer profiles from guest phone matches, and the driver screen uses the assigned-driver-only projection. Current Playwright coverage is still a positive customer-to-driver path; it does not cover the full anonymous, suspended, wrong-role, wrong-store, wrong-customer, or unrelated-driver denial matrix.
4. **P2 — Mobile performance:** product source assets were reduced from 83.04 MB of PNGs to 2.28 MB emitted JPEG/WebP imagery. Re-measure image completion, LCP, and transfer on a production-like preview; the local throttled timing has not yet been repeated.
5. **P2 — Journey coverage:** populated checkout, confirmation after refresh, invitation recovery, empty/error states, and authenticated mobile staff screens need manual acceptance coverage.

## Phase 0 disposition

The route/role map, representative responsive captures, and initial prioritized gaps are recorded. The development performance numbers are directional only. Phase 0 can guide implementation, but its visual and performance evidence must be extended during the role-specific journey work and repeated on a production-like build before release gates are declared passed.
