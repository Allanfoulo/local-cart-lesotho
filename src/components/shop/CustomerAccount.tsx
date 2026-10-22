import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { mapConvexOrder } from "@/features/orders/convex-mapper";
import {
  Heart,
  MapPin,
  Package,
  UserRound,
  Bell,
  Trash2,
  ShoppingBag,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDashboardNavigation } from "@/components/layout/ResponsiveDashboardNavigation";
import {
  useAppStore,
  ORDER_STATUS_LABEL,
  PAYMENT_LABEL,
  PAYMENT_STATUS_LABEL,
} from "@/lib/app-store";
import { formatDate, formatM } from "@/lib/format";
import type { DeliveryAddress } from "@/lib/types";

const sections = [
  ["profile", "Profile", UserRound],
  ["addresses", "Addresses", MapPin],
  ["orders", "Orders", Package],
  ["favourites", "Favourites", Heart],
  ["preferences", "Preferences", Bell],
] as const;
type Section = (typeof sections)[number][0];
export function CustomerAccount({ initialSection = "profile" }: { initialSection?: Section }) {
  const s = useAppStore();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const ownOrders = useQuery(api.customers.myOrders, isAuthenticated ? {} : "skip");
  const updateProfile = useMutation(api.customers.updateProfile);
  const [section, setSection] = useState<Section>(initialSection);
  const [notice, setNotice] = useState("");
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const myOrders = (ownOrders ?? []).map((order) => mapConvexOrder(order, order.timeline));
  const saveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setSavingProfile(true);
    setProfileError("");
    setNotice("");
    try {
      await updateProfile({ name: String(data.get("name")), phone: String(data.get("phone")) });
      setNotice("Your details are saved.");
    } catch (reason) {
      setProfileError(
        reason instanceof Error ? reason.message : "Could not save your details. Please try again.",
      );
    } finally {
      setSavingProfile(false);
    }
  };
  if (isLoading)
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center" role="status">
        Loading your account…
      </main>
    );
  if (!isAuthenticated)
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <UserRound className="mx-auto size-10 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">Sign in to your account</h1>
        <p className="mt-2 text-muted-foreground">
          Sign in to manage saved addresses, favourites, preferences, and your order history.
        </p>
        <Link
          to="/sign-in"
          search={{ returnTo: undefined, createAccount: false }}
          className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
        >
          Sign in or create an account
        </Link>
      </main>
    );
  return (
    <ResponsiveDashboardNavigation
      title="Your account"
      items={sections.map(([id, label, icon]) => ({ id, label, icon }))}
      activeItem={section}
      onSelect={setSection}
      className="h-full max-w-6xl overflow-hidden px-4 py-5 sm:py-7 md:px-8 md:py-4"
    >
      <main className="min-w-0">
        <header className="mb-5 sm:mb-7">
          <p className="text-sm font-semibold text-primary">YOUR REETAPELE ACCOUNT</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Hello, {s.account.name.split(" ")[0] || "there"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Manage the details that make your next shop easier.
          </p>
        </header>
        <div className="min-w-0">
          {notice && (
            <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-primary">
              {notice}
            </p>
          )}
          {section === "profile" && (
            <section className="max-w-xl">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Your details</h2>
                  <p className="text-sm text-muted-foreground">
                    We use these details to keep you updated about your order.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => void signOut()}
                >
                  Sign out
                </Button>
              </div>
              {profileError && (
                <p
                  role="alert"
                  className="mb-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {profileError}
                </p>
              )}
              <form onSubmit={saveProfile} className="space-y-4">
                <label className="block text-sm font-medium">
                  Full name
                  <Input
                    name="name"
                    required
                    defaultValue={s.account.name}
                    className="mt-1.5 min-h-11"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Phone number
                  <Input
                    name="phone"
                    required
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    defaultValue={s.account.phone}
                    className="mt-1.5 min-h-11"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Email
                  <Input
                    name="email"
                    type="email"
                    readOnly
                    value={s.account.email ?? ""}
                    className="mt-1.5 min-h-11"
                  />
                </label>
                <Button className="min-h-11 w-full sm:w-auto" disabled={savingProfile}>
                  {savingProfile ? "Saving…" : "Save details"}
                </Button>
              </form>
              <p className="mt-5 text-xs text-muted-foreground">
                Your account details are stored securely with REETAPELE.
              </p>
            </section>
          )}
          {section === "addresses" && <AddressBook />}
          {section === "orders" && (
            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Your orders</h2>
                  <p className="text-sm text-muted-foreground">
                    Updates reflect the latest status saved by the shop.
                  </p>
                </div>
                <Link
                  to="/shop"
                  className="min-h-11 inline-flex items-center text-sm font-semibold text-primary"
                >
                  Shop products
                </Link>
              </div>
              {ownOrders === undefined ? (
                <p
                  className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground"
                  role="status"
                >
                  Loading your orders…
                </p>
              ) : myOrders.length ? (
                <div className="space-y-4">
                  {myOrders.map((order) => (
                    <article key={order.id} className="rounded-2xl border bg-card p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">{order.number}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(order.createdAt)} · {order.address.area}
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-primary">
                          {ORDER_STATUS_LABEL[order.status]}
                        </span>
                      </div>
                      <p className="mt-4 break-words text-sm">
                        {order.items.map((i) => `${i.quantity} × ${i.name}`).join(" · ")}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                        <span className="text-sm text-muted-foreground">
                          {PAYMENT_LABEL[order.payment.method]} ·{" "}
                          {PAYMENT_STATUS_LABEL[order.payment.status]}
                        </span>
                        <strong>{formatM(order.total)}</strong>
                      </div>
                      <details className="mt-3">
                        <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-primary">
                          Order updates
                        </summary>
                        <ol className="mt-1 space-y-2">
                          {order.timeline.map((event, index) => (
                            <li
                              key={`${event.at}-${index}`}
                              className="flex flex-col gap-1 text-sm sm:flex-row sm:justify-between sm:gap-3"
                            >
                              <span>
                                {event.status === "note"
                                  ? event.note
                                  : (ORDER_STATUS_LABEL[
                                      event.status as keyof typeof ORDER_STATUS_LABEL
                                    ] ?? "Order placed")}
                              </span>
                              <time className="shrink-0 text-muted-foreground">
                                {new Date(event.at).toLocaleString("en-GB", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </time>
                            </li>
                          ))}
                        </ol>
                      </details>
                      <Button
                        className="mt-2 min-h-11 w-full sm:w-auto"
                        variant="outline"
                        onClick={() => {
                          const r = s.reorder(order.id);
                          setNotice(
                            `${r.added} item${r.added === 1 ? "" : "s"} added to your cart.${r.unavailable.length ? ` Unavailable: ${r.unavailable.join(", ")}.` : ""}${r.priceChanged.length ? ` Prices changed for: ${r.priceChanged.join(", ")}.` : ""}`,
                          );
                        }}
                      >
                        Order these again
                      </Button>
                    </article>
                  ))}
                </div>
              ) : (
                <Empty
                  title="No orders yet"
                  body="Your completed checkout will appear here."
                  action="Start shopping"
                />
              )}
            </section>
          )}
          {section === "favourites" && (
            <section>
              <h2 className="text-xl font-semibold">Saved favourites</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Your handy list of go-to groceries.
              </p>
              {s.favourites.length ? (
                <div className="divide-y rounded-2xl border bg-card">
                  {s.favourites
                    .map((id) => s.products.find((p) => p.id === id))
                    .filter(Boolean)
                    .map((product) => (
                      <div key={product!.id} className="flex flex-wrap items-center gap-3 p-4">
                        <span className="grid size-12 place-items-center rounded-xl bg-muted text-2xl">
                          {product!.emoji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{product!.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatM(product!.promoPrice ?? product!.price)} / {product!.unit}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="min-h-11"
                          onClick={() => s.addToCart(product!)}
                        >
                          Add
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-11 shrink-0"
                          aria-label={`Remove ${product!.name} from favourites`}
                          onClick={() => s.toggleFavourite(product!.id)}
                        >
                          <Heart className="size-4 fill-current text-primary" />
                        </Button>
                      </div>
                    ))}
                </div>
              ) : (
                <Empty
                  title="No favourites saved"
                  body="Tap the heart on a product to keep it here."
                  action="Browse groceries"
                />
              )}
            </section>
          )}
          {section === "preferences" && (
            <section className="max-w-2xl">
              <h2 className="text-xl font-semibold">Updates and reminders</h2>
              <p className="mb-5 text-sm text-muted-foreground">
                Choose the messages that are useful to you.
              </p>
              <div className="divide-y rounded-2xl border bg-card">
                {s.notificationPreferences.map((item) => (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-center justify-between gap-4 p-4"
                  >
                    <span>
                      <span className="block font-medium">{item.label}</span>
                      <span className="text-sm text-muted-foreground">{item.description}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={() => s.toggleNotification(item.id)}
                      className="size-5 accent-primary"
                    />
                  </label>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Preferences are saved with your account. Message delivery depends on the services
                enabled by the store.
              </p>
            </section>
          )}
        </div>
      </main>
    </ResponsiveDashboardNavigation>
  );
}
function AddressBook() {
  const s = useAppStore();
  const saveAddressMutation = useMutation(api.customers.saveAddress);
  const removeAddressMutation = useMutation(api.customers.removeAddress);
  const [editing, setEditing] = useState<DeliveryAddress>({
    area: s.shop.defaultDeliveryArea,
    address: "",
    label: "Home",
  });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string>();
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await saveAddressMutation({
        ...(editing.id ? { addressId: editing.id as Id<"customerAddresses"> } : {}),
        label: editing.label ?? "Address",
        area: editing.area,
        address: editing.address,
        ...(editing.landmark ? { landmark: editing.landmark } : {}),
        ...(editing.instructions ? { instructions: editing.instructions } : {}),
        ...(editing.lat === undefined || editing.lng === undefined
          ? {}
          : { latitude: editing.lat, longitude: editing.lng }),
      });
      setEditing({ area: s.shop.defaultDeliveryArea, address: "", label: "Home" });
      setNotice("Address saved.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not save the address. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  const remove = async (id: string) => {
    setError("");
    setNotice("");
    setRemovingId(id);
    try {
      await removeAddressMutation({ addressId: id as Id<"customerAddresses"> });
      setNotice("Address removed.");
      if (editing.id === id)
        setEditing({ area: s.shop.defaultDeliveryArea, address: "", label: "Home" });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not remove the address. Please try again.",
      );
    } finally {
      setRemovingId(undefined);
    }
  };
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Saved addresses</h2>
        <p className="text-sm text-muted-foreground">
          Use familiar landmarks and directions to help your driver.
        </p>
      </div>
      {notice && (
        <p role="status" className="mb-3 text-sm text-primary">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mb-5 space-y-3">
        {s.savedAddresses.map((a) => (
          <div
            key={a.id}
            className="flex flex-wrap items-start gap-3 rounded-xl border bg-card p-4"
          >
            <MapPin className="mt-0.5 size-4 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{a.label || "Address"}</p>
              <p className="text-sm">
                {a.address}, {a.area}
              </p>
              {a.landmark && <p className="text-sm text-muted-foreground">Near {a.landmark}</p>}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-11 shrink-0"
              aria-label={`Remove ${a.label ?? "address"}`}
              disabled={removingId === a.id}
              onClick={() => void remove(a.id!)}
            >
              <Trash2 className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => {
                setEditing(a);
                setNotice("");
                setError("");
              }}
            >
              Edit
            </Button>
          </div>
        ))}
      </div>
      <form
        onSubmit={save}
        className="grid max-w-2xl gap-3 rounded-2xl bg-muted/50 p-4 sm:grid-cols-2"
      >
        <h3 className="font-semibold sm:col-span-2">
          {editing.id ? "Edit address" : "Add an address"}
        </h3>
        <Input
          aria-label="Address label"
          placeholder="Label, e.g. Home"
          className="min-h-11"
          value={editing.label ?? ""}
          onChange={(e) => setEditing({ ...editing, label: e.target.value })}
        />
        <select
          aria-label="Delivery area"
          className="min-h-11 rounded-lg border bg-background px-3"
          value={editing.area}
          onChange={(e) => setEditing({ ...editing, area: e.target.value })}
        >
          {s.shop.deliveryAreas.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <Input
          required
          aria-label="House or street"
          autoComplete="street-address"
          placeholder="House / street / place name"
          className="min-h-11"
          value={editing.address}
          onChange={(e) => setEditing({ ...editing, address: e.target.value })}
        />
        <Input
          aria-label="Landmark"
          placeholder="Nearby landmark"
          className="min-h-11"
          value={editing.landmark ?? ""}
          onChange={(e) => setEditing({ ...editing, landmark: e.target.value })}
        />
        <Input
          aria-label="Driver directions"
          placeholder="Directions for driver (optional)"
          className="min-h-11"
          value={editing.instructions ?? ""}
          onChange={(e) => setEditing({ ...editing, instructions: e.target.value })}
        />
        <Button className="min-h-11 sm:col-span-2" disabled={saving}>
          {saving ? "Saving…" : "Save address"}
        </Button>
      </form>
    </section>
  );
}
function Empty({ title, body, action }: { title: string; body: string; action: string }) {
  return (
    <div className="rounded-2xl border border-dashed p-10 text-center">
      <ShoppingBag className="mx-auto size-8 text-muted-foreground" />
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      <Link
        to="/shop"
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary"
      >
        {action}
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}
