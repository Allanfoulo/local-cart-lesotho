import { Button } from "@/components/ui/button";
import { useAppStore, ORDER_STATUS_LABEL, PAYMENT_LABEL } from "@/lib/app-store";
import { formatDate, formatM } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { canAssignPreparation, nextOrderStatus, type OrderWorkflowRole } from "@/domain/orders/workflow";

export function DispatchOrdersQueue({ storeId }: { storeId?: string } = {}) {
  const store = useAppStore();
  const access = useQuery(api.memberships.currentAccess, {});
  const openOrders = store.orders
    .filter((order) => (!storeId || order.storeId === storeId) && !["delivered", "rejected", "cancelled"].includes(order.status))
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
            const storeRoles = access?.memberships.filter((membership) => membership.storeId === order.storeId) ?? [];
            const canDispatch = Boolean(access?.isSuperadmin || storeRoles.some((membership) => ["store_owner", "store_manager", "dispatcher"].includes(membership.role)));
            const canManagePayment = Boolean(access?.isSuperadmin || storeRoles.some((membership) => ["store_owner", "store_manager"].includes(membership.role)));
            const role: OrderWorkflowRole = access?.isSuperadmin ? "store_manager" :
              storeRoles.some((membership) => membership.role === "store_owner") ? "store_owner" :
              storeRoles.some((membership) => membership.role === "store_manager") ? "store_manager" :
              storeRoles.some((membership) => membership.role === "dispatcher") ? "dispatcher" : "order_staff";
            const nextStatus = nextOrderStatus(role, order.status);
            const preparationStaff = store.preparationStaff.filter((member) => member.storeIds.includes(order.storeId ?? ""));
            const drivers = store.drivers.filter((driver) => driver.storeIds.includes(order.storeId ?? ""));
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
                  {order.assignedStaff && <p className="mt-1 text-sm text-muted-foreground">Preparation: {order.assignedStaff}</p>}
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
                  <div className={`mt-3 grid gap-2 ${canDispatch && canManagePayment ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}>
                    {canManagePayment && preparationStaff.length > 0 && !["ready", "out_for_delivery", "delivered", "rejected", "cancelled"].includes(order.status) && (
                      <label className="text-sm font-medium">
                        Preparation staff
                        <select aria-label={`Assign order preparation for ${order.number}`} className="mt-1 h-11 w-full rounded-xl border bg-background px-3" value={order.assignedStaffUserId || "Not assigned"} onChange={(event) => store.assignPreparationStaff(order.id, event.target.value === "Not assigned" ? "" : event.target.value)}>
                          <option value="Not assigned">Not assigned</option>
                          {preparationStaff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                        </select>
                      </label>
                    )}
                    {canDispatch && (
                    <label className="text-sm font-medium">
                      Driver
                      <select
                        aria-label={`Assign driver for ${order.number}`}
                        className="mt-1 h-11 w-full rounded-xl border bg-background px-3"
                        value={order.driverUserId || "Not assigned"}
                        onChange={(event) =>
                          store.assignDriver(
                            order.id,
                            event.target.value === "Not assigned" ? "" : event.target.value,
                          )
                        }
                      >
                        <option>Not assigned</option>
                        {drivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>{driver.name}</option>
                        ))}
                      </select>
                    </label>
                    )}
                    {canManagePayment && (
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
                    )}
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
                  {canManagePayment && order.status === "received" && <Button variant="outline" className="mt-2 w-full" onClick={() => store.updateOrderStatus(order.id, "rejected")}>Reject order</Button>}
                  {canManagePayment && !["rejected", "cancelled"].includes(order.status) && <Button variant="outline" className="mt-2 w-full" onClick={() => store.updateOrderStatus(order.id, "cancelled")}>Cancel order</Button>}
                  {!canDispatch && order.status === "ready" && <p className="mt-2 text-center text-sm text-muted-foreground">Ready for dispatch.</p>}
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
