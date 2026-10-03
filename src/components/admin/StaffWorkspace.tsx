import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  ClipboardList,
  Package,
  Tags,
  MapPinned,
  Settings,
  LayoutDashboard,
  Search,
  CheckCircle2,
  Truck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeliveryPlacesManager } from "@/components/admin/DeliveryPlacesManager";
import { DispatchBoard } from "@/components/admin/orders/DispatchBoard";
import { CatalogueManagement } from "@/components/admin/CatalogueManagement";
import { OffersManagement } from "@/components/admin/OffersManagement";
import {
  useAppStore,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABEL,
  PAYMENT_LABEL,
  stockStatus,
} from "@/lib/app-store";
import { formatDate, formatM } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

const sections = [
  ["overview", "Today", LayoutDashboard],
  ["orders", "Orders", ClipboardList],
  ["customers", "Customers", Users],
  ["dispatch", "Dispatch", Truck],
  ["stock", "Products & stock", Package],
  ["promotions", "Promotions", Tags],
  ["places", "Delivery places", MapPinned],
  ["reports", "Reports", BarChart3],
  ["settings", "Shop settings", Settings],
] as const;
type Section = (typeof sections)[number][0];
const drivers = ["Kabelo M.", "Lineo P.", "Not assigned"];

export function StaffWorkspace() {
  const store = useAppStore();
  const [section, setSection] = useState<Section>("overview");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const orders = useMemo(
    () =>
      store.orders.filter(
        (order) =>
          (statusFilter === "all" || order.status === statusFilter) &&
          `${order.number} ${order.customer.name} ${order.address.area}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [store.orders, query, statusFilter],
  );
  const openOrders = store.orders.filter(
    (order) => !["delivered", "cancelled"].includes(order.status),
  );
  const lowStock = store.products.filter((product) => stockStatus(product) !== "in_stock");
  const todaysSales = store.orders
    .filter(
      (order) =>
        order.status === "delivered" &&
        new Date(order.createdAt).toDateString() === new Date().toDateString(),
    )
    .reduce((total, order) => total + order.total, 0);
  const setStatus = (id: string, status: OrderStatus) => {
    store.updateOrderStatus(id, status);
    setNotice(`Order updated to ${ORDER_STATUS_LABEL[status].toLowerCase()}.`);
  };
  const heading = sections.find(([id]) => id === section)?.[1] ?? "Today";

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-9">
      <header className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">MABOTE FRESH · STAFF</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{heading}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your local store workspace. Changes are saved in this browser.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/demo-login"
            className="inline-flex min-h-11 items-center rounded-xl border bg-card px-3 text-sm font-semibold text-primary hover:bg-muted"
          >
            Switch demo view
          </Link>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-primary">
            <span className="size-2 rounded-full bg-primary" />
            Store open
          </span>
        </div>
      </header>
      <nav className="mb-7 flex gap-2 overflow-x-auto pb-2" aria-label="Staff workspace sections">
        {sections.map(([id, label, Icon]) => (
          <button
            key={id}
            aria-current={section === id ? "page" : undefined}
            onClick={() => setSection(id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${section === id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </nav>
      {notice && (
        <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-primary">
          {notice}
        </p>
      )}
      {section === "overview" && (
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="New orders"
              value={String(openOrders.filter((o) => o.status === "received").length)}
              detail="Waiting for confirmation"
            />
            <Metric
              label="Being prepared"
              value={String(
                openOrders.filter((o) => ["confirmed", "preparing"].includes(o.status)).length,
              )}
              detail="Active pick and pack"
            />
            <button className="text-left" onClick={() => setSection("stock")}>
              <Metric
                label="Stock to check"
                value={String(lowStock.length)}
                detail="Low or out of stock"
              />
            </button>
            <Metric
              label="Delivered today"
              value={formatM(todaysSales)}
              detail="Completed order sales"
            />
          </div>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Next tasks</h2>
                <p className="text-sm text-muted-foreground">
                  Work through orders in the order they need attention.
                </p>
              </div>
              <Button variant="outline" onClick={() => setSection("orders")}>
                All orders
              </Button>
            </div>
            <div className="divide-y rounded-2xl border bg-card">
              {openOrders.slice(0, 5).map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  setStatus={setStatus}
                  assign={store.assignDriver}
                  paymentStatus={store.setOrderPaymentStatus}
                />
              ))}
              {openOrders.length === 0 && (
                <Empty text="All caught up. New orders will appear here." />
              )}
            </div>
          </section>
        </div>
      )}
      {section === "orders" && (
        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Order queue</h2>
              <p className="text-sm text-muted-foreground">
                Confirm, prepare, and assign deliveries.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search orders or areas"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <select
                aria-label="Filter orders by status"
                className="h-10 rounded-lg border bg-card px-3 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                {Object.entries(ORDER_STATUS_LABEL).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="divide-y rounded-2xl border bg-card">
            {orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                setStatus={setStatus}
                assign={store.assignDriver}
                paymentStatus={store.setOrderPaymentStatus}
              />
            ))}
            {orders.length === 0 && <Empty text="No matching orders." />}
          </div>
        </section>
      )}
      {section === "customers" && <CustomersPanel />}
      {section === "dispatch" && <DispatchBoard />}
      {section === "stock" && <CatalogueManagement />}
      {section === "promotions" && <OffersManagement />}
      {section === "places" && <DeliveryPlacesManager />}
      {section === "reports" && <ReportsPanel />}
      {section === "settings" && <SettingsPanel />}
      <p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="size-4 text-primary" />
        Prototype workspace, no staff sign-in or cross-device sync is enabled.
      </p>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}
function CustomersPanel() {
  const { customers, orders } = useAppStore();
  const [query, setQuery] = useState("");
  const matching = customers.filter((customer) =>
    `${customer.name} ${customer.phone} ${customer.email ?? ""}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Customers</h2>
          <p className="text-sm text-muted-foreground">
            Look up customer contact details and their recent order history.
          </p>
        </div>
        <label className="relative block w-full sm:w-72">
          <span className="sr-only">Search customers</span>
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Name, phone, or email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </header>
      <div className="divide-y rounded-2xl border bg-card">
        {matching.map((customer) => {
          const customerOrders = orders
            .filter(
              (order) =>
                order.customer.customerId === customer.id ||
                (!order.customer.customerId && order.customer.phone === customer.phone),
            )
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          return (
            <article key={customer.id} className="p-4 md:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold">{customer.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    <a
                      className="hover:text-primary"
                      href={`tel:${customer.phone.replace(/\s/g, "")}`}
                    >
                      {customer.phone}
                    </a>
                    {customer.email && <span> · {customer.email}</span>}
                  </p>
                </div>
                <div className="text-sm sm:text-right">
                  <p className="font-semibold">{customer.orders} orders recorded</p>
                  <p className="text-muted-foreground">
                    Lifetime order value {formatM(customer.lifetimeSpend)}
                  </p>
                </div>
              </div>
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer font-medium text-primary">
                  Recent orders in this browser ({customerOrders.length})
                </summary>
                {customerOrders.length ? (
                  <ul className="mt-2 divide-y rounded-xl border">
                    {customerOrders.slice(0, 5).map((order) => (
                      <li
                        key={order.id}
                        className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-3 py-2"
                      >
                        <span>
                          {order.number} · {order.address.area}
                        </span>
                        <span className="text-muted-foreground">
                          {ORDER_STATUS_LABEL[order.status]} · {formatM(order.total)} ·{" "}
                          {formatDate(order.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-muted-foreground">
                    No matching order details are saved in this browser.
                  </p>
                )}
              </details>
            </article>
          );
        })}
        {matching.length === 0 && <Empty text="No customers match that search." />}
      </div>
      <p className="text-xs text-muted-foreground">
        Customer records and contact details are stored in this browser prototype.
      </p>
    </section>
  );
}

function ReportsPanel() {
  const { orders } = useAppStore();
  const [windowDays, setWindowDays] = useState("30");
  const now = new Date();
  const start = new Date(now);
  if (windowDays !== "all") start.setDate(start.getDate() - Number(windowDays));
  const reportOrders = orders.filter(
    (order) => windowDays === "all" || new Date(order.createdAt) >= start,
  );
  const cancelled = reportOrders.filter((order) => order.status === "cancelled");
  const activeOrders = reportOrders.filter((order) => order.status !== "cancelled");
  const totalOrderValue = activeOrders.reduce((sum, order) => sum + order.total, 0);
  const paidAmount = activeOrders
    .filter((order) => order.payment.status === "paid")
    .reduce((sum, order) => sum + order.total, 0);
  const outstandingAmount = activeOrders
    .filter((order) => order.payment.status !== "paid")
    .reduce((sum, order) => sum + order.total, 0);
  const orderedItems = new Map<string, { quantity: number; value: number; unit: string }>();
  for (const order of activeOrders) {
    for (const item of order.items) {
      const current = orderedItems.get(item.productId) ?? {
        quantity: 0,
        value: 0,
        unit: item.unit,
      };
      current.quantity += item.quantity;
      current.value += item.lineTotal;
      orderedItems.set(item.productId, current);
    }
  }
  const topItems = [...orderedItems.entries()]
    .sort((a, b) => b[1].quantity - a[1].quantity)
    .slice(0, 5);
  const periodLabel = windowDays === "all" ? "All time" : `Last ${windowDays} days`;

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Reports</h2>
          <p className="text-sm text-muted-foreground">
            Order activity and payment totals based on records saved in this browser.
          </p>
        </div>
        <label className="text-sm font-medium">
          Reporting period
          <select
            className="mt-1 block h-10 rounded-lg border bg-card px-3"
            value={windowDays}
            onChange={(event) => setWindowDays(event.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </label>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Orders placed" value={String(reportOrders.length)} detail={periodLabel} />
        <Metric
          label="Order value"
          value={formatM(totalOrderValue)}
          detail="Excludes cancelled orders"
        />
        <Metric
          label="Marked paid"
          value={formatM(paidAmount)}
          detail="Payment status recorded as paid"
        />
        <Metric
          label="Outstanding"
          value={formatM(outstandingAmount)}
          detail="Active orders not marked paid"
        />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-4 md:p-5">
          <h3 className="font-semibold">Order status</h3>
          <ul className="mt-3 divide-y">
            {Object.entries(ORDER_STATUS_LABEL).map(([status, label]) => (
              <li key={status} className="flex justify-between gap-3 py-2 text-sm">
                <span>{label}</span>
                <strong>{reportOrders.filter((order) => order.status === status).length}</strong>
              </li>
            ))}
          </ul>
          {cancelled.length > 0 && (
            <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">
              Cancelled order value:{" "}
              {formatM(cancelled.reduce((sum, order) => sum + order.total, 0))}
            </p>
          )}
        </section>
        <section className="rounded-2xl border bg-card p-4 md:p-5">
          <h3 className="font-semibold">Most ordered items</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Cancelled orders are excluded; value is the sum of item line totals.
          </p>
          {topItems.length ? (
            <ol className="mt-3 divide-y">
              {topItems.map(([id, item]) => (
                <li key={id} className="flex justify-between gap-3 py-2 text-sm">
                  <span>
                    {orders.flatMap((order) => order.items).find((entry) => entry.productId === id)
                      ?.name ?? "Removed product"}
                  </span>
                  <span className="text-right font-medium">
                    {item.quantity} {item.unit} · {formatM(item.value)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No item sales in this period.
            </p>
          )}
        </section>
      </div>
      <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
        Paid and outstanding totals follow each order’s recorded payment status; delivery status
        does not count as proof of payment. These are local demo reports, not accounting exports.
      </p>
    </section>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="px-5 py-10 text-center text-sm text-muted-foreground">{text}</p>;
}
function OrderRow({
  order,
  setStatus,
  assign,
  paymentStatus,
}: {
  order: ReturnType<typeof useAppStore>["orders"][number];
  setStatus: (id: string, status: OrderStatus) => void;
  assign: (id: string, driver: string) => void;
  paymentStatus: (id: string, status: "pending" | "paid" | "unpaid") => void;
}) {
  const next =
    ORDER_STATUS_FLOW[
      Math.min(ORDER_STATUS_FLOW.indexOf(order.status) + 1, ORDER_STATUS_FLOW.length - 1)
    ] ?? order.status;
  return (
    <article className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{order.number}</h3>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
            {ORDER_STATUS_LABEL[order.status]}
          </span>
          <span className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</span>
        </div>
        <p className="mt-1 text-sm">
          {order.customer.name} · {order.customer.phone} · {order.address.area}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {order.items.map((i) => `${i.quantity} ${i.name}`).join(" · ")}
        </p>
        <p className="mt-1 text-sm font-semibold">
          {formatM(order.total)}{" "}
          <span className="font-normal text-muted-foreground">
            · {PAYMENT_LABEL[order.payment.method]} ({order.payment.status})
          </span>
        </p>
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-semibold text-primary">
            Delivery notes and status history
          </summary>
          <p className="mt-2 text-sm">
            {order.address.address}
            {order.address.landmark ? ` · Near ${order.address.landmark}` : ""}
          </p>
          {order.address.instructions && (
            <p className="text-sm text-muted-foreground">Driver: {order.address.instructions}</p>
          )}
          <ol className="mt-2 space-y-1">
            {order.timeline.map((event, i) => (
              <li key={`${event.at}-${i}`} className="text-xs text-muted-foreground">
                {event.status === "note"
                  ? event.note
                  : (ORDER_STATUS_LABEL[event.status as OrderStatus] ?? "Order placed")}{" "}
                ·{" "}
                {new Date(event.at).toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </li>
            ))}
          </ol>
        </details>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label={`Assign driver for ${order.number}`}
          className="h-9 rounded-lg border bg-background px-2 text-sm"
          value={order.driver || "Not assigned"}
          onChange={(e) =>
            assign(order.id, e.target.value === "Not assigned" ? "" : e.target.value)
          }
        >
          {drivers.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <select
          aria-label={`Payment status for ${order.number}`}
          className="h-9 rounded-lg border bg-background px-2 text-sm"
          value={order.payment.status}
          onChange={(e) => paymentStatus(order.id, e.target.value as "pending" | "paid" | "unpaid")}
        >
          <option value="pending">Payment pending</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
        {order.status !== "delivered" && order.status !== "cancelled" && (
          <>
            <Button size="sm" onClick={() => setStatus(order.id, next)}>
              {next === order.status ? "Current" : `Mark ${ORDER_STATUS_LABEL[next]}`}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStatus(order.id, "cancelled")}>
              Cancel
            </Button>
          </>
        )}
      </div>
    </article>
  );
}
function SettingsPanel() {
  const { shop, updateShop } = useAppStore();
  const [saved, setSaved] = useState(false);
  const textField = (name: "phone" | "whatsapp" | "address" | "openingHours", label: string) => (
    <label className="block text-sm font-medium">
      {label}
      <Input
        className="mt-1.5"
        value={shop[name]}
        onChange={(e) => {
          updateShop({ [name]: e.target.value });
          setSaved(false);
        }}
      />
    </label>
  );
  const moneyField = (name: "deliveryFee" | "minimumOrder", label: string) => (
    <label className="block text-sm font-medium">
      {label}
      <Input
        type="number"
        min="0"
        step="0.5"
        className="mt-1.5"
        value={shop[name]}
        onChange={(e) => {
          updateShop({ [name]: Number(e.target.value) });
          setSaved(false);
        }}
      />
    </label>
  );
  return (
    <section className="max-w-3xl space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Shop settings</h2>
        <p className="text-sm text-muted-foreground">
          Contact details, delivery offer, and opening information.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {textField("phone", "Phone")}
        {textField("whatsapp", "WhatsApp")}
        {textField("address", "Shop address")}
        {textField("openingHours", "Opening hours")}
        {moneyField("deliveryFee", "Delivery fee (M)")}
        {moneyField("minimumOrder", "Minimum order (M)")}
        <label className="block text-sm font-medium">
          Default delivery area
          <select
            className="mt-1.5 h-10 w-full rounded-lg border bg-card px-3"
            value={shop.defaultDeliveryArea}
            onChange={(e) => {
              updateShop({ defaultDeliveryArea: e.target.value });
              setSaved(false);
            }}
          >
            {shop.deliveryAreas.map((area) => (
              <option key={area}>{area}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm font-medium">
        Delivery areas, separated by commas
        <Input
          className="mt-1.5"
          value={shop.deliveryAreas.join(", ")}
          onChange={(e) => {
            const areas = e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            updateShop({
              deliveryAreas: areas,
              defaultDeliveryArea: areas.includes(shop.defaultDeliveryArea)
                ? shop.defaultDeliveryArea
                : (areas[0] ?? ""),
            });
            setSaved(false);
          }}
        />
      </label>
      <div className="flex flex-wrap gap-4">
        {(
          [
            ["mobileMoney", "Mobile money"],
            ["cashOnDelivery", "Cash on delivery"],
            ["card", "Card"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={shop.paymentOptions[key]}
              onChange={(e) => {
                updateShop({ paymentOptions: { ...shop.paymentOptions, [key]: e.target.checked } });
                setSaved(false);
              }}
            />
            {label}
          </label>
        ))}
      </div>
      <Button onClick={() => setSaved(true)}>Save settings</Button>
      {saved && (
        <p role="status" className="text-sm text-primary">
          Shop settings saved in this browser.
        </p>
      )}
    </section>
  );
}
