import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useAppStore, ORDER_STATUS_FLOW, ORDER_STATUS_LABEL, PAYMENT_LABEL } from "@/lib/app-store";
import { formatDate, formatM } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

const demoDrivers = ["Moshe Thabane", "Kabelo M.", "Lineo P."];

export function DispatchOrdersQueue() {
  const store = useAppStore();
  const drivers = useMemo(
    () =>
      [
        ...new Set([...demoDrivers, ...store.orders.map((order) => order.driver).filter(Boolean)]),
      ] as string[],
    [store.orders],
  );
  const openOrders = store.orders
    .filter((order) => !["delivered", "cancelled"].includes(order.status))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <section aria-labelledby="dispatch-orders-title">
      <header className="mb-4">
        <h2 id="dispatch-orders-title" className="text-lg font-semibold">
          Orders to prepare
        </h2>
        <p className="text-sm text-muted-foreground">
          Confirm the order, check payment, and mark it ready for a driver.
        </p>
      </header>
      {openOrders.length ? (
        <ol className="space-y-3">
          {openOrders.map((order) => {
            const statusIndex = ORDER_STATUS_FLOW.indexOf(order.status);
            const nextStatus =
              ORDER_STATUS_FLOW[Math.min(statusIndex + 1, ORDER_STATUS_FLOW.length - 1)] ??
              order.status;
            return (
              <li key={order.id}>
                <article className="rounded-2xl border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {order.number} · {order.customer.name}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {order.address.area} · {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-xs font-medium">
                      {ORDER_STATUS_LABEL[order.status]}
                    </span>
                  </div>
                  <p className="mt-3 text-sm">
                    {order.items.map((item) => `${item.quantity} ${item.name}`).join(" · ")}
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatM(order.total)}
                    <span className="font-normal text-muted-foreground">
                      {` · ${PAYMENT_LABEL[order.payment.method]} (${order.payment.status})`}
                    </span>
                  </p>
                  <details className="mt-3">
                    <summary className="min-h-10 cursor-pointer py-2 text-sm font-semibold text-primary">
                      Customer and delivery details
                    </summary>
                    <div className="space-y-1 pb-2 text-sm">
                      <a
                        href={`tel:${order.customer.phone.replace(/\s/g, "")}`}
                        className="font-medium text-primary"
                      >
                        {order.customer.phone}
                      </a>
                      <p>{order.address.address}</p>
                      <p>Near: {order.address.landmark || "No landmark recorded"}</p>
                      {order.address.instructions && (
                        <p className="text-muted-foreground">
                          Driver: {order.address.instructions}
                        </p>
                      )}
                    </div>
                  </details>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label className="text-sm font-medium">
                      Driver
                      <select
                        aria-label={`Assign driver for ${order.number}`}
                        className="mt-1 h-11 w-full rounded-xl border bg-background px-3"
                        value={order.driver || "Not assigned"}
                        onChange={(event) =>
                          store.assignDriver(
                            order.id,
                            event.target.value === "Not assigned" ? "" : event.target.value,
                          )
                        }
                      >
                        <option>Not assigned</option>
                        {drivers.map((name) => (
                          <option key={name}>{name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-medium">
                      Payment status
                      <select
                        aria-label={`Payment status for ${order.number}`}
                        className="mt-1 h-11 w-full rounded-xl border bg-background px-3"
                        value={order.payment.status}
                        onChange={(event) =>
                          store.setOrderPaymentStatus(
                            order.id,
                            event.target.value as "pending" | "paid" | "unpaid",
                          )
                        }
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="unpaid">Unpaid</option>
                      </select>
                    </label>
                  </div>
                  <Button
                    className="mt-3 h-12 w-full text-base"
                    disabled={
                      nextStatus === order.status ||
                      (nextStatus === "out_for_delivery" && !order.driver)
                    }
                    onClick={() => store.updateOrderStatus(order.id, nextStatus as OrderStatus)}
                  >
                    {nextStatus === "out_for_delivery" && !order.driver
                      ? "Assign a driver to continue"
                      : `Mark ${ORDER_STATUS_LABEL[nextStatus]}`}
                  </Button>
                </article>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="rounded-2xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          No open orders to prepare.
        </p>
      )}
    </section>
  );
}
