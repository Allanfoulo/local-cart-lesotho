/**
 * Delivery location input.
 *
 * This is the single boundary for how a customer describes where to deliver.
 * It edits a DeliveryAddress with area, free-text descriptions, optional pins,
 * and an optional ID for a selected staff-curated place.
 * A future CesiumJS / 3D map picker can replace the "Pin my location" block
 * below and simply call onChange with lat/lng — nothing else needs to change.
 */
import { LocateFixed, MapPin } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DeliveryAddress } from "@/lib/types";

export function LocationPicker({
  value,
  areas,
  onChange,
}: {
  value: DeliveryAddress;
  areas: string[];
  onChange: (next: DeliveryAddress) => void;
}) {
  const [locating, setLocating] = useState(false);
  const set = (patch: Partial<DeliveryAddress>) => onChange({ ...value, ...patch });

  const pin = () => {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          landmarkId: undefined,
          ...(value.landmarkId
            ? { address: "Customer-confirmed location", landmark: undefined }
            : {}),
        });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Delivery area</Label>
        <Select value={value.area} onValueChange={(area) => set({ area })}>
          <SelectTrigger className="h-11 rounded-xl">
            <SelectValue placeholder="Choose your area" />
          </SelectTrigger>
          <SelectContent>
            {areas.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="address">Delivery description or house / street</Label>
        <Input
          id="address"
          className="h-11 rounded-xl"
          placeholder="e.g. by Omega, behind the old supermarket"
          value={value.address}
          onChange={(e) => set({ address: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="landmark">Nearby landmark</Label>
        <Input
          id="landmark"
          className="h-11 rounded-xl"
          placeholder="e.g. Opposite the primary school"
          value={value.landmark ?? ""}
          onChange={(e) => set({ landmark: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="instructions">Directions for the driver (optional)</Label>
        <Textarea
          id="instructions"
          className="rounded-xl"
          placeholder="Gate colour, which house, who to ask for…"
          value={value.instructions ?? ""}
          onChange={(e) => set({ instructions: e.target.value })}
        />
      </div>
      <div className="flex items-center justify-between rounded-xl border border-dashed border-border bg-muted/40 p-3">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="size-4 text-primary" />
          {value.landmarkId ? (
            <span>Verified place pin selected: {value.landmark}</span>
          ) : value.lat != null ? (
            <span>Your location pin is saved with the order.</span>
          ) : (
            <span className="text-muted-foreground">Help the driver find you faster</span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={pin}
          disabled={locating}
        >
          <LocateFixed className="size-4" /> {locating ? "Finding…" : "Pin my location"}
        </Button>
      </div>
    </div>
  );
}
