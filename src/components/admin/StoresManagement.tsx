import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/app-store";

const emptyDraft = {
  name: "",
  slug: "",
  tagline: "",
  phone: "",
  whatsapp: "",
  address: "",
  openingHours: "08:00–18:00",
  deliveryArea: "Maseru",
  ownerEmail: "",
};

function slugFromName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function StoresManagement() {
  const appStore = useAppStore();
  const stores = useQuery(api.stores.listForPlatform, {});
  const inviteStaff = useMutation(api.invitations.create);
  const [draft, setDraft] = useState(emptyDraft);
  const [slugTouched, setSlugTouched] = useState(false);
  const [creating, setCreating] = useState(false);
  const [changingStore, setChangingStore] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const storeId = await appStore.createPlatformStore({
        name: draft.name,
        slug: draft.slug,
        tagline: draft.tagline,
        phone: draft.phone,
        whatsapp: draft.whatsapp,
        address: draft.address,
        openingHours: draft.openingHours,
        deliveryArea: draft.deliveryArea,
      });
      try {
        await inviteStaff({ storeId, email: draft.ownerEmail, role: "store_owner" });
        setNotice(`${draft.name.trim()} was created. The store owner invitation is queued; the store stays unpublished until setup is complete.`);
      } catch (reason) {
        setError(`The store was created but its owner invitation failed. It remains unpublished. Invite ${draft.ownerEmail} as the store owner from Team access. ${reason instanceof Error ? reason.message : ""}`);
      }
      setDraft(emptyDraft);
      setSlugTouched(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create this store.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleStore(storeId: Id<"stores">, enabled: boolean) {
    setChangingStore(String(storeId));
    setError("");
    setNotice("");
    try {
      await appStore.setPlatformStoreEnabled(storeId, enabled);
      setNotice(enabled ? "Store published in the marketplace." : "Store listing paused. Existing staff can still finish open work.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not change this store's listing status.");
    } finally {
      setChangingStore(null);
    }
  }

  return (
    <section className="space-y-8">
      <header>
        <h2 className="text-xl font-semibold">Stores</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Create a store, appoint its owner, and publish it after its delivery setup and first products are ready.
        </p>
      </header>
      {notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-primary">{notice}</p>}
      {error && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

      <form onSubmit={create} className="space-y-4 rounded-2xl border bg-card p-4 md:p-6">
        <div>
          <h3 className="font-semibold">Add a store</h3>
          <p className="mt-1 text-sm text-muted-foreground">New stores start unpublished. The invited owner can finish the catalogue and store settings.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-medium">Store name<Input required maxLength={120} className="mt-1.5" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value, ...(!slugTouched ? { slug: slugFromName(event.target.value) } : {}) }))} /></label>
          <label className="text-sm font-medium">Store URL slug<Input required maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" className="mt-1.5" value={draft.slug} onChange={(event) => { setSlugTouched(true); setDraft((current) => ({ ...current, slug: event.target.value.toLowerCase() })); }} /></label>
          <label className="text-sm font-medium">Short description<Input required maxLength={180} className="mt-1.5" value={draft.tagline} onChange={(event) => setDraft((current) => ({ ...current, tagline: event.target.value }))} /></label>
          <label className="text-sm font-medium">Store phone<Input required type="tel" maxLength={40} className="mt-1.5" value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} /></label>
          <label className="text-sm font-medium">WhatsApp<Input required type="tel" maxLength={40} className="mt-1.5" value={draft.whatsapp} onChange={(event) => setDraft((current) => ({ ...current, whatsapp: event.target.value }))} /></label>
          <label className="text-sm font-medium">First delivery area<Input required maxLength={80} className="mt-1.5" value={draft.deliveryArea} onChange={(event) => setDraft((current) => ({ ...current, deliveryArea: event.target.value }))} /></label>
          <label className="text-sm font-medium sm:col-span-2">Street address<Input required maxLength={240} className="mt-1.5" value={draft.address} onChange={(event) => setDraft((current) => ({ ...current, address: event.target.value }))} /></label>
          <label className="text-sm font-medium">Opening hours<Input required maxLength={120} className="mt-1.5" value={draft.openingHours} onChange={(event) => setDraft((current) => ({ ...current, openingHours: event.target.value }))} /></label>
          <label className="text-sm font-medium sm:col-span-2 lg:col-span-3">First store owner’s email<Input required type="email" className="mt-1.5 max-w-xl" value={draft.ownerEmail} onChange={(event) => setDraft((current) => ({ ...current, ownerEmail: event.target.value }))} /></label>
        </div>
        <Button disabled={creating}>{creating ? "Creating store and inviting owner…" : "Create store and invite owner"}</Button>
      </form>

      <section aria-labelledby="store-list-title">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h3 id="store-list-title" className="font-semibold">Platform stores</h3>
          <span className="text-sm text-muted-foreground">{stores ? `${stores.length} of 50` : "Loading…"}</span>
        </div>
        <div className="divide-y rounded-2xl border bg-card">
          {stores?.map((store) => (
            <article key={store.id} className="space-y-3 p-4 md:flex md:items-start md:justify-between md:gap-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold">{store.name}</h4>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${store.enabled ? "bg-emerald-50 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                    {store.enabled ? "Published" : "Unpublished"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">/{store.slug} · {store.ownerEmail ? `Owner: ${store.ownerEmail}` : store.ownerInvitationEmail ? `Owner invited: ${store.ownerInvitationEmail}` : "Owner not appointed"}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Setup: {store.setup.hasOwner ? "owner assigned" : "owner needed"} · {store.setup.hasSettings ? "delivery settings ready" : "delivery settings missing"} · {store.setup.hasActiveCategory ? "category ready" : "category needed"} · {store.setup.activeProductCount} available products
                </p>
              </div>
              <Button
                className="w-full md:w-auto"
                variant={store.enabled ? "outline" : "default"}
                disabled={changingStore === String(store.id) || (!store.enabled && !store.setup.readyToPublish)}
                onClick={() => void toggleStore(store.id, !store.enabled)}
              >
                {changingStore === String(store.id) ? "Saving…" : store.enabled ? "Pause listing" : "Publish store"}
              </Button>
            </article>
          ))}
          {stores?.length === 0 && <p className="p-5 text-sm text-muted-foreground">No stores are configured yet. Create the first store above.</p>}
        </div>
      </section>
    </section>
  );
}
