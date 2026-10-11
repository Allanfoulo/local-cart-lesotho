import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ORDER_STATUS_LABEL, PAYMENT_LABEL, useAppStore } from "@/lib/app-store";
import { formatDate, formatM, formatTime } from "@/lib/format";

export const Route = createFileRoute("/_store/order-confirmation/$id")({
  head: () => ({
    meta: [
      { title: "REETAPELE | Order confirmed" },
      { name: "description", content: "Your marketplace checkout confirmation." },
    ],
  }),
  component: OrderConfirmation,
});

function OrderConfirmation() {
  const { id } = Route.useParams();
  const savedOrders = useAppStore().orders;
  const orders = savedOrders.filter((order) => order.checkoutId === id);
  const receiptOrders = orders.length ? orders : savedOrders.filter((order) => order.id === id);
  const firstOrder = receiptOrders[0];

  if (!firstOrder)
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <PackageCheck className="mx-auto size-12 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">Order details unavailable</h1>
        <p className="mt-2 text-muted-foreground">This checkout receipt may have been cleared from this browser.</p>
        <Link to="/shop"><Button className="mt-5">Back to shop</Button></Link>
      </main>
    );

  const total = receiptOrders.reduce((sum, order) => sum + order.total, 0);
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 md:py-16">
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-14 text-primary" />
        <p className="mt-4 text-sm font-semibold text-primary">CHECKOUT PLACED</p>
        <h1 className="mt-1 text-3xl font-bold">Thanks, {firstOrder.customer.name.split(" ")[0]}.</h1>
        <p className="mt-2 text-muted-foreground">
          {receiptOrders.length === 1
            ? `Your order is with ${firstOrder.storeName ?? "the store"}.`
            : `Your checkout was sent to ${receiptOrders.length} stores.`}
        </p>
      </div>
      <section className="mt-8 space-y-5 rounded-2xl border bg-card p-5 md:p-7">
        {receiptOrders.map((order) => (
          <article key={order.id} className="border-b pb-5 last:border-0 last:pb-0">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
              <div>
                <p className="text-sm text-muted-foreground">{order.storeName ?? "Store"}</p>
                <p className="text-xl font-bold">{order.number}</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-primary">
                {ORDER_STATUS_LABEL[order.status]}
              </span>
            </div>
            <div className="grid gap-4 border-b py-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Delivery to</p>
                <p className="mt-1 font-semibold">{order.address.address}, {order.address.area}</p>
                {order.address.landmark && <p className="text-sm text-muted-foreground">Near {order.address.landmark}</p>}
                <p className="mt-2 text-sm">
                  <span className="text-muted-foreground">Estimated delivery:</span> {formatDate(order.estimatedDelivery)} around {formatTime(order.estimatedDelivery)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment</p>
                <p className="mt-1 font-semibold">{PAYMENT_LABEL[order.payment.method]}</p>
                <p className="text-sm text-muted-foreground">{order.payment.status === "pending" ? "Payment pending" : order.payment.status}</p>
                {order.payment.changeRequired != null && order.payment.changeRequired > 0 && (
                  <p className="mt-2 text-sm text-muted-foreground">Your driver should bring {formatM(order.payment.changeRequired)} change.</p>
                )}
              </div>
            </div>
            <ul className="divide-y">
              {order.items.map((item) => (
                <li key={item.productId} className="flex justify-between gap-3 py-3 text-sm">
                  <span>{item.quantity} × {item.name}</span>
                  <span className="font-semibold">{formatM(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatM(order.subtotal)}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-primary"><span>Coupon discount</span><span>−{formatM(order.discount)}</span></div>}
              <div className="flex justify-between"><span>Delivery</span><span>{formatM(order.deliveryFee)}</span></div>
              <div className="flex justify-between pt-1 text-base font-bold"><span>Store total</span><span>{formatM(order.total)}</span></div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Placed {formatDate(order.createdAt)}. This receipt is saved on this device.</p>
          </article>
        ))}
        {receiptOrders.length > 1 && (
          <div className="flex justify-between border-t pt-4 text-lg font-bold">
            <span>Checkout total</span><span>{formatM(total)}</span>
          </div>
        )}
      </section>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link to="/orders"><Button>View your orders</Button></Link>
        <Link to="/shop"><Button variant="outline">Continue shopping</Button></Link>
      </div>
    </main>
  );
}
