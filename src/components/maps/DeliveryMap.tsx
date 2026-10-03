import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DeliveryMapArea, DeliveryMapPoint } from "@/lib/delivery-map";

const defaultCenter: L.LatLngExpression = [-29.31, 27.49];
const tileUrl =
  import.meta.env["VITE_OSM_TILE_URL"] ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export function DeliveryMap({
  points = [],
  areas = [],
  route = [],
  height = "360px",
  ariaLabel = "Delivery map of Maseru",
}: {
  points?: DeliveryMapPoint[];
  areas?: DeliveryMapArea[];
  route?: [number, number][];
  height?: string;
  ariaLabel?: string;
}) {
  const element = useRef<HTMLDivElement>(null);
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const mapData = JSON.stringify({ points, areas, route });

  useEffect(() => {
    if (!element.current) return;
    const data = JSON.parse(mapData) as {
      points: DeliveryMapPoint[];
      areas: DeliveryMapArea[];
      route: [number, number][];
    };
    const map = L.map(element.current, {
      center: defaultCenter,
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: false,
      keyboard: true,
    });
    const tiles = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).addTo(map);
    tiles.on("tileerror", () => setTilesUnavailable(true));

    const bounds: L.LatLngExpression[] = [];
    for (const area of data.areas) {
      const marker = L.circleMarker([area.lat, area.lng], {
        radius: 7,
        color: "#346e42",
        weight: 2,
        fillColor: "#f4f1e8",
        fillOpacity: 1,
      }).addTo(map);
      const label = document.createElement("span");
      label.textContent = area.label;
      marker.bindTooltip(label, { permanent: true, direction: "top", offset: [0, -5] });
      bounds.push([area.lat, area.lng]);
    }
    for (const point of data.points) {
      const approximate = Boolean(point.approximate);
      const color = approximate ? "#a66a15" : point.kind === "shop" ? "#285d38" : "#2f7042";
      const marker = L.circleMarker([point.lat, point.lng], {
        radius: point.kind === "shop" ? 9 : 8,
        color,
        weight: approximate ? 3 : 2,
        fillColor: approximate ? "#f6ead0" : color,
        fillOpacity: 1,
      }).addTo(map);
      const label = document.createElement("span");
      label.textContent = point.label;
      marker.bindTooltip(label, { direction: "top", offset: [0, -7] });
      if (point.detail) {
        const detail = document.createElement("span");
        detail.textContent = point.detail;
        marker.bindPopup(detail);
      }
      bounds.push([point.lat, point.lng]);
    }
    if (data.route.length > 1) {
      const line = L.polyline(data.route, {
        color: "#347549",
        weight: 4,
        opacity: 0.88,
      }).addTo(map);
      bounds.push(...data.route);
      map.fitBounds(line.getBounds(), { padding: [28, 28], maxZoom: 15 });
    } else if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [32, 32], maxZoom: 14 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0]!, 14);
    }
    requestAnimationFrame(() => map.invalidateSize());
    return () => {
      map.remove();
    };
  }, [mapData]);

  return (
    <div className="delivery-map-frame">
      <div ref={element} className="delivery-map-canvas" style={{ height }} aria-label={ariaLabel} />
      {tilesUnavailable && (
        <p className="delivery-map-error" role="status">
          Map imagery is unavailable right now. The address and delivery details are still shown.
        </p>
      )}
    </div>
  );
}
