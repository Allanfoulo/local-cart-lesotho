import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { z } from "zod";

import { ProductCard } from "@/components/store/ProductCard";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { filterProducts, useAppStore } from "@/lib/app-store";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  sort: z.enum(["popular", "price_asc", "price_desc", "newest"]).optional(),
  instock: z.boolean().optional(),
  store: z.string().optional(),
});

export const Route = createFileRoute("/_store/shop")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Shop all groceries — REETAPELE" },
      {
        name: "description",
        content: "Browse fresh produce, groceries, drinks, snacks and household items.",
      },
      { property: "og:title", content: "Shop all groceries — REETAPELE" },
      {
        property: "og:description",
        content: "Browse every product at REETAPELE with live prices and stock.",
      },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const { categories, products, stores } = useAppStore();
  const activeStore = stores.find((store) => store.slug === search.store);
  const scopedCategories = categories.filter(
    (category) => !activeStore || category.storeId === activeStore.id,
  );
  const scopedProducts = products.filter(
    (product) => !activeStore || product.storeId === activeStore.id,
  );
  const active = scopedCategories.find((c) => c.slug === search.category);
  const categoryIds = scopedCategories
    .filter((category) => category.slug === search.category)
    .map((category) => category.id);
  const list = filterProducts(
    active?.slug === "specials" ? scopedProducts.filter((p) => p.promoPrice) : scopedProducts,
    {
      search: search.q,
      categoryId: active && active.slug !== "specials" ? categoryIds : undefined,
      sort: search.sort,
      inStockOnly: search.instock,
    },
  );

  const set = (patch: Partial<z.infer<typeof searchSchema>>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
          {activeStore
            ? `${activeStore.name}${active ? ` · ${active.name}` : ""}`
            : active
              ? active.name
              : "All products"}
        </h1>
        <Select
          value={activeStore?.slug ?? "all"}
          onValueChange={(value) =>
            set({ store: value === "all" ? undefined : value, category: undefined })
          }
        >
          <SelectTrigger className="h-11 w-full rounded-full bg-card sm:w-52">
            <SelectValue placeholder="All stores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stores</SelectItem>
            {stores.map((store) => (
              <SelectItem key={store.id} value={store.slug}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Search products"
          value={search.q ?? ""}
          onChange={(e) => set({ q: e.target.value || undefined })}
          placeholder="Search products"
          className="min-h-11 rounded-full bg-card pl-9"
        />
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <Chip active={!active} to={undefined}>
          All
        </Chip>
        {scopedCategories
          .filter((c) => c.enabled)
          .sort((a, b) => a.order - b.order)
          .map((c) => (
            <Chip key={c.id} active={active?.id === c.id} to={c.slug}>
              {c.emoji} {c.name}
            </Chip>
          ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <Switch
            checked={!!search.instock}
            onCheckedChange={(v) => set({ instock: v || undefined })}
          />
          In stock only
        </label>
        <Select value={search.sort ?? "popular"} onValueChange={(v) => set({ sort: v as never })}>
          <SelectTrigger className="h-11 w-40 rounded-full bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popular">Most popular</SelectItem>
            <SelectItem value="price_asc">Price: low to high</SelectItem>
            <SelectItem value="price_desc">Price: high to low</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-sm text-muted-foreground">
        {list.length} {list.length === 1 ? "product" : "products"}
      </p>
      {list.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <section
          className="rounded-2xl border border-dashed border-border bg-card p-8 text-center sm:p-10"
          aria-live="polite"
        >
          <p className="text-4xl" aria-hidden="true">
            {scopedProducts.length ? "🔍" : "🧺"}
          </p>
          <h2 className="mt-2 font-semibold">
            {scopedProducts.length
              ? "No products match those filters"
              : activeStore
                ? `${activeStore.name} is preparing its catalogue`
                : "Stores are preparing their catalogues"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {scopedProducts.length
              ? "Try a different search, category, or stock filter."
              : "Check back soon, or browse other stores in the marketplace."}
          </p>
          {scopedProducts.length ? (
            <button
              type="button"
              onClick={() => navigate({ search: { sort: search.sort }, replace: true })}
              className="mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              Clear filters
            </button>
          ) : activeStore ? (
            <button
              type="button"
              onClick={() => set({ store: undefined, category: undefined, q: undefined })}
              className="mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              Browse all stores
            </button>
          ) : null}
        </section>
      )}
    </div>
  );
}

function Chip({
  active,
  to,
  children,
}: {
  active: boolean;
  to?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to="/shop"
      search={(prev) => ({ ...prev, category: to })}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 shrink-0 items-center rounded-full border px-3.5 py-1.5 text-sm font-medium",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
      )}
    >
      {children}
    </Link>
  );
}
