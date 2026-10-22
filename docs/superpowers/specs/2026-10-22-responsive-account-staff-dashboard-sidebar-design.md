# Responsive Account and Staff Dashboard Sidebar

## Goal

Move the main section navigation in the customer account and staff workspace into a responsive, retractable sidebar. Keep the existing account, store operations, and team management workflows intact.

## Scope

- Apply to `CustomerAccount` and `StaffWorkspace`.
- Keep each dashboard's current section names, order, icons, and role-dependent visibility. The super admin-only Stores section remains restricted to the same existing condition.
- Keep dashboard content and section state within the existing components. Navigation selection continues to change the displayed section without introducing new routes or backend events.
- Leave the public storefront navigation and dedicated dispatch, catalogue, and driver workspaces unchanged.
- Leave existing workspace switching, sign-out, store status, and store selection actions in their current locations.

## Interaction and layout

- Use the existing sidebar UI primitives for a consistent desktop and mobile interaction.
- At desktop widths, show an expanded sidebar by default. Its toggle collapses it to a narrow icon rail; icons have accessible names and visible labels when expanded.
- At mobile and narrow widths, show a hamburger trigger. It opens a labeled slide-over navigation drawer, and selecting a section closes the drawer.
- Clearly mark the selected section in both layouts and retain keyboard focus visibility and screen-reader labels.
- Keep the selected section's content readable in the remaining main area without horizontal page scrolling.
- Keep authorization enforced by the existing protected routes and Convex functions. The sidebar only reflects the sections already available to the current dashboard.

## Acceptance criteria

- Customer account sections (Profile, Addresses, Orders, Favourites, Preferences) are reachable through the sidebar at desktop and mobile sizes.
- Staff workspace sections (Today, Orders, Customers, Dispatch, Products & stock, Promotions, Delivery places, Reports, Shop settings, Team access, and Stores when currently allowed) are reachable through the sidebar.
- Desktop collapse/expand works and the compact view remains understandable to assistive technology.
- The mobile hamburger opens the navigation drawer; selecting a section updates the panel and closes the drawer.
- Existing forms, order workflows, team management, store selection, workspace switching, and sign-out behavior continue to work.
- The change does not affect storefront, dispatch-only, catalogue-only, or driver layouts.

## Implementation notes

Use a shared responsive section-navigation shell in `src/components/layout/ResponsiveDashboardNavigation.tsx`, with the existing button and sheet primitives. Keep section state in the existing dashboard components. Do not use sidebar visibility as an authorization boundary.
