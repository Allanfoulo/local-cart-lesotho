import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  MapPin,
  MessageCircle,
  Navigation,
  PackageCheck,
  Phone,
  ReceiptText,
  Route,
  Truck,
  UserRound,
} from "lucide-react";
import { useParams } from "@tanstack/react-router";
import { useAppStore, ORDER_STATUS_LABEL, PAYMENT_LABEL } from "@/lib/app-store";
import type { Order, OrderStatus } from "@/lib/types";
import { formatDate, formatM, formatTime, quantityLabel } from "@/lib/format";
import { A, attempt, Status } from "@/components/shop/shared";
import { useDriver } from "./DriverLayout";

const activeStatuses: OrderStatus[] = ["ready", "out_for_delivery"];

function firstName(name: string) {
  return name.split(" ")[0] || name;
}

function deliveryLabel(order: Order) {
  return order.status === "ready" ? "Ready to collect" : ORDER_STATUS_LABEL[order.status];
}

function DeliveryCard({ order, claimable = false }: { order: Order; claimable?: boolean }) {
  const s = useAppStore();
  const { activeDriver } = useDriver();
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const start = () =>
    attempt(
      () => {
        if (claimable) s.assignDriver(order.id, activeDriver);
        s.updateOrderStatus(order.id, "out_for_delivery");
      },
      claimable ? "Delivery claimed and started" : "Delivery started",
    );
  const finish = () =>
    attempt(() => s.updateOrderStatus(order.id, "delivered"), "Delivery marked complete");
  return (
    <article className={`driver-delivery-card ${claimable ? "claimable" : ""}`}>
      <div className="driver-card-topline">
        <div>
          <span className="driver-order-number">{order.number}</span>
          <span className="driver-card-date">
            {formatDate(order.createdAt)} · {itemCount} items
          </span>
        </div>
        <span className={`driver-status driver-status-${order.status}`}>
          {order.status === "ready" ? <PackageCheck size={15} /> : <Route size={15} />}
          {deliveryLabel(order)}
        </span>
      </div>
      <div className="driver-customer-row">
        <span className="driver-customer-icon">
          <UserRound size={18} />
        </span>
        <div>
          <strong>{order.customer.name}</strong>
          <span>
            {order.address.area} · {order.address.address}
          </span>
        </div>
      </div>
      <div className="driver-card-meta">
        <span>
          <MapPin size={15} /> {order.address.landmark || "Maseru delivery"}
        </span>
        <span>
          <ReceiptText size={15} /> {formatM(order.total)} · {PAYMENT_LABEL[order.payment.method]}
        </span>
      </div>
      {order.address.instructions && (
        <p className="driver-instruction">“{order.address.instructions}”</p>
      )}
      <div className="driver-card-actions">
        <A to={`/driver/orders/${order.id}`} className="button secondary">
          View details <ChevronRight size={17} />
        </A>
        {claimable ? (
          <button className="button" onClick={start}>
            Claim &amp; start <Navigation size={17} />
          </button>
        ) : order.status === "ready" ? (
          <button className="button" onClick={start}>
            Start delivery <Navigation size={17} />
          </button>
        ) : order.status === "out_for_delivery" ? (
          <button className="button" onClick={finish}>
            Mark delivered <CheckCircle2 size={17} />
          </button>
        ) : null}
      </div>
    </article>
  );
}

