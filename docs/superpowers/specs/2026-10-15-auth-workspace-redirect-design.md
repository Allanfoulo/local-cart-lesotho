# Automatic workspace routing after sign-in

## Goal

After successful authentication, send each user to a workspace their active account can access. Preserve a valid workspace they originally requested so signing in to reach a protected page returns them there.

## Behavior

- Keep a requested workspace destination through the sign-in redirect and use it after authentication when the account has access to it.
- When no requested destination is available or valid for the account, choose a destination from active membership roles:
  - `superadmin`, `store_owner`, or `store_manager` → `/admin`
  - `order_staff` or `dispatcher` → `/staff/dispatch`
  - `catalogue_staff` → `/staff/catalogue`
  - `driver` → `/driver`
  - no active team membership → `/account`
- If an account has several roles, use the requested workspace first, then the role order above.
- Apply the same routing after password sign-in, email verification, and password reset sign-in.
- For an invitation sign-in, accept the invitation first, then route using the newly active membership and invitation destination.
- After initial super admin setup or super admin sign-in, route to `/admin`.
- Keep authorization in Convex-backed membership guards. Redirect data only selects a destination; it does not grant access. If the requested workspace is not permitted, use the role default.

## Scope and approach

Use the existing `memberships.currentAccess` query as the source of active role data and a shared client-side destination resolver for sign-in pages. Preserve a validated internal workspace path when protected pages send a user to sign-in. Use the same resolver in the public and super admin sign-in flows, with `/account` as the customer fallback. Invitation acceptance continues to use the existing mutation and determines the post-acceptance role.

This is a focused client routing change. It does not change membership authorization, account provisioning, Convex schema, or workspace permissions.

## Error and loading behavior

Wait until Convex auth and access data are loaded before choosing a role-based destination. Do not navigate on failed sign-in, failed email verification, failed password reset, failed invitation acceptance, or an access-query error. An inaccessible or malformed requested path falls back to a workspace supported by active membership.

## Verification

Review each role destination, the requested-destination fallback, the invitation flow, and super admin setup in the existing sign-in routes. Run the project type checker after implementation; do not change Convex authorization behavior.
