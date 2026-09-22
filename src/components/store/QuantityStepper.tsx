import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function QuantityStepper({
  value,
  step = 1,
  min = 0,
  suffix,
  onChange,
  size = "md",
}: {
  value: number;
  step?: number;
  min?: number;
  suffix?: string;
  onChange: (next: number) => void;
  size?: "sm" | "md";
}) {
  const btn = size === "sm" ? "size-8" : "size-11";
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Decrease"
        className={`${btn} rounded-full`}
        onClick={() => onChange(Math.max(min, Number((value - step).toFixed(2))))}
      >
        <Minus className="size-4" />
      </Button>
      <span className="min-w-12 text-center text-sm font-semibold tabular-nums">
        {value}
        {suffix ? <span className="text-muted-foreground"> {suffix}</span> : null}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Increase"
        className={`${btn} rounded-full`}
        onClick={() => onChange(Number((value + step).toFixed(2)))}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
