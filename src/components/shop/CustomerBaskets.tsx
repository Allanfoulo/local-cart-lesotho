import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ProductTile } from "@/components/store/ProductTile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/app-store";
import { formatM, unitLabel } from "@/lib/format";

const reasonLabels: Record<string, string> = {
  discontinued: "No longer listed",
  merchant_changed: "Original store changed",
  product_changed: "Quantity or weight options changed",
  store_unavailable: "Original store unavailable",
  category_unavailable: "Category unavailable",
  unavailable: "Currently unavailable",
  insufficient_stock: "Not enough in stock",
};

export function CustomerBaskets() {
  const s = useAppStore();
  const baskets = useQuery(api.baskets.listMine, {});
  const createEmpty = useMutation(api.baskets.createEmpty);
  const renameBasket = useMutation(api.baskets.rename);
  const removeBasket = useMutation(api.baskets.remove);
  const setItem = useMutation(api.baskets.setItem);
  const removeItem = useMutation(api.baskets.removeItem);
  const addAvailableToCart = useMutation(api.baskets.addAvailableToCart);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, string>>({});
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    try {
      await createEmpty({ name: newName });
      setNewName("");
      toast.success("Saved basket created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create that basket.");
    } finally {
      setCreating(false);
    }
  };

  if (baskets === undefined) {
    return <section role="status" aria-busy="true" className="rounded-2xl border bg-card p-5">Loading saved baskets…</section>;
  }

  return (
    <section className="space-y-5" aria-labelledby="saved-baskets-heading">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="saved-baskets-heading" className="text-xl font-semibold">Saved baskets</h2>
          <p className="mt-1 text-sm text-muted-foreground">Save household essentials and add them to your cart when you’re ready to shop.</p>
        </div>
        <Link to="/cart" className="inline-flex min-h-11 items-center font-semibold text-primary">View cart</Link>
      </header>

      <form onSubmit={create} className="flex flex-col gap-2 rounded-2xl border bg-card p-4 sm:flex-row">
        <Input aria-label="New basket name" required maxLength={60} placeholder="For example, Weekly Essentials" value={newName} onChange={(event) => setNewName(event.target.value)} className="min-h-11" />
        <Button className="min-h-11 shrink-0" disabled={creating}>{creating ? "Creating…" : "Create basket"}</Button>
      </form>

      {baskets.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center">
          <h3 className="font-semibold">No saved baskets yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Create a list here, save your cart, or save products from a previous order.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {baskets.map((basket) => {
            const basketId = String(basket._id);
            const estimate = basket.items.reduce((sum, item) => sum + (item.currentPrice ?? 0) * item.quantity, 0);
            const changedPrices = basket.items.filter((item) => item.currentPrice !== null && item.currentPrice !== item.unitPriceAtSave).length;
            const itemsByStore = new Map<string, { name: string; items: typeof basket.items }>();
            for (const item of basket.items) {
              const group = itemsByStore.get(String(item.storeId)) ?? { name: item.storeName, items: [] };
              group.items.push(item);
              itemsByStore.set(String(item.storeId), group);
            }
            return (
              <article key={basketId} className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <label className="min-w-0 flex-1 text-sm font-medium">
                    Basket name
                    <Input aria-label={`Basket name ${basket.name}`} maxLength={60} defaultValue={basket.name} key={`${basketId}-${basket.name}`} className="mt-1 min-h-11" onBlur={async (event) => {
                      const input = event.currentTarget;
                      const next = input.value.trim();
                      if (!next) { input.value = basket.name; toast.error("Enter a basket name."); return; }
                      if (next === basket.name) return;
                      setSavingId(basketId);
                      try { await renameBasket({ basketId: basket._id, name: next }); toast.success("Basket name saved."); }
                      catch (error) { input.value = basket.name; toast.error(error instanceof Error ? error.message : "Could not rename this basket."); }
                      finally { setSavingId(null); }
                    }} />
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-1 text-sm text-muted-foreground">Catalog estimate · {formatM(estimate)}</span>
                    <Button variant="outline" className="min-h-11" disabled={savingId === basketId} onClick={async () => {
                      setSavingId(basketId);
                      try {
                        const result = await addAvailableToCart({ basketId: basket._id });
                        const cartBlocked: string[] = [];
                        let addedCount = 0;
                        let priceChanged = false;
                        for (const item of result.added) {
                          const currentQuantity = s.cart.find((cartItem) => cartItem.productId === String(item.productId))?.quantity ?? 0;
                          if (currentQuantity + item.quantity > item.stock) {
                            cartBlocked.push(`${item.name}: your cart plus this basket would exceed the ${item.stock} currently available.`);
                            continue;
                          }
                          s.addToCart({
                            id: String(item.productId), storeId: String(item.storeId), storeName: item.storeName,
                            slug: item.slug, name: item.name, description: item.description, categoryId: String(item.categoryId),
                            price: item.price, ...(item.promoPrice === undefined ? {} : { promoPrice: item.promoPrice }),
                            unit: item.unit, soldByWeight: item.soldByWeight,
                            ...(item.weightOptions === undefined ? {} : { weightOptions: item.weightOptions }),
                            stock: item.stock, lowStockThreshold: item.lowStockThreshold, available: item.available,
                            popularity: item.popularity, createdAt: item.createdAt, emoji: item.emoji,
                            ...(item.variants === undefined ? {} : { variants: item.variants.map((variant, index) => ({ id: `${item.productId}-${index}`, ...variant })) }),
                          }, item.quantity);
                          addedCount += 1;
                          priceChanged ||= item.priceChanged;
                        }
                        if (addedCount) toast.success(`${addedCount} product${addedCount === 1 ? "" : "s"} added to your cart${priceChanged ? "; some prices changed" : ""}.`);
                        const blockedMessages = [...result.blocked.map((item) => `${item.name}: ${item.reason}`), ...cartBlocked];
                        if (blockedMessages.length) toast.error(blockedMessages.join(" "));
                        if (!addedCount && !blockedMessages.length) toast.error("This basket has no products yet.");
                      } catch (error) { toast.error(error instanceof Error ? error.message : "Could not add this basket to your cart."); }
                      finally { setSavingId(null); }
                    }}>{savingId === basketId ? "Checking…" : "Add available to cart"}</Button>
                    <Button variant="ghost" className="min-h-11 text-destructive" disabled={savingId === basketId} onClick={async () => {
                      if (!window.confirm(`Delete “${basket.name}” and its saved products?`)) return;
                      setSavingId(basketId);
                      try { await removeBasket({ basketId: basket._id }); toast.success("Basket deleted."); }
                      catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete this basket."); }
                      finally { setSavingId(null); }
                    }}>Delete</Button>
                  </div>
                </div>

                {changedPrices > 0 && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Prices changed for {changedPrices} product{changedPrices === 1 ? "" : "s"}. The estimate uses current catalogue prices.</p>}

                {basket.items.length ? (
                  <div className="space-y-3">
                    {[...itemsByStore.entries()].map(([storeId, group]) => (
                      <section key={storeId} aria-label={`${group.name} products`} className="overflow-hidden rounded-xl border">
                        <h3 className="border-b bg-muted/40 px-3 py-2 text-sm font-semibold sm:px-4">{group.name}</h3>
                        <div className="divide-y">
                    {group.items.map((item) => {
                      const itemKey = String(item.id);
                      const currentPrice = item.currentPrice ?? item.unitPriceAtSave;
                      return (
                        <div key={itemKey} className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
                          <ProductTile emoji={item.emoji} name={item.name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.storeName} · {formatM(currentPrice)} / {unitLabel(item.unit)}</p>
                            {item.reason ? <p className="mt-1 text-sm text-destructive">{reasonLabels[item.reason] ?? item.reason}{item.reason === "insufficient_stock" ? ` (available: ${item.availableStock})` : ""}</p> : null}
                            {item.currentPrice !== null && item.currentPrice !== item.unitPriceAtSave ? <p className="mt-1 text-xs text-amber-800">Was {formatM(item.unitPriceAtSave)} when saved</p> : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <Input aria-label={`Quantity of ${item.name} in ${basket.name}`} type="number" min={item.soldByWeight ? "0.5" : "1"} max="500" step={item.soldByWeight ? "0.5" : "1"} defaultValue={item.quantity} key={`${itemKey}-${item.quantity}`} className="min-h-11 w-24" onBlur={async (event) => {
                              const input = event.currentTarget;
                              const quantity = Number(input.value);
                              if (!Number.isFinite(quantity) || quantity <= 0) { input.value = String(item.quantity); toast.error("Enter a valid quantity."); return; }
                              if (quantity === item.quantity) return;
                              setSavingId(basketId);
                              try { await setItem({ basketId: basket._id, productId: item.productId, quantity }); }
                              catch (error) { input.value = String(item.quantity); toast.error(error instanceof Error ? error.message : "Could not update quantity."); }
                              finally { setSavingId(null); }
                            }} />
                            <Button size="icon" variant="ghost" className="size-11" aria-label={`Remove ${item.name} from ${basket.name}`} disabled={savingId === basketId} onClick={async () => {
                              setSavingId(basketId);
                              try { await removeItem({ basketId: basket._id, itemId: item.id }); }
                              catch (error) { toast.error(error instanceof Error ? error.message : "Could not remove this product."); }
                              finally { setSavingId(null); }
                            }}>×</Button>
                          </div>
                        </div>
                      );
                    })}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">This basket is empty. Add a product below.</p>}

                <form className="flex flex-col gap-2 border-t pt-4 sm:flex-row" onSubmit={async (event) => {
                  event.preventDefault();
                  const product = s.products.find((candidate) => candidate.id === selectedProducts[basketId]);
                  if (!product) { toast.error("Choose a product first."); return; }
                  const quantity = Number(quantities[basketId] ?? "1");
                  setSavingId(basketId);
                  try {
                    await setItem({ basketId: basket._id, productId: product.id as Id<"products">, quantity });
                    setSelectedProducts((current) => ({ ...current, [basketId]: "" }));
                    setQuantities((current) => ({ ...current, [basketId]: "1" }));
                    toast.success(`${product.name} added to ${basket.name}.`);
                  } catch (error) { toast.error(error instanceof Error ? error.message : "Could not add this product."); }
                  finally { setSavingId(null); }
                }}>
                  <select aria-label={`Choose a product for ${basket.name}`} className="min-h-11 min-w-0 flex-1 rounded-lg border bg-background px-3" value={selectedProducts[basketId] ?? ""} onChange={(event) => {
                    const product = s.products.find((candidate) => candidate.id === event.target.value);
                    setSelectedProducts((current) => ({ ...current, [basketId]: event.target.value }));
                    setQuantities((current) => ({ ...current, [basketId]: product?.soldByWeight ? String(product.weightOptions?.[0] ?? 1) : "1" }));
                  }}>
                    <option value="">Add a product…</option>
                    {s.products.filter((product) => product.available && !basket.items.some((item) => String(item.productId) === product.id)).sort((a, b) => a.storeName.localeCompare(b.storeName) || a.name.localeCompare(b.name)).map((product) => <option key={product.id} value={product.id}>{product.storeName} · {product.name} · {formatM(product.promoPrice ?? product.price)} / {unitLabel(product.unit)}</option>)}
                  </select>
                  <Input aria-label={`New product quantity for ${basket.name}`} type="number" min={s.products.find((product) => product.id === selectedProducts[basketId])?.soldByWeight ? "0.5" : "1"} max="500" step={s.products.find((product) => product.id === selectedProducts[basketId])?.soldByWeight ? "0.5" : "1"} value={quantities[basketId] ?? "1"} onChange={(event) => setQuantities((current) => ({ ...current, [basketId]: event.target.value }))} className="min-h-11 w-full sm:w-28" />
                  <Button type="submit" variant="outline" className="min-h-11" disabled={savingId === basketId}>Save product</Button>
                </form>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
