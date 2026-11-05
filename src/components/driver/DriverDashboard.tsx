import { useAuthActions } from "@convex-dev/auth/react";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, ChevronDown, MapPin, Phone, Truck } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { DeliveryMap } from "@/components/maps/DeliveryMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const confirmDelivery = useMutation(api.orders.confirmDelivery);
  const [mapOpen, setMapOpen] = useState(false);
  const [pendingDelivery, setPendingDelivery] = useState<Order | null>(null);
  const [deliveryCode, setDeliveryCode] = useState("");
  const [busyStopId, setBusyStopId] = useState<string | null>(null);
  const [failedUpdate, setFailedUpdate] = useState<Order | null>(null);
  const [updateError, setUpdateError] = useState("");
  const { signOut } = useAuthActions();
  const assigned = deliveryProjection?.orders.map(mapAssignedDelivery).filter((order) => inProgress.has(order.status)) ?? [];
  const pendingAssignments = deliveryProjection?.pendingAssignments ?? [];
  const routeSequences = Object.fromEntries((deliveryProjection?.routeSequences ?? []).map((sequence) => {
    const driverId = deliveryProjection?.orders.find((order) => order.storeId === sequence.storeId)?.driverUserId ?? "";
    return [`${String(sequence.storeId)}::${String(driverId)}`, sequence.orderIds.map(String)];
  }));
  const ordered = orderSequence(assigned, routeSequences);
  const currentStop = ordered[0];
  const tracking = useQuery(
    api.deliveryTracking.forOrder,
    currentStop?.status === "out_for_delivery"
      ? { orderId: currentStop.id as Id<"orders"> }
      : "skip",
  );
  const assignedStoreIds = new Set(ordered.map((order) => order.storeId));
  const areas = deliveryAreasForMap([...new Set(store.stores.filter((shop) => assignedStoreIds.has(shop.id)).flatMap((shop) => shop.deliveryAreas))]);
  const points = ordered.flatMap((order) => {
    const point = orderMapPoint(order);
    return point ? [{ ...point, label: order.number }] : [];
  });
  const liveTrip = tracking?.active && tracking.location
    ? {
        orderId: currentStop?.id ?? "",
        driverLocation: { lat: tracking.location.latitude, lng: tracking.location.longitude },
        ...(tracking.destination ? { destination: { lat: tracking.destination.latitude, lng: tracking.destination.longitude } } : {}),
        routeStatus: tracking.location.routeStatus,
        ...(tracking.location.distanceMeters === undefined ? {} : { distanceMeters: tracking.location.distanceMeters }),
        ...(tracking.location.durationSeconds === undefined ? {} : { durationSeconds: tracking.location.durationSeconds }),
        ...(tracking.location.encodedPolyline === undefined ? {} : { encodedPolyline: tracking.location.encodedPolyline }),
      }
    : undefined;

  const updateStop = async (order: Order) => {
    setBusyStopId(order.id);
    setUpdateError("");
    setFailedUpdate(null);
    try {
      await updateOrderStatus({ orderId: order.id as Id<"orders">, status: "out_for_delivery" });
    } catch {
      setFailedUpdate(order);
      setUpdateError("This update did not sync. The stop will stay active until Convex confirms it.");
    } finally {
      setBusyStopId(null);
    }
  };

  const confirmPendingDelivery = async () => {
    if (!pendingDelivery) return;
    setBusyStopId(pendingDelivery.id);
    setUpdateError("");
    setFailedUpdate(null);
    try {
      const result = await confirmDelivery({ orderId: pendingDelivery.id as Id<"orders">, code: deliveryCode });
      if (!result.success) {
        if (result.reason === "locked") {
          setUpdateError("Too many incorrect attempts. Ask the customer to request a new code in their order details.");
        } else if (result.reason === "code_unavailable") {
          setUpdateError("No active code is available. Ask the customer to generate one in their order details.");
        } else {
          setUpdateError(`That code is incorrect. ${result.attemptsRemaining} attempt${result.attemptsRemaining === 1 ? "" : "s"} remaining.`);
        }
        return;
      }
      setPendingDelivery(null);
      setDeliveryCode("");
    } catch {
      setUpdateError("Could not confirm this delivery. Check the code and connection, then try again.");
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
              REETAPELE Â· Driver
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Todayâ€™s deliveries</h1>
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
              Loading assigned deliveriesâ€¦
            </div>
          ) : currentStop ? (
            <article className="overflow-hidden rounded-2xl border bg-card">
              <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-foreground">
                  1
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {currentStop.number} Â· {currentStop.customer.name}
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

                {currentStop.status === "ready" ? (
                  <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
                    Starting delivery shares your live location with this customer until you confirm delivery. Keep this page open during the trip.
                  </p>
                ) : (
                  <DriverLocationReporter orderId={currentStop.id as Id<"orders">} />
                )}
                {tracking?.active && tracking.location?.routeStatus === "available" &&
                  tracking.location.durationSeconds !== undefined && tracking.location.distanceMeters !== undefined && (
                    <div className="flex items-center justify-between rounded-xl border bg-background p-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Current stop</p>
                        <p className="font-semibold">About {Math.max(1, Math.round(tracking.location.durationSeconds / 60))} min away</p>
                      </div>
                      <p className="text-sm font-semibold text-primary">
                        {tracking.location.distanceMeters < 1000
                          ? `${Math.round(tracking.location.distanceMeters)} m`
                          : `${(tracking.location.distanceMeters / 1000).toFixed(1)} km`} by road
                      </p>
                    </div>
                  )}

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
                  onClick={() => {
                    if (currentStop.status === "ready") void updateStop(currentStop);
                    else {
                      setDeliveryCode("");
                      setUpdateError("");
                      setPendingDelivery(currentStop);
                    }
                  }}
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
                  {failedUpdate && <Button className="mt-2 min-h-11" variant="outline" disabled={busyStopId !== null} onClick={() => void updateStop(failedUpdate)}>{busyStopId === failedUpdate.id ? "Retryingâ€¦" : "Retry update"}</Button>}
                </div>}
              </div>
            </article>
          ) : (
            <div className="rounded-2xl border bg-card px-5 py-10 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-primary">
                <Check className="size-6" />
              </span>
              <h3 className="mt-3 font-semibold">Youâ€™re all caught up</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Ready orders assigned to you will appear here.
              </p>
            </div>
          )}
        </section>

        {pendingAssignments.length > 0 && (
          <section className="mt-5" aria-labelledby="waiting-for-store-heading">
            <h2 id="waiting-for-store-heading" className="mb-2 font-semibold">
              Waiting for store
            </h2>
            <p className="mb-3 text-sm text-muted-foreground">
              These orders are assigned to you. Delivery details and tracking become available when the store marks an order ready.
            </p>
            <ul className="divide-y rounded-2xl border bg-card">
              {pendingAssignments.map((order) => (
                <li key={order._id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-semibold">{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">{order.storeName}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-xs font-medium">
                    {order.status === "received" ? "Received" : order.status === "confirmed" ? "Confirmed" : "Preparing"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

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
                      {order.number} Â· {order.customer.name}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {order.address.area} Â· {order.address.landmark || "No landmark"}
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
                liveTrip={liveTrip}
                height="240px"
                ariaLabel={liveTrip ? "Live driver location and route to the current delivery stop" : "Approximate neighbourhood centers for assigned delivery stops"}
              />
              <p className="px-2 py-2 text-xs text-muted-foreground">
                {liveTrip
                  ? "The current customerâ€™s verified delivery pin and your live location are shown while this stop is active."
                  : "Pins show approximate neighbourhood centres. Live location sharing starts when you begin the next stop."}
              </p>
            </div>
          )}
        </details>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Delivery updates sync with your store workspace.
        </p>
      </div>
      <AlertDialog open={pendingDelivery !== null} onOpenChange={(open) => { if (!open && busyStopId === null) { setPendingDelivery(null); setDeliveryCode(""); setUpdateError(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enter the customerâ€™s delivery code</AlertDialogTitle>
            <AlertDialogDescription>
              Ask the customer to show the code from their REETAPELE order details. Confirm only after handing over order {pendingDelivery?.number}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="block text-sm font-medium">
            Six-digit code
            <Input
              autoComplete="one-time-code"
              autoFocus
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]{6}"
              value={deliveryCode}
              onChange={(event) => setDeliveryCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-1.5 min-h-12 text-center font-mono text-xl tracking-[0.35em]"
              aria-label="Customer delivery confirmation code"
            />
          </label>
          {updateError && <p role="alert" className="rounded-lg bg-destructive/5 p-3 text-sm text-destructive">{updateError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11" disabled={busyStopId !== null}>Keep stop active</AlertDialogCancel>
            <AlertDialogAction className="min-h-11" disabled={busyStopId !== null || deliveryCode.length !== 6} onClick={(event) => { event.preventDefault(); void confirmPendingDelivery(); }}>
              {busyStopId && pendingDelivery ? "Checking code..." : "Confirm delivered"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function DriverLocationReporter({ orderId }: { orderId: Id<"orders"> }) {
  const updateLocation = useMutation(api.deliveryTracking.updateDriverLocation);
  const [state, setState] = useState<"starting" | "sharing" | "paused">("starting");
  const lastPosition = useRef<{ latitude: number; longitude: number; sentAt: number } | undefined>(undefined);

  useEffect(() => {
    if (!navigator.geolocation || !window.isSecureContext) {
      setState("paused");
      return;
    }
    let watchId: number | undefined;
    let stopped = false;
    const stop = () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
      watchId = undefined;
    };
    const start = () => {
      if (stopped || document.visibilityState !== "visible" || watchId !== undefined) return;
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const next = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            sentAt: Date.now(),
          };
          const prior = lastPosition.current;
          if (prior && next.sentAt - prior.sentAt < 10_000) return;
          lastPosition.current = next;
          void updateLocation({ orderId, latitude: next.latitude, longitude: next.longitude })
            .then(() => setState("sharing"))
            .catch(() => setState("paused"));
        },
        () => setState("paused"),
        { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
      );
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };
    start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stopped = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [orderId, updateLocation]);

  return (
    <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground" role="status">
      {state === "sharing"
        ? "Your live location is being shared with this customer while this stop is active."
        : state === "starting"
          ? "Allow location access to share your live position with this customer."
          : "Live location is paused. Check browser location permission and keep this page open to resume tracking."}
    </p>
  );
}

