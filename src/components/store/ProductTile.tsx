import { cn } from "@/lib/utils";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const TILES = ["tile-leaf", "tile-wheat", "tile-sky", "tile-sun", "tile-clay", "tile-rose"];

// On-brand product photography, keyed by product slug (file name).
const JPG_IMAGES = import.meta.glob<string>("../../assets/products/*.jpg", {
  eager: true,
  import: "default",
});
const WEBP_IMAGES = import.meta.glob<string>("../../assets/products/*.webp", {
  eager: true,
  import: "default",
});
const BY_SLUG: Record<string, string> = Object.fromEntries(
  [...Object.entries(JPG_IMAGES), ...Object.entries(WEBP_IMAGES)].map(([path, src]) => [
    path
      .split("/")
      .pop()!
      .replace(/\.(jpg|webp)$/, ""),
    src,
  ]),
);

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function tileFor(seed: string) {
  let sum = 0;
  for (let i = 0; i < seed.length; i += 1) sum += seed.charCodeAt(i);
  return TILES[sum % TILES.length];
}

export function ProductTile({
  emoji,
  name,
  className,
  size = "md",
}: {
  emoji: string;
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const src = BY_SLUG[slugify(name)];
  return (
    <div
      role="img"
      aria-label={name}
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-xl",
        tileFor(name),
        size === "sm" && "size-16 shrink-0 text-3xl",
        size === "md" && "aspect-square w-full text-5xl",
        size === "lg" && "aspect-square w-full text-[7rem]",
        className,
      )}
    >
      {src ? (
        <ProductPhoto key={src} src={src} name={name} fallback={emoji} />
      ) : (
        <span aria-hidden>{emoji}</span>
      )}
    </div>
  );
}

function ProductPhoto({ src, name, fallback }: { src: string; name: string; fallback: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">("loading");

  if (status === "failed") return <span aria-hidden>{fallback}</span>;

  return (
    <>
      {status === "loading" ? (
        <Skeleton className="absolute inset-0 size-full rounded-none" aria-hidden="true" />
      ) : null}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className={cn(
          "absolute inset-0 size-full object-cover transition-opacity duration-200",
          status === "loaded" ? "opacity-100" : "opacity-0",
        )}
        width={512}
        height={512}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("failed")}
      />
    </>
  );
}
