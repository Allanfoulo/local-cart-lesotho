import { useMemo, useState } from "react";
import {
  ArrowRight,
  Banknote,
  Boxes,
  ChartNoAxesCombined,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Headphones,
  ListChecks,
  MessageCircle,
  Minus,
  PackageCheck,
  Phone,
  Plus,
  Route,
  Search,
  Truck,
  UserRound,
} from "lucide-react";
import { useAppStore, ORDER_STATUS_LABEL, PAYMENT_LABEL, stockStatus } from "@/lib/app-store";
import { formatDate, formatM, formatTime, unitLabel } from "@/lib/format";
import type { Order, OrderStatus, Product } from "@/lib/types";
import { A, Status, attempt } from "@/components/shop/shared";
import { RevenueChart } from "@/components/admin/OrderManagement";
import { OperationsHeading } from "./OperationsLayout";

function OpsStat({
  label,
  value,
  detail,
  tone = "green",
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: string;
}) {
  return (
    <div className={`ops-stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function OrderItems({ order }: { order: Order }) {
  return (
    <div className="ops-order-items">
      {order.items.map((item) => (
        <div key={item.id}>
          <span>
            {item.name}
            <small>
              {item.quantity} {unitLabel(item.unit)}
            </small>
          </span>
          <strong>{formatM(item.lineTotal)}</strong>
        </div>
      ))}
    </div>
  );
}

const fulfilmentStatuses: OrderStatus[] = ["received", "confirmed", "preparing", "ready"];

export function PickingPage() {
  const s = useAppStore();
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const queue = s.orders.filter(
    (order) =>
      fulfilmentStatuses.includes(order.status) && (filter === "all" || order.status === filter),
  );
  const move = (order: Order) => {
    const next: Partial<Record<OrderStatus, OrderStatus>> = {
      received: "confirmed",
      confirmed: "preparing",
      preparing: "ready",
    };
    const status = next[order.status];
    if (status)
      attempt(
        () => s.updateOrderStatus(order.id, status),
        status === "ready"
          ? "Order is ready for dispatch"
          : `Order marked ${ORDER_STATUS_LABEL[status].toLowerCase()}`,
      );
  };
  return (
    <div className="ops-page">
      <OperationsHeading
        title="Picking & fulfilment"
        text="Turn new orders into packed baskets ready for the delivery team."
        action={
          <A to="/operations/dispatch" className="button">
            Open dispatch <ArrowRight size={17} />
          </A>
        }
      />
      <div className="ops-stat-grid">
        <OpsStat
          label="Needs attention"
          value={s.orders.filter((order) => order.status === "received").length}
          detail="New orders"
          tone="orange"
        />
        <OpsStat
          label="In progress"
          value={
            s.orders.filter((order) => ["confirmed", "preparing"].includes(order.status)).length
          }
          detail="Being picked"
        />
        <OpsStat
          label="Ready"
          value={s.orders.filter((order) => order.status === "ready").length}
          detail="Waiting for a driver"
          tone="blue"
        />
        <OpsStat
          label="Today’s items"
          value={s.orders
            .filter(
              (order) => new Date(order.createdAt).toDateString() === new Date().toDateString(),
            )
            .reduce((sum, order) => sum + order.items.length, 0)}
          detail="Line items to pack"
          tone="purple"
        />
      </div>
      <section className="ops-panel">
        <div className="ops-panel-heading">
          <div>
            <h2>Fulfilment queue</h2>
            <p>Work from the oldest order first.</p>
          </div>
          <div className="ops-filter-tabs">
            {[
              ["all", "All"],
              ["received", "New"],
              ["confirmed", "Confirmed"],
              ["preparing", "Picking"],
              ["ready", "Ready"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={filter === value ? "selected" : ""}
                onClick={() => setFilter(value as OrderStatus | "all")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="ops-order-list">
          {queue.map((order) => (
            <article className="ops-order-card" key={order.id}>
              <div className="ops-order-card-top">
                <div>
                  <A to={`/admin/orders/${order.id}`} className="ops-order-number">
                    {order.number}
                  </A>
                  <span>
                    {order.customer.name} · {order.address.area}
                  </span>
                </div>
                <Status status={order.status} />
              </div>
              <OrderItems order={order} />
              <div className="ops-order-card-bottom">
                <span>
                  <Clock3 size={15} /> {formatTime(order.createdAt)} · {formatM(order.total)}
                </span>
                {order.status === "ready" ? (
                  <span className="ops-ready-label">
                    <CheckCircle2 size={16} /> Ready for dispatch
                  </span>
                ) : (
                  <button className="button" onClick={() => move(order)}>
                    {order.status === "received"
                      ? "Confirm order"
                      : order.status === "confirmed"
                        ? "Start picking"
                        : "Mark ready"}
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </article>
          ))}
          {!queue.length && (
            <div className="ops-empty">
              <CheckCircle2 size={27} />
              <strong>Nothing in this queue</strong>
              <p>Try another filter or check back after the next customer order.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function driverNames(orders: Order[]) {
  return [
    ...new Set([
      "Moshe Thabane",
      "Thabo Molefi",
      ...(orders.map((order) => order.driver).filter(Boolean) as string[]),
    ]),
  ];
}

export function DispatchPage() {
  const s = useAppStore();
  const drivers = driverNames(s.orders);
  const [selectedDriver, setSelectedDriver] = useState(drivers[0] ?? "Moshe Thabane");
  const ready = s.orders.filter((order) => order.status === "ready");
  const live = s.orders.filter((order) => order.status === "out_for_delivery");
  const send = (order: Order) =>
    attempt(() => {
      s.assignDriver(order.id, selectedDriver);
      s.updateOrderStatus(order.id, "out_for_delivery");
    }, `${order.number} sent with ${selectedDriver}`);
  return (
    <div className="ops-page">
      <OperationsHeading
        title="Dispatch control"
        text="Assign ready baskets, send drivers out and keep the route moving."
        action={
          <A to="/driver" className="button secondary">
            <Truck size={17} /> Driver view
          </A>
        }
      />
      <div className="ops-stat-grid">
        <OpsStat label="Ready to send" value={ready.length} detail="At the shop" tone="orange" />
        <OpsStat label="On the road" value={live.length} detail="Active deliveries" />
        <OpsStat
          label="Drivers online"
          value={drivers.length}
          detail="Demo driver profiles"
          tone="blue"
        />
        <OpsStat label="Average handoff" value="28m" detail="Target: under 40m" tone="purple" />
      </div>
      <section className="ops-panel">
        <div className="ops-panel-heading">
          <div>
            <h2>Ready for dispatch</h2>
            <p>Assign a driver and send the customer&apos;s basket on its way.</p>
          </div>
          <label className="ops-driver-picker">
            <span>Assigning to</span>
            <select
              value={selectedDriver}
              onChange={(event) => setSelectedDriver(event.target.value)}
            >
              {drivers.map((driver) => (
                <option key={driver}>{driver}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="ops-order-list">
          {ready.map((order) => (
            <article className="ops-dispatch-card" key={order.id}>
              <div className="ops-dispatch-main">
                <span className="ops-dispatch-icon">
                  <PackageCheck size={20} />
                </span>
                <div>
                  <A to={`/admin/orders/${order.id}`} className="ops-order-number">
                    {order.number}
                  </A>
                  <strong>{order.customer.name}</strong>
                  <span>
                    {order.address.area} · {order.items.length} items · {formatM(order.total)}
                  </span>
                </div>
              </div>
              <div className="ops-dispatch-actions">
                {order.driver ? (
                  <span className="ops-assigned">Assigned to {order.driver}</span>
                ) : (
                  <span className="ops-unassigned">Unassigned</span>
                )}
                <button className="button" onClick={() => send(order)}>
                  {order.driver ? "Send delivery" : "Assign & send"}
                  <Route size={16} />
                </button>
              </div>
            </article>
          ))}
          {!ready.length && (
            <div className="ops-empty">
              <CheckCircle2 size={27} />
              <strong>All ready orders are on the road</strong>
              <p>New packed orders will appear here.</p>
            </div>
          )}
        </div>
      </section>
      <section className="ops-panel">
        <div className="ops-panel-heading">
          <div>
            <h2>Live deliveries</h2>
            <p>Track what drivers are carrying right now.</p>
          </div>
          <span className="ops-panel-count">{live.length} active</span>
        </div>
        <div className="ops-live-list">
          {live.map((order) => (
            <A to={`/driver/orders/${order.id}`} className="ops-live-row" key={order.id}>
              <span className="ops-live-pulse" />
              <span>
                <strong>
                  {order.number} · {order.customer.name}
                </strong>
                <small>
                  {order.driver || "Driver pending"} · {order.address.area}
                </small>
              </span>
              <Status status={order.status} />
              <ChevronRight size={17} />
            </A>
          ))}
          {!live.length && <p className="ops-muted">No active deliveries.</p>}
        </div>
      </section>
    </div>
  );
}

function InventoryRow({ product }: { product: Product }) {
  const s = useAppStore();
  const status = stockStatus(product);
  const adjust = (amount: number) =>
    attempt(
      () => s.setStock(product.id, Math.max(0, product.stock + amount)),
      `${product.name} stock updated`,
    );
  return (
    <div className="ops-inventory-row">
      <div className="ops-product-name">
        <span>{product.emoji}</span>
        <span>
          <strong>{product.name}</strong>
          <small>{s.categories.find((category) => category.id === product.categoryId)?.name}</small>
        </span>
      </div>
      <div className="ops-stock-level">
        <strong>{product.stock}</strong>
        <span>{unitLabel(product.unit)}</span>
      </div>
      <span className={`ops-stock-pill ${status}`}>
        {status === "in_stock" ? "In stock" : status === "low_stock" ? "Low stock" : "Out of stock"}
      </span>
      <div className="ops-stock-actions">
        <button aria-label={`Decrease ${product.name} stock`} onClick={() => adjust(-1)}>
          <Minus size={15} />
        </button>
        <button aria-label={`Increase ${product.name} stock`} onClick={() => adjust(1)}>
          <Plus size={15} />
        </button>
        <button className="restock" onClick={() => adjust(10)}>
          +10 restock
        </button>
      </div>
    </div>
  );
}

export function InventoryOperationsPage() {
  const s = useAppStore();
  const [q, setQ] = useState("");
  const products = s.products.filter((product) =>
    `${product.name} ${product.emoji}`.toLowerCase().includes(q.toLowerCase()),
  );
  const low = s.products.filter((product) => stockStatus(product) !== "in_stock");
  return (
    <div className="ops-page">
      <OperationsHeading
        title="Inventory control"
        text="Keep shelves healthy with quick stock checks and restocks."
        action={
          <A to="/admin/inventory" className="button secondary">
            <Boxes size={17} /> Full inventory
          </A>
        }
      />
      <div className="ops-stat-grid">
        <OpsStat label="Products tracked" value={s.products.length} detail="Active catalogue" />
        <OpsStat
          label="Low stock"
          value={low.filter((product) => stockStatus(product) === "low_stock").length}
          detail="Needs a restock"
          tone="orange"
        />
        <OpsStat
          label="Out of stock"
          value={low.filter((product) => stockStatus(product) === "out_of_stock").length}
          detail="Hide or replenish"
          tone="red"
        />
        <OpsStat
          label="Stock units"
          value={s.products.reduce((sum, product) => sum + product.stock, 0)}
          detail="Across all products"
          tone="blue"
        />
      </div>
      <section className="ops-panel">
        <div className="ops-panel-heading">
          <div>
            <h2>Stock room</h2>
            <p>Use the quick controls for this demo; receiving workflows can connect later.</p>
          </div>
          <label className="ops-search">
            <Search size={16} />
            <input
              aria-label="Search inventory"
              placeholder="Search products"
              value={q}
              onChange={(event) => setQ(event.target.value)}
            />
          </label>
        </div>
        <div className="ops-inventory-list">
          {products.map((product) => (
            <InventoryRow key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}

type SupportIssue = { order: Order; title: string; detail: string; tone: string };
function SupportCard({
  issue,
  handled,
  onHandle,
}: {
  issue: SupportIssue;
  handled: boolean;
  onHandle: () => void;
}) {
  return (
    <article className={`ops-support-card ${handled ? "handled" : ""}`}>
      <div className="ops-support-top">
        <span className={`ops-support-icon ${issue.tone}`}>
          {issue.tone === "payment" ? (
            <Banknote size={18} />
          ) : issue.tone === "delivery" ? (
            <Truck size={18} />
          ) : (
            <MessageCircle size={18} />
          )}
        </span>
        <div>
          <A to={`/admin/orders/${issue.order.id}`} className="ops-order-number">
            {issue.order.number}
          </A>
          <strong>{issue.title}</strong>
          <span>{issue.detail}</span>
        </div>
        {handled && (
          <span className="ops-handled">
            <Check size={15} /> Handled
          </span>
        )}
      </div>
      <div className="ops-support-customer">
        <span>
          <UserRound size={15} /> {issue.order.customer.name}
        </span>
        <span>
          <Clock3 size={15} /> {formatDate(issue.order.createdAt)}
        </span>
      </div>
      {!handled && (
        <div className="ops-support-actions">
          <a
            className="button secondary"
            href={`tel:${issue.order.customer.phone.replace(/\s/g, "")}`}
          >
            <Phone size={15} /> Call customer
          </a>
          <button className="button" onClick={onHandle}>
            Mark handled <CheckCircle2 size={16} />
          </button>
        </div>
      )}
    </article>
  );
}

export function SupportPage() {
  const s = useAppStore();
  const [handled, setHandled] = useState<string[]>([]);
  const issues = useMemo<SupportIssue[]>(
    () =>
      s.orders
        .filter((order) => order.status !== "delivered" && order.status !== "cancelled")
        .map((order) =>
          order.payment.method === "cash_on_delivery" && order.payment.status !== "paid"
            ? {
                order,
                title: "Cash collection to confirm",
                detail: `${PAYMENT_LABEL[order.payment.method]} · ${formatM(order.total)} due at the door`,
                tone: "payment",
              }
            : order.status === "out_for_delivery"
              ? {
                  order,
                  title: "Delivery follow-up",
                  detail: `${order.driver || "Driver pending"} · Customer is expecting this order`,
                  tone: "delivery",
                }
              : {
                  order,
                  title: "Order check-in",
                  detail: `${ORDER_STATUS_LABEL[order.status]} · Confirm the customer has no questions`,
                  tone: "message",
                },
        ),
    [s.orders],
  );
  const open = issues.filter((issue) => !handled.includes(issue.order.id));
  return (
    <div className="ops-page">
      <OperationsHeading
        title="Support desk"
        text="Resolve customer questions before they become missed deliveries."
        action={
          <A to="/admin/orders" className="button secondary">
            <Headphones size={17} /> All orders
          </A>
        }
      />
      <div className="ops-stat-grid">
        <OpsStat
          label="Open conversations"
          value={open.length}
          detail="Needs a response"
          tone="orange"
        />
        <OpsStat
          label="Cash to confirm"
          value={
            issues.filter((issue) => issue.tone === "payment" && !handled.includes(issue.order.id))
              .length
          }
          detail="Collect at doorstep"
          tone="red"
        />
        <OpsStat
          label="Delivery follow-ups"
          value={
            issues.filter((issue) => issue.tone === "delivery" && !handled.includes(issue.order.id))
              .length
          }
          detail="On the road"
          tone="blue"
        />
        <OpsStat
          label="Handled today"
          value={handled.length}
          detail="Demo-only queue"
          tone="purple"
        />
      </div>
      <section className="ops-panel">
        <div className="ops-panel-heading">
          <div>
            <h2>Needs a human touch</h2>
            <p>These cards are generated from the live demo orders.</p>
          </div>
          <span className="ops-panel-count">{open.length} open</span>
        </div>
        <div className="ops-support-list">
          {issues.map((issue) => (
            <SupportCard
              key={issue.order.id}
              issue={issue}
              handled={handled.includes(issue.order.id)}
              onHandle={() => setHandled((current) => [...current, issue.order.id])}
            />
          ))}
          {!issues.length && (
            <div className="ops-empty">
              <CheckCircle2 size={27} />
              <strong>Inbox clear</strong>
              <p>No open conversations need attention.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export function OwnerPage() {
  const s = useAppStore();
  const completed = s.orders.filter((order) => order.status === "delivered");
  const nonCancelled = s.orders.filter((order) => order.status !== "cancelled");
  const revenue = nonCancelled.reduce((sum, order) => sum + order.total, 0);
  const average = nonCancelled.length ? revenue / nonCancelled.length : 0;
  const low = s.products.filter((product) => stockStatus(product) !== "in_stock");
  const popular = s.products
    .map((product) => ({
      product,
      sold: s.orders.reduce(
        (sum, order) =>
          sum + (order.items.find((item) => item.productId === product.id)?.quantity ?? 0),
        0,
      ),
    }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);
  return (
    <div className="ops-page owner-page">
      <OperationsHeading
        title="Owner overview"
        text="A calm view of sales, fulfilment and the health of the shop."
        action={
          <A to="/admin/reports" className="button secondary">
            <ChartNoAxesCombined size={17} /> Full reports
          </A>
        }
      />
      <div className="ops-stat-grid">
        <OpsStat
          label="Gross order value"
          value={formatM(revenue)}
          detail={`${nonCancelled.length} non-cancelled orders`}
        />
        <OpsStat
          label="Average basket"
          value={formatM(average)}
          detail="Across all demo orders"
          tone="blue"
        />
        <OpsStat
          label="Fulfilment rate"
          value={`${s.orders.length ? Math.round((completed.length / s.orders.length) * 100) : 0}%`}
          detail={`${completed.length} delivered`}
          tone="purple"
        />
        <OpsStat
          label="Stock alerts"
          value={low.length}
          detail="Products to review"
          tone="orange"
        />
      </div>
      <div className="owner-grid">
        <section className="ops-panel">
          <div className="ops-panel-heading">
            <div>
              <h2>Revenue rhythm</h2>
              <p>Order value over the last seven days.</p>
            </div>
          </div>
          <RevenueChart orders={s.orders} />
        </section>
        <section className="ops-panel">
          <div className="ops-panel-heading">
            <div>
              <h2>Top products</h2>
              <p>By units on demo orders.</p>
            </div>
          </div>
          <div className="owner-ranking">
            {popular.map(({ product, sold }, index) => (
              <div key={product.id}>
                <span>{index + 1}</span>
                <strong>{product.emoji}</strong>
                <span>{product.name}</span>
                <small>{sold} units</small>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="ops-panel">
        <div className="ops-panel-heading">
          <div>
            <h2>Operational pulse</h2>
            <p>Where the team should look next.</p>
          </div>
        </div>
        <div className="owner-pulse-grid">
          <A to="/operations/picking">
            <ListChecks size={20} />
            <span>
              <strong>
                {
                  s.orders.filter((order) =>
                    ["received", "confirmed", "preparing"].includes(order.status),
                  ).length
                }{" "}
                orders need fulfilment
              </strong>
              <small>Open the picking queue</small>
            </span>
            <ChevronRight size={17} />
          </A>
          <A to="/operations/dispatch">
            <Truck size={20} />
            <span>
              <strong>
                {s.orders.filter((order) => order.status === "ready").length} baskets ready to send
              </strong>
              <small>Open dispatch control</small>
            </span>
            <ChevronRight size={17} />
          </A>
          <A to="/operations/inventory">
            <CircleAlert size={20} />
            <span>
              <strong>{low.length} stock alerts</strong>
              <small>Review inventory levels</small>
            </span>
            <ChevronRight size={17} />
          </A>
        </div>
      </section>
    </div>
  );
}
