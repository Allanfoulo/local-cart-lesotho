import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/app-store";
import type { DeliveryLandmark } from "@/lib/types";

const blankForm = {
  name: "",
  aliases: "",
  area: "",
  lat: "",
  lng: "",
};

export function DeliveryPlacesManager() {
  const { shop, deliveryLandmarks, saveDeliveryLandmark, removeDeliveryLandmark } = useAppStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm);
  const [coordinatesConfirmed, setCoordinatesConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const editLandmark = (landmark: DeliveryLandmark) => {
    setEditingId(landmark.id);
    setForm({
      name: landmark.name,
      aliases: landmark.aliases.join(", "),
      area: landmark.area,
      lat: String(landmark.lat),
      lng: String(landmark.lng),
    });
    setCoordinatesConfirmed(true);
    setError("");
    setNotice("");
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (
      !form.name.trim() ||
      !shop.deliveryAreas.includes(form.area) ||
      !form.lat.trim() ||
      !form.lng.trim() ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      setError("Add a place name, delivery area, and verified latitude and longitude.");
      return;
    }
    if (!coordinatesConfirmed) {
      setError("Confirm that the coordinates have been checked for this place.");
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError("Enter coordinates within the valid latitude and longitude ranges.");
      return;
    }
    const usedNames = new Set([form.name.trim().toLocaleLowerCase()]);
    const aliases = form.aliases
      .split(/[,;\n]/)
      .map((alias) => alias.trim())
      .filter((alias) => {
        const normalized = alias.toLocaleLowerCase();
        if (!normalized || usedNames.has(normalized)) return false;
        usedNames.add(normalized);
        return true;
      });
    const proposedNames = [form.name.trim(), ...aliases].map((name) => name.toLocaleLowerCase());
    const collision = deliveryLandmarks
      .filter((landmark) => landmark.id !== editingId)
      .flatMap((landmark) => [landmark.name, ...landmark.aliases])
      .some((name) => proposedNames.includes(name.toLocaleLowerCase()));
    if (collision) {
      setError("That name or alias is already used by another saved place.");
      return;
    }
    const id = editingId ?? crypto.randomUUID();
    saveDeliveryLandmark({ id, name: form.name.trim(), aliases, area: form.area, lat, lng });
    setForm(blankForm);
    setEditingId(null);
    setCoordinatesConfirmed(false);
    setNotice("Verified delivery place saved in this browser.");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(blankForm);
    setCoordinatesConfirmed(false);
    setError("");
  };

  return (
    <div className="space-y-7">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-primary">STAFF TOOLS</p>
        <h1 className="text-3xl font-bold tracking-tight">Known delivery places</h1>
        <p className="max-w-2xl text-muted-foreground">
          Keep familiar place names and former business names connected to pins the team has checked.
          Enter coordinates only after verifying the place on the ground or with a trusted source.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          {editingId ? <Pencil className="size-4" /> : <Plus className="size-4" />}
          {editingId ? "Edit delivery place" : "Add a delivery place"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add alternate spellings or old shop names separated by commas. These pins stay in the local app.
        </p>
        <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={save}>
          <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
            Common place name
            <Input
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="For example, Omega"
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
            Other names people use
            <Input
              value={form.aliases}
              onChange={(event) => setForm({ ...form, aliases: event.target.value })}
              placeholder="Former business name, local spelling"
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
            Delivery area
            <select
              required
              value={form.area}
              onChange={(event) => setForm({ ...form, area: event.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Choose an area</option>
              {shop.deliveryAreas.map((area) => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Verified latitude
            <Input
              required
              type="number"
              min="-90"
              max="90"
              step="any"
              value={form.lat}
              onChange={(event) => setForm({ ...form, lat: event.target.value })}
              placeholder="-29.31"
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Verified longitude
            <Input
              required
              type="number"
              min="-180"
              max="180"
              step="any"
              value={form.lng}
              onChange={(event) => setForm({ ...form, lng: event.target.value })}
              placeholder="27.49"
            />
          </label>
          <label className="flex items-start gap-2 text-sm text-muted-foreground sm:col-span-2">
            <input
              type="checkbox"
              required
              checked={coordinatesConfirmed}
              onChange={(event) => setCoordinatesConfirmed(event.target.checked)}
              className="mt-0.5 size-4 accent-primary"
            />
            I confirm these coordinates have been checked for this place.
          </label>
          {error && <p className="text-sm text-destructive sm:col-span-2" role="alert">{error}</p>}
          {notice && <p className="text-sm text-primary sm:col-span-2" role="status">{notice}</p>}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit">{editingId ? "Save changes" : "Add place"}</Button>
            {editingId && <Button type="button" variant="outline" onClick={cancelEdit}>Cancel</Button>}
          </div>
        </form>
      </section>

      <section aria-labelledby="saved-places-heading" className="space-y-3">
        <div>
          <h2 id="saved-places-heading" className="text-xl font-semibold">Saved places</h2>
          <p className="text-sm text-muted-foreground">{deliveryLandmarks.length} verified {deliveryLandmarks.length === 1 ? "place" : "places"}</p>
        </div>
        {deliveryLandmarks.length ? (
          <ul className="space-y-3">
            {deliveryLandmarks.map((landmark) => (
              <li key={landmark.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold">{landmark.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {landmark.area}{landmark.aliases.length ? ` · Also known as ${landmark.aliases.join(", ")}` : ""}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" /> {landmark.lat.toFixed(5)}, {landmark.lng.toFixed(5)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => editLandmark(landmark)}>
                    <Pencil /> Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Remove ${landmark.name}`}
                    onClick={() => {
                      removeDeliveryLandmark(landmark.id);
                      if (editingId === landmark.id) cancelEdit();
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-border px-5 py-8 text-center">
            <MapPin className="mx-auto size-7 text-muted-foreground" />
            <p className="mt-2 font-medium">No verified places yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a known landmark after confirming its area and coordinates. No sample pins are assumed.
            </p>
          </div>
        )}
      </section>

      <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
        This prototype has no staff sign-in and stores the directory in this browser only. It is not yet
        shared across staff devices, and landmark coordinates are not sent to external map or routing services.
      </p>
    </div>
  );
}
