import { useCallback, useEffect, useRef, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useAction, useConvexAuth, useQuery } from "convex/react";
import { CheckCircle2, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "../../convex/_generated/api";
import { ORDER_STATUS_LABEL, PAYMENT_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/app-store";
import { formatDate, formatM, formatTime } from "@/lib/format";

type MoPayPaymentState = {
  status: string;
  paymentUrl?: string;
  selectedRail?: string;
};

function isValidMoPayPaymentUrl(paymentUrl: string | undefined): paymentUrl is string {
  if (!paymentUrl) return false;
  try {
    const url = new URL(paymentUrl);
    return (
      url.protocol === "https:" &&
      url.hostname.toLowerCase() === "mopay.co.ls" &&
      url.port === "" &&
      /^\/pay\/[^/]+$/.test(url.pathname) &&
      url.search === "" &&
      url.hash === "" &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function moPayStatusLabel(status: string) {
  switch (status) {
    case "ready":
      return "Ready to pay";
    case "creating":
      return "Preparing payment";
    case "pending":
      return "Payment processing";
    case "paid":
      return "Payment confirmed";
    case "failed":
      return "Payment failed";
    case "cancelled":
      return "Payment cancelled";
    case "expired":
      return "Payment session expired";
    default:
      return "Payment status unconfirmed";
  }
}

function moPayRailLabel(rail: string | undefined) {
  switch (rail?.toLowerCase()) {
    case "mpesa":
    case "m-pesa":
      return "M-Pesa";
    case "ecocash":
      return "EcoCash";
    case "card":
    case "visa":
    case "mastercard":
      return "card";
    default:
      return undefined;
  }
}

export const Route = createFileRoute("/_store/order-confirmation/$id")({
  head: () => ({
    meta: [
      { title: "REETAPELE | Order confirmed" },
      { name: "description", content: "Your marketplace checkout confirmation." },
    ],
  }),
  component: OrderConfirmation,
});

function OrderConfirmation() {
  const { id } = Route.useParams();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const receipt = useQuery(api.orders.checkoutReceipt, { checkoutId: id });
  const receiptOrders = receipt?.orders ?? [];
  const firstOrder = receiptOrders[0];
  const isMoPayCheckout = receiptOrders.some((order) => order.payment.method === "mopay");
  const moPayPayment = useQuery(
    api.mopay.getCheckoutPayment,
    isMoPayCheckout ? { checkoutId: id } : "skip",
  );
  const verifyCheckoutPayment = useAction(api.mopay.verifyCheckoutPayment);
  const startCheckoutPayment = useAction(api.mopay.startCheckoutPayment);
  const [verifiedPayment, setVerifiedPayment] = useState<MoPayPaymentState | null | undefined>(
    undefined,
  );
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const verifiedCheckoutId = useRef<string | null>(null);

  const verifyPayment = useCallback(async () => {
    setIsVerifying(true);
    setPaymentMessage("");
    try {
      const current = await verifyCheckoutPayment({ checkoutId: id });
      setVerifiedPayment(
        current
          ? {
              status: String(current.status),
              ...(current.selectedRail ? { selectedRail: current.selectedRail } : {}),
            }
          : null,
      );
    } catch {
      setVerifiedPayment({ status: "unknown" });
      setPaymentMessage(
        "We could not confirm payment with MoPay yet. Your order is saved; check the status again before trying to pay.",
      );
    } finally {
      setVerificationComplete(true);
      setIsVerifying(false);
    }
  }, [id, verifyCheckoutPayment]);

  useEffect(() => {
    if (!isMoPayCheckout || verifiedCheckoutId.current === id) return;
    verifiedCheckoutId.current = id;
    void verifyPayment();
  }, [id, isMoPayCheckout, verifyPayment]);

  const currentMoPayPayment = (moPayPayment ?? verifiedPayment) as
    MoPayPaymentState | null | undefined;
  const moPayStatus = currentMoPayPayment?.status ?? "unknown";
  const noMoPayAttempt = moPayPayment === null && verificationComplete && verifiedPayment === null;
  const terminalMoPayStatus = ["failed", "cancelled", "expired"].includes(moPayStatus);
  const canResumeMoPay = moPayStatus === "ready";

  async function startOrResumeMoPayPayment() {
    setIsStarting(true);
    setPaymentMessage("");
    try {
      const attempt = await startCheckoutPayment({ checkoutId: id });
      const paymentState: MoPayPaymentState = {
        status: String(attempt.status),
        ...(attempt.paymentUrl ? { paymentUrl: attempt.paymentUrl } : {}),
      };
      setVerifiedPayment(paymentState);
      if (attempt.status === "ready") {
        if (isValidMoPayPaymentUrl(attempt.paymentUrl)) {
          window.location.assign(attempt.paymentUrl);
          return;
        }
        setVerifiedPayment({ status: "unknown" });
        setPaymentMessage(
          "MoPay did not return a secure payment link. Your order is saved; check its payment status before trying again.",
        );
        return;
      }
      if (["creating", "pending", "unknown"].includes(String(attempt.status))) {
        await verifyPayment();
      }
    } catch {
      setPaymentMessage(
        "We could not open MoPay. Your order is still saved; check its payment status before trying again.",
      );
      await verifyPayment();
    } finally {
      setIsStarting(false);
    }
  }

  if (receipt === undefined)
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center" role="status">
        <p className="text-muted-foreground">Loading your receipt…</p>
      </main>
    );

  if (!receipt || !firstOrder)
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <PackageCheck className="mx-auto size-12 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">Order details unavailable</h1>
        <p className="mt-2 text-muted-foreground">
          We could not find this checkout receipt. Check the link or contact support if you need
          help.
        </p>
        <Link to="/shop">
          <Button className="mt-5">Back to shop</Button>
        </Link>
      </main>
    );

  const total = receipt.total;
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 md:py-16">
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-14 text-primary" />
        <p className="mt-4 text-sm font-semibold text-primary">CHECKOUT PLACED</p>
        <h1 className="mt-1 break-words text-2xl font-bold sm:text-3xl">
          Thanks, {firstOrder.customerName.split(" ")[0]}.
        </h1>
        <p className="mt-2 text-muted-foreground">
          {receiptOrders.length === 1
            ? `Your order is with ${firstOrder.storeName ?? "the store"}.`
            : `Your checkout was sent to ${receiptOrders.length} stores.`}
        </p>
      </div>
      {isMoPayCheckout && (
        <section className="mt-6 rounded-2xl border bg-card p-5" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">MoPay payment</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {moPayRailLabel(currentMoPayPayment?.selectedRail)
                  ? `Method: ${moPayRailLabel(currentMoPayPayment?.selectedRail)}.`
                  : "Choose M-Pesa, EcoCash, or card on MoPay's hosted page."}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${moPayStatus === "paid" ? "bg-emerald-50 text-primary" : "bg-muted text-foreground"}`}
            >
              {moPayStatusLabel(moPayStatus)}
            </span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {moPayStatus === "paid"
              ? "MoPay confirmed this payment. Your order is marked paid."
              : moPayStatus === "ready"
                ? "Your order is saved. Continue to MoPay to complete payment."
                : moPayStatus === "creating"
                  ? "MoPay is preparing your payment session. Check again shortly; do not start another payment."
                  : moPayStatus === "pending"
                    ? "MoPay is still processing your payment. We will show it as paid only after the server confirms it."
                    : moPayStatus === "failed"
                      ? "MoPay reported that this attempt failed. You can safely start another attempt for this saved order."
                      : moPayStatus === "cancelled"
                        ? "This payment attempt was cancelled. You can safely try again for this saved order."
                        : moPayStatus === "expired"
                          ? "This payment session expired. You can safely start another attempt for this saved order."
                          : noMoPayAttempt
                            ? "No MoPay session is attached yet. Start payment here; your order will not be placed again."
                            : "Payment is not confirmed yet. Check its status before attempting another payment."}
          </p>
          {isVerifying && (
            <p role="status" className="mt-3 text-sm text-muted-foreground">
              Checking payment status…
            </p>
          )}
          {paymentMessage && (
            <p role="status" className="mt-3 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
              {paymentMessage}
            </p>
          )}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {canResumeMoPay && (
              <Button
                className="min-h-11"
                onClick={() => void startOrResumeMoPayPayment()}
                disabled={isStarting}
              >
                {isStarting ? "Opening MoPay…" : "Continue to MoPay"}
              </Button>
            )}
            {(noMoPayAttempt || terminalMoPayStatus) && (
              <Button
                className="min-h-11"
                onClick={() => void startOrResumeMoPayPayment()}
                disabled={isStarting || isVerifying}
              >
                {isStarting
                  ? "Preparing payment…"
                  : noMoPayAttempt
                    ? "Start MoPay payment"
                    : "Try payment again"}
              </Button>
            )}
            {moPayStatus !== "paid" && (
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => void verifyPayment()}
                disabled={isVerifying || isStarting}
              >
                {isVerifying ? "Checking status…" : "Check payment status"}
              </Button>
            )}
          </div>
        </section>
      )}
      <section className="mt-8 space-y-5 rounded-2xl border bg-card p-5 md:p-7">
        {receiptOrders.map((order) => (
          <article key={order.orderNumber} className="border-b pb-5 last:border-0 last:pb-0">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
              <div>
                <p className="text-sm text-muted-foreground">{order.storeName}</p>
                <p className="text-xl font-bold">{order.orderNumber}</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-primary">
                {ORDER_STATUS_LABEL[order.status as keyof typeof ORDER_STATUS_LABEL]}
              </span>
            </div>
            <div className="grid gap-4 border-b py-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Delivery to</p>
                <p className="mt-1 break-words font-semibold">
                  {order.destination.address}, {order.destination.area}
                </p>
                {order.destination.landmark && (
                  <p className="text-sm text-muted-foreground">Near {order.destination.landmark}</p>
                )}
                {order.destination.instructions && (
                  <p className="text-sm text-muted-foreground">
                    Driver directions: {order.destination.instructions}
                  </p>
                )}
                <p className="mt-2 text-sm">
                  <span className="text-muted-foreground">Estimated delivery:</span>{" "}
                  {formatDate(new Date(order.estimatedDeliveryAt).toISOString())} around{" "}
                  {formatTime(new Date(order.estimatedDeliveryAt).toISOString())}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment</p>
                <p className="mt-1 font-semibold">{PAYMENT_LABEL[order.payment.method]}</p>
                <p className="text-sm text-muted-foreground">
                  {PAYMENT_STATUS_LABEL[order.payment.status]}
                </p>
                {order.payment.exactAmount !== undefined && (
                  <p className="text-sm text-muted-foreground">
                    {order.payment.exactAmount ? "Exact cash requested" : "Change requested"}
                  </p>
                )}
                {receipt.changeRequired !== null &&
                  receipt.changeRequired > 0 &&
                  order === firstOrder && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Your driver should bring {formatM(receipt.changeRequired)} change.
                    </p>
                  )}
              </div>
            </div>
            <ul className="divide-y">
              {order.items.map((item) => (
                <li key={item.productId} className="flex justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0 break-words">
                    {item.quantity} × {item.name}
                  </span>
                  <span className="font-semibold">{formatM(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatM(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Coupon discount</span>
                  <span>−{formatM(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery</span>
                <span>{formatM(order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between pt-1 text-base font-bold">
                <span>Store total</span>
                <span>{formatM(order.total)}</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Placed {formatDate(new Date(order.createdAt).toISOString())}. Keep this receipt link
              to return to your checkout details.
            </p>
          </article>
        ))}
        {receiptOrders.length > 1 && (
          <div className="flex justify-between border-t pt-4 text-lg font-bold">
            <span>Checkout total</span>
            <span>{formatM(total)}</span>
          </div>
        )}
      </section>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        {!isLoading && isAuthenticated && (
          <Link to="/orders" className="w-full sm:w-auto">
            <Button className="min-h-11 w-full">View your orders</Button>
          </Link>
        )}
        <Link to="/shop" className="w-full sm:w-auto">
          <Button className="min-h-11 w-full" variant="outline">
            Continue shopping
          </Button>
        </Link>
      </div>
      {!isLoading && !isAuthenticated && (
        <section className="mx-auto mt-8 max-w-xl rounded-2xl border bg-card p-5 text-center">
          <h2 className="font-semibold">Save your details for next time</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a customer account to save addresses and see future signed-in orders. Keep this
            receipt link to check this guest order.
          </p>
          <Link to="/sign-in" search={{ createAccount: true, returnTo: "/account" }}>
            <Button className="mt-4 min-h-11 w-full sm:w-auto">Create a customer account</Button>
          </Link>
        </section>
      )}
    </main>
  );
}
