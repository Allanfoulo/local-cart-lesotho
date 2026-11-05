import { useState } from "react";
import { Check, ChevronRight, Circle, Eye, Store } from "lucide-react";
import { useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { formatM } from "@/lib/format";

type Section = "settings" | "stock" | "team";

export function OwnerSetupChecklist({
  storeId,
  onOpenSection,
}: {
  storeId: string;
  onOpenSection: (section: Section) => void;
}) {
  const [now] = useState(() => Date.now());
  const progress = useQuery(api.stores.setupProgress, {
    storeId: storeId as Id<"stores">,
    now,
  });

  if (!progress) {
    return (
      <section
        aria-label="Store setup progress"
        className="h-40 animate-pulse rounded-2xl border bg-card"
      />
    );
  }

  const requiredSteps = [
    {
      label: "Store profile",
      done: progress.steps.profile,
      hint: "Name, contact, address, and hours",
      section: "settings" as const,
    },
    {
      label: "Delivery area",
      done: progress.steps.delivery,
      hint: "Choose a service area and default",
      section: "settings" as const,
    },
    {
      label: "Payment methods",
      done: progress.steps.payment,
      hint: "Enable cash or manual mobile money",
      section: "settings" as const,
    },
    {
      label: "First products",
      done: progress.steps.catalogue,
      hint: "Add a category and an available product",
      section: "stock" as const,
    },
  ];
  const completed = requiredSteps.filter((step) => step.done).length;

  return (
    <section aria-labelledby="owner-setup-title" className="rounded-2xl border bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">
            STORE SETUP · {completed} OF {requiredSteps.length} REQUIRED
          </p>
          <h2 id="owner-setup-title" className="mt-1 text-xl font-semibold">
            Get {progress.store.name} ready
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Complete these steps so the platform admin can review the store for publishing. Your
            changes are saved as you go.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-full bg-muted px-3 py-2 text-sm font-medium">
          <Store className="size-4" aria-hidden="true" />
          {progress.store.enabled ? "Published" : "Unpublished"}
        </div>
      </div>

      <div
        className="mt-5 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Required store setup steps"
        aria-valuemin={0}
        aria-valuemax={requiredSteps.length}
        aria-valuenow={completed}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${(completed / requiredSteps.length) * 100}%` }}
        />
      </div>

      <ol className="mt-3 divide-y rounded-xl border">
        {requiredSteps.map((step) => (
          <li
            key={step.label}
            className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4"
          >
            <span className="flex min-w-0 flex-1 items-start gap-3">
              {step.done ? (
                <Check className="mt-0.5 size-5 shrink-0 text-primary" aria-label="Complete" />
              ) : (
                <Circle
                  className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                  aria-label="Not complete"
                />
              )}
              <span>
                <span className="block font-medium">{step.label}</span>
                <span className="block text-sm text-muted-foreground">{step.hint}</span>
              </span>
            </span>
            {!step.done && (
              <Button
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
                onClick={() => onOpenSection(step.section)}
              >
                Continue <ChevronRight className="ml-1 size-4" />
              </Button>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-col gap-3 rounded-xl bg-muted/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">
            Invite your team{" "}
            <span className="text-xs font-normal text-muted-foreground">
              · recommended before launch
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            Give managers and staff access only to the work they need.
          </p>
        </div>
        <Button
          variant="outline"
          className="min-h-11 w-full sm:w-auto"
          onClick={() => onOpenSection("team")}
        >
          {progress.steps.team ? "Manage team" : "Invite staff"}
        </Button>
      </div>

      <details className="group mt-4 rounded-xl border p-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-medium [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <Eye className="size-4 text-primary" /> Preview customer listing
          </span>
          <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
        </summary>
        <div className="mt-3 rounded-xl border bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            REETAPELE store listing
          </p>
          <h3 className="mt-1 text-lg font-semibold">{progress.store.name}</h3>
          <p className="text-sm text-muted-foreground">{progress.store.tagline}</p>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <p>
              <span className="font-medium">Delivery:</span> {progress.preview.deliveryArea}
            </p>
            <p>
              <span className="font-medium">Hours:</span> {progress.store.openingHours}
            </p>
            <p>
              <span className="font-medium">Contact:</span> {progress.store.phone}
            </p>
            <p>
              <span className="font-medium">Payment:</span>{" "}
              {progress.preview.paymentMethods.join(", ") || "Choose a supported payment method"}
            </p>
          </div>
          <p className="mt-3 border-t pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Available products
          </p>
          {progress.preview.products.length ? (
            <ul className="mt-2 divide-y">
              {progress.preview.products.map((product) => (
                <li key={product.name} className="flex justify-between gap-3 py-2 text-sm">
                  <span>{product.name}</span>
                  <span className="shrink-0 font-medium">
                    {formatM(product.price)} / {product.unit}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Your available products will appear here after you add them to an active category.
            </p>
          )}
          {!progress.store.enabled && (
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              This preview is private to your authorized store workspace. Customers will see the
              listing after the platform admin publishes it.
            </p>
          )}
        </div>
      </details>

      {progress.readyToPublish && !progress.store.enabled && (
        <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
          Required setup is complete. The platform admin can now review this store for publishing.
        </p>
      )}
    </section>
  );
}
