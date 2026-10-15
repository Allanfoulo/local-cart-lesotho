# Mobile-First REETAPELE Marketplace and App Design

**Status:** Approved direction; implementation plan in `../plans/2026-10-15-mobile-first-marketplace-implementation-plan.md`.

## 1. Product goal

Deliver one REETAPELE app for customers, store owners and staff, drivers, and the platform super admin. Every role can complete its main job on a phone, with wider desktop layouts where staff benefit from more information at once. The same product is available as a web app and is prepared for one Google Play and one Apple App Store listing.

## 2. Users and context

- Customers mainly use phones to find groceries, choose delivery, pay by a supported method, and follow orders.
- Store owners and managers configure a store and onboard its staff. They may use phones or larger screens.
- Order staff, catalogue staff, dispatchers, and drivers need quick, focused actions during daily work; many will use phones.
- The super admin oversees stores and platform access. Store authority never implies platform authority.

## 3. Primary tasks

1. Discover products and place a guest or signed-in order across one or more stores.
2. Create, configure, and publish a store; invite, manage, and orient its staff.
3. Accept, prepare, assign, dispatch, deliver, reject, or cancel orders using allowed role actions.
4. Give customers accurate order and payment status, with a clear support path when something fails.
5. Switch deliberately between customer and workspaces when one account has multiple memberships.

## 4. Dominant psychology principles

- **Reciprocity:** let customers browse and build value before asking them to register.
- **Smart defaults:** prefill eligible saved contact and delivery details; always let people review them.
- **Goal gradient:** show real progress and remaining steps in store and staff onboarding.
- **Contrast effect:** show delivery fees and the final cost beside the basket they apply to, without hiding the full price.
- Do not use loss aversion, false scarcity, fabricated ratings, or urgency to pressure a purchase.

## 5. Information architecture

The single app contains separate, visibly identified workspaces:

| Workspace | Main destinations |
| --- | --- |
| Customer | Home, shop/search, product, multi-store cart, checkout, order confirmation/tracking, account |
| Store owner/manager | Store overview, orders, catalogue, delivery and payment settings, staff and invitations |
| Order staff | Assigned preparation work and order details needed to fulfil it |
| Catalogue staff | Products, stock, categories, and promotions |
| Dispatcher | Store order queue, driver assignment, delivery sequence |
| Driver | Assigned stops, delivery instructions, contact action, delivery progress |
| Super admin | Platform store directory, store onboarding, owner assignment, platform health/access |

The current public `/demo-login` role directory must not act as a role switch or imply authorization in the released app. Authenticated people use a workspace switcher containing only workspaces available to their memberships.

## 6. Flow and interaction model

### Identity and workspace entry

- Public shopping and guest checkout remain available without an account.
- After sign-in, a person with one active workspace is sent there. A person with multiple eligible workspaces chooses one explicitly.
- The current workspace and store are always identifiable. Switching requires an explicit action and returns to the selected workspace's landing screen.
- The same identity may have a customer profile and one or more memberships. Customer data remains self-scoped; staff access remains scoped by active role and store.
- Sign-out and account changes clear client caches and local identity-bound state before another user enters.

### Customer order

Browse/search/category → product detail → basket grouped by store → delivery and eligibility review → supported payment choice → final order review → confirmation → per-store order progress.

Before submission, show item availability, store-specific fees, service-area outcome, and the complete total. Convex recalculates and validates prices, stock/availability, minimums, promotions, delivery eligibility, and payment method. A multi-store checkout creates linked per-store orders with explicit outcomes. Submission is idempotent so retries do not create duplicate orders. A network or validation failure preserves the basket and entered details.

### Store onboarding and staff access

Super admin creates a store and assigns its first owner → owner completes a guided checklist for profile, hours, delivery, payment methods, catalogue, and staff → the app shows remaining publish requirements → store is published only when valid. Owners invite managers; owners and managers invite permitted staff roles. Invite acceptance explains the store and assigned role before access is granted. Expired, revoked, or already-used invitations give a recovery action.

### Fulfillment

Order staff accept and prepare orders → dispatcher assigns eligible drivers → driver sees assigned stops only → driver records delivery progress → customer and staff views update from the same authoritative Convex state. A driver sees only delivery information needed for assigned work. The interface must not claim live tracking unless the capability is actually implemented.

