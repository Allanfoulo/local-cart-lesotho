import { Link, createFileRoute } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { CheckCircle2, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "../../convex/_generated/api";
import { ORDER_STATUS_LABEL, PAYMENT_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/app-store";
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
  const { isLoading, isAuthenticated } = useConvexAuth();
  const receipt = useQuery(api.orders.checkoutReceipt, { checkoutId: id });
  const receiptOrders = receipt?.orders ?? [];
  const firstOrder = receiptOrders[0];

  if (receipt === undefined)
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center" role="status">
        <p className="text-muted-foreground">Loading your receipt…</p>
      </main>
    );

  if (!receipt || !firstOrder)
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <PackageCheck className="mx-auto size-12 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">Order details unavailable</h1>
        <p className="mt-2 text-muted-foreground">
          We could not find this checkout receipt. Check the link or contact support if you need
          help.
        </p>
        <Link to="/shop">
          <Button className="mt-5">Back to shop</Button>
        </Link>
      </main>
    );

  const total = receipt.total;
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 md:py-16">
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-14 text-primary" />
        <p className="mt-4 text-sm font-semibold text-primary">CHECKOUT PLACED</p>
        <h1 className="mt-1 break-words text-2xl font-bold sm:text-3xl">
          Thanks, {firstOrder.customerName.split(" ")[0]}.
        </h1>
        <p className="mt-2 text-muted-foreground">
          {receiptOrders.length === 1
            ? `Your order is with ${firstOrder.storeName ?? "the store"}.`
            : `Your checkout was sent to ${receiptOrders.length} stores.`}
        </p>
      </div>
      <section className="mt-8 space-y-5 rounded-2xl border bg-card p-5 md:p-7">
        {receiptOrders.map((order) => (
          <article key={order.orderNumber} className="border-b pb-5 last:border-0 last:pb-0">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
              <div>
                <p className="text-sm text-muted-foreground">{order.storeName}</p>
                <p className="text-xl font-bold">{order.orderNumber}</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-primary">
                {ORDER_STATUS_LABEL[order.status as keyof typeof ORDER_STATUS_LABEL]}
              </span>
            </div>
            <div className="grid gap-4 border-b py-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Delivery to</p>
                <p className="mt-1 break-words font-semibold">
                  {order.destination.address}, {order.destination.area}
                </p>
                {order.destination.landmark && (
                  <p className="text-sm text-muted-foreground">Near {order.destination.landmark}</p>
                )}
                {order.destination.instructions && (
                  <p className="text-sm text-muted-foreground">
                    Driver directions: {order.destination.instructions}
                  </p>
                )}
                <p className="mt-2 text-sm">
                  <span className="text-muted-foreground">Estimated delivery:</span>{" "}
                  {formatDate(new Date(order.estimatedDeliveryAt).toISOString())} around{" "}
                  {formatTime(new Date(order.estimatedDeliveryAt).toISOString())}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment</p>
                <p className="mt-1 font-semibold">{PAYMENT_LABEL[order.payment.method]}</p>
                <p className="text-sm text-muted-foreground">
                  {PAYMENT_STATUS_LABEL[order.payment.status]}
                </p>
                {order.payment.exactAmount !== undefined && (
                  <p className="text-sm text-muted-foreground">
                    {order.payment.exactAmount ? "Exact cash requested" : "Change requested"}
                  </p>
                )}
                {receipt.changeRequired !== null &&
                  receipt.changeRequired > 0 &&
                  order === firstOrder && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Your driver should bring {formatM(receipt.changeRequired)} change.
                    </p>
                  )}
              </div>
            </div>
            <ul className="divide-y">
              {order.items.map((item) => (
                <li key={item.productId} className="flex justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0 break-words">
                    {item.quantity} × {item.name}
                  </span>
                  <span className="font-semibold">{formatM(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatM(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Coupon discount</span>
                  <span>−{formatM(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery</span>
                <span>{formatM(order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between pt-1 text-base font-bold">
                <span>Store total</span>
                <span>{formatM(order.total)}</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Placed {formatDate(new Date(order.createdAt).toISOString())}. Keep this receipt link
              to return to your checkout details.
            </p>
          </article>
        ))}
        {receiptOrders.length > 1 && (
          <div className="flex justify-between border-t pt-4 text-lg font-bold">
            <span>Checkout total</span>
            <span>{formatM(total)}</span>
          </div>
        )}
      </section>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        {!isLoading && isAuthenticated && (
          <Link to="/orders" className="w-full sm:w-auto">
            <Button className="min-h-11 w-full">View your orders</Button>
          </Link>
        )}
        <Link to="/shop" className="w-full sm:w-auto">
          <Button className="min-h-11 w-full" variant="outline">
            Continue shopping
          </Button>
        </Link>
      </div>
      {!isLoading && !isAuthenticated && (
        <section className="mx-auto mt-8 max-w-xl rounded-2xl border bg-card p-5 text-center">
          <h2 className="font-semibold">Save your details for next time</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a customer account to save addresses and see future signed-in orders. Keep this
            receipt link to check this guest order.
          </p>
          <Link to="/sign-in" search={{ createAccount: true, returnTo: "/account" }}>
            <Button className="mt-4 min-h-11 w-full sm:w-auto">Create a customer account</Button>
          </Link>
        </section>
      )}
    </main>
  );
}
