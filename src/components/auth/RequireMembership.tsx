import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

type Role = "superadmin" | "store_owner" | "store_manager" | "order_staff" | "catalogue_staff" | "dispatcher" | "driver";

export function RequireMembership({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const access = useQuery(api.memberships.currentAccess, {});
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (isLoading || access === undefined) {
    return <Status>Checking your account access…</Status>;
  }
  if (!isAuthenticated) {
    return (
      <Status>
        <p>Sign in with an account that has access to this workspace.</p>
        <Link
          className="mt-3 inline-block font-semibold text-primary hover:underline"
          to="/sign-in"
          search={{ returnTo: pathname }}
        >
          Sign in
        </Link>
      </Status>
    );
  }
  const allowed = Boolean(
    access?.isSuperadmin || access?.memberships.some((membership) => roles.includes(membership.role as Role)),
  );
  if (!allowed) {
    return (
      <Status>
        <p>This account does not have access to this workspace.</p>
        <Link className="mt-3 inline-block font-semibold text-primary hover:underline" to="/">
          Return to the marketplace
        </Link>
      </Status>
    );
  }
  return children;
}

function Status({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-8" role="status">
        {children}
      </section>
    </main>
  );
}
