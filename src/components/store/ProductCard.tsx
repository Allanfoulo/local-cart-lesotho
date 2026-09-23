import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { effectivePrice, stockStatus, useAppStore } from "@/lib/app-store";
import { formatMShort, unitLabel } from "@/lib/format";
import type { Product } from "@/lib/types";
import { ProductTile } from "./ProductTile";
import { QuantityStepper } from "./QuantityStepper";
import { StockBadge } from "./StockBadge";
import { toast } from "sonner";

export function ProductCard({ product }: { product: Product }) {
  const { cart, addToCart, setCartQuantity } = useAppStore();
  const inCart = cart.find((i) => i.productId === product.id);
  const status = stockStatus(product);
  const step = product.soldByWeight ? 0.5 : 1;

  return (
    <div className="group flex flex-col rounded-2xl border border-border bg-card p-2.5 shadow-sm transition hover:shadow-md">
      <Link to="/products/$slug" params={{ slug: product.slug }} className="relative block">
        <ProductTile emoji={product.emoji} name={product.name} />
        {product.promoPrice ? (
          <span className="absolute left-2 top-2 rounded-full bg-promo px-2 py-0.5 text-[10px] font-bold uppercase text-promo-foreground">
            Special
          </span>
        ) : null}
      </Link>
      <div className="mt-2.5 flex flex-1 flex-col px-0.5">
        <Link
          to="/products/$slug"
          params={{ slug: product.slug }}
          className="line-clamp-2 text-sm font-semibold leading-snug"
        >
          {product.name}
        </Link>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="font-bold text-primary">{formatMShort(effectivePrice(product))}</span>
          <span className="text-xs text-muted-foreground">{unitLabel(product.unit)}</span>
          {product.promoPrice ? (
            <span className="text-xs text-muted-foreground line-through">
              {formatMShort(product.price)}
            </span>
          ) : null}
        </div>
        <div className="mt-1">
          <StockBadge status={status} />
        </div>
        <div className="mt-auto pt-2.5">
          {status === "out_of_stock" ? (
            <Button variant="secondary" size="sm" className="w-full rounded-full" disabled>
              Unavailable
            </Button>
          ) : inCart ? (
            <QuantityStepper
              size="sm"
              value={inCart.quantity}
              step={step}
              suffix={product.soldByWeight ? "kg" : undefined}
              onChange={(q) => setCartQuantity(product.id, q)}
            />
          ) : (
            <Button
              size="sm"
              className="w-full rounded-full"
              onClick={() => {
                addToCart(product, 1);
                toast.success(`${product.name} added to cart`);
              }}
            >
              <Plus className="size-4" /> Add
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
