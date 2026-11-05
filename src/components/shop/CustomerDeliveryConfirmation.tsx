import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function CustomerDeliveryConfirmation({
  orderId,
  orderStatus,
}: {
  orderId: string;
  orderStatus: string;
}) {
  const active = orderStatus === "out_for_delivery";
  const confirmation = useQuery(
    api.orders.deliveryConfirmationCode,
    active ? { orderId: orderId as Id<"orders"> } : "skip",
  );
  const replaceCode = useMutation(api.orders.replaceDeliveryConfirmationCode);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);

  if (!active) return null;

  const secondsUntilReplacement = confirmation
    ? Math.max(0, Math.ceil((confirmation.replacementAvailableAt - now) / 1000))
    : 0;
  const requestCode = async () => {
    setBusy(true);
    setMessage("");
    try {
      const result = await replaceCode({ orderId: orderId as Id<"orders"> });
      if (result.success) setMessage("Your new delivery code is ready. Share it with your driver.");
      else setMessage(`You can request another code in ${Math.max(1, Math.ceil(result.retryAfterMs / 1000))} seconds.`);
    } catch {
      setMessage("Could not update your delivery code. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4" aria-label="Delivery confirmation code">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold">Delivery confirmation code</h4>
          <p className="mt-1 text-sm text-muted-foreground">Share this code with your driver when they hand over your order.</p>
        </div>
        {confirmation === undefined ? (
          <Skeleton className="h-10 w-24" aria-hidden="true" />
        ) : confirmation ? (
          <p className="rounded-xl bg-background px-4 py-2 font-mono text-2xl font-bold tracking-[0.25em]" aria-label={`Your code is ${confirmation.code}`}>
            {confirmation.code}
          </p>
        ) : null}
      </div>
      {confirmation === undefined ? null : (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={busy || secondsUntilReplacement > 0}
            onClick={() => void requestCode()}
          >
            {busy ? "Updating codeâ€¦" : confirmation ? "Get a new code" : "Generate delivery code"}
          </Button>
          {secondsUntilReplacement > 0 && (
            <p className="text-sm text-muted-foreground">Available again in {secondsUntilReplacement}s.</p>
          )}
        </div>
      )}
      {message && <p role="status" className="mt-2 text-sm text-muted-foreground">{message}</p>}
    </section>
  );
}

