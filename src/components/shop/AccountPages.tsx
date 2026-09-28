import { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCheck,
  Truck,
  Phone,
  MessageCircle,
  MapPin,
  RotateCcw,
  Package,
  UserRound,
  Heart,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore, ORDER_STATUS_FLOW, ORDER_STATUS_LABEL, PAYMENT_LABEL } from "@/lib/app-store";
import { formatM, formatDate, formatTime } from "@/lib/format";
import { A, Empty, Field, Status, ProductGrid, attempt } from "./shared";
export function ConfirmationPage({ id }: { id: string }) {
  const s = useAppStore();
  const order = s.orders.find((o) => o.id === id && s.ownOrderIds.includes(id));
  if (!order)
    return (
      <Empty
        title="Order not found"
        text="Check your orders for purchases made in this browser."
        to="/orders"
        action="My orders"
      />
    );
  return (
    <section className="confirmation">
      <div className="success-mark">
        <Check size={42} />
      </div>
      <p className="eyebrow">THANK YOU FOR SHOPPING LOCAL</p>
      <h1>We’ve got your order.</h1>
      <p>Your neighbourhood favourites are one step closer.</p>
      <div className="confirmation-card">
        <div>
          <span>Order number</span>
          <strong>{order.number}</strong>
        </div>
        <div>
          <Truck />
          <span>
            <small>Estimated delivery</small>Within about 2 hours of confirmation
          </span>
        </div>
        <div>
          <Package />
          <span>
            <small>Payment method</small>
            {PAYMENT_LABEL[order.payment.method]} · pending
          </span>
        </div>
        <div>
          <MapPin />
          <span>
            <small>Delivery location</small>
            {order.address.address}, {order.address.area}
          </span>
        </div>
        <div className="line">
          <span>Total</span>
          <strong>{formatM(order.total)}</strong>
        </div>
      </div>
      <A to={`/orders/${order.id}`} className="button wide">
        Track your order
        <ArrowRight size={18} />
      </A>
      <A to="/shop" className="button secondary wide">
        Continue shopping
      </A>
      <p className="small">Demo order saved in this browser.</p>
    </section>
  );
}
export function OrdersPage() {
  const s = useAppStore();
  const [tab, setTab] = useState("current");
  const orders = s.orders.filter(
    (o) =>
      s.ownOrderIds.includes(o.id) &&
      (tab === "past") === ["delivered", "cancelled"].includes(o.status),
  );
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">YOUR LOCAL SHOP, ALWAYS CLOSE</p>
        <h1>Your orders</h1>
        <p>Follow your delivery or fill your basket with favourites again.</p>
      </div>
      <div className="tabs">
        <button className={tab === "current" ? "selected" : ""} onClick={() => setTab("current")}>
          Current orders
        </button>
        <button className={tab === "past" ? "selected" : ""} onClick={() => setTab("past")}>
          Previous orders
        </button>
      </div>
      {orders.length ? (
        <div className="order-cards">
          {orders.map((o) => (
            <article key={o.id} className="order-card">
              <div className="line">
                <h2>{o.number}</h2>
                <Status status={o.status} />
              </div>
              <p>
                {formatDate(o.createdAt)} · {o.items.length} products
              </p>
              <div className="order-preview">
                {o.items.slice(0, 5).map((i) => (
                  <span key={i.id} title={i.name}>
                    {i.emoji}
                  </span>
                ))}
              </div>
              <div className="line">
                <strong>{formatM(o.total)}</strong>
                <A to={`/orders/${o.id}`} className="button secondary">
                  View order
                  <ArrowRight size={16} />
                </A>
              </div>
              <ReorderButton id={o.id} />
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title={tab === "current" ? "No orders on the go" : "Your favourites will be here"}
          text={
            tab === "current"
              ? "Place an order and follow it from our shelves to your door."
              : "Completed orders appear here, ready to shop again."
          }
        />
      )}
    </>
  );
}
export function ReorderButton({ id }: { id: string }) {
  const s = useAppStore();
  return (
    <button
      className="text-button"
      onClick={() =>
        attempt(() => {
          const r = s.reorder(id);
          if (r.added) toast.success(`${r.added} products added at current prices.`);
          if (r.unavailable.length)
            toast.warning(`Unavailable or limited: ${r.unavailable.join(", ")}`);
          if (r.priceChanged.length) toast.info(`Prices changed: ${r.priceChanged.join(", ")}`);
        })
      }
    >
      <RotateCcw size={16} />
      Buy again
    </button>
  );
}
export function TrackingPage({ id }: { id: string }) {
  const s = useAppStore();
  const order = s.orders.find((o) => o.id === id && s.ownOrderIds.includes(id));
  if (!order)
    return (
      <Empty
        title="Order not found"
        text="Your locally placed orders are available under My orders."
        to="/orders"
        action="My orders"
      />
    );
  const index = ORDER_STATUS_FLOW.indexOf(order.status);
  return (
    <>
      <div className="page-heading">
        <A to="/orders" className="back">
          <ArrowLeft size={17} />
          My orders
        </A>
        <div className="line">
          <h1>{order.number}</h1>
          <Status status={order.status} />
        </div>
        <p>
          Placed {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
        </p>
      </div>
      <div className="checkout-layout">
        <section className="form-panel">
          <h2>
            {order.status === "delivered"
              ? "Delivered with care."
              : order.status === "cancelled"
                ? "Your order was cancelled."
                : "From our shop to your door."}
          </h2>
          {order.status !== "cancelled" && (
            <ol className="tracking-timeline">
              {ORDER_STATUS_FLOW.map((status, i) => {
                const event = order.timeline.find((t) => t.status === status);
                return (
                  <li key={status} className={i <= index ? "done" : ""}>
                    <span>{i <= index ? <Check size={17} /> : i + 1}</span>
                    <div>
                      <strong>{ORDER_STATUS_LABEL[status]}</strong>
                      <small>
                        {event
                          ? formatTime(event.at)
                          : i === index
                            ? "In progress"
                            : i < index
                              ? "Completed"
                              : "Pending"}
                      </small>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          {order.status === "out_for_delivery" && (
            <div className="location-placeholder">
              <Truck size={30} />
              <h3>{order.driver} is bringing your groceries</h3>
              <p>Live driver tracking will be available in a future version.</p>
            </div>
          )}
          <div className="form-actions">
            <a className="button secondary" href={`tel:${s.shop.phone.replace(/\s/g, "")}`}>
              <Phone size={17} />
              Call shop
            </a>
            <a
              className="button secondary"
              href={`https://wa.me/${s.shop.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={17} />
              Contact support
            </a>
          </div>
        </section>
        <aside className="summary">
          <h2>Order details</h2>
          {order.items.map((i) => (
            <div key={i.id}>
              <span>
                {i.name} × {i.quantity}
                {i.soldByWeight ? ` ${i.unit === "gram" ? "g" : i.unit}` : ""}
              </span>
              <strong>{formatM(i.lineTotal)}</strong>
            </div>
          ))}
          <div>
            <span>Delivery</span>
            <strong>{formatM(order.deliveryFee)}</strong>
          </div>
          <div>
            <span>Discount</span>
            <strong>−{formatM(order.discount)}</strong>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <strong>{formatM(order.total)}</strong>
          </div>
          <h3>Delivery address</h3>
          <p>
            {order.address.address}
            <br />
            {order.address.area}
          </p>
          <p>{order.address.landmark}</p>
          <h3>Payment</h3>
          <p>
            {PAYMENT_LABEL[order.payment.method]} · {order.payment.status}
          </p>
          {order.payment.changeRequired != null && (
            <p>Change: {formatM(order.payment.changeRequired)}</p>
          )}
          <ReorderButton id={id} />
        </aside>
      </div>
    </>
  );
}
export function AccountPage() {
  const s = useAppStore();
  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState(s.account);
  const [editing, setEditing] = useState(false);
  const [address, setAddress] = useState({
    label: "Home",
    area: s.deliveryArea,
    address: "",
    landmark: "",
  });
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">MAKE YOURSELF AT HOME</p>
        <h1>
          {s.account.signedIn
            ? `Hello, ${s.account.name.split(" ")[0]}.`
            : "Your little corner of the shop."}
        </h1>
        <p>Keep your favourites and delivery details close by.</p>
      </div>
      <div className="account-layout">
        <nav className="account-menu">
          {[
            ["profile", "My profile"],
            ["addresses", "Saved addresses"],
            ["favourites", "Favourite products"],
            ["notifications", "Notifications"],
          ].map(([id, label]) => (
            <button className={tab === id ? "selected" : ""} key={id} onClick={() => setTab(id!)}>
              {label}
            </button>
          ))}
          <A to="/orders">
            My orders
            <ArrowRight size={17} />
          </A>
          {s.account.signedIn && (
            <button
              onClick={() =>
                attempt(
                  () => s.updateAccount({ signedIn: false, name: "", phone: "", email: "" }),
                  "You have signed out of the demo profile.",
                )
              }
            >
              <LogOut size={17} />
              Sign out
            </button>
          )}
        </nav>
        <section>
          {tab === "profile" && (
            <form
              className="form-panel"
              onSubmit={(e) => {
                e.preventDefault();
                attempt(
                  () => s.updateAccount({ ...profile, signedIn: true }),
                  "Profile saved on this device.",
                );
              }}
            >
              <h2>Your details</h2>
              <p className="notice">
                This is a local demo profile, not an online account. Your details stay in this
                browser.
              </p>
              <Field
                label="Full name"
                required
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
              <Field
                label="Phone number"
                type="tel"
                required
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
              <Field
                label="Email (optional)"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
              <button className="button">Save profile</button>
            </form>
          )}
          {tab === "addresses" && (
            <>
              <div className="section-title">
                <h2>Saved addresses</h2>
                <button className="button secondary" onClick={() => setEditing(!editing)}>
                  {editing ? "Close" : "Add address"}
                </button>
              </div>
              {s.savedAddresses.map((a) => (
                <article className="address-card" key={a.id}>
                  <MapPin />
                  <div>
                    <h3>{a.label}</h3>
                    <p>
                      {a.address}, {a.area}
                    </p>
                    <p>{a.landmark}</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => attempt(() => s.removeAddress(a.id!))}
                  >
                    Remove
                  </button>
                </article>
              ))}
              {!s.savedAddresses.length && !editing && (
                <p className="notice">Save an address to make your next checkout quicker.</p>
              )}
              {editing && (
                <form
                  className="form-panel"
                  onSubmit={(e) => {
                    e.preventDefault();
                    attempt(() => {
                      s.saveAddress(address);
                      setEditing(false);
                    }, "Address saved.");
                  }}
                >
                  <Field
                    label="Address label"
                    required
                    value={address.label}
                    onChange={(e) => setAddress({ ...address, label: e.target.value })}
                  />
                  <label className="field">
                    <span>Area</span>
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
                    label="Delivery address"
                    required
                    value={address.address}
                    onChange={(e) => setAddress({ ...address, address: e.target.value })}
                  />
                  <Field
                    label="Nearest landmark"
                    value={address.landmark}
                    onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                  />
                  <button className="button">Save address</button>
                </form>
              )}
            </>
          )}
          {tab === "favourites" && (
            <>
              <h2 className="mb-6">Your favourites</h2>
              {s.favourites.length ? (
                <ProductGrid products={s.products.filter((p) => s.favourites.includes(p.id))} />
              ) : (
                <Empty
                  title="Keep the good stuff close"
                  text="Tap the heart on any product to save it here."
                />
              )}
            </>
          )}
          {tab === "notifications" && (
            <div className="form-panel">
              <h2>Notification preferences</h2>
              <p className="notice">
                Preferences are saved locally. SMS and email delivery are not connected yet.
              </p>
              {s.notificationPreferences.map((p) => (
                <label className="notification-row" key={p.id}>
                  <span>
                    <strong>{p.label}</strong>
                    <small>{p.description}</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={p.enabled}
                    onChange={() => attempt(() => s.toggleNotification(p.id))}
                  />
                </label>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
