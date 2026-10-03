import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronDown, MapPin, Phone, Truck } from "lucide-react";
import { DeliveryMap } from "@/components/maps/DeliveryMap";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/app-store";
import { deliveryAreasForMap, orderMapPoint } from "@/lib/delivery-map";
import { formatM } from "@/lib/format";
import type { Order } from "@/lib/types";

const inProgress = new Set(["ready", "out_for_delivery"]);

function orderSequence(orders: Order[], ids: string[]) {
  return [...orders].sort((a, b) => {
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
  const [mapOpen, setMapOpen] = useState(false);
  const drivers = [
    ...new Set(store.orders.map((order) => order.driver).filter(Boolean)),
  ] as string[];
  const options = drivers.length ? drivers : ["No driver assigned"];
  const [driver, setDriver] = useState(options[0]!);
  const activeDriver = options.includes(driver) ? driver : options[0]!;
  const assigned = store.orders.filter(
    (order) => order.driver === activeDriver && inProgress.has(order.status),
  );
  const routeIds = store.deliveryRouteSequence[activeDriver] ?? [];
  const ordered = orderSequence(assigned, routeIds);
  const areas = deliveryAreasForMap(store.shop.deliveryAreas);
  const points = ordered.flatMap((order) => {
    const point = orderMapPoint(order);
    return point ? [{ ...point, label: order.number }] : [];
  });
  const currentStop = ordered[0];

  const updateStop = (order: Order) => {
    store.updateOrderStatus(order.id, order.status === "ready" ? "out_for_delivery" : "delivered");
  };

  return (
    <main className="min-h-screen bg-background px-3 pb-8 pt-4 sm:px-5 sm:pt-6">
      <div className="mx-auto max-w-xl">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Mabote Fresh · Driver
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Today’s deliveries</h1>
          </div>
          <Link
            to="/demo-login"
            aria-label="Back to demo views"
            className="grid size-11 shrink-0 place-items-center rounded-xl border bg-card text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="size-5" />
          </Link>
        </header>

        <label className="mb-5 block text-sm font-medium">
          Driver preview
          <select
            className="mt-1.5 h-12 w-full rounded-xl border bg-card px-3 text-base"
            value={activeDriver}
            onChange={(event) => setDriver(event.target.value)}
            disabled={!drivers.length}
          >
            {options.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>

        <section aria-labelledby="current-stop-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="current-stop-heading" className="font-semibold">
              Next stop
            </h2>
            <span className="text-sm text-muted-foreground">{ordered.length} remaining</span>
          </div>

          {currentStop ? (
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

                <Button className="h-12 w-full text-base" onClick={() => updateStop(currentStop)}>
                  {currentStop.status === "ready" ? (
                    <>
                      <Truck className="size-4" /> Start delivery
                    </>
                  ) : (
                    <>
                      <Check className="size-4" /> Mark delivered
                    </>
                  )}
                </Button>
              </div>
            </article>
          ) : (
            <div className="rounded-2xl border bg-card px-5 py-10 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-primary">
                <Check className="size-6" />
              </span>
              <h3 className="mt-3 font-semibold">You’re all caught up</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Ready orders assigned to {activeDriver} will appear here.
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
          Driver demo · Status changes are saved in this browser.
        </p>
      </div>
    </main>
  );
}
