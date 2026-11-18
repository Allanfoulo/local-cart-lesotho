export type GoogleLatLngLiteral = { lat: number; lng: number };

interface GoogleBounds {
  extend(location: GoogleLatLngLiteral): void;
}

export interface GoogleMapInstance {
  fitBounds(bounds: GoogleBounds, padding?: number | { top: number; right: number; bottom: number; left: number }): void;
  setCenter(location: GoogleLatLngLiteral): void;
  setZoom(zoom: number): void;
  addListener(eventName: string, handler: () => void): { remove(): void };
}

export interface GoogleMarkerInstance {
  setMap(map: GoogleMapInstance | null): void;
  setPosition(position: GoogleLatLngLiteral): void;
  getPosition(): { lat(): number; lng(): number } | undefined;
}

export interface GooglePolylineInstance {
  setMap(map: GoogleMapInstance | null): void;
  setPath(path: GoogleLatLngLiteral[]): void;
}

export interface GoogleMapsApi {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
  Marker: new (options: Record<string, unknown>) => GoogleMarkerInstance;
  Polyline: new (options: Record<string, unknown>) => GooglePolylineInstance;
  LatLngBounds: new () => GoogleBounds;
  SymbolPath: { CIRCLE: string; FORWARD_CLOSED_ARROW: string };
  geometry: { encoding: { decodePath(encodedPath: string): Array<{ lat(): number; lng(): number }> } };
}

let mapsPromise: Promise<GoogleMapsApi> | undefined;

export function loadGoogleMaps(apiKey: string): Promise<GoogleMapsApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("Maps are available in the browser only."));
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (mapsPromise) return mapsPromise;

  mapsPromise = new Promise<GoogleMapsApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=geometry&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => window.google?.maps
      ? resolve(window.google.maps)
      : reject(new Error("Google Maps did not initialize."));
    script.onerror = () => reject(new Error("Google Maps could not be loaded."));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    mapsPromise = undefined;
    throw error;
  });

  return mapsPromise;
}

declare global {
  interface Window {
    google?: { maps: GoogleMapsApi };
  }
}

