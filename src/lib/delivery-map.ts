import type { Order } from "./types";

export interface DeliveryMapPoint {
  id: string;
  label: string;
  detail?: string;
  lat: number;
  lng: number;
  kind: "destination" | "order" | "shop";
  approximate?: boolean;
}

export interface DeliveryMapArea {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

// These OSM-derived points identify neighbourhoods, not street-level coverage borders.
const areaCenters: Record<string, [number, number]> = {
  "Ha-Mabote, Maseru": [-29.29149, 27.52725],
  "Khubetsoana, Maseru": [-29.28292, 27.52373],
  "Sekamaneng, Maseru": [-29.27342, 27.55359],
  "Maseru West": [-29.30468, 27.47631],
  "Lithabaneng, Maseru": [-29.3652, 27.5409],
  "Ha-Tsolo, Maseru": [-29.3539, 27.46368],
};

export const maseruCenter: [number, number] = [-29.31, 27.49];

export function deliveryAreasForMap(areas: string[]): DeliveryMapArea[] {
  return areas.flatMap((name, index) => {
    const center = areaCenters[name];
    return center ? [{ id: `area-${index}`, label: name.replace(", Maseru", ""), lat: center[0], lng: center[1] }] : [];
  });
}

export function orderMapPoint(order: Order): DeliveryMapPoint | undefined {
  // Customer coordinates stay out of requests to the public basemap provider.
  const center = areaCenters[order.address.area];
  if (!center) return undefined;
  return {
    id: order.id,
    label: "Approximate area",
    detail: `${order.address.area} · approximate neighborhood center only`,
    lat: center[0],
    lng: center[1],
    kind: "destination",
    approximate: true,
  };
}
