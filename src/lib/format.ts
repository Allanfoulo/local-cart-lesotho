import type { PricingUnit } from "./types";

export function formatM(value: number): string {
  return `M${value.toFixed(2)}`;
}

export function formatMShort(value: number): string {
  return Number.isInteger(value) ? `M${value}` : `M${value.toFixed(2)}`;
}

export function unitLabel(unit: PricingUnit): string {
  switch (unit) {
    case "each":
      return "each";
    case "pack":
      return "/ pack";
    case "kg":
      return "/ kg";
    case "gram":
      return "/ 100g";
    case "litre":
      return "/ litre";
    case "crate":
      return "/ crate";
  }
}

export function priceWithUnit(price: number, unit: PricingUnit): string {
  return `${formatMShort(price)} ${unitLabel(unit)}`;
}

export function quantityLabel(quantity: number, soldByWeight: boolean): string {
  return soldByWeight ? `${quantity} kg` : `${quantity}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
