import { useEffect, useState } from "react";
import { PackagePlus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ManagementStoreSelector } from "@/components/admin/ManagementStoreSelector";
import { useAppStore } from "@/lib/app-store";
import { formatM } from "@/lib/format";
import type { Product, PricingUnit } from "@/lib/types";

type Draft = Pick<Product, "name" | "description" | "categoryId" | "price" | "promoPrice" | "unit" | "stock" | "lowStockThreshold" | "available" | "emoji">;
const blank: Draft = { name: "", description: "", categoryId: "", price: 0, unit: "each", stock: 0, lowStockThreshold: 5, available: true, emoji: "🛒" };

export function CatalogueManagement() {
  const store = useAppStore();
  const products = store.managementProducts.filter((product) => product.storeId === store.managementStore.id);
  const categories = store.managementCategories.filter((category) => category.storeId === store.managementStore.id);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "needs_stock" | "hidden">("all");

  useEffect(() => {
    setEditingId(null);
    setDraft(blank);
    setMessage("");
  }, [store.managementStore.id]);

  const edit = (product: Product) => {
    setEditingId(product.id);
    setDraft({ name: product.name, description: product.description, categoryId: product.categoryId, price: product.price, promoPrice: product.promoPrice, unit: product.unit, stock: product.stock, lowStockThreshold: product.lowStockThreshold, available: product.available, emoji: product.emoji });
    setMessage("");
  };

  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.categoryId || !categories.some((category) => category.id === draft.categoryId) || draft.price < 0 || draft.stock < 0) return;
    const base = editingId ? products.find((product) => product.id === editingId) : undefined;
    const selectedStore = store.managementStore;
    const slug = draft.name.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const product: Product = {
      ...base, ...draft, id: base?.id ?? `prd_${crypto.randomUUID()}`,
      storeId: selectedStore.id, storeName: selectedStore.name,
      slug: base?.slug ?? slug, description: draft.description.trim(), name: draft.name.trim(),
      popularity: base?.popularity ?? 0, createdAt: base?.createdAt ?? new Date().toISOString(),
      soldByWeight: base?.soldByWeight ?? false, available: draft.stock > 0 && draft.available,
    };
    store.upsertProduct(product);
    setEditingId(null);
    setDraft(blank);
    setMessage(base ? "Product updated." : `Product added to ${selectedStore.name}.`);
  };

  const field = (label: string, key: keyof Draft, type = "text") => (
    <label className="block text-sm font-medium">
      {label}
      <Input required={key === "name" || key === "price" || key === "stock"} type={type} min={type === "number" ? "0" : undefined} step={key === "price" || key === "promoPrice" ? "0.01" : undefined} className="mt-1.5" value={draft[key] as string | number | undefined} onChange={(event) => setDraft({ ...draft, [key]: type === "number" ? (event.target.value === "" && key === "promoPrice" ? undefined : event.target.value === "" ? 0 : Number(event.target.value)) : event.target.value })} />
    </label>
  );

  const needsStock = products.filter((product) => !product.available || product.stock <= product.lowStockThreshold);
  const hidden = products.filter((product) => !product.available);
  const visibleProducts = products.filter((product) => {
    const matchesSearch = `${product.name} ${product.description} ${categories.find((category) => category.id === product.categoryId)?.name ?? ""}`
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    const matchesFilter = filter === "all" || (filter === "needs_stock" && needsStock.includes(product)) || (filter === "hidden" && !product.available);
    return matchesSearch && matchesFilter;
  });

  return (
    <section className="space-y-5">
      <header className="space-y-3">
        <div><h2 className="text-xl font-semibold">Products and stock</h2><p className="text-sm text-muted-foreground">Edit the customer catalogue and update shelf quantities.</p></div>
        <ManagementStoreSelector />
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4"><p className="text-sm text-muted-foreground">Products</p><p className="mt-1 text-2xl font-semibold">{products.length}</p></div>
        <button type="button" onClick={() => setFilter(filter === "needs_stock" ? "all" : "needs_stock")} aria-pressed={filter === "needs_stock"} className={`rounded-2xl border p-4 text-left ${filter === "needs_stock" ? "border-primary bg-primary/5" : "bg-card"}`}><p className="text-sm text-muted-foreground">Needs stock attention</p><p className="mt-1 text-2xl font-semibold">{needsStock.length}</p></button>
        <button type="button" onClick={() => setFilter(filter === "hidden" ? "all" : "hidden")} aria-pressed={filter === "hidden"} className={`rounded-2xl border p-4 text-left ${filter === "hidden" ? "border-primary bg-primary/5" : "bg-card"}`}><p className="text-sm text-muted-foreground">Hidden from customers</p><p className="mt-1 text-2xl font-semibold">{hidden.length}</p></button>
      </div>
      <form id="product-form" onSubmit={save} className="grid scroll-mt-4 gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2 md:p-5">
        <div className="flex items-center gap-2 sm:col-span-2"><PackagePlus className="size-5 text-primary" /><h3 className="font-semibold">{editingId ? "Edit product" : `Add a product to ${store.managementStore.name}`}</h3></div>
        {field("Product name", "name")}{field("Emoji or simple symbol", "emoji")}
        <label className="block text-sm font-medium">Description<textarea className="mt-1.5 min-h-20 w-full rounded-lg border bg-background p-3 text-sm" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
        <label className="block text-sm font-medium">Category<select required className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3" value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}><option value="">Choose category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        {field("Price (M)", "price", "number")}{field("Promo price (optional, M)", "promoPrice", "number")}
        <label className="block text-sm font-medium">Pricing unit<select className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3" value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value as PricingUnit })}>{["each", "pack", "kg", "gram", "litre", "crate"].map((unit) => <option key={unit}>{unit}</option>)}</select></label>
        {field("Stock quantity", "stock", "number")}{field("Low stock alert at", "lowStockThreshold", "number")}
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={draft.available} onChange={(event) => setDraft({ ...draft, available: event.target.checked })} className="size-4 accent-primary" />Available to customers</label>
        <div className="flex gap-2 sm:col-span-2"><Button type="submit">{editingId ? "Save product" : "Add product"}</Button>{editingId && <Button type="button" variant="outline" onClick={() => { setEditingId(null); setDraft(blank); }}>Cancel</Button>}</div>
        {message && <p role="status" className="text-sm text-primary sm:col-span-2">{message}</p>}
      </form>
      <section aria-labelledby="catalogue-list-title" className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h3 id="catalogue-list-title" className="font-semibold">Product list</h3><p className="text-sm text-muted-foreground">Update stock here; changes sync to the marketplace.</p></div>
          <label className="block w-full sm:max-w-xs"><span className="sr-only">Search products</span><Input className="min-h-11" placeholder="Search products or categories" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        </div>
        {products.length > 0 && <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter products">
          {(["all", "needs_stock", "hidden"] as const).map((value) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium ${filter === value ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>{value === "all" ? "All products" : value === "needs_stock" ? "Needs attention" : "Hidden"}</button>)}
        </div>}
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleProducts.map((product) => (
            <article key={product.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted text-2xl">{product.emoji}</span>
                <div className="min-w-0 flex-1">
                  <h4 className="break-words font-semibold">{product.name}</h4>
                  <p className="mt-0.5 text-sm text-muted-foreground">{categories.find((category) => category.id === product.categoryId)?.name ?? "Uncategorized"}</p>
                  <p className="mt-2 text-sm font-medium">{formatM(product.promoPrice ?? product.price)} / {product.unit}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${product.available ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{product.available ? "Available" : "Hidden"}</span>
              </div>
              <div className="mt-4 flex flex-wrap items-end gap-2 border-t pt-3">
                <label className="mr-auto text-sm font-medium">Stock quantity<Input aria-label={`${product.name} stock quantity`} className="mt-1 min-h-11 w-28" type="number" min="0" value={product.stock} onChange={(event) => store.setStock(product.id, Number(event.target.value))} /></label>
                <Button className="min-h-11 min-w-11" variant="outline" aria-label={`Edit ${product.name}`} onClick={() => edit(product)}><Pencil className="size-4" /><span className="sm:sr-only">Edit</span></Button>
                <Button className="min-h-11 min-w-11" variant="outline" aria-label={`Remove ${product.name}`} onClick={() => { if (window.confirm(`Remove ${product.name} from the catalogue?`)) { store.removeProduct(product.id); setMessage(`${product.name} removed.`); if (editingId === product.id) { setEditingId(null); setDraft(blank); } } }}><Trash2 className="size-4" /><span className="sm:sr-only">Remove</span></Button>
              </div>
            </article>
          ))}
        </div>
        {!products.length && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No products are configured for {store.managementStore.name} yet. Add your first product above.</p>}
        {products.length > 0 && visibleProducts.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No products match these filters. Clear the search or choose all products.</p>}
      </section>
    </section>
  );
}
