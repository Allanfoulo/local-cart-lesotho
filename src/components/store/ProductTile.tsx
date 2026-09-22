import { cn } from "@/lib/utils";

const TILES = ["tile-leaf", "tile-wheat", "tile-sky", "tile-sun", "tile-clay", "tile-rose"];

function tileFor(seed: string) {
  let sum = 0;
  for (let i = 0; i < seed.length; i += 1) sum += seed.charCodeAt(i);
  return TILES[sum % TILES.length];
}

/**
 * Product imagery placeholder. Swap the inner render for <img src={product.imageUrl} />
 * once real photography is uploaded through the admin product form.
 */
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
  return (
    <div
      role="img"
      aria-label={name}
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-xl",
        tileFor(name),
        size === "sm" && "size-16 text-3xl",
        size === "md" && "aspect-square w-full text-5xl",
        size === "lg" && "aspect-square w-full text-[7rem]",
        className,
      )}
    >
      <span aria-hidden>{emoji}</span>
    </div>
  );
}
