import { cn } from "@/lib/utils";
import type { StockStatus } from "@/lib/types";

const MAP: Record<StockStatus, { label: string; cls: string }> = {
  in_stock: { label: "In stock", cls: "text-success" },
  low_stock: { label: "Low stock", cls: "text-warning" },
  out_of_stock: { label: "Out of stock", cls: "text-destructive" },
};

export function StockBadge({ status, className }: { status: StockStatus; className?: string }) {
  const m = MAP[status];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", m.cls, className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {m.label}
    </span>
  );
}