### Payments and customer communications

Until a provider is selected and integrated, show only the supported cash and manual mobile-money paths. Explain pending verification and cash/change details honestly. Never show a payment as successful based only on a customer selection. Customer updates must reflect committed order state and provide a support route for exceptions.

## 7. Hierarchy and layout

Each screen has one primary next action. Customer pages prioritize products, price, availability, and the path to checkout. Operational pages prioritize work needing action, then supporting details and history. Rare controls remain in a secondary or detail view. Order status is communicated by text and icon/shape as well as color.

## 8. Visual system

Retain the established REETAPELE identity: warm cream surfaces, clear white content surfaces, grocery green for primary actions, restrained orange for promotions, the approved PWA mark, existing type and component patterns. Keep category imagery and product photography useful to scanning. Do not apply generic blue palettes, decorative motion, or an unrelated admin theme from generic design-system search results.

## 9. States and edge cases

Every workflow defines loading, empty, success, disabled, error, and permission-denied states. Validation is placed next to the relevant field. Failed checkout, invite, or order actions preserve recoverable input. Suspended/wrong-store/wrong-role access fails closed. Stale status changes explain the current status and offer a refresh. Duplicate submissions return the existing result where appropriate.

## 10. Accessibility review

Use semantic headings and landmarks, persistent labels, meaningful accessible names, visible keyboard focus, logical tab order, reduced-motion behavior, and non-color status cues. Target at least 44×44 CSS pixels for touch controls and 4.5:1 contrast for normal text. Keep mobile body and form text at least 16 px where practical, and use suitable input types/keyboards.

## 11. Responsiveness

Design phone layouts first. At narrow widths, use compact navigation, readable task lists, and focused detail views; never require horizontal page scrolling. Convert wide operational tables to labeled cards or row-detail views. Keep primary actions clear of browser and device safe areas. On desktop, use denser tables, split panels, and broader overview layouts when they improve staff throughput. Validate short and long content at 360/375/390/430 px, 768 px, and 1024/1440 px widths.

## 12. Design-system impact

Standardize workspace shell and switcher, store context, status badges, task/order rows, empty/error/loading states, forms, confirmation dialogs, mobile bottom actions/navigation, and responsive data lists. Components must receive authorized data and callbacks; they do not infer permission from a hidden or visible control.

## 13. Final recommendation

Keep one app listing and one identity system, with distinct customer, store, driver, and platform shells. Use explicit workspace switching for multi-role accounts. Make Convex the authority for access, prices, stock, orders, and status. Complete and verify marketplace behavior before committing to the app-store packaging technology; a manifest alone does not constitute an app-store release.

## 14. UI/UX Pro Max inputs used

- Product search: marketplace/directory and grocery commerce; use search-led discovery, visible categories, and trust details where they support shopping.
- UX search: mobile-first layout, predictable back navigation, keyboard-appropriate inputs, compensating space for fixed navigation, active navigation state, and keyboard access.
- React stack search: keep workspaces as clear route boundaries and load heavy routes/components only where needed.
- Generic palettes, app-store marketing patterns, and dashboard typography recommendations were rejected where they conflict with the current product or do not apply to the in-app experience.

## 15. Psychology checks applied

Smart defaults, reciprocity, goal gradient, and truthful price contrast support task completion. IKEA/endowment effects may be used only when a user is genuinely configuring their own store or saved preferences. Loss aversion is rejected for grocery purchasing and access decisions. No technique may obscure fees, payment state, permissions, or a user's available choices.

## Acceptance criteria

- One app identity supports customer, staff, driver, and super-admin workspaces with explicit switching for multi-role users.
- Direct links, altered client state, and changed store identifiers cannot cross Convex access boundaries.
- Guest checkout and multi-store order creation remain supported; customers see honest per-store totals and statuses.
- Store onboarding, staff invitations, order preparation, dispatch, and delivery complete end to end with persisted state.
- Every current app route has a mobile-first layout and passes the defined responsive/accessibility review.
- Payment messages match configured and implemented payment capability; no unintegrated provider is presented as operational.
- A tested, documented release path exists for the agreed single Google Play/App Store app listing.
