import { Skeleton } from "@/components/ui/skeleton";

function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-2.5" aria-hidden="true">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <Skeleton className="mt-3 h-4 w-4/5" />
      <Skeleton className="mt-2 h-3 w-2/5" />
      <Skeleton className="mt-3 h-5 w-1/2" />
      <Skeleton className="mt-3 h-11 w-full rounded-full" />
    </div>
  );
}

function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

function SectionTitleSkeleton({ width = "w-36" }: { width?: string }) {
  return <Skeleton className={`mb-3 h-6 ${width}`} aria-hidden="true" />;
}

function CategorySkeleton() {
  return (
    <div className="no-scrollbar -mx-4 flex gap-3 overflow-hidden px-4 md:mx-0 md:grid md:grid-cols-8 md:px-0">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex w-20 shrink-0 flex-col items-center gap-2 md:w-auto">
          <Skeleton className="size-16 rounded-2xl" aria-hidden="true" />
          <Skeleton className="h-3 w-14" aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}

function StoreCardSkeleton() {
  return (
    <div
      className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
      aria-hidden="true"
    >
      <Skeleton className="size-12 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
    </div>
  );
}

function LoadingAnnouncement() {
  return (
    <p className="sr-only" role="status" aria-live="polite">
      Loading stores and products
    </p>
  );
}

export function StorefrontHomeSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true">
      <LoadingAnnouncement />
      <section className="grid overflow-hidden rounded-3xl bg-primary-soft md:grid-cols-2">
        <div className="space-y-4 p-6 md:p-10">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-4/5 md:h-12" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-12 w-40 rounded-full" />
        </div>
        <Skeleton className="h-48 w-full rounded-none md:h-full md:min-h-64" />
      </section>
      <section>
        <SectionTitleSkeleton width="w-28" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <StoreCardSkeleton key={index} />
          ))}
        </div>
      </section>
      <section>
        <SectionTitleSkeleton width="w-44" />
        <CategorySkeleton />
      </section>
      <section>
        <SectionTitleSkeleton width="w-40" />
        <ProductGridSkeleton count={4} />
      </section>
      <section>
        <SectionTitleSkeleton width="w-36" />
        <ProductGridSkeleton />
      </section>
    </div>
  );
}

export function StorefrontListingSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <LoadingAnnouncement />
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-11 w-full rounded-full sm:w-52" />
      </div>
      <Skeleton className="h-11 w-full rounded-full" />
      <CategorySkeleton />
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-11 w-32 rounded-full" />
        <Skeleton className="h-11 w-40 rounded-full" />
      </div>
      <Skeleton className="h-4 w-24" />
      <ProductGridSkeleton />
    </div>
  );
}

export function StorefrontCheckoutDataSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <LoadingAnnouncement />
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4 rounded-2xl border bg-card p-5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
        <div className="space-y-4 rounded-2xl border bg-card p-5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
        </div>
      </div>
    </div>
  );
}
