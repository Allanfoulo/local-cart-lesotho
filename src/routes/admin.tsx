import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { StaffWorkspace } from "@/components/admin/StaffWorkspace";
import { RequireMembership } from "@/components/auth/RequireMembership";

export const Route = createFileRoute("/admin")({
  validateSearch: (search: Record<string, unknown>) => ({
    store: typeof search["store"] === "string" ? search["store"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "REETAPELE | Staff workspace" },
      {
        name: "description",
        content:
          "Manage local store orders, customers, reports, stock, promotions, and delivery places.",
      },
    ],
  }),
  component: AdminRoute,
});

function AdminRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { store } = Route.useSearch();
  return pathname === "/admin/sign-in" ? (
    <Outlet />
  ) : (
    <RequireMembership roles={["store_owner", "store_manager"]}>
      <StaffWorkspace initialStoreId={store} />
    </RequireMembership>
  );
}
