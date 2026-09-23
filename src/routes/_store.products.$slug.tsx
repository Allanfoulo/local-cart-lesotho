import { Link, createFileRoute, notFound } from "@tanstack/react-router";
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

export const Route = createFileRoute("/_store/products/$slug")({
  loader: ({ params }) => {
    const p = seedProducts.find((x) => x.slug === params.slug);
    if (!p) throw notFound();
    return { name: p.name, description: p.description };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.name} — Mabote Fresh` : "Product — Mabote Fresh";
    const description = loaderData?.description ?? "Product at Mabote Fresh";
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
  const { products, addToCart, favourites, toggleFavourite } = useAppStore();
  const product = products.find((p) => p.slug === slug);
  const [qty, setQty] = useState(1);

  if (!product) return <p>Product not found.</p>;
  const status = stockStatus(product);
  const price = effectivePrice(product);
  const fav = favourites.includes(product.id);
  const related = products
    .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="space-y-8">
      <Link to="/shop" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Back to shop
      </Link>
      <div className="grid gap-6 md:grid-cols-2">
        <ProductTile emoji={product.emoji} name={product.name} size="lg" className="rounded-3xl" />
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight">{product.name}</h1>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              aria-label="Save to favourites"
              onClick={() => toggleFavourite(product.id)}
            >
              <Heart className={cn("size-5", fav && "fill-destructive text-destructive")} />
            </Button>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{formatMShort(price)}</span>
            <span className="text-muted-foreground">{unitLabel(product.unit)}</span>
            {product.promoPrice ? (
              <span className="text-muted-foreground line-through">{formatMShort(product.price)}</span>
            ) : null}
          </div>
          <StockBadge status={status} />
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
                      "rounded-full border px-4 py-2 text-sm font-semibold",
                      qty === w ? "border-primary bg-primary-soft text-primary" : "border-border bg-card",
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
              step={product.soldByWeight ? 0.5 : 1}
              min={product.soldByWeight ? 0.5 : 1}
              suffix={product.soldByWeight ? "kg" : undefined}
              onChange={setQty}
            />
            <Button
              size="lg"
              className="h-12 flex-1 rounded-full"
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
