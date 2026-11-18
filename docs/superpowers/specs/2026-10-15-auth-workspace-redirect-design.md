# Automatic workspace routing after sign-in

## Goal

After successful authentication, send each user to a workspace their active account can access. Preserve a valid workspace they originally requested so signing in to reach a protected page returns them there.

## Behavior

- Keep a requested workspace destination through the sign-in redirect and use it after authentication when the account has access to it.
- When a signed-in user has exactly one active team membership, choose a destination from that role:
  - `superadmin`, `store_owner`, or `store_manager` → `/admin`
  - `order_staff` or `dispatcher` → `/staff/dispatch`
  - `catalogue_staff` → `/staff/catalogue`
  - `driver` → `/driver`
- When a signed-in user has multiple active membership rows, ask whether they want to open their account or the staff workspace. Choosing staff uses the requested workspace when that membership permits it, otherwise the role order above.
- A customer account with no active team memberships goes to `/account`.
- Apply the same routing after password sign-in, email verification, and password reset sign-in.
- For an invitation sign-in, accept the invitation first, then route using the newly active membership and invitation destination.
- After initial super admin setup or super admin sign-in, route to `/admin`.
- Keep authorization in Convex-backed membership guards. Redirect data only selects a destination; it does not grant access. If the requested workspace is not permitted, use the role default.

## Scope and approach

Use the existing authenticated `memberships.currentAccess` query as the source of the signed-in user's email and active membership rows. The server derives the user from the auth session and joins memberships by `userId`; do not accept an email or role from the browser as authorization input. Use a shared client-side destination resolver for sign-in pages. Preserve a validated internal workspace path when protected pages send a user to sign-in. Use the same resolver and account-or-staff choice in the public and super admin sign-in flows. Invitation acceptance continues to use the existing mutation and determines the post-acceptance role.

This is a focused client routing change. It does not change membership authorization, account provisioning, Convex schema, or workspace permissions.

## Error and loading behavior

Wait until Convex auth and access data are loaded before choosing a role-based destination. A valid user with no active team membership goes to `/account`; a `null` access result is an unverified account lookup and must show an error instead of silently routing to the customer page. Do not navigate on failed sign-in, failed email verification, failed password reset, failed invitation acceptance, or an access-query error. An inaccessible or malformed requested path falls back to a workspace supported by active membership.

## Verification

Review each role destination, the requested-destination fallback, the invitation flow, and super admin setup in the existing sign-in routes. Run the project type checker after implementation; do not change Convex authorization behavior.
