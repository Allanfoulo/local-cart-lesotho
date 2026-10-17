import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { DispatchOrdersQueue } from "@/components/admin/orders/DispatchOrdersQueue";
import { DispatchBoard } from "@/components/admin/orders/DispatchBoard";
import { RequireMembership } from "@/components/auth/RequireMembership";
import { WorkspaceSwitcher } from "@/components/auth/WorkspaceSwitcher";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/staff/dispatch")({
  validateSearch: (search: Record<string, unknown>) => ({
    store: typeof search["store"] === "string" ? search["store"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "REETAPELE | Dispatch" },
      { name: "description", content: "Organize assigned delivery stops for the dispatch team." },
    ],
  }),
  component: DispatchWorkspace,
});

function DispatchWorkspace() {
  const [section, setSection] = useState<"orders" | "stops">("orders");
  const { store } = Route.useSearch();
  const navigate = Route.useNavigate();
  const access = useQuery(api.memberships.currentAccess, {});
  const selectedStoreId = access?.stores.find((item) => item.id === store)?.id ?? access?.stores[0]?.id;
  const canDispatch = Boolean(access?.isSuperadmin || access?.memberships.some((membership) =>
    membership.storeId === selectedStoreId && ["store_owner", "store_manager", "dispatcher"].includes(membership.role),
  ));
  return <RequireMembership roles={["store_owner", "store_manager", "dispatcher", "order_staff"]}><>
    <main className="min-h-screen bg-background px-3 py-4 sm:px-5 sm:py-7">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/demo-login"
          className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Demo views
        </Link>
        <header className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            REETAPELE · Dispatch
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Plan the next stops
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Prepare orders, assign drivers, and arrange delivery stops from your phone.
          </p>
        </header>
        <nav className={`mb-5 grid gap-2 ${canDispatch ? "grid-cols-2" : "grid-cols-1"}`} aria-label="Dispatch sections">
          {(canDispatch ? ["orders", "stops"] as const : ["orders"] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-current={section === key ? "page" : undefined}
              onClick={() => setSection(key)}
              className={`min-h-12 rounded-xl px-3 text-sm font-semibold ${section === key ? "bg-primary text-primary-foreground" : "border bg-card text-muted-foreground hover:text-foreground"}`}
            >
              {key === "orders" ? "Orders to prepare" : "Driver stops"}
            </button>
          ))}
        </nav>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><WorkspaceSwitcher />{access?.stores && access.stores.length > 1 && <label className="block w-full max-w-sm text-sm font-medium">Store<select aria-label="Dispatch store" className="mt-1 h-11 w-full rounded-xl border bg-card px-3" value={selectedStoreId} onChange={(event) => void navigate({ search: (previous) => ({ ...previous, store: event.target.value }) })}>{access.stores.map((item) => <option key={item.id} value={item.id}>{item.name}{item.enabled ? "" : " (paused)"}</option>)}</select></label>}</div>
        {section === "orders" || !canDispatch ? <DispatchOrdersQueue storeId={selectedStoreId} /> : <DispatchBoard storeId={selectedStoreId} />}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Order, assignment, and stop updates sync with the store workspace.
        </p>
      </div>
    </main>
  </></RequireMembership>;
}
