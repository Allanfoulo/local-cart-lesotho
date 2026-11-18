import { Link, createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Trash2 } from "lucide-react";

import { ProductTile } from "@/components/store/ProductTile";
import { QuantityStepper } from "@/components/store/QuantityStepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { groupCartByStore, useAppStore } from "@/lib/app-store";
import { formatM, unitLabel } from "@/lib/format";

export const Route = createFileRoute("/_store/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — REETAPELE" },
      { name: "description", content: "Review the groceries in your cart before checkout." },
      { property: "og:title", content: "Your cart — REETAPELE" },
      { property: "og:description", content: "Review your REETAPELE cart." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { isAuthenticated } = useConvexAuth();
  const createBasketFromCart = useMutation(api.baskets.createFromCart);
  const [savingBasket, setSavingBasket] = useState(false);
  const [basketName, setBasketName] = useState("");
  const { cart, cartSubtotal, stores, shop, products, setCartQuantity, removeFromCart } =
    useAppStore();
  const groups = groupCartByStore(cart, stores.length ? stores : [shop]);
  const delivery = groups.reduce((sum, group) => sum + group.store.deliveryFee, 0);
  const total = cartSubtotal + delivery;
  const belowMinimum = groups.filter((group) => group.subtotal < group.store.minimumOrder);
  const belowMin = belowMinimum.length > 0;
  const unavailableItems = cart.filter((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return !product || !product.available || product.stock <= 0 || item.quantity > product.stock;
  });
  const checkoutBlocked = belowMin || unavailableItems.length > 0;

  const saveBasket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingBasket(true);
    try {
      await createBasketFromCart({
        name: basketName,
        items: cart.map((item) => ({ productId: item.productId as Id<"products">, quantity: item.quantity })),
      });
      setBasketName("");
      toast.success("Cart saved as a basket. You can find it in your account.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this cart as a basket.");
    } finally {
      setSavingBasket(false);
    }
  };

  if (!cart.length) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-6xl">🧺</p>
        <h1 className="mt-4 text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-1 text-muted-foreground">Add some fresh groceries to get started.</p>
        <Button asChild size="lg" className="mt-6 rounded-full">
          <Link to="/shop">Browse products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Your cart</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Items and delivery are grouped by store. Each store prepares a separate order.
          </p>
          {isAuthenticated ? (
            <form onSubmit={saveBasket} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input aria-label="Saved basket name" required maxLength={60} placeholder="Name this basket, for example Weekly Essentials" value={basketName} onChange={(event) => setBasketName(event.target.value)} className="min-h-11 max-w-md" />
              <Button type="submit" variant="outline" className="min-h-11" disabled={savingBasket}>{savingBasket ? "Saving…" : "Save cart as basket"}</Button>
            </form>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground"><Link to="/account" className="font-semibold text-primary">Sign in</Link> to save this cart as a basket.</p>
          )}
        </div>
        {unavailableItems.length > 0 && (
          <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            Update or remove these unavailable or over-stock items before checkout:{" "}
            {unavailableItems.map((item) => item.name).join(", ")}.
          </p>
        )}
        {groups.map((group) => (
          <section key={group.store.id} className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-bold">{group.store.name}</h2>
              <span className="text-xs text-muted-foreground">{group.items.length} items</span>
            </div>
            {group.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <ProductTile emoji={item.emoji} name={item.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-semibold">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatM(item.unitPrice)} {unitLabel(item.unit)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11 shrink-0"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => removeFromCart(item.productId)}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <QuantityStepper
                      value={item.quantity}
                      itemName={item.name}
                      step={item.soldByWeight ? 0.5 : 1}
                      suffix={item.soldByWeight ? "kg" : undefined}
                      onChange={(q) => setCartQuantity(item.productId, q)}
                    />
                    <span className="shrink-0 font-bold">
                      {formatM(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
      <aside className="h-fit space-y-3 rounded-2xl border border-border bg-card p-5 md:sticky md:top-32">
        <h2 className="font-bold">Order summary</h2>
        <Row label="Subtotal" value={formatM(cartSubtotal)} />
        {groups.map((group) => (
          <Row
            key={group.store.id}
            label={`${group.store.name} delivery`}
            value={formatM(group.store.deliveryFee)}
          />
        ))}
        <div className="border-t border-border pt-3">
          <Row label="Total" value={formatM(total)} bold />
        </div>
        {belowMin ? (
          <div className="space-y-2 rounded-xl bg-warning/15 p-3 text-sm">
            {belowMinimum.map((group) => (
              <p key={group.store.id}>
                {group.store.name} requires {formatM(group.store.minimumOrder)} minimum. Add{" "}
                {formatM(group.store.minimumOrder - group.subtotal)} more.
              </p>
            ))}
          </div>
        ) : null}
        <Button
          asChild
          size="lg"
          className="min-h-12 w-full rounded-full"
          disabled={checkoutBlocked}
        >
          {checkoutBlocked ? <span>Checkout</span> : <Link to="/checkout">Checkout</Link>}
        </Button>
        <Link to="/shop" className="block text-center text-sm font-semibold text-primary">
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}

export function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? "text-base font-bold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
