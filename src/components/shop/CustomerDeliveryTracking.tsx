import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { DeliveryMap } from "@/components/maps/DeliveryMap";

const STALE_AFTER_MS = 90_000;

function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function formatMinutes(seconds: number) {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

function updatedLabel(updatedAt: number, now: number) {
  const seconds = Math.max(0, Math.floor((now - updatedAt) / 1000));
  if (seconds < 10) return "Updated just now";
  if (seconds < 60) return `Updated ${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  return `Updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
}

export function CustomerDeliveryTracking({
  orderId,
  orderStatus,
}: {
  orderId: string;
  orderStatus: string;
}) {
  const tracking = useQuery(
    api.deliveryTracking.forOrder,
    orderStatus === "out_for_delivery" ? { orderId: orderId as Id<"orders"> } : "skip",
  );
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);

  if (orderStatus !== "out_for_delivery") return null;
  if (tracking === undefined) {
    return <p className="mt-3 rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground" role="status">Loading live delivery updates…</p>;
  }
  if (!tracking?.active) return null;
  if (!tracking.location) {
    return (
      <p className="mt-3 rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground" role="status">
        Your driver is on the way. Live location will appear when their device shares its first update.
      </p>
    );
  }

  const location = tracking.location;
  const stale = now - location.updatedAt > STALE_AFTER_MS;
  const liveTrip = {
    orderId,
    driverLocation: { lat: location.latitude, lng: location.longitude },
    ...(tracking.destination ? { destination: { lat: tracking.destination.latitude, lng: tracking.destination.longitude } } : {}),
    routeStatus: location.routeStatus,
    ...(location.distanceMeters === undefined ? {} : { distanceMeters: location.distanceMeters }),
    ...(location.durationSeconds === undefined ? {} : { durationSeconds: location.durationSeconds }),
    ...(location.encodedPolyline === undefined ? {} : { encodedPolyline: location.encodedPolyline }),
  };

  return (
    <section className="mt-4 space-y-3 rounded-2xl border bg-card p-3 sm:p-4" aria-label="Live delivery tracking">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="font-semibold">Your driver is on the way</h4>
          <p className="mt-1 text-xs text-muted-foreground" role="status">
            {updatedLabel(location.updatedAt, now)}{stale ? " · Tracking may be paused" : ""}
          </p>
        </div>
        {location.routeStatus === "available" && location.durationSeconds !== undefined && location.distanceMeters !== undefined && (
          <div className="text-right">
            <p className="text-lg font-bold text-primary">About {formatMinutes(location.durationSeconds)}</p>
            <p className="text-sm text-muted-foreground">{formatDistance(location.distanceMeters)} by road</p>
          </div>
        )}
      </div>

      <DeliveryMap
        liveTrip={liveTrip}
        height="240px"
        ariaLabel="Live driver location and route to your delivery address"
      />
      {!tracking.destination && (
        <p className="text-sm text-muted-foreground" role="status">
          The live driver location is shown, but this order has no verified map pin. Your delivery address remains the guide.
        </p>
      )}

      {location.routeStatus === "pending" && (
        <p className="text-sm text-muted-foreground" role="status">Updating the route and arrival estimate…</p>
      )}
      {location.routeStatus === "unavailable" && (
        <p className="text-sm text-muted-foreground" role="status">
          Road distance and arrival estimate are temporarily unavailable. The driver’s latest location is shown when available.
        </p>
      )}
      {stale && (
        <p className="text-sm text-muted-foreground">
          This is the last location update. Your driver’s address and contact details remain in the order information.
        </p>
      )}
    </section>
  );
}

