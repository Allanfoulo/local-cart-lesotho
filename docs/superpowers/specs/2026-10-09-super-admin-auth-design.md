# Super Admin Authentication Design

## Goal

Add a secure first-admin foundation for REETAPELE using Convex Auth with email and password. The first platform administrator is `allanfdeveloper@gmail.com`. This design establishes authentication and authorization foundations; it does not provision a password or enable broader staff workflows.

## Current context

- The project uses Convex and has catalog and order functions, but no authentication package, auth configuration, or membership table.
- Staff and customer workspaces currently contain demo/local-only behavior.
- Convex project guidance prohibits private staff operations until authentication and authorization exist.
- The marketplace must support multiple stores. Platform-level roles and store-scoped roles therefore remain distinct.

## Design

1. Integrate Convex Auth email/password authentication using its documented React client and Convex backend setup. Convex Auth is currently documented as a beta feature, so verify the installed version and deployment support during implementation.
2. Do not expose unrestricted account creation. Permit password sign-up only for the configured initial admin email while no superadmin membership exists; regular users must not be able to self-assign roles.
3. Add a membership record for authorization. Memberships identify the authenticated Convex identity, carry a platform role (initially `superadmin`), and can later support store-scoped memberships without elevating store staff to platform access.
4. Grant the initial membership only after the authenticated account has completed the email-verification step and its verified, normalized email matches `allanfdeveloper@gmail.com`. Never trust a client-supplied email or role.
5. Keep the bootstrap capability server-validated and one-time. Make it fail closed if the identity is missing, the email is unverified or mismatched, a membership already exists, or bootstrap has already completed. Disable initial-admin sign-up after the first successful grant.
6. Require backend authorization helpers to check both authenticated identity and membership before any privileged query or mutation. Do not migrate staff/order functionality as part of this foundation.
7. Add a minimal sign-in experience for the initial admin and clear unauthenticated/unauthorized states. Do not put passwords, bootstrap secrets, or other credentials in source, logs, or committed config.

## Provisioning and email verification

The user has provided the email identifier, not a password or email-delivery configuration. The implementation must not create a password or claim to have sent verification email unless a real configured provider supports it. Before enabling the initial account, configure the required email delivery/provider settings privately. The allowlisted first-account flow must be constrained on the server and close permanently after bootstrap; a public client cannot choose the allowed email or a role.

## Failure behavior

- Unauthenticated requests receive no privileged data or writes.
- Authenticated users without an active platform membership remain unauthorized.
- An unverified email cannot receive the initial superadmin membership.
- Bootstrap failures do not create partial or elevated membership records.

## Out of scope

- Customer authentication and customer account migration.
- Store-owner or store-staff invite and membership management.
- Password value selection, password reset email delivery, or external email provider setup.
- Replacing all demo/local data workflows.
- Enabling private order details, dispatch, payment verification, or customer search.

## Acceptance criteria

- Convex Auth email/password is configured for this app.
- Public self-signup cannot grant roles or create unrestricted accounts; before bootstrap, only the configured initial email can sign up.
- Only a verified account matching `allanfdeveloper@gmail.com` can receive the one-time initial `superadmin` membership.
- The membership is linked to the trusted authenticated identity, not a caller-provided role or email.
- Shared authorization helpers deny access by default and distinguish platform membership from future store-scoped membership.
- No password or credential secret is committed.

## References

- [Convex Auth](https://docs.convex.dev/auth/convex-auth)
- [Auth in Functions](https://docs.convex.dev/auth/functions-auth)
- [Storing Users in the Convex Database](https://docs.convex.dev/auth/database-auth)
