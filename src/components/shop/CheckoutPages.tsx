import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  LocateFixed,
  Trash2,
  ShoppingBasket,
  Smartphone,
  Banknote,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore, MOBILE_MONEY_PROVIDERS, PAYMENT_LABEL } from "@/lib/app-store";
import { activePromotion } from "@/lib/commerce";
import { formatM, unitLabel } from "@/lib/format";
import type { DeliveryAddress, PaymentMethod } from "@/lib/types";
import { QuantityStepper } from "@/components/store/QuantityStepper";
import { A, Empty, Field, Summary, ProductImage, attempt } from "./shared";
export function CartPage() {
  const s = useAppStore();
  const [code, setCode] = useState(s.coupon);
  if (!s.cart.length)
    return (
      <Empty
        title="Your basket is waiting"
        text="Fresh picks and everyday favourites are just an aisle away."
      />
    );
  return (
    <>
      <div className="page-heading">
        <A to="/shop" className="back">
          <ArrowLeft size={17} />
          Continue shopping
        </A>
        <h1>
          Your basket <span className="muted">({s.cartCount})</span>
        </h1>
        <p>A little local goodness, ready to go.</p>
      </div>
      <div className="checkout-layout">
        <div>
          <div className="cart-list">
            {s.cart.map((i) => {
              const p = s.products.find((p) => p.id === i.productId);
              return (
                <article className="cart-row" key={i.id}>
                  {p ? (
                    <A to={`/product/${p.id}`}>
                      <ProductImage product={p} />
                    </A>
                  ) : (
                    <ShoppingBasket />
                  )}
                  <div>
                    <h3>{i.name}</h3>
                    <p>
                      {formatM(i.unitPrice)} {unitLabel(i.unit)}
                    </p>
                    <QuantityStepper
                      value={i.quantity}
                      step={i.soldByWeight ? 0.5 : 1}
                      suffix={i.soldByWeight ? i.unit : ""}
                      onChange={(q) => attempt(() => s.setCartQuantity(i.productId, q))}
                    />
                  </div>
                  <div className="cart-row-total">
                    <strong>{formatM(i.quantity * i.unitPrice)}</strong>
                    <button
                      className="icon-button"
                      aria-label={`Remove ${i.name}`}
                      onClick={() => attempt(() => s.removeFromCart(i.productId))}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <button className="text-button" onClick={() => attempt(s.clearCart)}>
            Clear basket
          </button>
          <form
            className="coupon-form"
            onSubmit={(e) => {
              e.preventDefault();
              const valid = s.promotions.some(
                (p) =>
                  p.type === "coupon" &&
                  activePromotion(p) &&
                  p.code?.toUpperCase() === code.trim().toUpperCase() &&
                  s.cartSubtotal >= (p.minimumSpend ?? 0),
              );
              if (!valid) {
                toast.error("That code is unavailable or its minimum spend has not been met.");
                return;
              }
              attempt(
                () => s.setCoupon(code.trim()),
                "Coupon applied. The best eligible offer is used.",
              );
            }}
          >
            <Field
              label="Have a coupon?"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter code"
            />
            <button className="button secondary">Apply</button>
            {s.coupon && (
              <button
                type="button"
                className="text-button"
                onClick={() => attempt(() => s.setCoupon(""))}
              >
                Remove coupon
              </button>
            )}
          </form>
        </div>
        <Summary
          submit={
            <>
              {s.cartSubtotal < s.shop.minimumOrder && (
                <p className="notice">
                  Add {formatM(s.shop.minimumOrder - s.cartSubtotal)} to reach the minimum order.
                </p>
              )}
              <A to="/checkout" className="button wide">
                Checkout
                <ArrowRight size={17} />
              </A>
            </>
          }
        />
      </div>
    </>
  );
}
export function LocationSelector({
  value,
  onChange,
}: {
  value: DeliveryAddress;
  onChange: (a: DeliveryAddress) => void;
}) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="location-placeholder">
      <MapPin size={30} />
      <strong>
        {value.lat != null ? "Location added to your address" : "Help us find your door"}
      </strong>
      <p>
        {value.lat != null
          ? `${value.lat.toFixed(5)}, ${value.lng?.toFixed(5)}`
          : "Your address and nearest landmark guide our driver."}
      </p>
      <button
        type="button"
        className="button secondary"
        disabled={locating}
        onClick={() => {
          setError("");
          if (!navigator.geolocation) {
            setError("Location is unavailable. Please use your address and landmark.");
            return;
          }
          setLocating(true);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              onChange({ ...value, lat: pos.coords.latitude, lng: pos.coords.longitude });
              setLocating(false);
            },
            () => {
              setError("Could not get your location. You can continue with your address.");
              setLocating(false);
            },
            { timeout: 10000 },
          );
        }}
      >
        <LocateFixed size={17} />
        {locating ? "Finding you…" : "Use current location"}
      </button>
      {error && <p role="alert">{error}</p>}
      <small>Live maps will be available in a future version.</small>
    </div>
  );
}
export function CheckoutPage() {
  const s = useAppStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState({
    name: s.account.name,
    phone: s.account.phone,
    email: s.account.email,
  });
  const [address, setAddress] = useState<DeliveryAddress>({
    area: s.deliveryArea,
    address: "",
    landmark: "",
    instructions: "",
  });
  const [method, setMethod] = useState<PaymentMethod>(
    s.shop.paymentOptions.cashOnDelivery ? "cash_on_delivery" : "mobile_money",
  );
  const [provider, setProvider] = useState(MOBILE_MONEY_PROVIDERS[0] ?? "");
  const [exact, setExact] = useState(true);
  const [cash, setCash] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  if (!s.cart.length)
    return (
      <Empty
        title="Let’s fill your basket first"
        text="Choose your groceries, then we’ll take care of delivery."
      />
    );
  const steps = ["Your details", "Delivery", "Payment", "Review"];
  const next = () => {
    setError("");
    if (
      step === 0 &&
      (!customer.name.trim() ||
        !/^(?:\+266)?[256]\d{7}$/.test(customer.phone.replace(/[\s-]/g, "")))
    ) {
      setError(
        "Enter your full name and an 8-digit Lesotho phone number, optionally starting with +266.",
      );
      return;
    }
    if (step === 1 && (!address.address.trim() || !s.shop.deliveryAreas.includes(address.area))) {
      setError("Enter an address and choose a supported delivery area.");
      return;
    }
    if (step === 2 && method === "cash_on_delivery" && !exact && Number(cash) < s.total) {
      setError("Your cash amount must cover the total.");
      return;
    }
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  return (
    <>
      <div className="page-heading">
        <A to="/cart" className="back">
          <ArrowLeft size={17} />
          Back to basket
        </A>
        <h1>Almost at your door.</h1>
        <p>Checkout as a guest. No account needed.</p>
      </div>
      <ol className="checkout-steps">
        {steps.map((title, i) => (
          <li key={title} className={i <= step ? "active" : ""}>
            <span>{i < step ? <Check size={16} /> : i + 1}</span>
            <strong>{title}</strong>
          </li>
        ))}
      </ol>
      <div className="checkout-layout">
        <form
          className="form-panel"
          onSubmit={(e) => {
            e.preventDefault();
            if (step < 3) {
              next();
              return;
            }
            if (placing) return;
            setPlacing(true);
            try {
              const order = s.placeOrder({
                customer,
                address,
                payment: {
                  method,
                  provider,
                  status: "pending",
                  exactAmount: exact,
                  ...(!exact && method === "cash_on_delivery" ? { cashGiven: Number(cash) } : {}),
                },
              });
              navigate({ to: `/order-confirmation/${order.id}` });
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not place the order.");
              setPlacing(false);
            }
          }}
        >
          <h2>{steps[step]}</h2>
          {step === 0 && (
            <>
              <Field
                label="Full name"
                autoComplete="name"
                required
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              />
              <Field
                label="Phone number"
                type="tel"
                autoComplete="tel"
                placeholder="+266 5888 1234"
                required
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              />
              <Field
                label="Email (optional)"
                type="email"
                autoComplete="email"
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
              />
              <p className="small">We’ll use your number to coordinate delivery.</p>
            </>
          )}
          {step === 1 && (
            <>
              {s.savedAddresses.length > 0 && (
                <label className="field">
                  <span>Use a saved address</span>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const a = s.savedAddresses.find((a) => a.id === e.target.value);
                      if (a) setAddress(a);
                    }}
                  >
                    <option value="">Choose an address</option>
                    {s.savedAddresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label} · {a.address}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="field">
                <span>Delivery area</span>
                <select
                  value={address.area}
                  onChange={(e) => setAddress({ ...address, area: e.target.value })}
                >
                  {s.shop.deliveryAreas.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </label>
              <Field
                label="Street / delivery address"
                autoComplete="street-address"
                required
                value={address.address}
                onChange={(e) => setAddress({ ...address, address: e.target.value })}
              />
              <Field
                label="Nearest landmark"
                placeholder="Opposite Mabote Primary School"
                value={address.landmark ?? ""}
                onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
              />
              <label className="field">
                <span>Delivery instructions (optional)</span>
                <textarea
                  placeholder="Blue gate, second house after the shop"
                  value={address.instructions ?? ""}
                  onChange={(e) => setAddress({ ...address, instructions: e.target.value })}
                />
              </label>
              <LocationSelector value={address} onChange={setAddress} />
            </>
          )}
          {step === 2 && (
            <>
              <div className="payment-options">
                {s.shop.paymentOptions.mobileMoney && (
                  <label className={method === "mobile_money" ? "selected" : ""}>
                    <input
                      type="radio"
                      name="payment"
                      checked={method === "mobile_money"}
                      onChange={() => setMethod("mobile_money")}
                    />
                    <Smartphone />
                    <span>
                      <strong>Mobile money</strong>
                      <small>Choose your provider below</small>
                    </span>
                  </label>
                )}
                {s.shop.paymentOptions.cashOnDelivery && (
                  <label className={method === "cash_on_delivery" ? "selected" : ""}>
                    <input
                      type="radio"
                      name="payment"
                      checked={method === "cash_on_delivery"}
                      onChange={() => setMethod("cash_on_delivery")}
                    />
                    <Banknote />
                    <span>
                      <strong>Cash on delivery</strong>
                      <small>Pay when your groceries arrive</small>
                    </span>
                  </label>
                )}
                <div className="disabled-payment">
                  <CreditCard size={22} />
                  <span>
                    Card <small>Coming soon</small>
                  </span>
                </div>
              </div>
              {method === "mobile_money" ? (
                <>
                  <label className="field">
                    <span>Mobile-money provider</span>
                    <select value={provider} onChange={(e) => setProvider(e.target.value)}>
                      {MOBILE_MONEY_PROVIDERS.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                  <p className="notice">
                    Demo: no money will be collected. Your order’s payment will remain pending.
                  </p>
                </>
              ) : (
                <div className="cash-panel">
                  <h3>How much will you be paying with?</h3>
                  <div className="line">
                    <span>Order total</span>
                    <strong>{formatM(s.total)}</strong>
                  </div>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={exact}
                      onChange={(e) => setExact(e.target.checked)}
                    />
                    I have the exact amount
                  </label>
                  {!exact && (
                    <>
                      <Field
                        label="Cash amount (M)"
                        type="number"
                        required
                        min={s.total}
                        step="0.01"
                        value={cash}
                        onChange={(e) => setCash(e.target.value)}
                      />
                      <div className="line">
                        <span>Change required</span>
                        <strong>{formatM(Math.max(0, Number(cash) - s.total))}</strong>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
          {step === 3 && (
            <>
              <div className="review-section">
                <h3>Your groceries</h3>
                {s.cart.map((i) => (
                  <div className="line" key={i.id}>
                    <span>
                      {i.name} × {i.quantity}
                      {i.soldByWeight ? ` ${i.unit === "gram" ? "g" : i.unit}` : ""}
                    </span>
                    <strong>{formatM(i.unitPrice * i.quantity)}</strong>
                  </div>
                ))}
              </div>
              <div className="review-section">
                <h3>
                  Deliver to{" "}
                  <button type="button" className="text-button" onClick={() => setStep(1)}>
                    Edit
                  </button>
                </h3>
                <p>
                  {customer.name} · {customer.phone}
                </p>
                <p>
                  {address.address}, {address.area}
                </p>
                <p>{address.landmark}</p>
                <p>{address.instructions}</p>
              </div>
              <div className="review-section">
                <h3>
                  Payment{" "}
                  <button type="button" className="text-button" onClick={() => setStep(2)}>
                    Edit
                  </button>
                </h3>
                <p>
                  {PAYMENT_LABEL[method]}
                  {method === "mobile_money" ? ` · ${provider}` : ""}
                </p>
                {method === "cash_on_delivery" && (
                  <p>
                    {exact
                      ? "Exact amount"
                      : `${formatM(Number(cash))} cash · ${formatM(Number(cash) - s.total)} change`}
                  </p>
                )}
              </div>
              <p className="notice">
                This is a demonstration order stored in your browser. The shop will not receive a
                real delivery request.
              </p>
            </>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            {step > 0 && (
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setStep(step - 1);
                  setError("");
                }}
              >
                Back
              </button>
            )}
            <button className="button" disabled={placing}>
              {step === 3 ? (placing ? "Placing order…" : "Place order") : "Continue"}
              <ArrowRight size={17} />
            </button>
          </div>
        </form>
        <Summary />
      </div>
    </>
  );
}
