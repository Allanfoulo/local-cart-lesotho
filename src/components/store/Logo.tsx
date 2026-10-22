import { cn } from "@/lib/utils";

export function Logo({
  name,
  tagline,
  className,
  compact = false,
}: {
  name: string;
  tagline?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <img
        src="/brand/reetapele/pwa/reetapele-192.svg"
        alt=""
        aria-hidden="true"
        className="size-9 shrink-0 rounded-xl object-contain"
      />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-base font-bold tracking-tight">{name}</span>
        {!compact && tagline ? (
          <span className="block truncate text-[11px] text-muted-foreground">{tagline}</span>
        ) : null}
      </span>
    </div>
  );
}
