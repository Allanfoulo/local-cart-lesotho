import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { CatalogueManagement } from "@/components/admin/CatalogueManagement";
import { OffersManagement } from "@/components/admin/OffersManagement";
import { RequireMembership } from "@/components/auth/RequireMembership";
import { WorkspaceSwitcher } from "@/components/auth/WorkspaceSwitcher";
import { useAppStore } from "@/lib/app-store";

export const Route = createFileRoute("/staff/catalogue")({
  validateSearch: (search: Record<string, unknown>) => ({
    store: typeof search["store"] === "string" ? search["store"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "REETAPELE | Stock and promotions" },
      { name: "description", content: "Manage products, stock, categories, and promotions." },
    ],
  }),
  component: CatalogueWorkspace,
});

function CatalogueWorkspace() {
  const [section, setSection] = useState<"products" | "offers">("products");
  const { store: storeId } = Route.useSearch();
  const store = useAppStore();
  useEffect(() => {
    if (storeId && store.managementStores.some((item) => item.id === storeId)) store.setManagementStore(storeId);
  }, [storeId, store.managementStores, store.setManagementStore]);
  return <RequireMembership roles={["store_owner", "store_manager", "catalogue_staff"]}><>
    <main className="min-h-screen bg-background px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/demo-login"
          className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Demo views
        </Link>
        <header className="mb-5">
          <div className="mb-3"><WorkspaceSwitcher /></div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            REETAPELE · Catalogue
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Stock and promotions
          </h1>
        </header>
        <nav className="mb-6 flex gap-2" aria-label="Catalogue sections">
          {(["products", "offers"] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-current={section === key ? "page" : undefined}
              onClick={() => setSection(key)}
              className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${section === key ? "bg-primary text-primary-foreground" : "border bg-card text-muted-foreground hover:text-foreground"}`}
            >
              {key === "products" ? "Products & stock" : "Categories & promotions"}
            </button>
          ))}
        </nav>
        {section === "products" ? <CatalogueManagement /> : <OffersManagement />}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Product, stock, and promotion updates sync with the store marketplace.
        </p>
      </div>
    </main>
  </></RequireMembership>;
}
