import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useMutation } from "convex/react";
import { Check, ChevronLeft, ChevronRight, LoaderCircle, MapPin, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationPicker } from "@/components/delivery/LocationPicker";
import { groupCartByStore, useAppStore } from "@/lib/app-store";
import { formatM, unitLabel } from "@/lib/format";
import type { DeliveryAddress, Payment, PaymentMethod } from "@/lib/types";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type Method = PaymentMethod;
type CheckoutInput = {
  checkoutId: string;
  customer: { name: string; phone: string; email: string };
  address: DeliveryAddress;
  payment: Payment;
  couponCode?: string;
};

const PENDING_CHECKOUT_STORAGE_KEY = "reetapele.pending-checkout";
type PendingCheckout = { checkoutId: string; cartFingerprint: string };

function checkoutErrorMessage(reason: unknown) {
  const raw = reason instanceof Error ? reason.message : "";
  if (/sign in or create a customer account before placing your order/i.test(raw)) {
    return "Please sign in or create a customer account before placing your order.";
  }
  if (/sign in with the email address entered for this checkout/i.test(raw)) {
    return "Your checkout email must match your account email. Update the email in delivery details or sign in with the matching account.";
  }

  const errorStart = raw.search(/Uncaught (?:ConvexError|Error):/i);
  if (errorStart >= 0) {
    const messageStart = raw.indexOf(":", errorStart) + 1;
    const message = raw
      .slice(messageStart)
      .split(/\s+at handler\b|\s+Called by client\b/)[0]
      ?.trim();
    if (message) return message;
  }

  if (raw && !/\[CONVEX|Request ID:|Called by client|at handler/i.test(raw)) return raw;
  return "We couldn't place your order. Please check your details and try again.";
}

function pendingCheckoutFor(cartFingerprint: string, current?: PendingCheckout): PendingCheckout {
  if (current?.cartFingerprint === cartFingerprint) return current;
  try {
    const saved: unknown = JSON.parse(
      sessionStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY) ?? "null",
    );
    if (
      saved &&
      typeof saved === "object" &&
      "checkoutId" in saved &&
      typeof saved.checkoutId === "string" &&
      saved.checkoutId.length >= 12 &&
      "cartFingerprint" in saved &&
      saved.cartFingerprint === cartFingerprint
    ) {
      return { checkoutId: saved.checkoutId, cartFingerprint };
    }
  } catch {
    // Storage may be unavailable; the in-memory key still protects retries
    // while this checkout page remains open.
  }
  const pending = { checkoutId: crypto.randomUUID(), cartFingerprint };
  try {
    sessionStorage.setItem(PENDING_CHECKOUT_STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // Keep the generated key in memory for the current page session.
  }
  return pending;
}

function CustomerAccountGate({ email, onCancel }: { email: string; onCancel: () => void }) {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [flow, setFlow] = useState<"signUp" | "signIn">("signUp");
  const [verificationPending, setVerificationPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const formData = new FormData(event.currentTarget);
      formData.set("flow", flow);
      const result = await signIn("password", formData);
      if (!result.signingIn) {
        setVerificationPending(true);
        setMessage(
          "We sent a verification code to your email. Enter it below to finish creating your account.",
        );
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not complete account access.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const formData = new FormData(event.currentTarget);
      formData.set("flow", "email-verification");
      await signIn("password", formData);
      setVerificationPending(false);
      setMessage("Email verified. Your account is ready; place your order to continue.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not verify your email code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-5 rounded-2xl border bg-card p-4 sm:p-5">
      <h2 className="text-xl font-semibold">
        {isAuthenticated
          ? "Account ready"
          : verificationPending
            ? "Verify your email"
            : flow === "signUp"
              ? "Create your customer account"
              : "Sign in to your customer account"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        An account is required to place an order. Your cart and checkout details will stay here.
      </p>
      {isAuthenticated ? (
        <p role="status" className="mt-4 rounded-xl bg-primary/10 p-3 text-sm">
          {message || "Your account is ready. Place your order to continue."}
        </p>
      ) : verificationPending ? (
        <form onSubmit={verifyEmail} className="mt-4 space-y-3">
          <input name="email" type="hidden" value={email} />
          <label className="block text-sm font-medium">
            Email verification code
            <Input
              name="code"
              autoComplete="one-time-code"
              inputMode="numeric"
              required
              className="mt-1.5 min-h-11 text-base"
            />
          </label>
          <Button className="min-h-11 w-full" disabled={busy}>
            {busy ? "Verifying…" : "Verify email"}
          </Button>
        </form>
      ) : (
        <form onSubmit={submitCredentials} className="mt-4 space-y-3">
          <input name="email" type="hidden" value={email} />
          <label className="block text-sm font-medium">
            {flow === "signUp" ? "Choose a password" : "Password"}
            <Input
              name="password"
              type="password"
              autoComplete={flow === "signUp" ? "new-password" : "current-password"}
              minLength={8}
              required
              className="mt-1.5 min-h-11 text-base"
            />
          </label>
          <Button className="min-h-11 w-full" disabled={busy || isLoading}>
            {busy ? "Please wait…" : flow === "signUp" ? "Create account" : "Sign in"}
          </Button>
          <button
            type="button"
            className="min-h-11 w-full text-sm font-medium text-primary hover:underline"
            onClick={() => {
              setError("");
              setFlow(flow === "signUp" ? "signIn" : "signUp");
            }}
          >
            {flow === "signUp" ? "I already have an account" : "Create a new account"}
          </button>
        </form>
      )}
      {message && !isAuthenticated && !verificationPending ? (
        <p role="status" className="mt-3 text-sm text-primary">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {!isAuthenticated ? (
        <Button type="button" variant="link" className="mt-2 h-11 px-0" onClick={onCancel}>
          Return to order review
        </Button>
      ) : null}
    </div>
  );
}

function clearPendingCheckout(checkoutId: string) {
  try {
    const saved: unknown = JSON.parse(
      sessionStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY) ?? "null",
    );
    if (
      saved &&
      typeof saved === "object" &&
      "checkoutId" in saved &&
      saved.checkoutId === checkoutId
    ) {
      sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
    }
  } catch {
    // Clearing an unavailable or malformed storage entry is best effort.
  }
}

export function CheckoutWizard() {
  return <ConvexCheckoutWizard />;
}

function ConvexCheckoutWizard() {
  const s = useAppStore();
  const placeGuestOrder = useMutation(api.orders.placeGuestOrder);
  return (
    <CheckoutWizardForm
      submitOrder={async ({ checkoutId, customer, address, payment, couponCode }) => {
        const receipt = await placeGuestOrder({
          checkoutId,
          customer,
          destination: {
            area: address.area,
            address: address.address || address.landmark || "",
            ...(address.landmark === undefined ? {} : { landmark: address.landmark }),
            ...(address.instructions === undefined ? {} : { instructions: address.instructions }),
            ...(address.lat === undefined ? {} : { latitude: address.lat }),
            ...(address.lng === undefined ? {} : { longitude: address.lng }),
          },
          paymentMethod: payment.method,
          ...(couponCode ? { couponCode } : {}),
          ...(payment.cashGiven === undefined ? {} : { cashGiven: payment.cashGiven }),
          ...(payment.exactAmount === undefined ? {} : { exactAmount: payment.exactAmount }),
          items: s.cart.map((item) => ({
            productId: item.productId as Id<"products">,
            quantity: item.quantity,
          })),
        });
        s.recordConvexCheckout({
          checkoutId: receipt.checkoutId,
          customer,
          address,
          payment: { ...payment, changeRequired: receipt.changeRequired },
          orders: receipt.orders.map((order) => ({
            ...order,
            orderId: String(order.orderId),
            storeId: String(order.storeId),
            items: order.items.map((item) => ({ ...item, productId: String(item.productId) })),
          })),
        });
        return receipt.checkoutId;
      }}
    />
  );
}

function CheckoutWizardForm({
  submitOrder,
}: {
  submitOrder: (input: CheckoutInput) => Promise<string>;
}) {
  const s = useAppStore();
  const groups = groupCartByStore(s.cart, s.stores.length ? s.stores : [s.shop]);
  const navigate = useNavigate();
  const { isAuthenticated } = useConvexAuth();
  const [step, setStep] = useState(0);
  const [accountStep, setAccountStep] = useState(false);
  const checkoutId = useRef<PendingCheckout | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [addressId, setAddressId] = useState(s.savedAddresses[0]?.id ?? "new");
  const [address, setAddress] = useState<DeliveryAddress>(
    s.savedAddresses[0] ?? { area: s.deliveryArea, address: "" },
  );
  const [landmarkSearch, setLandmarkSearch] = useState("");
  const [name, setName] = useState(s.account.name);
  const [phone, setPhone] = useState(s.account.phone);
  const [email, setEmail] = useState(s.account.email ?? "");
  const [method, setMethod] = useState<Method>(
    groups.length > 0 && groups.every((group) => group.store.paymentOptions.cashOnDelivery)
      ? "cash_on_delivery"
      : groups.length > 0 && groups.every((group) => group.store.paymentOptions.mobileMoney)
        ? "mobile_money"
        : "card",
  );
  const [provider, setProvider] = useState("EcoCash");
  const [cashGiven, setCashGiven] = useState("");
  const [saveAddress, setSaveAddress] = useState(false);
  const [error, setError] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string>();
  const deliveryTotal = groups.reduce((sum, group) => sum + group.store.deliveryFee, 0);
  const activeCoupon = appliedCoupon?.trim().toUpperCase();
  const today = new Date().toISOString().slice(0, 10);
  const couponDiscount = activeCoupon
    ? groups.reduce((sum, group) => {
        const coupon = s.promotions.find(
          (promotion) =>
            promotion.storeId === group.store.id &&
            promotion.type === "coupon" &&
            promotion.active &&
            promotion.code?.trim().toUpperCase() === activeCoupon &&
            promotion.startDate <= today &&
            promotion.endDate >= today,
        );
        return sum + (coupon ? Math.min(group.subtotal, coupon.value) : 0);
      }, 0)
    : 0;
  const total = Math.max(0, Number((s.cartSubtotal + deliveryTotal - couponDiscount).toFixed(2)));
  const minimumIssues = groups.filter((group) => group.subtotal < group.store.minimumOrder);
  const deliveryAreas = groups.length
    ? groups[0]!.store.deliveryAreas.filter((area) =>
        groups.every((group) => group.store.deliveryAreas.includes(area)),
      )
    : s.shop.deliveryAreas;
  const available = s.cart.map((i) => ({
    item: i,
    product: s.products.find((p) => p.id === i.productId),
  }));
  const unavailable = available.filter(
    (x) =>
      !x.product ||
      !x.product.available ||
      x.product.stock <= 0 ||
      x.item.quantity > x.product.stock,
  );
  const chosenAddress =
    addressId === "new" ? address : (s.savedAddresses.find((a) => a.id === addressId) ?? address);
  const setDelivery = (next: DeliveryAddress) => {
    setAddress(next);
    setAddressId("new");
  };
  const landmarkQuery = landmarkSearch.trim().toLocaleLowerCase();
  const landmarkMatches = landmarkQuery
    ? s.deliveryLandmarks.filter((place) =>
        [place.name, ...place.aliases].some((label) =>
          label.toLocaleLowerCase().includes(landmarkQuery),
        ),
      )
    : [];
  const selectLandmark = (place: (typeof s.deliveryLandmarks)[number]) => {
    setDelivery({
      ...chosenAddress,
      area: place.area,
      address: place.name,
      landmark: undefined,
      landmarkId: place.id,
      lat: place.lat,
      lng: place.lng,
    });
    setLandmarkSearch("");
  };
  const allowed = (key: Method) =>
    key === "card"
      ? false
      : key === "mobile_money"
        ? groups.every((group) => group.store.paymentOptions.mobileMoney)
        : key === "cash_on_delivery"
          ? groups.every((group) => group.store.paymentOptions.cashOnDelivery)
          : groups.every((group) => group.store.paymentOptions.card);
  const hasSharedPaymentMethod = allowed("cash_on_delivery") || allowed("mobile_money");
  const continueStep = () => {
    setError("");
    if (step === 0) {
      if (!name.trim() || !phone.trim()) {
        setError("Add your name and phone number.");
        return;
      }
      const normalizedPhone = phone.trim().replace(/[\s()-]/g, "");
      if (!/^\+?[0-9]{8,15}$/.test(normalizedPhone)) {
        setError("Enter a valid phone number so the store can contact you about delivery.");
        return;
      }
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError("Enter a valid email address to create or sign in to your customer account.");
        return;
      }
      if (!deliveryAreas.length) {
        setError(
          "The stores in this cart have no shared delivery area. Remove items from a store or contact the stores for help.",
        );
        return;
      }
      if (
        !chosenAddress.area ||
        (!chosenAddress.address.trim() && !chosenAddress.landmark?.trim())
      ) {
        setError(
          "Choose a delivery area and enter a familiar place name, landmark, or delivery description.",
        );
        return;
      }
      if (!deliveryAreas.includes(chosenAddress.area)) {
        setError("At least one store in your cart does not deliver to that area.");
        return;
      }
    }
    if (step === 1) {
      if (!hasSharedPaymentMethod) {
        setError(
          "The stores in this cart do not share a payment method. Remove items from one store or contact the stores for help.",
        );
        return;
      }
      if (!allowed(method)) {
        setError("Choose a payment option accepted by every store in your cart.");
        return;
      }
      if (method === "cash_on_delivery" && cashGiven && Number(cashGiven) < total) {
        setError("Cash available must cover the order total.");
        return;
      }
    }
    setStep(Math.min(2, step + 1));
  };
  const place = async () => {
    setError("");
    if (!isAuthenticated) {
      setAccountStep(true);
      return;
    }
    if (s.cart.length === 0) {
      setError("Your cart is empty.");
      return;
    }
    if (minimumIssues.length) {
      setError(
        minimumIssues
          .map(
            ({ store, subtotal }) =>
              `${store.name} requires ${formatM(store.minimumOrder)} minimum; add ${formatM(store.minimumOrder - subtotal)}.`,
          )
          .join(" "),
      );
      return;
    }
    if (unavailable.length) {
      setError(
        `Please remove unavailable or over-stock items: ${unavailable.map((x) => x.item.name).join(", ")}.`,
      );
      return;
    }
    const payment = {
      method,
      provider: method === "mobile_money" ? provider : undefined,
      status: method === "cash_on_delivery" ? ("unpaid" as const) : ("pending" as const),
      cashGiven: method === "cash_on_delivery" && cashGiven ? Number(cashGiven) : undefined,
      exactAmount: method === "cash_on_delivery" ? cashGiven === "" : undefined,
      changeRequired:
        method === "cash_on_delivery" && cashGiven
          ? Number((Number(cashGiven) - total).toFixed(2))
          : undefined,
    };
    const finalAddress = { ...chosenAddress };
    setSubmitting(true);
    try {
      const cartFingerprint = JSON.stringify(
        s.cart
          .map((item) => [item.productId, item.quantity] as const)
          .sort(([a], [b]) => a.localeCompare(b)),
      );
      checkoutId.current = pendingCheckoutFor(cartFingerprint, checkoutId.current);
      const receiptId = await submitOrder({
        checkoutId: checkoutId.current.checkoutId,
        customer: { name: name.trim(), phone: phone.trim(), email: email.trim() },
        address: finalAddress,
        payment,
        ...(activeCoupon ? { couponCode: activeCoupon } : {}),
      });
      if (
        saveAddress &&
        s.account.signedIn &&
        (finalAddress.address.trim() || finalAddress.landmark?.trim())
      )
        s.saveAddress({
          ...finalAddress,
          id: finalAddress.id ?? crypto.randomUUID(),
          label: finalAddress.label || "Home",
        });
      clearPendingCheckout(checkoutId.current.checkoutId);
      checkoutId.current = undefined;
      void navigate({ to: "/order-confirmation/$id", params: { id: receiptId } });
    } catch (placeError) {
      setError(checkoutErrorMessage(placeError));
    } finally {
      setSubmitting(false);
    }
  };
  if (s.cart.length === 0)
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <ShoppingBag className="mx-auto size-10 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Add a few groceries to get started.</p>
        <Link to="/shop">
          <Button className="mt-5">Browse groceries</Button>
        </Link>
      </main>
    );
  return (
    <main className="mx-auto max-w-6xl px-4 py-5 sm:py-7 md:px-8 md:py-10">
      <div className="mb-6">
        <Link
          to="/cart"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ChevronLeft className="size-4" />
          Back to cart
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Checkout</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Check delivery, payment, and per-store totals before placing your order.
        </p>
      </div>
      <ol aria-label="Checkout progress" className="mb-6 grid grid-cols-3 sm:mb-8">
        {["Delivery", "Payment", "Review"].map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? "step" : undefined}
            className={`border-b-2 pb-3 text-xs font-semibold sm:text-sm ${i <= step ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
          >
            <span className="mr-2 inline-grid size-6 place-items-center rounded-full bg-muted text-xs">
              {i < step ? <Check className="size-4" /> : i + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0">
          {step === 0 && (
            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold">Who is receiving the order?</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    Full name
                    <Input
                      required
                      autoComplete="name"
                      className="mt-1.5 min-h-11"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Phone number
                    <Input
                      required
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      className="mt-1.5 min-h-11"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </label>
                  <label className="text-sm font-medium sm:col-span-2">
                    Email address (required for your account)
                    <Input
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      required
                      className="mt-1.5 min-h-11"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                </div>
              </section>
              <section>
                <h2 className="text-xl font-semibold">Where should we deliver?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use a familiar place name, even if the business has closed. Street numbers aren’t
                  needed; the location pin is optional.
                </p>
                {s.deliveryLandmarks.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <label htmlFor="known-place-search" className="text-sm font-medium">
                      Search known local places
                    </label>
                    <Input
                      id="known-place-search"
                      className="h-11 rounded-xl"
                      value={landmarkSearch}
                      onChange={(e) => setLandmarkSearch(e.target.value)}
                      placeholder="Try a common or former place name"
                      autoComplete="off"
                    />
                    <p className="text-xs text-muted-foreground">
                      These names and pins were checked by the delivery team. Add directions below
                      if your door is near the selected place.
                    </p>
                    {landmarkQuery && (
                      <ul
                        className="max-h-56 divide-y overflow-auto rounded-xl border bg-card"
                        aria-label="Matching known places"
                      >
                        {landmarkMatches.length ? (
                          landmarkMatches.map((place) => (
                            <li key={place.id}>
                              <button
                                type="button"
                                onClick={() => selectLandmark(place)}
                                className="w-full px-3 py-2.5 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <span className="block font-semibold">{place.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  {place.area}
                                  {place.aliases.length
                                    ? ` · Also known as ${place.aliases.join(", ")}`
                                    : ""}
                                </span>
                              </button>
                            </li>
                          ))
                        ) : (
                          <li className="px-3 py-3 text-sm text-muted-foreground">
                            No saved place matches. You can enter the name and directions below.
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                )}
                {s.savedAddresses.length > 0 && (
                  <div className="my-4 flex flex-wrap gap-2">
                    {s.savedAddresses.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setAddressId(a.id ?? "new")}
                        className={`min-h-11 rounded-xl border px-3 py-2 text-sm ${addressId === a.id ? "border-primary bg-emerald-50 text-primary" : "bg-card"}`}
                      >
                        <MapPin className="mr-1 inline size-3.5" />
                        {a.label || a.area}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setAddressId("new");
                        setAddress({ area: s.deliveryArea, address: "" });
                      }}
                      className={`min-h-11 rounded-xl border px-3 py-2 text-sm ${addressId === "new" ? "border-primary bg-emerald-50 text-primary" : "bg-card"}`}
                    >
                      + New address
                    </button>
                  </div>
                )}
                {!deliveryAreas.length ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-warning/40 bg-warning/15 p-4 text-sm"
                  >
                    <p className="font-semibold">These stores do not share a delivery area.</p>
                    <p className="mt-1 text-muted-foreground">
                      Review your basket and choose stores that deliver to the same area to place
                      one checkout.
                    </p>
                    <Link
                      to="/cart"
                      className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
                    >
                      Review basket
                    </Link>
                  </div>
                ) : addressId === "new" ? (
                  <LocationPicker value={address} areas={deliveryAreas} onChange={setDelivery} />
                ) : (
                  <div className="rounded-xl border bg-card p-4">
                    <p className="font-semibold">{chosenAddress.address}</p>
                    <p className="text-sm text-muted-foreground">
                      {chosenAddress.area}
                      {chosenAddress.landmark ? ` · Near ${chosenAddress.landmark}` : ""}
                    </p>
                    <Button
                      className="mt-3 min-h-11"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAddress(chosenAddress);
                        setAddressId("new");
                      }}
                    >
                      Edit address
                    </Button>
                  </div>
                )}
                {s.account.signedIn && (
                  <label className="mt-4 flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={(e) => setSaveAddress(e.target.checked)}
                      className="size-4 accent-primary"
                    />
                    Save this address for next time
                  </label>
                )}
              </section>
            </div>
          )}
          {step === 1 && (
            <section>
              <h2 className="text-xl font-semibold">How would you like to pay?</h2>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">
                Select an option accepted by every store in your cart.
              </p>
              <div className="space-y-3">
                {(
                  [
                    [
                      "cash_on_delivery",
                      "Cash on delivery",
                      "Pay your driver when the order arrives.",
                    ],
                    [
                      "mobile_money",
                      "Mobile money",
                      "Arrange a separate transfer with each store.",
                    ],
                    ["card", "Card", "Card processing is not configured yet."],
                  ] as [Method, string, string][]
                )
                  .filter(([key]) => allowed(key))
                  .map(([key, title, desc]) => (
                    <label
                      key={key}
                      className={`block min-h-16 cursor-pointer rounded-2xl border p-4 ${method === key ? "border-primary bg-emerald-50/60" : "bg-card"}`}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="payment"
                          checked={method === key}
                          onChange={() => setMethod(key)}
                          className="accent-primary"
                        />
                        <span>
                          <span className="block font-semibold">{title}</span>
                          <span className="text-sm text-muted-foreground">{desc}</span>
                        </span>
                      </span>
                    </label>
                  ))}
              </div>
              {!hasSharedPaymentMethod && (
                <p role="alert" className="mt-4 rounded-xl bg-warning/15 p-3 text-sm">
                  These stores do not share an available payment method for one checkout. Remove
                  items from one store or contact the stores for help.
                </p>
              )}
              {method === "mobile_money" && (
                <div className="mt-4 space-y-3">
                  <label className="block text-sm font-medium">
                    Mobile money provider
                    <select
                      className="mt-1.5 h-11 w-full rounded-xl border bg-background px-3"
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                    >
                      <option>EcoCash</option>
                      <option>M-Pesa</option>
                      <option>Other mobile money</option>
                    </select>
                  </label>
                  <div className="rounded-xl border bg-card p-4">
                    <p className="text-sm font-semibold">
                      Confirm transfer details with each store
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Payments are arranged outside REETAPELE. Ask each store for its correct
                      transfer number before sending money.
                    </p>
                    <ul className="mt-3 divide-y">
                      {groups.map((group) => (
                        <li
                          key={group.store.id}
                          className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                        >
                          <span className="font-medium">{group.store.name}</span>
                          <span className="flex gap-3">
                            <a
                              className="inline-flex min-h-11 items-center px-2 font-semibold text-primary underline"
                              href={`tel:${group.store.phone.replace(/\s/g, "")}`}
                            >
                              Call
                            </a>
                            {group.store.whatsapp && (
                              <a
                                className="inline-flex min-h-11 items-center px-2 font-semibold text-primary underline"
                                href={`https://wa.me/${group.store.whatsapp.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                WhatsApp
                              </a>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {method === "cash_on_delivery" && (
                <>
                  <label className="mt-4 block text-sm font-medium">
                    Cash amount (optional)
                    <Input
                      className="mt-1.5 min-h-11 max-w-xs"
                      type="number"
                      min={total}
                      step="0.01"
                      inputMode="decimal"
                      placeholder="Leave blank for exact amount"
                      value={cashGiven}
                      onChange={(e) => setCashGiven(e.target.value)}
                    />
                  </label>
                  {cashGiven && Number(cashGiven) >= total && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Your driver should bring {formatM(Number(cashGiven) - total)} change.
                    </p>
                  )}
                </>
              )}
              <p className="mt-4 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                {method === "mobile_money"
                  ? "Payment stays pending until the store confirms your mobile money transfer."
                  : method === "cash_on_delivery"
                    ? "Your driver collects payment at delivery. No online payment is taken."
                    : "Card payments are not configured; this order will remain pending until the store confirms payment."}
              </p>
            </section>
          )}
          {step === 2 && (
            <section>
              {accountStep && (
                <CustomerAccountGate email={email.trim()} onCancel={() => setAccountStep(false)} />
              )}
              <h2 className="text-xl font-semibold">Check your order</h2>
              <div className="mt-4 rounded-2xl border bg-card p-4">
                <label htmlFor="checkout-coupon" className="text-sm font-semibold">
                  Store coupon code
                </label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="checkout-coupon"
                    className="min-h-11"
                    value={couponInput}
                    onChange={(event) => setCouponInput(event.target.value)}
                    placeholder="Enter a store coupon"
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 sm:shrink-0"
                    onClick={() => {
                      const code = couponInput.trim().toUpperCase();
                      const matches = groups.some((group) =>
                        s.promotions.some(
                          (promotion) =>
                            promotion.storeId === group.store.id &&
                            promotion.type === "coupon" &&
                            promotion.active &&
                            promotion.code?.trim().toUpperCase() === code &&
                            promotion.startDate <= today &&
                            promotion.endDate >= today,
                        ),
                      );
                      if (!code || !matches) {
                        setAppliedCoupon(undefined);
                        setError(
                          "That coupon is invalid, expired, or not available for products in your cart.",
                        );
                        return;
                      }
                      setError("");
                      setAppliedCoupon(code);
                    }}
                  >
                    Apply
                  </Button>
                  {appliedCoupon && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-11 sm:shrink-0"
                      onClick={() => {
                        setAppliedCoupon(undefined);
                        setCouponInput("");
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                {appliedCoupon && (
                  <p className="mt-2 text-sm text-primary">
                    {appliedCoupon} applied · You save {formatM(couponDiscount)} on eligible store
                    orders.
                  </p>
                )}
              </div>
              <div className="mt-4 rounded-2xl border bg-card p-5">
                <h3 className="font-semibold">Delivery</h3>
                <p className="mt-1">
                  {name} · {phone}
                </p>
                <p className="text-sm text-muted-foreground">
                  {chosenAddress.address}, {chosenAddress.area}
                </p>
                {chosenAddress.landmark && (
                  <p className="text-sm text-muted-foreground">Near {chosenAddress.landmark}</p>
                )}
                {chosenAddress.instructions && (
                  <p className="text-sm text-muted-foreground">
                    Driver directions: {chosenAddress.instructions}
                  </p>
                )}
                <Button variant="link" className="h-auto px-0 py-2" onClick={() => setStep(0)}>
                  Change delivery details
                </Button>
                <div className="mt-3 border-t pt-3">
                  <h3 className="font-semibold">Payment</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {method === "mobile_money"
                      ? `${provider} · payment pending`
                      : method === "cash_on_delivery"
                        ? `Cash on delivery${cashGiven ? ` · bring ${formatM(Number(cashGiven))}${Number(cashGiven) > total ? ` · change ${formatM(Number(cashGiven) - total)}` : ""}` : " · exact amount if possible"}`
                        : "Card · pending"}
                  </p>
                  <Button variant="link" className="h-auto px-0 py-2" onClick={() => setStep(1)}>
                    Change payment
                  </Button>
                </div>
              </div>
              {unavailable.length > 0 && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
                >
                  Review stock for: {unavailable.map((x) => x.item.name).join(", ")}.
                </p>
              )}
            </section>
          )}
          {error && (
            <p
              role="alert"
              className="mt-5 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 mt-6 flex flex-col-reverse gap-3 border-t bg-background/95 py-3 backdrop-blur sm:static sm:flex-row sm:justify-between sm:border-0 sm:bg-transparent sm:py-0 sm:backdrop-blur-none">
            {step > 0 ? (
              <Button
                variant="outline"
                className="min-h-12 w-full sm:w-auto"
                onClick={() => {
                  setError("");
                  setStep(step - 1);
                }}
              >
                <ChevronLeft className="size-4" />
                Back
              </Button>
            ) : (
              <span />
            )}
            {step < 2 ? (
              <Button className="min-h-12 w-full sm:w-auto" onClick={continueStep}>
                Continue
                <ChevronRight className="size-4" />
              </Button>
            ) : !accountStep || isAuthenticated ? (
              <Button
                className="min-h-12 w-full sm:w-auto"
                onClick={() => void place()}
                disabled={submitting}
                aria-busy={submitting}
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                    Placing order…
                  </>
                ) : !isAuthenticated ? (
                  "Create account to place order"
                ) : (
                  `Place order · ${formatM(total)}`
                )}
              </Button>
            ) : null}
          </div>
        </section>
        <aside className="h-fit rounded-2xl border bg-card p-5 lg:sticky lg:top-6">
          <h2 className="text-lg font-semibold">Your marketplace checkout</h2>
          {groups.map((group) => (
            <section key={group.store.id} className="mt-4">
              <h3 className="text-sm font-semibold">{group.store.name}</h3>
              <ul className="divide-y">
                {group.items.map((item) => (
                  <li key={item.productId} className="flex justify-between gap-3 py-3 text-sm">
                    <span>
                      {item.quantity} × {item.name}
                      <span className="block text-xs text-muted-foreground">
                        {unitLabel(item.unit)}
                      </span>
                    </span>
                    <span className="font-semibold">{formatM(item.unitPrice * item.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between border-t pt-2 text-xs text-muted-foreground">
                <span>Delivery from {group.store.name}</span>
                <span>{formatM(group.store.deliveryFee)}</span>
              </div>
            </section>
          ))}
          <div className="space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatM(s.cartSubtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total delivery</span>
              <span>{formatM(deliveryTotal)}</span>
            </div>
            {couponDiscount > 0 && (
              <div className="flex justify-between text-primary">
                <span>Coupon savings</span>
                <span>−{formatM(couponDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-3 text-base font-bold">
              <span>Total</span>
              <span>{formatM(total)}</span>
            </div>
          </div>
          <p className="mt-4 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
            {minimumIssues.length
              ? minimumIssues
                  .map(
                    (group) => `${group.store.name}: ${formatM(group.store.minimumOrder)} minimum`,
                  )
                  .join(" · ")
              : `Delivery to ${chosenAddress.area || s.deliveryArea}. ${groups.length} store${groups.length === 1 ? "" : "s"} will fulfill this checkout.`}
          </p>
        </aside>
      </div>
    </main>
  );
}
