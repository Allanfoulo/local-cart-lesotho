import { useEffect, useState } from "react";
import { Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ManagementStoreSelector } from "@/components/admin/ManagementStoreSelector";
import { useAppStore } from "@/lib/app-store";
import { formatM } from "@/lib/format";
import type { Category, Promotion } from "@/lib/types";

const today = () => new Date().toISOString().slice(0, 10);
const blankPromotion = (storeId: string): Promotion => ({ id: "", storeId, name: "", type: "percentage", value: 10, startDate: today(), endDate: today(), active: true });

export function OffersManagement() {
  const store = useAppStore();
  const categories = store.managementCategories.filter((category) => category.storeId === store.managementStore.id);
  const promotions = store.managementPromotions.filter((promotion) => promotion.storeId === store.managementStore.id);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryEmoji, setCategoryEmoji] = useState("🛒");
  const [categoryOrder, setCategoryOrder] = useState(1);
  const [notice, setNotice] = useState("");
  const [promotion, setPromotion] = useState<Promotion>(() => blankPromotion(store.managementStore.id));

  useEffect(() => {
    setEditingCategory(null);
    setNewCategory(false);
    setCategoryName("");
    setCategoryEmoji("🛒");
    setPromotion(blankPromotion(store.managementStore.id));
    setNotice("");
  }, [store.managementStore.id]);

  const saveCategory = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const slug = categoryName.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const current = editingCategory;
    store.upsertCategory({ ...(current ?? {} as Category), id: current?.id ?? `cat_${crypto.randomUUID()}`, storeId: store.managementStore.id, slug: current?.slug ?? slug, name: categoryName.trim(), emoji: categoryEmoji, accent: current?.accent ?? "green", enabled: current?.enabled ?? true, order: categoryOrder });
    setEditingCategory(null);
    setNewCategory(false);
    setCategoryName("");
    setCategoryEmoji("🛒");
    setNotice(`Category saved for ${store.managementStore.name}.`);
  };

  const startCategory = (category?: Category) => {
    setEditingCategory(category ?? null);
    setCategoryName(category?.name ?? "");
    setCategoryEmoji(category?.emoji ?? "🛒");
    setCategoryOrder(category?.order ?? categories.length + 1);
    setNewCategory(true);
  };

  const savePromotion = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const existing = promotion.id ? promotions.find((item) => item.id === promotion.id) : undefined;
    store.upsertPromotion({ ...promotion, storeId: store.managementStore.id, id: promotion.id || `promo_${crypto.randomUUID()}`, name: promotion.name.trim() });
    setPromotion(blankPromotion(store.managementStore.id));
    setNotice(existing ? "Promotion updated." : `Promotion created for ${store.managementStore.name}.`);
  };

  return (
    <section className="space-y-8">
      <header className="space-y-3"><div><h2 className="text-xl font-semibold">Categories and promotions</h2><p className="text-sm text-muted-foreground">Manage offers for {store.managementStore.name}.</p></div><ManagementStoreSelector /></header>
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-primary">{notice}</p>}
      <section>
        <div className="mb-3 flex items-end justify-between gap-3"><div><h3 className="text-lg font-semibold">Categories</h3><p className="text-sm text-muted-foreground">Set the label, display order, and visibility.</p></div><Button variant="outline" onClick={() => startCategory()}><Plus className="size-4" />Add category</Button></div>
        {newCategory && <form onSubmit={saveCategory} className="mb-4 grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-[1fr_100px_120px_auto_auto] sm:items-end"><label className="text-sm font-medium">Name<Input required className="mt-1.5" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} /></label><label className="text-sm font-medium">Emoji<Input className="mt-1.5" value={categoryEmoji} onChange={(event) => setCategoryEmoji(event.target.value)} /></label><label className="text-sm font-medium">Sort order<Input type="number" min="0" className="mt-1.5" value={categoryOrder} onChange={(event) => setCategoryOrder(Number(event.target.value))} /></label><Button><Save className="size-4" />Save</Button><Button type="button" variant="outline" onClick={() => { setNewCategory(false); setEditingCategory(null); }}>Cancel</Button></form>}
        <div className="divide-y rounded-2xl border bg-card">{[...categories].sort((a, b) => a.order - b.order).map((category) => <div key={category.id} className="flex flex-wrap items-center gap-3 p-4"><span className="text-xl">{category.emoji}</span><div className="flex-1"><p className="font-semibold">{category.name}</p><p className="text-xs text-muted-foreground">Order {category.order}</p></div><Button variant="outline" size="sm" onClick={() => startCategory(category)}>Edit</Button><Button variant={category.enabled ? "outline" : "secondary"} size="sm" onClick={() => store.upsertCategory({ ...category, enabled: !category.enabled })}>{category.enabled ? "Visible" : "Hidden"}</Button></div>)}{!categories.length && <p className="p-5 text-sm text-muted-foreground">No categories for {store.managementStore.name} yet.</p>}</div>
      </section>
      <section>
        <div className="mb-3"><h3 className="text-lg font-semibold">Promotions</h3><p className="text-sm text-muted-foreground">Store coupon codes apply a fixed LSL discount to that store’s item subtotal; delivery is excluded.</p></div>
        <form onSubmit={savePromotion} className="mb-4 grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3"><h4 className="font-semibold sm:col-span-2 lg:col-span-3">{promotion.id ? "Edit promotion" : `Create a promotion for ${store.managementStore.name}`}</h4><label className="text-sm font-medium">Offer name<Input required className="mt-1.5" value={promotion.name} onChange={(event) => setPromotion({ ...promotion, name: event.target.value })} /></label><label className="text-sm font-medium">Offer type<select className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3" value={promotion.type} onChange={(event) => setPromotion({ ...promotion, type: event.target.value as Promotion["type"] })}>{[["percentage", "Percentage off"], ["fixed", "Fixed amount"], ["product_price", "Product price"], ["coupon", "Fixed coupon amount"]].map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="text-sm font-medium">Value (LSL)<Input type="number" required min={promotion.type === "coupon" ? "0.01" : "0"} step="0.01" className="mt-1.5" value={promotion.value} onChange={(event) => setPromotion({ ...promotion, value: Number(event.target.value) })} /></label>{promotion.type === "coupon" && <label className="text-sm font-medium">Code<Input required maxLength={40} className="mt-1.5" value={promotion.code ?? ""} onChange={(event) => setPromotion({ ...promotion, code: event.target.value.toUpperCase() })} /></label>}<label className="text-sm font-medium">Starts<Input type="date" required className="mt-1.5" value={promotion.startDate} onChange={(event) => setPromotion({ ...promotion, startDate: event.target.value })} /></label><label className="text-sm font-medium">Ends<Input type="date" required className="mt-1.5" value={promotion.endDate} onChange={(event) => setPromotion({ ...promotion, endDate: event.target.value })} /></label><div className="flex items-end gap-3"><Button><Save className="size-4" />{promotion.id ? "Save changes" : "Add offer"}</Button>{promotion.id && <Button type="button" variant="outline" onClick={() => setPromotion(blankPromotion(store.managementStore.id))}>Cancel</Button>}</div></form>
        <div className="divide-y rounded-2xl border bg-card">{promotions.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3 p-4"><div className="flex-1"><p className="font-semibold">{item.name}</p><p className="text-sm text-muted-foreground">{item.code ? `Code ${item.code} · ` : ""}{item.startDate} to {item.endDate}</p></div><span className="font-semibold">{item.type === "percentage" ? `${item.value}% off` : formatM(item.value)}</span><Button variant="outline" size="sm" onClick={() => setPromotion({ ...item })}>Edit</Button><Button size="sm" variant={item.active ? "outline" : "secondary"} onClick={() => store.upsertPromotion({ ...item, active: !item.active })}>{item.active ? "Active" : "Paused"}</Button></div>)}{!promotions.length && <p className="p-6 text-center text-sm text-muted-foreground">No promotions are configured for this store.</p>}</div>
      </section>
    </section>
  );
}