function DriverStat({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <div className={`driver-stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

export function DriverDashboardPage() {
  const s = useAppStore();
  const { activeDriver } = useDriver();
  const current = s.orders.filter(
    (order) => order.driver === activeDriver && activeStatuses.includes(order.status),
  );
  const delivered = s.orders.filter(
    (order) => order.driver === activeDriver && order.status === "delivered",
  );
  const available = s.orders.filter((order) => order.status === "ready" && !order.driver);
  const firstCurrent = current[0];
  return (
    <div className="driver-page">
      <section className="driver-welcome">
        <div>
          <p className="eyebrow">THURSDAY, 24 SEPTEMBER 2026 · DEMO SHIFT</p>
          <h1>Good morning, {firstName(activeDriver)}.</h1>
          <p>
            Here&apos;s what&apos;s on your route today. Keep customers in the loop at every
            handoff.
          </p>
        </div>
        <div className="driver-welcome-badge">
          <Truck size={24} />
          <span>Ready for the road</span>
        </div>
      </section>
      <section className="driver-stat-grid" aria-label="Shift summary">
        <DriverStat
          label="Assigned now"
          value={`${current.length}`}
          detail="Ready or on route"
          tone="green"
        />
        <DriverStat
          label="Out for delivery"
          value={`${current.filter((order) => order.status === "out_for_delivery").length}`}
          detail="Keep moving"
          tone="orange"
        />
        <DriverStat
          label="Delivered"
          value={`${delivered.length}`}
          detail="Completed in demo"
          tone="blue"
        />
        <DriverStat label="Shift status" value="Live" detail="Demo workspace" tone="purple" />
      </section>
      {firstCurrent ? (
        <section className="driver-next-stop">
          <div>
            <p className="eyebrow">NEXT STOP</p>
            <h2>{firstCurrent.customer.name}</h2>
            <p>
              <MapPin size={16} /> {firstCurrent.address.area} · {firstCurrent.address.address}
            </p>
          </div>
          <A to={`/driver/orders/${firstCurrent.id}`} className="button">
            Open delivery <ArrowRight size={17} />
          </A>
        </section>
      ) : (
        <section className="driver-next-stop empty-next-stop">
          <div>
            <p className="eyebrow">NEXT STOP</p>
            <h2>No active deliveries yet</h2>
            <p>Claim a ready order below to put a stop on your route.</p>
          </div>
          <Clock3 size={32} />
        </section>
      )}
      <div className="driver-section-heading">
        <div>
          <p className="eyebrow">YOUR ROUTE</p>
          <h2>Assigned deliveries</h2>
        </div>
        <span>{current.length} active</span>
      </div>
      {current.length ? (
        <div className="driver-delivery-list">
          {current.map((order) => (
            <DeliveryCard key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <div className="driver-empty-card">
          <PackageCheck size={27} />
          <strong>Your route is clear</strong>
          <p>There are no deliveries assigned to {firstName(activeDriver)} right now.</p>
        </div>
      )}
      {available.length > 0 && (
        <>
          <div className="driver-section-heading">
            <div>
              <p className="eyebrow">OPEN STOPS</p>
              <h2>Ready for a driver</h2>
            </div>
            <span>{available.length} available</span>
          </div>
          <p className="driver-section-note">
            These orders are ready at the shop. Claim one to add it to your route.
          </p>
          <div className="driver-delivery-list">
            {available.map((order) => (
              <DeliveryCard key={order.id} order={order} claimable />
            ))}
          </div>
        </>
      )}
      <div className="driver-section-heading">
        <div>
          <p className="eyebrow">RECENT HANDOFFS</p>
          <h2>Completed deliveries</h2>
        </div>
        <span>{delivered.length} delivered</span>
      </div>
      {delivered.length ? (
        <div className="driver-history-list">
          {delivered.slice(0, 4).map((order) => (
            <A key={order.id} to={`/driver/orders/${order.id}`} className="driver-history-row">
              <span className="driver-history-check">
                <CheckCircle2 size={18} />
              </span>
              <span>
                <strong>
                  {order.number} · {order.customer.name}
                </strong>
                <small>
                  {order.address.area} · Delivered{" "}
                  {formatTime(order.timeline.at(-1)?.at || order.createdAt)}
                </small>
              </span>
              <strong>{formatM(order.total)}</strong>
              <ChevronRight size={17} />
            </A>
          ))}
        </div>
      ) : (
        <div className="driver-empty-card compact">
          <Clock3 size={22} />
          <p>Completed stops will appear here.</p>
        </div>
      )}
    </div>
  );
}

export function DriverOrderPage() {
  const s = useAppStore();
  const { activeDriver } = useDriver();
  const { id } = useParams({ from: "/driver/orders/$id" });
  const order = s.orders.find((item) => item.id === id);
  const [note, setNote] = useState("");
  if (!order)
    return (
      <div className="driver-empty-card">
        <PackageCheck size={30} />
        <h1>Delivery not found</h1>
        <p>This order may have been removed from the demo workspace.</p>
        <A to="/driver" className="button">
          <ArrowLeft size={17} /> Back to dashboard
        </A>
      </div>
    );
  const isMine = order.driver === activeDriver;
  const claim = () =>
    attempt(() => {
      s.assignDriver(order.id, activeDriver);
      s.updateOrderStatus(order.id, "out_for_delivery", note.trim() || undefined);
    }, "Delivery claimed and started");
  const start = () =>
    attempt(
      () => s.updateOrderStatus(order.id, "out_for_delivery", note.trim() || undefined),
      "Delivery started",
    );
  const finish = () =>
    attempt(
      () => s.updateOrderStatus(order.id, "delivered", note.trim() || undefined),
      "Delivery marked complete",
    );
  const mapQuery = encodeURIComponent(`${order.address.address}, ${order.address.area}, Lesotho`);
  return (
    <div className="driver-page driver-order-page">
      <A to="/driver" className="driver-back-link">
        <ArrowLeft size={16} /> Back to route
      </A>
      <section className="driver-detail-heading">
        <div>
          <p className="eyebrow">DELIVERY DETAIL</p>
          <h1>{order.number}</h1>
          <p>
            Created {formatDate(order.createdAt)} · {order.items.length} line items
          </p>
        </div>
        <Status status={order.status} />
      </section>
      {!isMine && order.driver && (
        <div className="driver-assignment-note">
          <ShieldIcon />
          <span>
            This delivery is assigned to <strong>{order.driver}</strong>. You can still explore the
            demo details.
          </span>
        </div>
      )}
      <div className="driver-detail-grid">
        <div className="driver-detail-main">
          <section className="driver-panel driver-customer-panel">
            <div className="driver-panel-heading">
              <h2>Customer</h2>
              <span>
                <UserRound size={17} />
              </span>
            </div>
            <div className="driver-customer-detail">
              <div>
                <strong>{order.customer.name}</strong>
                <p>{order.customer.phone}</p>
                {order.customer.email && <p>{order.customer.email}</p>}
              </div>
              <div className="driver-contact-actions">
                <a
                  className="button secondary"
                  href={`tel:${order.customer.phone.replace(/\s/g, "")}`}
                >
                  <Phone size={16} /> Call
                </a>
                <a
                  className="button secondary"
                  href={`sms:${order.customer.phone.replace(/\s/g, "")}`}
                >
                  <MessageCircle size={16} /> Message
                </a>
              </div>
            </div>
          </section>
          <section className="driver-panel">
            <div className="driver-panel-heading">
              <h2>Drop-off address</h2>
              <span>
                <MapPin size={17} />
              </span>
            </div>
            <div className="driver-address">
              <strong>{order.address.address}</strong>
              <span>{order.address.area}</span>
              {order.address.landmark && <span>Landmark: {order.address.landmark}</span>}
              {order.address.instructions && (
                <p>
                  <strong>Customer note:</strong> {order.address.instructions}
                </p>
              )}
            </div>
            <a
              className="driver-map-placeholder"
              href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
              target="_blank"
              rel="noreferrer"
            >
              <Navigation size={22} />
              <span>
                <strong>Open directions</strong>
                <small>Use your preferred map app for the route</small>
              </span>
              <ExternalLink size={17} />
            </a>
          </section>
          <section className="driver-panel">
            <div className="driver-panel-heading">
              <h2>Order items</h2>
              <span>
                <PackageCheck size={17} />
              </span>
            </div>
            <div className="driver-item-list">
              {order.items.map((item) => (
                <div key={item.id}>
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {quantityLabel(item.quantity, item.soldByWeight)} · {formatM(item.unitPrice)}{" "}
                      each
                    </small>
                  </span>
                  <strong>{formatM(item.lineTotal)}</strong>
                </div>
              ))}
            </div>
            <div className="driver-total-row">
              <span>Total to collect</span>
              <strong>{formatM(order.total)}</strong>
            </div>
          </section>
        </div>
        <aside className="driver-detail-side">
          <section className="driver-panel driver-handoff-panel">
            <div className="driver-panel-heading">
              <h2>Handoff</h2>
              <span>
                <Route size={17} />
              </span>
            </div>
            <div className="driver-handoff-summary">
              <span className={`driver-status driver-status-${order.status}`}>
                {deliveryLabel(order)}
              </span>
              <p>
                {PAYMENT_LABEL[order.payment.method]} ·{" "}
                <strong>{order.payment.status === "paid" ? "Paid" : "Collect at door"}</strong>
              </p>
              {order.payment.changeRequired ? (
                <p className="driver-change">
                  Prepare change: <strong>{formatM(order.payment.changeRequired)}</strong>
                </p>
              ) : null}
            </div>
            {order.status === "ready" && !order.driver && (
              <button className="button wide" onClick={claim}>
                Claim &amp; start delivery <Navigation size={17} />
              </button>
            )}
            {order.status === "ready" && isMine && (
              <button className="button wide" onClick={start}>
                Start delivery <Navigation size={17} />
              </button>
            )}
            {order.status === "out_for_delivery" && isMine && (
              <button className="button wide" onClick={finish}>
                Mark as delivered <CheckCircle2 size={17} />
              </button>
            )}
            {order.status === "delivered" && (
              <div className="driver-complete">
                <CheckCircle2 size={22} />
                <span>Handoff complete</span>
              </div>
            )}
            {isMine && order.status !== "delivered" && (
              <label className="field driver-note-field">
                <span>Delivery note (optional)</span>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="e.g. Left with customer at the gate"
                />
              </label>
            )}
          </section>
          <section className="driver-panel">
            <div className="driver-panel-heading">
              <h2>Activity</h2>
              <span>
                <Clock3 size={17} />
              </span>
            </div>
            <div className="driver-timeline">
              {order.timeline
                .slice()
                .reverse()
                .map((event, index) => (
                  <div key={`${event.at}-${index}`}>
                    <span className={`timeline-dot ${event.status === "note" ? "note" : ""}`} />
                    <div>
                      <strong>
                        {event.status === "note"
                          ? event.note
                          : event.status === "created"
                            ? "Order created"
                            : ORDER_STATUS_LABEL[event.status]}
                      </strong>
                      <small>
                        {formatDate(event.at)} · {formatTime(event.at)}
                      </small>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <span className="driver-assignment-icon">
      <CheckCircle2 size={18} />
    </span>
  );
}
