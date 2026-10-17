import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { ArrowLeftRight } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { resolveWorkspaceDestination, type WorkspaceRole } from "@/lib/auth/workspace-destination";

type WorkspaceLink = {
  key: string;
  label: string;
  roleLabel: string;
  destination: "/admin" | "/staff/dispatch" | "/staff/catalogue" | "/driver";
  storeId?: string;
};

const roleLabels: Record<WorkspaceRole, string> = {
  superadmin: "Platform admin",
  store_owner: "Store owner",
  store_manager: "Store manager",
  order_staff: "Order preparation",
  dispatcher: "Dispatch",
  catalogue_staff: "Catalogue",
  driver: "Driver deliveries",
};

export function WorkspaceSwitcher({ className = "" }: { className?: string }) {
  const { isAuthenticated } = useConvexAuth();
  const access = useQuery(api.memberships.currentAccess, {});
  const details = useRef<HTMLDetailsElement>(null);

  if (!isAuthenticated || access === undefined || access === null) return null;

  const workspaces: WorkspaceLink[] = [];
  if (access.isSuperadmin) {
    workspaces.push({
      key: "superadmin",
      label: "Platform overview",
      roleLabel: "Super admin",
      destination: "/admin",
    });
  }
  for (const membership of access.memberships) {
    if (membership.role === "superadmin" || !membership.storeId) continue;
    const store = access.stores.find((candidate) => candidate.id === membership.storeId);
    if (!store) continue;
    const destination = resolveWorkspaceDestination({ roles: [membership.role as WorkspaceRole] });
    if (destination === "/account") continue;
    const key = destination === "/driver" ? "driver" : `${membership.storeId}:${destination}`;
    if (workspaces.some((workspace) => workspace.key === key)) continue;
    workspaces.push({
      key,
      label: destination === "/driver" ? "Driver deliveries" : store.name,
      roleLabel: roleLabels[membership.role as WorkspaceRole],
      destination,
      ...(destination === "/driver" ? {} : { storeId: String(membership.storeId) }),
    });
  }

  return (
    <details ref={details} className={`relative ${className}`}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ArrowLeftRight className="size-4 text-primary" aria-hidden="true" />
        <span>Switch workspace</span>
      </summary>
      <nav
        aria-label="Available workspaces"
        className="absolute right-0 z-50 mt-2 grid min-w-64 max-w-[calc(100vw-2rem)] gap-1 rounded-2xl border border-border bg-card p-2 shadow-lg"
      >
        <Link
          to="/account"
          onClick={() => {
            if (details.current) details.current.open = false;
          }}
          className="rounded-xl px-3 py-3 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          My customer account
        </Link>
        {workspaces.map((workspace) => {
          const content = (
            <>
              <span className="block font-semibold">{workspace.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {workspace.roleLabel}
              </span>
            </>
          );
          const className =
            "block rounded-xl px-3 py-3 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
          const closeMenu = () => {
            if (details.current) details.current.open = false;
          };

          if (workspace.destination === "/admin") {
            return (
              <Link
                key={workspace.key}
                to="/admin"
                search={{ store: workspace.storeId }}
                onClick={closeMenu}
                className={className}
              >
                {content}
              </Link>
            );
          }
          if (workspace.destination === "/staff/dispatch") {
            return (
              <Link
                key={workspace.key}
                to="/staff/dispatch"
                search={{ store: workspace.storeId }}
                onClick={closeMenu}
                className={className}
              >
                {content}
              </Link>
            );
          }
          if (workspace.destination === "/staff/catalogue") {
            return (
              <Link
                key={workspace.key}
                to="/staff/catalogue"
                search={{ store: workspace.storeId }}
                onClick={closeMenu}
                className={className}
              >
                {content}
              </Link>
            );
          }
          return (
            <Link key={workspace.key} to="/driver" onClick={closeMenu} className={className}>
              {content}
            </Link>
          );
        })}
      </nav>
    </details>
  );
}
