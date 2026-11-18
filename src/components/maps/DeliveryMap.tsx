import { useEffect, useMemo, useRef, useState } from "react";
import type {
  GoogleLatLngLiteral,
  GoogleMapInstance,
  GoogleMapsApi,
  GoogleMarkerInstance,
  GooglePolylineInstance,
} from "@/lib/google-maps-api";
import { loadGoogleMaps } from "@/lib/google-maps-api";
import type { DeliveryMapArea, DeliveryMapPoint } from "@/lib/delivery-map";

const defaultCenter: GoogleLatLngLiteral = { lat: -29.31, lng: 27.49 };
const googleMapsApiKey = import.meta.env["VITE_GOOGLE_MAPS_API_KEY"]?.trim() ?? "";

export interface DeliveryLiveTrip {
  orderId: string;
  driverLocation: GoogleLatLngLiteral;
  destination?: GoogleLatLngLiteral;
  distanceMeters?: number;
  durationSeconds?: number;
  routeStatus: "pending" | "available" | "unavailable";
  encodedPolyline?: string;
}

function animateMarker(
  marker: GoogleMarkerInstance,
  target: GoogleLatLngLiteral,
  maps: GoogleMapsApi,
  onAnimation: (frame: number | undefined) => void,
) {
  const current = marker.getPosition();
  if (!current) {
    marker.setPosition(target);
    return;
  }
  const start = { lat: current.lat(), lng: current.lng() };
  const startedAt = performance.now();
  const duration = 900;
  const frame = (now: number) => {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = progress * (2 - progress);
    marker.setPosition({
      lat: start.lat + (target.lat - start.lat) * eased,
      lng: start.lng + (target.lng - start.lng) * eased,
    });
    if (progress < 1) onAnimation(requestAnimationFrame(frame));
    else onAnimation(undefined);
  };
  onAnimation(requestAnimationFrame(frame));
}

