import { cn } from "@/lib/utils";

const TILES = ["tile-leaf", "tile-wheat", "tile-sky", "tile-sun", "tile-clay", "tile-rose"];

// On-brand product photography, keyed by product slug (file name).
const IMAGES = import.meta.glob<string>("@/assets/products/*.jpg", {
  eager: true,
  import: "default",
});
const BY_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(IMAGES).map(([path, src]) => [path.split("/").pop()!.replace(".jpg", ""), src]),
);

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
      role={src ? undefined : "img"}
      aria-label={src ? undefined : name}
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-xl",
        tileFor(name),
        size === "sm" && "size-16 shrink-0 text-3xl",
        size === "md" && "aspect-square w-full text-5xl",
        size === "lg" && "aspect-square w-full text-[7rem]",
        className,
      )}
    >
      {src ? (
        <img src={src} alt={name} loading="lazy" className="size-full object-cover" width={512} height={512} />
      ) : (
        <span aria-hidden>{emoji}</span>
      )}
    </div>
  );
}
