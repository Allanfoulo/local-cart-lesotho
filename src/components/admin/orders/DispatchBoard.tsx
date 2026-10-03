import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, MapPin, Truck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeliveryMap } from "@/components/maps/DeliveryMap";
import { useAppStore } from "@/lib/app-store";
import { deliveryAreasForMap, orderMapPoint } from "@/lib/delivery-map";
import { formatM } from "@/lib/format";
import type { Order } from "@/lib/types";

const eligible = new Set(["ready", "out_for_delivery"]);
const demoDrivers = ["Moshe Thabane", "Kabelo M.", "Lineo P."];

function sortByRoute(orders: Order[], savedIds: string[]) {
  return [...orders].sort((a, b) => {
    const aIndex = savedIds.indexOf(a.id);
    const bIndex = savedIds.indexOf(b.id);
    return (
      (aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex) -
      (bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex)
    );
  });
}

export function DispatchBoard() {
  const store = useAppStore();
  const [mapOpen, setMapOpen] = useState(false);
  const assignedDrivers = store.orders.map((order) => order.driver).filter(Boolean) as string[];
  const drivers = [...new Set([...demoDrivers, ...assignedDrivers])];
  const [driver, setDriver] = useState(drivers[0]!);
  const activeDriver = drivers.includes(driver) ? driver : drivers[0]!;
  const assigned = store.orders.filter(
    (order) => order.driver === activeDriver && eligible.has(order.status),
  );
  const unassigned = store.orders.filter((order) => !order.driver && order.status === "ready");
  const savedIds = store.deliveryRouteSequence[activeDriver] ?? [];
  const ordered = sortByRoute(assigned, savedIds);
  const points = ordered.flatMap((order) => {
    const point = orderMapPoint(order);
    return point ? [{ ...point, label: order.number }] : [];
  });
  const areas = useMemo(
    () => deliveryAreasForMap(store.shop.deliveryAreas),
    [store.shop.deliveryAreas],
  );

  const reorder = (index: number, direction: -1 | 1) => {
    const next = [...ordered];
    const other = index + direction;
    if (other < 0 || other >= next.length) return;
    [next[index], next[other]] = [next[other]!, next[index]!];
    store.setDeliveryRouteSequence(
      activeDriver,
      next.map((order) => order.id),
    );
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Delivery run</h2>
          <p className="text-sm text-muted-foreground">
            Assign ready orders and set a manual team sequence.
          </p>
        </div>
        <label className="text-sm font-medium">
          Driver
          <select
            className="mt-1.5 h-12 w-full rounded-xl border bg-background px-3 sm:min-w-56"
            value={activeDriver}
            onChange={(event) => setDriver(event.target.value)}
          >
            {drivers.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
      </header>

      <section aria-labelledby="stop-order-title">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 id="stop-order-title" className="font-semibold">
              {activeDriver}’s stops
            </h3>
            <p className="text-sm text-muted-foreground">{ordered.length} assigned and ready</p>
          </div>
          <Truck className="size-5 text-primary" />
        </div>
        {ordered.length ? (
          <ol className="divide-y overflow-hidden rounded-2xl border bg-card">
            {ordered.map((order, index) => (
              <li key={order.id} className="flex items-center gap-3 p-3 sm:p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {order.number} · {order.customer.name}
                  </p>
                  <p className="mt-0.5 flex items-start gap-1 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 size-4 shrink-0" />
                    <span>
                      {order.address.area} · {order.address.landmark || "No landmark recorded"}
                    </span>
                  </p>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {order.status.replaceAll("_", " ")} · {formatM(order.total)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <Button
                    className="size-11"
                    variant="outline"
                    size="icon"
                    aria-label={`Move ${order.number} earlier`}
                    disabled={index === 0}
                    onClick={() => reorder(index, -1)}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    className="size-11"
                    variant="outline"
                    size="icon"
                    aria-label={`Move ${order.number} later`}
                    disabled={index === ordered.length - 1}
                    onClick={() => reorder(index, 1)}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-2xl border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            No ready deliveries assigned to this driver.
          </p>
        )}
      </section>

      <section aria-labelledby="unassigned-title">
        <div className="mb-3">
          <h3 id="unassigned-title" className="font-semibold">
            Ready to assign
          </h3>
          <p className="text-sm text-muted-foreground">
            Choose the driver for each prepared order.
          </p>
        </div>
        {unassigned.length ? (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {unassigned.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {order.number} · {order.customer.name}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {order.address.area} · {order.address.landmark || "No landmark recorded"}
                  </p>
                </div>
                <Button
                  className="h-11 w-full sm:w-auto"
                  onClick={() => store.assignDriver(order.id, activeDriver)}
                >
                  <UserPlus className="size-4" />
                  Assign to {activeDriver.split(" ")[0]}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            No unassigned ready orders.
          </p>
        )}
      </section>

      <details
        className="overflow-hidden rounded-2xl border bg-card"
        onToggle={(event) => setMapOpen(event.currentTarget.open)}
      >
        <summary className="min-h-12 cursor-pointer px-4 py-3 font-semibold">
          Delivery area map
        </summary>
        {mapOpen && (
          <div className="border-t p-2">
            <DeliveryMap
              points={points}
              areas={areas}
              height="280px"
              ariaLabel="Approximate delivery neighbourhoods and assigned stops"
            />
            <p className="px-2 py-2 text-xs text-muted-foreground">
              Pins show approximate neighbourhood centres only. The map does not calculate routes or
              travel times; exact customer details stay out of the map request.
            </p>
          </div>
        )}
      </details>
    </section>
  );
}