export function DeliveryMap({
  points = [],
  areas = [],
  route = [],
  liveTrip,
  height = "360px",
  ariaLabel = "Delivery map of Maseru",
}: {
  points?: DeliveryMapPoint[];
  areas?: DeliveryMapArea[];
  route?: [number, number][];
  liveTrip?: DeliveryLiveTrip;
  height?: string;
  ariaLabel?: string;
}) {
  const element = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMapInstance | undefined>(undefined);
  const mapsRef = useRef<GoogleMapsApi | undefined>(undefined);
  const staticMarkersRef = useRef<GoogleMarkerInstance[]>([]);
  const staticLinesRef = useRef<GooglePolylineInstance[]>([]);
  const driverMarkerRef = useRef<GoogleMarkerInstance | undefined>(undefined);
  const destinationMarkerRef = useRef<GoogleMarkerInstance | undefined>(undefined);
  const liveRouteRef = useRef<GooglePolylineInstance | undefined>(undefined);
  const animationRef = useRef<number | undefined>(undefined);
  const fittedOrderRef = useRef<string | undefined>(undefined);
  const [mapReady, setMapReady] = useState(false);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const staticMapData = useMemo(() => JSON.stringify({ points, areas, route }), [points, areas, route]);

  useEffect(() => {
    if (!element.current) return;
    if (!googleMapsApiKey) {
      setMapUnavailable(true);
      return;
    }

    let cancelled = false;
    let tilesListener: { remove(): void } | undefined;
    let tileTimeout: ReturnType<typeof setTimeout> | undefined;
    void loadGoogleMaps(googleMapsApiKey).then((maps) => {
      if (cancelled || !element.current) return;
      mapsRef.current = maps;
      mapRef.current = new maps.Map(element.current, {
        center: defaultCenter,
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        gestureHandling: "cooperative",
      });
      setMapUnavailable(false);
      setMapReady(true);
      tilesListener = mapRef.current.addListener("tilesloaded", () => setMapUnavailable(false));
      tileTimeout = setTimeout(() => {
        if (!cancelled && element.current?.childElementCount === 0) setMapUnavailable(true);
      }, 12_000);
    }).catch(() => {
      if (!cancelled) setMapUnavailable(true);
    });

    return () => {
      cancelled = true;
      tilesListener?.remove();
      if (tileTimeout) clearTimeout(tileTimeout);
      if (animationRef.current !== undefined) cancelAnimationFrame(animationRef.current);
      staticMarkersRef.current.forEach((marker) => marker.setMap(null));
      staticLinesRef.current.forEach((line) => line.setMap(null));
      driverMarkerRef.current?.setMap(null);
      destinationMarkerRef.current?.setMap(null);
      liveRouteRef.current?.setMap(null);
      mapRef.current = undefined;
      mapsRef.current = undefined;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const maps = mapsRef.current;
    if (!mapReady || !map || !maps) return;
    staticMarkersRef.current.forEach((marker) => marker.setMap(null));
    staticLinesRef.current.forEach((line) => line.setMap(null));
    staticMarkersRef.current = [];
    staticLinesRef.current = [];

    const data = JSON.parse(staticMapData) as {
      points: DeliveryMapPoint[];
      areas: DeliveryMapArea[];
      route: [number, number][];
    };
    const bounds = new maps.LatLngBounds();
    let hasBounds = false;
    for (const area of data.areas) {
      const position = { lat: area.lat, lng: area.lng };
      const marker = new maps.Marker({
        map,
        position,
        title: `${area.label} (approximate neighbourhood center)`,
        label: { text: area.label, color: "#1f482d", fontSize: "12px", fontWeight: "600" },
        icon: { path: maps.SymbolPath.CIRCLE, scale: 5, fillColor: "#f4f1e8", fillOpacity: 1, strokeColor: "#346e42", strokeWeight: 2 },
      });
      staticMarkersRef.current.push(marker);
      bounds.extend(position);
      hasBounds = true;
    }
    for (const point of data.points) {
      const position = { lat: point.lat, lng: point.lng };
      const marker = new maps.Marker({
        map,
        position,
        title: point.detail ?? point.label,
        label: point.label,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: point.approximate ? 8 : point.kind === "shop" ? 9 : 8,
          fillColor: point.approximate ? "#f6ead0" : point.kind === "shop" ? "#285d38" : "#2f7042",
          fillOpacity: 1,
          strokeColor: point.approximate ? "#a66a15" : "#ffffff",
          strokeWeight: point.approximate ? 3 : 2,
        },
      });
      staticMarkersRef.current.push(marker);
      bounds.extend(position);
      hasBounds = true;
    }
    if (data.route.length > 1) {
      const path = data.route.map(([lat, lng]) => ({ lat, lng }));
      const line = new maps.Polyline({ map, path, strokeColor: "#347549", strokeWeight: 4, strokeOpacity: 0.88 });
      staticLinesRef.current.push(line);
      path.forEach((point) => bounds.extend(point));
      hasBounds = true;
    }
    if (hasBounds) map.fitBounds(bounds, { top: 28, right: 28, bottom: 28, left: 28 });
  }, [mapReady, staticMapData]);

  useEffect(() => {
    const map = mapRef.current;
    const maps = mapsRef.current;
    if (!mapReady || !map || !maps) return;
    if (animationRef.current !== undefined) cancelAnimationFrame(animationRef.current);
    if (!liveTrip) {
      driverMarkerRef.current?.setMap(null);
      destinationMarkerRef.current?.setMap(null);
      liveRouteRef.current?.setMap(null);
      driverMarkerRef.current = undefined;
      destinationMarkerRef.current = undefined;
      liveRouteRef.current = undefined;
      fittedOrderRef.current = undefined;
      return;
    }

    if (!driverMarkerRef.current) {
      driverMarkerRef.current = new maps.Marker({
        map,
        position: liveTrip.driverLocation,
        title: "Delivery driver’s live location",
        zIndex: 1000,
        icon: { path: maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 6, fillColor: "#176b3a", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 },
      });
    } else {
      animateMarker(driverMarkerRef.current, liveTrip.driverLocation, maps, (frame) => { animationRef.current = frame; });
    }
    if (liveTrip.destination) {
      if (!destinationMarkerRef.current) {
        destinationMarkerRef.current = new maps.Marker({
          map,
          position: liveTrip.destination,
          title: "Delivery destination",
          icon: { path: maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#a84d25", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 },
        });
      } else {
        destinationMarkerRef.current.setPosition(liveTrip.destination);
      }
    } else if (destinationMarkerRef.current) {
      destinationMarkerRef.current.setMap(null);
      destinationMarkerRef.current = undefined;
    }

    const path = liveTrip.encodedPolyline
      ? maps.geometry.encoding.decodePath(liveTrip.encodedPolyline).map((point) => ({ lat: point.lat(), lng: point.lng() }))
      : [];
    if (path.length > 1) {
      if (!liveRouteRef.current) {
        liveRouteRef.current = new maps.Polyline({ map, path, strokeColor: "#2f7042", strokeWeight: 5, strokeOpacity: 0.8 });
      } else {
        liveRouteRef.current.setPath(path);
      }
    } else if (liveRouteRef.current) {
      liveRouteRef.current.setMap(null);
      liveRouteRef.current = undefined;
    }
    if (fittedOrderRef.current !== liveTrip.orderId) {
      const bounds = new maps.LatLngBounds();
      bounds.extend(liveTrip.driverLocation);
      if (liveTrip.destination) bounds.extend(liveTrip.destination);
      path.forEach((point) => bounds.extend(point));
      if (liveTrip.destination || path.length > 1) map.fitBounds(bounds, { top: 36, right: 36, bottom: 36, left: 36 });
      else {
        map.setCenter(liveTrip.driverLocation);
        map.setZoom(15);
      }
      fittedOrderRef.current = liveTrip.orderId;
    }
  }, [mapReady, liveTrip]);

  return (
    <div className="space-y-1.5">
      <div className="relative w-full overflow-hidden rounded-xl border bg-muted/30" style={{ height }}>
        <div ref={element} className="h-full w-full" aria-label={ariaLabel} role="img" />
        {mapUnavailable && (
          <div className="absolute inset-0 grid place-items-center bg-background/95 px-5 text-center text-sm text-muted-foreground" role="status">
            The map is unavailable right now. Delivery addresses and status updates are still available.
          </div>
        )}
        {!mapReady && !mapUnavailable && (
          <div className="absolute inset-0 grid place-items-center bg-background/70 text-sm text-muted-foreground" role="status">
            Loading Google Maps…
          </div>
        )}
      </div>
      <p className="px-1 text-[11px] text-muted-foreground">
        Map © Google Maps · Neighbourhood reference locations © OpenStreetMap contributors.
      </p>
    </div>
  );
}

