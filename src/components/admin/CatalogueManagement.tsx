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

  return (
    <section className="space-y-5">
      <header className="space-y-3">
        <div><h2 className="text-xl font-semibold">Products and stock</h2><p className="text-sm text-muted-foreground">Edit the customer catalogue and update shelf quantities.</p></div>
        <ManagementStoreSelector />
      </header>
      <form onSubmit={save} className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2 md:p-5">
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
      <div className="divide-y rounded-2xl border bg-card">{products.map((product) => <div key={product.id} className="flex flex-wrap items-center gap-3 p-4"><span className="grid size-12 place-items-center rounded-xl bg-muted text-2xl">{product.emoji}</span><div className="min-w-40 flex-1"><p className="font-semibold">{product.name}</p><p className="text-sm text-muted-foreground">{formatM(product.promoPrice ?? product.price)} · {product.stock} in stock · {product.available ? "Available" : "Hidden"}</p></div><label className="text-xs text-muted-foreground">Stock<Input aria-label={`${product.name} stock quantity`} className="mt-1 w-24" type="number" min="0" value={product.stock} onChange={(event) => store.setStock(product.id, Number(event.target.value))} /></label><Button size="icon" variant="outline" aria-label={`Edit ${product.name}`} onClick={() => edit(product)}><Pencil className="size-4" /></Button><Button size="icon" variant="outline" aria-label={`Remove ${product.name}`} onClick={() => { if (window.confirm(`Remove ${product.name} from the catalogue?`)) { store.removeProduct(product.id); setMessage(`${product.name} removed.`); if (editingId === product.id) { setEditingId(null); setDraft(blank); } } }}><Trash2 className="size-4" /></Button></div>)}</div>
      {!products.length && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No products are configured for {store.managementStore.name} yet.</p>}
    </section>
  );
}
