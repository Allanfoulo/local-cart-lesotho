import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore, ORDER_STATUS_LABEL, PAYMENT_LABEL } from "@/lib/app-store";
import { formatDate, formatM, formatTime } from "@/lib/format";

export const Route = createFileRoute("/_store/order-confirmation/$id")({
  head: () => ({ meta: [{ title: "Mabote Fresh | Order confirmed" }, { name: "description", content: "Your grocery order details." }] }),
  component: OrderConfirmation,
});

function OrderConfirmation() {
  const { id } = Route.useParams();
  const order = useAppStore().orders.find((item) => item.id === id);
  if (!order) return <main className="mx-auto max-w-xl px-4 py-16 text-center"><PackageCheck className="mx-auto size-12 text-primary"/><h1 className="mt-4 text-2xl font-bold">Order details unavailable</h1><p className="mt-2 text-muted-foreground">This order may have been cleared from this browser.</p><Link to="/shop"><Button className="mt-5">Back to shop</Button></Link></main>;
  return <main className="mx-auto max-w-2xl px-4 py-10 md:py-16">
    <div className="text-center"><CheckCircle2 className="mx-auto size-14 text-primary"/><p className="mt-4 text-sm font-semibold text-primary">ORDER PLACED</p><h1 className="mt-1 text-3xl font-bold">Thanks, {order.customer.name.split(" ")[0]}.</h1><p className="mt-2 text-muted-foreground">Your order is with the Mabote Fresh team.</p></div>
    <section className="mt-8 rounded-2xl border bg-card p-5 md:p-7"><div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4"><div><p className="text-sm text-muted-foreground">Order number</p><p className="text-xl font-bold">{order.number}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-primary">{ORDER_STATUS_LABEL[order.status]}</span></div>
      <div className="grid gap-4 border-b py-4 sm:grid-cols-2"><div><p className="text-sm text-muted-foreground">Delivery to</p><p className="mt-1 font-semibold">{order.address.address}, {order.address.area}</p>{order.address.landmark&&<p className="text-sm text-muted-foreground">Near {order.address.landmark}</p>}<p className="mt-2 text-sm"><span className="text-muted-foreground">Estimated delivery:</span> {formatDate(order.estimatedDelivery)} around {formatTime(order.estimatedDelivery)}</p></div>
      <div><p className="text-sm text-muted-foreground">Payment</p><p className="mt-1 font-semibold">{PAYMENT_LABEL[order.payment.method]}</p><p className="text-sm text-muted-foreground">{order.payment.status=== "pending"?"Payment pending":order.payment.status}</p>{order.payment.changeRequired!=null&&order.payment.changeRequired>0&&<p className="mt-2 text-sm text-muted-foreground">Your driver should bring {formatM(order.payment.changeRequired)} change.</p>}</div></div>
      <ul className="divide-y">{order.items.map(item=><li key={item.productId} className="flex justify-between gap-3 py-3 text-sm"><span>{item.quantity} × {item.name}</span><span className="font-semibold">{formatM(item.lineTotal)}</span></li>)}</ul><div className="flex justify-between border-t pt-4 text-lg font-bold"><span>Total</span><span>{formatM(order.total)}</span></div><p className="mt-3 text-xs text-muted-foreground">Placed {formatDate(order.createdAt)}. Order updates will appear in your account when the shop changes the status.</p></section>
    <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Link to="/orders"><Button>View your orders</Button></Link><Link to="/shop"><Button variant="outline">Continue shopping</Button></Link></div>
  </main>;
}
