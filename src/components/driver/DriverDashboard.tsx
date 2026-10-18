import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, ChevronDown, MapPin, Phone, Truck } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { DeliveryMap } from "@/components/maps/DeliveryMap";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WorkspaceSwitcher } from "@/components/auth/WorkspaceSwitcher";
import { mapAssignedDelivery } from "@/features/orders/convex-mapper";
import { useAppStore } from "@/lib/app-store";
import { deliveryAreasForMap, orderMapPoint } from "@/lib/delivery-map";
import { formatM } from "@/lib/format";
import type { Order } from "@/lib/types";

const inProgress = new Set(["ready", "out_for_delivery"]);

function orderSequence(orders: Order[], sequences: Record<string, string[]>) {
  return [...orders].sort((a, b) => {
    if (a.storeId !== b.storeId) return (a.storeName ?? "").localeCompare(b.storeName ?? "");
    const ids = sequences[`${a.storeId}::${a.driverUserId}`] ?? [];
    const aIndex = ids.indexOf(a.id);
    const bIndex = ids.indexOf(b.id);
    return (
      (aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex) -
      (bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex)
    );
  });
}

export function DriverDashboard() {
  const store = useAppStore();
  const deliveryProjection = useQuery(api.orders.myAssigned, {});
  const updateOrderStatus = useMutation(api.orders.updateStatus);
  const [mapOpen, setMapOpen] = useState(false);
  const [pendingDelivery, setPendingDelivery] = useState<Order | null>(null);
  const [busyStopId, setBusyStopId] = useState<string | null>(null);
  const [failedUpdate, setFailedUpdate] = useState<{ order: Order; status: "out_for_delivery" | "delivered" } | null>(null);
  const [updateError, setUpdateError] = useState("");
  const { signOut } = useAuthActions();
  const assigned = deliveryProjection?.orders.map(mapAssignedDelivery).filter((order) => inProgress.has(order.status)) ?? [];
  const routeSequences = Object.fromEntries((deliveryProjection?.routeSequences ?? []).map((sequence) => {
    const driverId = deliveryProjection?.orders.find((order) => order.storeId === sequence.storeId)?.driverUserId ?? "";
    return [`${String(sequence.storeId)}::${String(driverId)}`, sequence.orderIds.map(String)];
  }));
  const ordered = orderSequence(assigned, routeSequences);
  const assignedStoreIds = new Set(ordered.map((order) => order.storeId));
  const areas = deliveryAreasForMap([...new Set(store.stores.filter((shop) => assignedStoreIds.has(shop.id)).flatMap((shop) => shop.deliveryAreas))]);
  const points = ordered.flatMap((order) => {
    const point = orderMapPoint(order);
    return point ? [{ ...point, label: order.number }] : [];
  });
  const currentStop = ordered[0];

  const updateStop = async (order: Order, status: "out_for_delivery" | "delivered") => {
    setBusyStopId(order.id);
    setUpdateError("");
    setFailedUpdate(null);
    try {
      await updateOrderStatus({ orderId: order.id as Id<"orders">, status });
      setPendingDelivery(null);
    } catch {
      setFailedUpdate({ order, status });
      setUpdateError("This update did not sync. The stop will stay active until Convex confirms it.");
    } finally {
      setBusyStopId(null);
    }
  };

  return (
    <main className="min-h-screen bg-background px-3 pb-8 pt-4 sm:px-5 sm:pt-6">
      <div className="mx-auto max-w-xl">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              REETAPELE · Driver
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Today’s deliveries</h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <WorkspaceSwitcher />
            <Button variant="outline" className="min-h-11" onClick={() => void signOut()}>Sign out</Button>
          </div>
        </header>

        <section aria-labelledby="current-stop-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="current-stop-heading" className="font-semibold">
              Next stop
            </h2>
            <span className="text-sm text-muted-foreground">{ordered.length} remaining</span>
          </div>

          {deliveryProjection === undefined ? (
            <div className="rounded-2xl border bg-card px-5 py-10 text-center text-sm text-muted-foreground" role="status">
              Loading assigned deliveries…
            </div>
          ) : currentStop ? (
            <article className="overflow-hidden rounded-2xl border bg-card">
              <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-foreground">
                  1
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {currentStop.number} · {currentStop.customer.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentStop.status === "ready" ? "Ready to collect" : "Out for delivery"}
                  </p>
                </div>
                <span className="text-sm font-semibold">{formatM(currentStop.total)}</span>
              </div>

              <div className="space-y-4 p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="font-medium">{currentStop.address.area}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {currentStop.address.address}
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      Near: {currentStop.address.landmark || "No landmark recorded"}
                    </p>
                    {currentStop.address.instructions && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {currentStop.address.instructions}
                      </p>
                    )}
                  </div>
                </div>

                <a
                  href={`tel:${currentStop.customer.phone.replace(/\s/g, "")}`}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl border font-semibold text-primary"
                >
                  <Phone className="size-4" />
                  Call {currentStop.customer.name.split(" ")[0]}
                </a>

                <Button
                  className="h-12 w-full text-base"
                  disabled={busyStopId === currentStop.id}
                  onClick={() => currentStop.status === "ready" ? void updateStop(currentStop, "out_for_delivery") : setPendingDelivery(currentStop)}
                >
                  {currentStop.status === "ready" ? (
                    <>
                      <Truck className="size-4" /> Start delivery
                    </>
                  ) : (
                    <>
                      <Check className="size-4" /> Confirm delivery
                    </>
                  )}
                </Button>
                {updateError && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <p>{updateError}</p>
                  {failedUpdate && <Button className="mt-2 min-h-11" variant="outline" disabled={busyStopId !== null} onClick={() => void updateStop(failedUpdate.order, failedUpdate.status)}>{busyStopId === failedUpdate.order.id ? "Retrying…" : "Retry update"}</Button>}
                </div>}
              </div>
            </article>
          ) : (
            <div className="rounded-2xl border bg-card px-5 py-10 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-primary">
                <Check className="size-6" />
              </span>
              <h3 className="mt-3 font-semibold">You’re all caught up</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Ready orders assigned to you will appear here.
              </p>
            </div>
          )}
        </section>

        {ordered.length > 1 && (
          <section className="mt-6">
            <h2 className="mb-3 font-semibold">Following stops</h2>
            <ol className="divide-y rounded-2xl border bg-card">
              {ordered.slice(1).map((order, index) => (
                <li key={order.id} className="flex items-start gap-3 p-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold">
                    {index + 2}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {order.number} · {order.customer.name}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {order.address.area} · {order.address.landmark || "No landmark"}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">{formatM(order.total)}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <details
          className="mt-6 overflow-hidden rounded-2xl border bg-card"
          onToggle={(event) => setMapOpen(event.currentTarget.open)}
        >
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 font-semibold">
            <span className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" /> Delivery area map
            </span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </summary>
          {mapOpen && (
            <div className="border-t p-2">
              <DeliveryMap
                points={points}
                areas={areas}
                height="240px"
                ariaLabel="Approximate neighbourhood centers for assigned delivery stops"
              />
              <p className="px-2 py-2 text-xs text-muted-foreground">
                Pins show approximate neighbourhood centres, not the customer’s exact house. No
                address or customer coordinates are sent to the map.
              </p>
            </div>
          )}
        </details>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Delivery updates sync with your store workspace.
        </p>
      </div>
      <AlertDialog open={pendingDelivery !== null} onOpenChange={(open) => { if (!open && busyStopId === null) setPendingDelivery(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm this delivery?</AlertDialogTitle>
            <AlertDialogDescription>
              Mark order {pendingDelivery?.number} as delivered only after handing it to the customer. This updates the customer’s order status.
            </AlertDialogDescription>
            {updateError && <p role="alert" className="rounded-lg bg-destructive/5 p-3 text-sm text-destructive">{updateError}</p>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11" disabled={busyStopId !== null}>Keep stop active</AlertDialogCancel>
            <AlertDialogAction className="min-h-11" disabled={busyStopId !== null} onClick={(event) => { event.preventDefault(); if (pendingDelivery) void updateStop(pendingDelivery, "delivered"); }}>
              {busyStopId ? "Saving…" : failedUpdate?.status === "delivered" ? "Retry confirmation" : "Confirm delivered"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
