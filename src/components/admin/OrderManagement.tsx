import { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  ShoppingBasket,
  Banknote,
  Clock,
  Truck,
  TriangleAlert,
  Check,
  Users,
  Package,
} from "lucide-react";
import { useAppStore, ORDER_STATUS_FLOW, ORDER_STATUS_LABEL, PAYMENT_LABEL } from "@/lib/app-store";
import { formatM, formatDate, formatTime } from "@/lib/format";
import type { Order } from "@/lib/types";
import { A, Status, Field, Empty, attempt } from "@/components/shop/shared";
export function AdminHeading({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="admin-heading">
      <div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action}
    </div>
  );
}
export function OrderTable({ orders }: { orders: Order[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Placed</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Status</th>
            <th>Delivery area</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>
                <A to={`/admin/orders/${o.id}`} className="table-link">
                  {o.number}
                </A>
              </td>
              <td>{o.customer.name}</td>
              <td>
                {formatDate(o.createdAt)}
                <small>{formatTime(o.createdAt)}</small>
              </td>
              <td className="nowrap">{formatM(o.total)}</td>
              <td>
                {PAYMENT_LABEL[o.payment.method]}
                <small>{o.payment.status}</small>
              </td>
              <td>
                <Status status={o.status} />
              </td>
              <td>{o.address.area}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!orders.length && <p className="table-empty">No orders match this view.</p>}
    </div>
  );
}
export function RevenueChart({ orders }: { orders: Order[] }) {
  const now = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - 6 + i);
    return {
      label: date.toLocaleDateString("en-GB", { weekday: "short" }),
      value: orders
        .filter(
          (o) =>
            o.status !== "cancelled" &&
            new Date(o.createdAt).toDateString() === date.toDateString(),
        )
        .reduce((s, o) => s + o.total, 0),
    };
  });
  const max = Math.max(1, ...days.map((d) => d.value));
  return (
    <div
      className="bar-chart"
      role="img"
      aria-label={`Order value over seven days: ${days.map((d) => `${d.label} ${formatM(d.value)}`).join(", ")}`}
    >
      {days.map((d, i) => (
        <div key={i}>
          <span>{formatM(d.value)}</span>
          <div className="bar-track">
            <i style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }} />
          </div>
          <small>{d.label}</small>
        </div>
      ))}
    </div>
  );
}
export function DashboardPage() {
  const s = useAppStore();
  const today = s.orders.filter(
    (o) => new Date(o.createdAt).toDateString() === new Date().toDateString(),
  );
  const low = s.products.filter((p) => p.stock <= p.lowStockThreshold);
  const stats = [
    ["Today’s orders", today.length, ShoppingBasket],
    [
      "Today’s order value",
      formatM(today.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + o.total, 0)),
      Banknote,
    ],
    ["Pending orders", s.orders.filter((o) => o.status === "received").length, Clock],
    ["Out for delivery", s.orders.filter((o) => o.status === "out_for_delivery").length, Truck],
    ["Low-stock products", low.length, TriangleAlert],
  ] as const;
  const popular = s.products
    .map((p) => ({
      ...p,
      sold: s.orders
        .filter((o) => o.status !== "cancelled")
        .reduce(
          (total, o) => total + (o.items.find((i) => i.productId === p.id)?.quantity ?? 0),
          0,
        ),
    }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);
  return (
    <>
      <AdminHeading
        title="Good things are growing."
        text="Welcome back. Here’s what’s happening in your shop."
        action={
          <A to="/admin/orders" className="button">
            Manage orders
            <ArrowRight size={17} />
          </A>
        }
      />
      <div className="stats-grid">
        {stats.map(([label, value, Icon]) => (
          <div className="stat" key={label}>
            <Icon size={21} />
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="dashboard-columns">
        <section className="admin-panel">
          <div className="section-title">
            <h2>Sales overview</h2>
            <span>Last 7 days</span>
          </div>
          <RevenueChart orders={s.orders} />
        </section>
        <section className="admin-panel">
          <h2>Best-selling products</h2>
          {popular.map((p, i) => (
            <div className="ranking" key={p.id}>
              <span>{i + 1}</span>
              <span className="ranking-emoji">{p.emoji}</span>
              <strong>{p.name}</strong>
              <span>
                {p.sold} {p.unit}
              </span>
            </div>
          ))}
        </section>
      </div>
      <section className="admin-panel">
        <div className="section-title">
          <h2>Recent orders</h2>
          <A to="/admin/orders">
            All orders
            <ArrowRight size={16} />
          </A>
        </div>
        <OrderTable orders={s.orders.slice(0, 6)} />
      </section>
      <section className="admin-panel">
        <div className="section-title">
          <h2>Keep an eye on the shelves</h2>
          <A to="/admin/inventory">
            Update stock
            <ArrowRight size={16} />
          </A>
        </div>
        <div className="low-stock-list">
          {low.map((p) => (
            <A key={p.id} to="/admin/inventory">
              <span>{p.emoji}</span>
              <strong>{p.name}</strong>
              <small>
                {p.stock} {p.unit} left
              </small>
            </A>
          ))}
        </div>
      </section>
    </>
  );
}
export function AdminOrdersPage() {
  const s = useAppStore();
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  return (
    <>
      <AdminHeading title="Orders" text="From the first request to the final doorstep." />
      <div className="admin-panel">
        <div className="filters">
          <input
            aria-label="Search orders"
            placeholder="Search order or customer…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="tabs scroll-tabs">
          {["all", ...ORDER_STATUS_FLOW, "cancelled"].map((st) => (
            <button
              key={st}
              className={status === st ? "selected" : ""}
              onClick={() => setStatus(st)}
            >
              {st === "all"
                ? "All orders"
                : ORDER_STATUS_LABEL[st as keyof typeof ORDER_STATUS_LABEL]}
            </button>
          ))}
        </div>
        <OrderTable
          orders={s.orders.filter(
            (o) =>
              (status === "all" || o.status === status) &&
              `${o.number} ${o.customer.name} ${o.customer.phone}`
                .toLowerCase()
                .includes(q.toLowerCase()),
          )}
        />
      </div>
    </>
  );
}
export function AdminOrderPage({ id }: { id: string }) {
  const s = useAppStore();
  const order = s.orders.find((o) => o.id === id);
  const [driver, setDriver] = useState(order?.driver ?? "");
  const [cancel, setCancel] = useState(false);
  if (!order)
    return (
      <Empty
        title="Order not found"
        text="Select an order from the order list."
        to="/admin/orders"
        action="Back to orders"
      />
    );
  const next = ORDER_STATUS_FLOW[ORDER_STATUS_FLOW.indexOf(order.status) + 1];
  const finished = ["delivered", "cancelled"].includes(order.status);
  return (
    <>
      <A to="/admin/orders" className="back">
        <ArrowLeft size={16} />
        All orders
      </A>
      <AdminHeading
        title={order.number}
        text={`Placed ${formatDate(order.createdAt)} at ${formatTime(order.createdAt)}`}
        action={<Status status={order.status} />}
      />
      <div className="dashboard-columns">
        <section className="admin-panel">
          <h2>Customer</h2>
          <h3>{order.customer.name}</h3>
          <a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a>
          <p>{order.customer.email}</p>
          <h2 className="mt-8">Delivery details</h2>
          <p>
            {order.address.address}, {order.address.area}
          </p>
          <p>
            <strong>Landmark:</strong> {order.address.landmark || "Not provided"}
          </p>
          <p>
            <strong>Instructions:</strong> {order.address.instructions || "None"}
          </p>
          {order.address.lat != null && (
            <p>
              Location: {order.address.lat}, {order.address.lng}
            </p>
          )}
        </section>
        <section className="admin-panel">
          <h2>Payment</h2>
          <p>
            {PAYMENT_LABEL[order.payment.method]} {order.payment.provider}
          </p>
          <p>
            Status: <strong>{order.payment.status}</strong>
          </p>
          {order.payment.method === "cash_on_delivery" && (
            <>
              <p>
                Cash:{" "}
                {order.payment.exactAmount
                  ? "Exact amount"
                  : formatM(order.payment.cashGiven ?? order.total)}
              </p>
              <p>
                Change: <strong>{formatM(order.payment.changeRequired ?? 0)}</strong>
              </p>
            </>
          )}
          {order.payment.status !== "paid" && order.status !== "cancelled" && (
            <button
              className="button secondary"
              onClick={() => attempt(() => s.markPaid(id), "Payment recorded.")}
            >
              Record payment received
            </button>
          )}
          <p className="small">
            Record payment only after confirming receipt. This does not charge a customer.
          </p>
        </section>
      </div>
      <section className="admin-panel">
        <h2>Order items</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Unit price</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((i) => (
                <tr key={i.id}>
                  <td>
                    {i.emoji} {i.name}
                  </td>
                  <td>
                    {i.quantity} {i.unit}
                  </td>
                  <td>{formatM(i.unitPrice)}</td>
                  <td>{formatM(i.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="order-totals">
          <p>
            Subtotal <strong>{formatM(order.subtotal)}</strong>
          </p>
          <p>
            Delivery <strong>{formatM(order.deliveryFee)}</strong>
          </p>
          <p>
            Discount <strong>−{formatM(order.discount)}</strong>
          </p>
          <p>
            Total <strong>{formatM(order.total)}</strong>
          </p>
        </div>
      </section>
      <div className="dashboard-columns">
        <section className="admin-panel">
          <h2>Fulfil this order</h2>
          {!finished ? (
            <>
              <form
                className="driver-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  attempt(() => s.assignDriver(id, driver), "Driver assigned.");
                }}
              >
                <Field
                  label="Driver name"
                  value={driver}
                  required
                  onChange={(e) => setDriver(e.target.value)}
                />
                <button className="button secondary">Assign driver</button>
              </form>
              <div className="form-actions">
                {next && (
                  <button
                    className="button"
                    onClick={() =>
                      attempt(
                        () => s.updateOrderStatus(id, next),
                        `Order ${ORDER_STATUS_LABEL[next].toLowerCase()}.`,
                      )
                    }
                  >
                    {next === "confirmed"
                      ? "Confirm order"
                      : next === "preparing"
                        ? "Start preparing"
                        : next === "ready"
                          ? "Ready for delivery"
                          : next === "out_for_delivery"
                            ? "Dispatch order"
                            : "Mark delivered"}
                    <ArrowRight size={16} />
                  </button>
                )}
                <button className="text-button danger" onClick={() => setCancel(!cancel)}>
                  Cancel order
                </button>
              </div>
              {cancel && (
                <div className="notice">
                  <p>Cancel this order and return its items to stock?</p>
                  <button
                    className="button danger-button"
                    onClick={() =>
                      attempt(
                        () => s.updateOrderStatus(id, "cancelled"),
                        "Order cancelled and stock restored.",
                      )
                    }
                  >
                    Yes, cancel order
                  </button>
                </div>
              )}
            </>
          ) : (
            <p>This order is {order.status}.</p>
          )}
        </section>
        <section className="admin-panel">
          <h2>Order activity</h2>
          <ol className="activity-list">
            {[...order.timeline].reverse().map((event, i) => (
              <li key={i}>
                <span />
                <div>
                  <strong>
                    {event.note ??
                      (event.status === "created"
                        ? "Order created"
                        : event.status === "note"
                          ? "Note"
                          : ORDER_STATUS_LABEL[event.status])}
                  </strong>
                  <small>
                    {formatDate(event.at)} · {formatTime(event.at)}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
export function CustomersPage() {
  const s = useAppStore();
  const [phone, setPhone] = useState("");
  return (
    <>
      <AdminHeading title="Customers" text="The people who keep your neighbourhood shop growing." />
      <div className="admin-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Orders</th>
                <th>Lifetime spend</th>
                <th>Last order</th>
              </tr>
            </thead>
            <tbody>
              {s.customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <button className="table-link" onClick={() => setPhone(c.phone)}>
                      {c.name}
                    </button>
                  </td>
                  <td>{c.phone}</td>
                  <td>{c.orders}</td>
                  <td>{formatM(c.lifetimeSpend)}</td>
                  <td>{formatDate(c.lastOrder)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {phone && (
        <section className="admin-panel">
          <h2>{s.customers.find((c) => c.phone === phone)?.name}: order history</h2>
          <OrderTable orders={s.orders.filter((o) => o.customer.phone === phone)} />
        </section>
      )}
    </>
  );
}
export function DeliveriesPage() {
  const s = useAppStore();
  return (
    <>
      <AdminHeading title="Deliveries" text="Bring a little local goodness to every doorstep." />
      <div className="notice">
        Open an order to assign a driver and update delivery progress. Live maps are planned for a
        future integration.
      </div>
      <OrderTable
        orders={s.orders.filter((o) => ["ready", "out_for_delivery"].includes(o.status))}
      />
      <div className="delivery-cards">
        {s.orders
          .filter((o) => ["ready", "out_for_delivery"].includes(o.status))
          .map((o) => (
            <article className="admin-panel" key={o.id}>
              <Status status={o.status} />
              <h2>{o.number}</h2>
              <p>
                {o.customer.name} · <a href={`tel:${o.customer.phone}`}>{o.customer.phone}</a>
              </p>
              <p>
                {o.address.address}, {o.address.area}
              </p>
              <p>
                Driver: <strong>{o.driver || "Unassigned"}</strong>
              </p>
              <A to={`/admin/orders/${o.id}`} className="button secondary">
                Manage delivery
                <ArrowRight size={16} />
              </A>
            </article>
          ))}
      </div>
    </>
  );
}
export function ReportsPage() {
  const s = useAppStore();
  const orders = s.orders.filter((o) => o.status !== "cancelled");
  const sum = (days: number) =>
    orders
      .filter((o) => Date.now() - new Date(o.createdAt).getTime() < days * 86400000)
      .reduce((sum, o) => sum + o.total, 0);
  const total = sum(30);
  return (
    <>
      <AdminHeading title="Reports" text="Know what’s selling. Plan a brighter tomorrow." />
      <div className="stats-grid">
        {[
          ["Last 24 hours", formatM(sum(1))],
          ["Last 7 days", formatM(sum(7))],
          ["Last 30 days", formatM(total)],
          [
            "Orders (30 days)",
            orders.filter((o) => Date.now() - new Date(o.createdAt).getTime() < 30 * 86400000)
              .length,
          ],
          [
            "Average order",
            formatM(
              orders.length ? orders.reduce((sum, o) => sum + o.total, 0) / orders.length : 0,
            ),
          ],
        ].map(([label, value]) => (
          <div className="stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <p className="small">
        Sales figures show non-cancelled order value, including pending payments and delivery.
        Average order and category totals use all stored orders.
      </p>
      <div className="dashboard-columns">
        <section className="admin-panel">
          <h2>Daily order value</h2>
          <RevenueChart orders={orders} />
        </section>
        <section className="admin-panel">
          <h2>Orders by payment method</h2>
          {(["cash_on_delivery", "mobile_money"] as const).map((method) => {
            const count = orders.filter((o) => o.payment.method === method).length;
            return (
              <div className="report-row" key={method}>
                <div className="line">
                  <span>{PAYMENT_LABEL[method]}</span>
                  <strong>{count} orders</strong>
                </div>
                <progress max={orders.length || 1} value={count} />
              </div>
            );
          })}
          <div className="line">
            <span>Recorded payments</span>
            <strong>
              {formatM(
                orders
                  .filter((o) => o.payment.status === "paid")
                  .reduce((sum, o) => sum + o.total, 0),
              )}
            </strong>
          </div>
        </section>
      </div>
      <section className="admin-panel">
        <h2>Category performance</h2>
        {s.categories
          .filter((c) => c.slug !== "specials")
          .map((c) => {
            const value = orders.reduce(
              (sum, o) =>
                sum +
                o.items
                  .filter((i) =>
                    s.products.some((p) => p.id === i.productId && p.categoryId === c.id),
                  )
                  .reduce((v, i) => v + i.lineTotal, 0),
              0,
            );
            return (
              <div className="ranking" key={c.id}>
                <span>{c.emoji}</span>
                <strong>{c.name}</strong>
                <span>{formatM(value)}</span>
              </div>
            );
          })}
      </section>
    </>
  );
}
