import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ProductCard } from "@/components/store/ProductCard";
import { ProductTile } from "@/components/store/ProductTile";
import { QuantityStepper } from "@/components/store/QuantityStepper";
import { StockBadge } from "@/components/store/StockBadge";
import { Button } from "@/components/ui/button";
import { effectivePrice, stockStatus, useAppStore } from "@/lib/app-store";
import { formatM, formatMShort, unitLabel } from "@/lib/format";
import { seedProducts } from "@/lib/seed";
import { cn } from "@/lib/utils";
import { z } from "zod";

export const Route = createFileRoute("/_store/products/$slug")({
  validateSearch: (search) => z.object({ store: z.string().optional() }).parse(search),
  loader: ({ params }) => {
    const p = seedProducts.find((x) => x.slug === params.slug);
    return {
      name: p?.name ?? "Product",
      description: p?.description ?? "Product details from local stores.",
    };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.name} — REETAPELE` : "Product — REETAPELE";
    const description = loaderData?.description ?? "Product at REETAPELE";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const { products, stores, addToCart, favourites, toggleFavourite } = useAppStore();
  const selectedStore = stores.find((store) => store.slug === search.store);
  const product = products.find(
    (p) => p.slug === slug && (!selectedStore || p.storeId === selectedStore.id),
  );
  const [qty, setQty] = useState(1);

  if (!product)
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <h1 className="text-2xl font-bold">Product not found</h1>
        <p className="mt-2 text-muted-foreground">
          It may have been removed or is not available from this store.
        </p>
        <Button asChild className="mt-5 min-h-11 rounded-full">
          <Link to="/shop" search={{ store: selectedStore?.slug }}>
            Browse products
          </Link>
        </Button>
      </div>
    );
  const status = stockStatus(product);
  const price = effectivePrice(product);
  const fav = favourites.includes(product.id);
  const related = products
    .filter(
      (p) =>
        p.storeId === product.storeId && p.categoryId === product.categoryId && p.id !== product.id,
    )
    .slice(0, 4);

  return (
    <div className="space-y-8">
      <Link
        to="/shop"
        search={{ store: selectedStore?.slug }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Back to shop
      </Link>
      <div className="grid gap-5 md:grid-cols-2 md:gap-6">
        <ProductTile emoji={product.emoji} name={product.name} size="lg" className="rounded-3xl" />
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h1 className="min-w-0 break-words text-3xl font-extrabold tracking-tight">
              {product.name}
            </h1>
            <Button
              variant="outline"
              size="icon"
              className="size-11 shrink-0 rounded-full"
              aria-label={fav ? "Remove from favourites" : "Save to favourites"}
              onClick={() => toggleFavourite(product.id)}
            >
              <Heart className={cn("size-5", fav && "fill-destructive text-destructive")} />
            </Button>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{formatMShort(price)}</span>
            <span className="text-muted-foreground">{unitLabel(product.unit)}</span>
            {product.promoPrice ? (
              <span className="text-muted-foreground line-through">
                {formatMShort(product.price)}
              </span>
            ) : null}
          </div>
          <StockBadge status={status} />
          <p className="text-sm font-medium text-muted-foreground">Sold by {product.storeName}</p>
          <p className="text-muted-foreground">{product.description}</p>

          {product.soldByWeight && product.weightOptions ? (
            <div>
              <p className="mb-2 text-sm font-semibold">Choose weight</p>
              <div className="flex flex-wrap gap-2">
                {product.weightOptions.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setQty(w)}
                    className={cn(
                      "min-h-11 rounded-full border px-4 py-2 text-sm font-semibold",
                      qty === w
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border bg-card",
                    )}
                  >
                    {w} kg
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <QuantityStepper
              value={qty}
              itemName={product.name}
              step={product.soldByWeight ? 0.5 : 1}
              min={product.soldByWeight ? 0.5 : 1}
              suffix={product.soldByWeight ? "kg" : undefined}
              onChange={setQty}
            />
            <Button
              size="lg"
              className="min-h-12 flex-1 rounded-full"
              disabled={status === "out_of_stock"}
              onClick={() => {
                addToCart(product, qty);
                toast.success(`${product.name} added to cart`);
              }}
            >
              {status === "out_of_stock" ? "Out of stock" : `Add to cart • ${formatM(price * qty)}`}
            </Button>
          </div>
        </div>
      </div>
      {related.length ? (
        <section>
          <h2 className="mb-3 text-lg font-bold">You might also need</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
