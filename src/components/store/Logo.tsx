import { Mountain } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({
  name,
  tagline,
  className,
  compact = false,
  imageUrl,
}: {
  name: string;
  tagline?: string;
  className?: string;
  compact?: boolean;
  imageUrl?: string | undefined;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="size-full rounded-xl object-contain" />
        ) : (
          <Mountain className="size-5" />
        )}
      </span>
      <span className="leading-tight">
        <span className="block text-base font-bold tracking-tight">{name}</span>
        {!compact && tagline ? (
          <span className="block text-[11px] text-muted-foreground">{tagline}</span>
        ) : null}
      </span>
    </div>
  );
}
