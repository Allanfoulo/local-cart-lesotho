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
});

export const Route = createFileRoute("/_store/shop")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Shop all groceries — Mabote Fresh" },
      { name: "description", content: "Browse fresh produce, groceries, drinks, snacks and household items." },
      { property: "og:title", content: "Shop all groceries — Mabote Fresh" },
      { property: "og:description", content: "Browse every product at Mabote Fresh with live prices and stock." },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const { categories, products } = useAppStore();
  const active = categories.find((c) => c.slug === search.category);
  const list = filterProducts(
    active?.slug === "specials" ? products.filter((p) => p.promoPrice) : products,
    {
      search: search.q,
      categoryId: active && active.slug !== "specials" ? active.id : undefined,
      sort: search.sort,
      inStockOnly: search.instock,
    },
  );

  const set = (patch: Partial<z.infer<typeof searchSchema>>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold tracking-tight">{active ? active.name : "All products"}</h1>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search.q ?? ""}
          onChange={(e) => set({ q: e.target.value || undefined })}
          placeholder="Search products"
          className="h-11 rounded-full bg-card pl-9"
        />
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <Chip active={!active} to={undefined}>All</Chip>
        {categories
          .filter((c) => c.enabled)
          .sort((a, b) => a.order - b.order)
          .map((c) => (
            <Chip key={c.id} active={active?.id === c.id} to={c.slug}>
              {c.emoji} {c.name}
            </Chip>
          ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={!!search.instock} onCheckedChange={(v) => set({ instock: v || undefined })} />
          In stock only
        </label>
        <Select value={search.sort ?? "popular"} onValueChange={(v) => set({ sort: v as never })}>
          <SelectTrigger className="h-9 w-40 rounded-full bg-card">
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
      <p className="text-sm text-muted-foreground">{list.length} products</p>
      {list.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-4xl">🔍</p>
          <p className="mt-2 font-semibold">No products found</p>
          <p className="text-sm text-muted-foreground">Try another search or category.</p>
        </div>
      )}
    </div>
  );
}

function Chip({ active, to, children }: { active: boolean; to?: string; children: React.ReactNode }) {
  return (
    <Link
      to="/shop"
      search={(prev) => ({ ...prev, category: to })}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
      )}
    >
      {children}
    </Link>
  );
}
