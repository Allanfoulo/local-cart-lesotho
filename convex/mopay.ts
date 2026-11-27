import { getAuthUserId } from "@convex-dev/auth/server";
import {
  makeFunctionReference,
  type DefaultFunctionArgs,
  type FunctionReference,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { action, env, internalMutation, internalQuery, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const paymentStatus = v.union(
  v.literal("creating"),
  v.literal("ready"),
  v.literal("pending"),
  v.literal("paid"),
  v.literal("failed"),
  v.literal("cancelled"),
  v.literal("expired"),
  v.literal("unknown"),
);
const selectedRail = v.union(v.literal("mpesa"), v.literal("ecocash"), v.literal("card"));

type PublicPaymentStatus =
  "creating" | "ready" | "pending" | "paid" | "failed" | "cancelled" | "expired" | "unknown";
type MoPayRail = "mpesa" | "ecocash" | "card";
type InternalFunctionReference<
  Type extends "query" | "mutation" | "action",
  Args extends DefaultFunctionArgs,
  Result,
> = FunctionReference<Type, "internal", Args, Result>;

type ReserveArgs = {
  checkoutId: string;
  customerUserId: Id<"users">;
  attemptId: string;
  reference: string;
  now: number;
  reservationExpiresAt: number;
};
type Reservation = {
  created: boolean;
  status: PublicPaymentStatus;
  attemptId?: string;
  reference?: string;
  expectedAmount?: number;
  paymentUrl?: string;
  sessionId?: string;
};
type CheckoutState = { status: PublicPaymentStatus; selectedRail?: MoPayRail };
type ProviderResult = {
  status: PublicPaymentStatus;
  sessionId: string;
  reference: string;
  amountCents: number;
  selectedRail?: MoPayRail;
  transactionId?: string;
};

const reserveCheckoutPaymentRef = makeFunctionReference<"mutation", ReserveArgs, Reservation>(
  "mopay:reserveCheckoutPayment",
) as unknown as InternalFunctionReference<"mutation", ReserveArgs, Reservation>;
const saveCreatedSessionRef = makeFunctionReference<
  "mutation",
  { attemptId: string; sessionId: string; paymentUrl: string; now: number },
  CheckoutState
>("mopay:saveCreatedSession") as unknown as InternalFunctionReference<
  "mutation",
  { attemptId: string; sessionId: string; paymentUrl: string; now: number },
  CheckoutState
>;
const setAttemptStatusRef = makeFunctionReference<
  "mutation",
  { attemptId: string; status: PublicPaymentStatus; now: number },
  CheckoutState
>("mopay:setAttemptStatus") as unknown as InternalFunctionReference<
  "mutation",
  { attemptId: string; status: PublicPaymentStatus; now: number },
  CheckoutState
>;
const getOwnedAttemptRef = makeFunctionReference<
  "query",
  { checkoutId: string; customerUserId: Id<"users"> },
  {
    attemptId: string;
    sessionId?: string;
    reference: string;
    expectedAmount: number;
    status: PublicPaymentStatus;
  } | null
>("mopay:getOwnedAttempt") as unknown as InternalFunctionReference<
  "query",
  { checkoutId: string; customerUserId: Id<"users"> },
  {
    attemptId: string;
    sessionId?: string;
    reference: string;
    expectedAmount: number;
    status: PublicPaymentStatus;
  } | null
>;
const applyVerifiedResultRef = makeFunctionReference<
  "mutation",
  {
    attemptId: string;
    customerUserId?: Id<"users">;
    result: ProviderResult;
    eventId?: string;
    eventType?: string;
    now: number;
  },
  CheckoutState
>("mopay:applyVerifiedResult") as unknown as InternalFunctionReference<
  "mutation",
  {
    attemptId: string;
    customerUserId?: Id<"users">;
    result: ProviderResult;
    eventId?: string;
    eventType?: string;
    now: number;
  },
  CheckoutState
>;
const getAttemptByReferenceRef = makeFunctionReference<
  "query",
  { reference: string },
  { attemptId: string; checkoutId: string; expectedAmount: number; sessionId?: string } | null
>("mopay:getAttemptByReference") as unknown as InternalFunctionReference<
  "query",
  { reference: string },
  { attemptId: string; checkoutId: string; expectedAmount: number; sessionId?: string } | null
>;

const envValues = env as unknown as {
  MOPAY_API_KEY?: string;
  MOPAY_WEBHOOK_TOKEN?: string;
  MOPAY_REDIRECT_BASE_URL?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readRedirectBase(): string | null {
  const configured = asNonEmptyString(envValues.MOPAY_REDIRECT_BASE_URL);
  if (!configured) return null;
  try {
    const url = new URL(configured);
    const isDeployPreview = /^deploy-preview-\d+--local-cart-lesotho\.netlify\.app$/i.test(
      url.hostname,
    );
    if (
      url.protocol !== "https:" ||
      !isDeployPreview ||
      url.username ||
      url.password ||
      url.port ||
      (url.pathname !== "/" && url.pathname !== "") ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function getMoPayConfiguration() {
  const apiKey = asNonEmptyString(envValues.MOPAY_API_KEY);
  const webhookToken = asNonEmptyString(envValues.MOPAY_WEBHOOK_TOKEN);
  const redirectBase = readRedirectBase();
  if (!apiKey || !webhookToken || !redirectBase) return null;
  return { apiKey, webhookToken, redirectBase };
}

function parseMoneyCents(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const [wholePart, fractionPart = ""] = text.split(".");
  const whole = Number(wholePart);
  const fraction = Number(fractionPart.padEnd(2, "0"));
  if (!Number.isSafeInteger(whole) || !Number.isSafeInteger(fraction)) return null;
  const cents = whole * 100 + fraction;
  return Number.isSafeInteger(cents) ? cents : null;
}

function amountCents(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) return -1;
  return Math.round(amount * 100);
}

function validHostedPaymentUrl(raw: string, sessionId: string): boolean {
  try {
    const url = new URL(raw);
    return (
      url.protocol === "https:" &&
      url.hostname === "mopay.co.ls" &&
      url.port === "" &&
      url.username === "" &&
      url.password === "" &&
      url.pathname === `/pay/${sessionId}` &&
      url.search === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
}

function parseCreatedSession(value: unknown): { sessionId: string; paymentUrl: string } | null {
  if (!isRecord(value) || value["success"] !== true) return null;
  const sessionId = asNonEmptyString(value["sessionId"]);
  const paymentUrl = asNonEmptyString(value["paymentUrl"]);
  if (
    !sessionId ||
    sessionId.length > 200 ||
    !paymentUrl ||
    !validHostedPaymentUrl(paymentUrl, sessionId)
  ) {
    return null;
  }
  return { sessionId, paymentUrl };
}

function mapRail(value: unknown): MoPayRail | undefined {
  if (value === "mpesa" || value === "ecocash" || value === "card") return value;
  return undefined;
}

function parseProviderSession(
  value: unknown,
  expected: { sessionId: string; reference: string; amount: number },
): ProviderResult {
  const unknownResult: ProviderResult = {
    status: "unknown",
    sessionId: expected.sessionId,
    reference: expected.reference,
    amountCents: amountCents(expected.amount),
  };
  if (!isRecord(value) || value["success"] !== true || !isRecord(value["session"]))
    return unknownResult;

  const session = value["session"];
  const sessionId = asNonEmptyString(session["sessionId"]);
  const reference = asNonEmptyString(session["reference"]);
  const receivedAmount = parseMoneyCents(session["amount"]);
  const expectedCents = amountCents(expected.amount);
  if (
    sessionId !== expected.sessionId ||
    reference !== expected.reference ||
    receivedAmount === null ||
    receivedAmount !== expectedCents
  ) {
    return unknownResult;
  }

  const rawStatus = session["status"];
  let status: PublicPaymentStatus = "unknown";
  if (rawStatus === "CREATED") status = "ready";
  else if (rawStatus === "PROCESSING") status = "pending";
  else if (rawStatus === "FAILED") status = "failed";
  else if (rawStatus === "CANCELLED") status = "cancelled";
  else if (rawStatus === "EXPIRED") status = "expired";
  else if (rawStatus === "COMPLETED" && session["transactionStatus"] === "success") {
    status = "paid";
  }

  const transactionId = asNonEmptyString(session["transactionId"]) ?? undefined;
  if (status === "paid" && !transactionId) status = "unknown";
  return {
    status,
    sessionId,
    reference,
    amountCents: receivedAmount,
    ...(mapRail(session["selectedPaymentMethod"])
      ? { selectedRail: mapRail(session["selectedPaymentMethod"]) }
      : {}),
    ...(transactionId ? { transactionId } : {}),
  };
}

function validateCheckoutId(raw: string): string {
  const checkoutId = raw.trim();
  if (checkoutId.length < 12 || checkoutId.length > 100) throw new ConvexError("Invalid checkout.");
  return checkoutId;
}

async function loadOwnedCheckout(
  ctx: QueryCtx | MutationCtx,
  rawCheckoutId: string,
  customerUserId: Id<"users">,
) {
  const checkoutId = validateCheckoutId(rawCheckoutId);
  const checkout = await ctx.db
    .query("checkouts")
    .withIndex("by_checkout_id", (q) => q.eq("checkoutId", checkoutId))
    .unique();
  if (!checkout || checkout.orderIds.length === 0 || checkout.orderIds.length > 50) {
    throw new ConvexError("Checkout not found.");
  }

  const orders = await Promise.all(checkout.orderIds.map((orderId) => ctx.db.get(orderId)));
  if (
    orders.some(
      (order) =>
        !order ||
        order.checkoutId !== checkoutId ||
        order.customerUserId !== customerUserId ||
        order.payment.method !== "mopay",
    )
  ) {
    throw new ConvexError("Checkout not found.");
  }
  if (new Set(checkout.orderIds.map(String)).size !== checkout.orderIds.length) {
    throw new ConvexError("Checkout not found.");
  }
  const allLinkedOrders = await ctx.db
    .query("orders")
    .withIndex("by_checkout_id", (q) => q.eq("checkoutId", checkoutId))
    .take(51);
  if (
    allLinkedOrders.length !== checkout.orderIds.length ||
    allLinkedOrders.some((order) => !checkout.orderIds.some((orderId) => orderId === order._id))
  ) {
    throw new ConvexError("Checkout not found.");
  }
  const validOrders = orders.filter((order) => order !== null);
  const totalFromOrders = Math.round(
    validOrders.reduce((sum, order) => sum + order.total, 0) * 100,
  );
  if (amountCents(checkout.total) !== totalFromOrders) {
    throw new ConvexError("Checkout total is inconsistent.");
  }
  return { checkout, orders: validOrders, checkoutId };
}

function publicState(
  payment: { status: PublicPaymentStatus; selectedRail?: MoPayRail } | null,
): CheckoutState | null {
  if (!payment) return null;
  return {
    status: payment.status,
    ...(payment.selectedRail ? { selectedRail: payment.selectedRail } : {}),
  };
}

async function getCheckoutState(ctx: QueryCtx | MutationCtx, checkoutId: string) {
  const summary = await ctx.db
    .query("mopayCheckoutPayments")
    .withIndex("by_checkout_id", (q) => q.eq("checkoutId", checkoutId))
    .unique();
  if (!summary) return null;
  const attempt = await ctx.db.get(summary.currentAttemptId);
  return publicState(
    attempt
      ? { status: summary.status, selectedRail: attempt.selectedRail ?? summary.selectedRail }
      : { status: summary.status, selectedRail: summary.selectedRail },
  );
}

function newReference(): string {
  return `REE${crypto.randomUUID().replaceAll("-", "").toUpperCase()}`;
}

function checkoutRedirectUrl(base: string, checkoutId: string): string {
  return `${base}/order-confirmation/${encodeURIComponent(checkoutId)}?mopayReturn=1`;
}

async function providerSession(sessionId: string): Promise<unknown> {
  const response = await fetch(
    `https://mopay.co.ls/api/external/session/v1/${encodeURIComponent(sessionId)}`,
    { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15_000) },
  );
  if (!response.ok) throw new Error("MoPay session lookup failed.");
  return await response.json();
}

export const getAvailability = query({
  args: {},
  returns: v.object({ enabled: v.boolean() }),
  handler: async () => ({ enabled: getMoPayConfiguration() !== null }),
});

export const getCheckoutPayment = query({
  args: { checkoutId: v.string() },
  returns: v.union(
    v.null(),
    v.object({ status: paymentStatus, selectedRail: v.optional(selectedRail) }),
  ),
  handler: async (ctx, { checkoutId }) => {
    const customerUserId = await getAuthUserId(ctx);
    if (!customerUserId) throw new ConvexError("Authentication required.");
    const owned = await loadOwnedCheckout(ctx, checkoutId, customerUserId);
    return await getCheckoutState(ctx, owned.checkoutId);
  },
});

export const startCheckoutPayment = action({
  args: { checkoutId: v.string() },
  returns: v.object({ status: paymentStatus, paymentUrl: v.optional(v.string()) }),
  handler: async (ctx, { checkoutId: rawCheckoutId }) => {
    const customerUserId = await getAuthUserId(ctx);
    if (!customerUserId) throw new ConvexError("Authentication required.");
    const config = getMoPayConfiguration();
    if (!config) return { status: "failed" as const };

    const checkoutId = validateCheckoutId(rawCheckoutId);
    const attemptId = crypto.randomUUID();
    const now = Date.now();
    const reservation = await ctx.runMutation(reserveCheckoutPaymentRef, {
      checkoutId,
      customerUserId,
      attemptId,
      reference: newReference(),
      now,
      reservationExpiresAt: now + 30_000,
    });
    if (!reservation.created) {
      return {
        status: reservation.status,
        ...(reservation.paymentUrl ? { paymentUrl: reservation.paymentUrl } : {}),
      };
    }
    if (!reservation.reference || reservation.expectedAmount === undefined) {
      await ctx.runMutation(setAttemptStatusRef, { attemptId, status: "unknown", now: Date.now() });
      return { status: "unknown" as const };
    }

    try {
      const response = await fetch("https://mopay.co.ls/api/external/payment", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          amount: reservation.expectedAmount.toFixed(2),
          reference: reservation.reference,
          redirectUrl: checkoutRedirectUrl(config.redirectBase, checkoutId),
          description: `REETAPELE order ${reservation.reference}`,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        const status: PublicPaymentStatus = response.status >= 500 ? "unknown" : "failed";
        const updated = await ctx.runMutation(setAttemptStatusRef, {
          attemptId,
          status,
          now: Date.now(),
        });
        return { status: updated.status };
      }
      const created = parseCreatedSession(await response.json().catch(() => null));
      if (!created) {
        const updated = await ctx.runMutation(setAttemptStatusRef, {
          attemptId,
          status: "unknown",
          now: Date.now(),
        });
        return { status: updated.status };
      }
      const saved = await ctx.runMutation(saveCreatedSessionRef, {
        attemptId,
        sessionId: created.sessionId,
        paymentUrl: created.paymentUrl,
        now: Date.now(),
      });
      return {
        status: saved.status,
        ...(saved.status === "ready" ? { paymentUrl: created.paymentUrl } : {}),
      };
    } catch {
      try {
        const updated = await ctx.runMutation(setAttemptStatusRef, {
          attemptId,
          status: "unknown",
          now: Date.now(),
        });
        return { status: updated.status };
      } catch {
        return { status: "unknown" as const };
      }
    }
  },
});

export const verifyCheckoutPayment = action({
  args: { checkoutId: v.string() },
  returns: v.union(
    v.null(),
    v.object({ status: paymentStatus, selectedRail: v.optional(selectedRail) }),
  ),
  handler: async (ctx, { checkoutId }) => {
    const customerUserId = await getAuthUserId(ctx);
    if (!customerUserId) throw new ConvexError("Authentication required.");
    const attempt = await ctx.runQuery(getOwnedAttemptRef, { checkoutId, customerUserId });
    if (!attempt) return null;
    if (!attempt.sessionId) return { status: attempt.status };
    try {
      const raw = await providerSession(attempt.sessionId);
      const result = parseProviderSession(raw, {
        sessionId: attempt.sessionId,
        reference: attempt.reference,
        amount: attempt.expectedAmount,
      });
      const updated = await ctx.runMutation(applyVerifiedResultRef, {
        attemptId: attempt.attemptId,
        customerUserId,
        result,
        now: Date.now(),
      });
      return updated;
    } catch {
      return await ctx.runMutation(setAttemptStatusRef, {
        attemptId: attempt.attemptId,
        status: "unknown",
        now: Date.now(),
      });
    }
  },
});

export const reserveCheckoutPayment = internalMutation({
  args: {
    checkoutId: v.string(),
    customerUserId: v.id("users"),
    attemptId: v.string(),
    reference: v.string(),
    now: v.number(),
    reservationExpiresAt: v.number(),
  },
  returns: v.object({
    created: v.boolean(),
    status: paymentStatus,
    attemptId: v.optional(v.string()),
    reference: v.optional(v.string()),
    expectedAmount: v.optional(v.number()),
    paymentUrl: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<Reservation> => {
    const { checkout, orders, checkoutId } = await loadOwnedCheckout(
      ctx,
      args.checkoutId,
      args.customerUserId,
    );
    if (!/^[A-Z0-9]+$/.test(args.reference) || args.reference.length > 64) {
      throw new ConvexError("Invalid MoPay reference.");
    }
    if (
      orders.some(
        (order) =>
          order.payment.status === "paid" || ["cancelled", "rejected"].includes(order.status),
      )
    ) {
      throw new ConvexError("This checkout cannot start a MoPay payment.");
    }

    let summary = await ctx.db
      .query("mopayCheckoutPayments")
      .withIndex("by_checkout_id", (q) => q.eq("checkoutId", checkoutId))
      .unique();
    let attemptNumber = 1;
    if (summary) {
      if (
        summary.customerUserId !== args.customerUserId ||
        amountCents(summary.total) !== amountCents(checkout.total)
      ) {
        throw new ConvexError("Checkout not found.");
      }
      const current = await ctx.db.get(summary.currentAttemptId);
      if (!current) throw new ConvexError("MoPay payment state is unavailable.");
      if (summary.status === "paid") {
        return {
          created: false,
          status: "paid",
          attemptId: current.attemptId,
          reference: current.reference,
        };
      }
      if (["ready", "pending"].includes(summary.status)) {
        return {
          created: false,
          status: summary.status,
          attemptId: current.attemptId,
          reference: current.reference,
          expectedAmount: current.expectedAmount,
          ...(current.paymentUrl ? { paymentUrl: current.paymentUrl } : {}),
          ...(current.sessionId ? { sessionId: current.sessionId } : {}),
        };
      }
      if (summary.status === "creating") {
        if (current.reservationExpiresAt > args.now) {
          return {
            created: false,
            status: "creating",
            attemptId: current.attemptId,
            reference: current.reference,
          };
        }
        await ctx.db.patch(current._id, { status: "unknown", updatedAt: args.now });
        await ctx.db.patch(summary._id, { status: "unknown", updatedAt: args.now });
        return {
          created: false,
          status: "unknown",
          attemptId: current.attemptId,
          reference: current.reference,
        };
      }
      if (summary.status === "unknown") {
        return {
          created: false,
          status: "unknown",
          attemptId: current.attemptId,
          reference: current.reference,
          expectedAmount: current.expectedAmount,
          ...(current.paymentUrl ? { paymentUrl: current.paymentUrl } : {}),
          ...(current.sessionId ? { sessionId: current.sessionId } : {}),
        };
      }
      attemptNumber = current.attemptNumber + 1;
    }

    const attemptDocId = await ctx.db.insert("mopayPaymentAttempts", {
      checkoutId,
      customerUserId: args.customerUserId,
      attemptNumber,
      attemptId: args.attemptId,
      reference: args.reference,
      expectedAmount: checkout.total,
      status: "creating",
      reservationExpiresAt: args.reservationExpiresAt,
      createdAt: args.now,
      updatedAt: args.now,
    });
    if (summary) {
      await ctx.db.patch(summary._id, {
        total: checkout.total,
        orderIds: checkout.orderIds,
        currentAttemptId: attemptDocId,
        status: "creating",
        selectedRail: undefined,
        providerTransactionId: undefined,
        updatedAt: args.now,
      });
    } else {
      const summaryId = await ctx.db.insert("mopayCheckoutPayments", {
        checkoutId,
        customerUserId: args.customerUserId,
        total: checkout.total,
        orderIds: checkout.orderIds,
        currentAttemptId: attemptDocId,
        status: "creating",
        updatedAt: args.now,
      });
      summary = await ctx.db.get(summaryId);
    }
    return {
      created: true,
      status: "creating",
      attemptId: args.attemptId,
      reference: args.reference,
      expectedAmount: checkout.total,
    };
  },
});

export const saveCreatedSession = internalMutation({
  args: { attemptId: v.string(), sessionId: v.string(), paymentUrl: v.string(), now: v.number() },
  returns: v.object({ status: paymentStatus, selectedRail: v.optional(selectedRail) }),
  handler: async (ctx, args) => {
    if (
      !args.sessionId.trim() ||
      args.sessionId.length > 200 ||
      !validHostedPaymentUrl(args.paymentUrl, args.sessionId)
    ) {
      throw new ConvexError("Invalid MoPay session response.");
    }
    const attempt = await ctx.db
      .query("mopayPaymentAttempts")
      .withIndex("by_attempt_id", (q) => q.eq("attemptId", args.attemptId))
      .unique();
    if (!attempt) throw new ConvexError("Payment attempt not found.");
    const collision = await ctx.db
      .query("mopayPaymentAttempts")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    if (collision && collision._id !== attempt._id)
      throw new ConvexError("MoPay session is already in use.");
    const summary = await ctx.db
      .query("mopayCheckoutPayments")
      .withIndex("by_checkout_id", (q) => q.eq("checkoutId", attempt.checkoutId))
      .unique();
    if (!summary) throw new ConvexError("MoPay checkout payment not found.");
    if (attempt.status === "paid" || summary.status === "paid") {
      return {
        status: "paid" as const,
        ...(attempt.selectedRail ? { selectedRail: attempt.selectedRail } : {}),
      };
    }
    await ctx.db.patch(attempt._id, {
      sessionId: args.sessionId,
      paymentUrl: args.paymentUrl,
      status: "ready",
      updatedAt: args.now,
    });
    if (summary.currentAttemptId === attempt._id) {
      await ctx.db.patch(summary._id, { status: "ready", updatedAt: args.now });
    }
    return { status: "ready" as const };
  },
});

export const setAttemptStatus = internalMutation({
  args: { attemptId: v.string(), status: paymentStatus, now: v.number() },
  returns: v.object({ status: paymentStatus, selectedRail: v.optional(selectedRail) }),
  handler: async (ctx, args) => {
    const attempt = await ctx.db
      .query("mopayPaymentAttempts")
      .withIndex("by_attempt_id", (q) => q.eq("attemptId", args.attemptId))
      .unique();
    if (!attempt) return { status: "unknown" as const };
    const summary = await ctx.db
      .query("mopayCheckoutPayments")
      .withIndex("by_checkout_id", (q) => q.eq("checkoutId", attempt.checkoutId))
      .unique();
    if (!summary) return { status: "unknown" as const };
    if (attempt.status === "paid" || summary.status === "paid") {
      return {
        status: "paid" as const,
        ...(attempt.selectedRail ? { selectedRail: attempt.selectedRail } : {}),
      };
    }
    await ctx.db.patch(attempt._id, { status: args.status, updatedAt: args.now });
    if (summary.currentAttemptId === attempt._id) {
      await ctx.db.patch(summary._id, { status: args.status, updatedAt: args.now });
    }
    return { status: summary.currentAttemptId === attempt._id ? args.status : summary.status };
  },
});

export const getOwnedAttempt = internalQuery({
  args: { checkoutId: v.string(), customerUserId: v.id("users") },
  returns: v.union(
    v.null(),
    v.object({
      attemptId: v.string(),
      sessionId: v.optional(v.string()),
      reference: v.string(),
      expectedAmount: v.number(),
      status: paymentStatus,
    }),
  ),
  handler: async (ctx, args) => {
    const { checkoutId } = await loadOwnedCheckout(ctx, args.checkoutId, args.customerUserId);
    const summary = await ctx.db
      .query("mopayCheckoutPayments")
      .withIndex("by_checkout_id", (q) => q.eq("checkoutId", checkoutId))
      .unique();
    if (!summary) return null;
    if (summary.customerUserId !== args.customerUserId)
      throw new ConvexError("Checkout not found.");
    const attempt = await ctx.db.get(summary.currentAttemptId);
    if (!attempt) return null;
    return {
      attemptId: attempt.attemptId,
      ...(attempt.sessionId ? { sessionId: attempt.sessionId } : {}),
      reference: attempt.reference,
      expectedAmount: attempt.expectedAmount,
      status: summary.status,
    };
  },
});

export const getAttemptByReference = internalQuery({
  args: { reference: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      attemptId: v.string(),
      checkoutId: v.string(),
      expectedAmount: v.number(),
      sessionId: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { reference }) => {
    const attempt = await ctx.db
      .query("mopayPaymentAttempts")
      .withIndex("by_reference", (q) => q.eq("reference", reference))
      .unique();
    if (!attempt) return null;
    return {
      attemptId: attempt.attemptId,
      checkoutId: attempt.checkoutId,
      expectedAmount: attempt.expectedAmount,
      ...(attempt.sessionId ? { sessionId: attempt.sessionId } : {}),
    };
  },
});

export const applyVerifiedResult = internalMutation({
  args: {
    attemptId: v.string(),
    customerUserId: v.optional(v.id("users")),
    result: v.object({
      status: paymentStatus,
      sessionId: v.string(),
      reference: v.string(),
      amountCents: v.number(),
      selectedRail: v.optional(selectedRail),
      transactionId: v.optional(v.string()),
    }),
    eventId: v.optional(v.string()),
    eventType: v.optional(v.string()),
    now: v.number(),
  },
  returns: v.object({ status: paymentStatus, selectedRail: v.optional(selectedRail) }),
  handler: async (ctx, args) => {
    const attempt = await ctx.db
      .query("mopayPaymentAttempts")
      .withIndex("by_attempt_id", (q) => q.eq("attemptId", args.attemptId))
      .unique();
    if (!attempt) return { status: "unknown" as const };
    const duplicateEvent = args.eventId
      ? await ctx.db
          .query("mopayWebhookEvents")
          .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId!))
          .unique()
      : null;
    const summary = await ctx.db
      .query("mopayCheckoutPayments")
      .withIndex("by_checkout_id", (q) => q.eq("checkoutId", attempt.checkoutId))
      .unique();
    if (!summary) return { status: "unknown" as const };
    if (duplicateEvent)
      return publicState({ status: summary.status, selectedRail: summary.selectedRail })!;
    const customerUserId = args.customerUserId ?? attempt.customerUserId;
    if (customerUserId !== attempt.customerUserId) throw new ConvexError("Checkout not found.");
    const { checkout, orders } = await loadOwnedCheckout(ctx, attempt.checkoutId, customerUserId);
    if (
      (args.result.sessionId !== attempt.sessionId && attempt.sessionId !== undefined) ||
      args.result.reference !== attempt.reference ||
      args.result.amountCents !== amountCents(attempt.expectedAmount) ||
      amountCents(checkout.total) !== amountCents(attempt.expectedAmount)
    ) {
      throw new ConvexError("MoPay verification did not match this checkout.");
    }
    if (!attempt.sessionId) {
      const collision = await ctx.db
        .query("mopayPaymentAttempts")
        .withIndex("by_session_id", (q) => q.eq("sessionId", args.result.sessionId))
        .unique();
      if (collision && collision._id !== attempt._id)
        throw new ConvexError("MoPay session is already in use.");
    }
    if (args.eventId && !args.eventId.trim()) throw new ConvexError("Invalid MoPay event ID.");

    // A delayed read or duplicate webhook must never move a confirmed payment
    // back to pending/failed after another verification already marked it paid.
    if (attempt.status === "paid" || summary.status === "paid") {
      if (args.eventId) {
        await ctx.db.insert("mopayWebhookEvents", {
          eventId: args.eventId,
          eventType: args.eventType ?? "payment.succeeded",
          checkoutId: attempt.checkoutId,
          processedAt: args.now,
        });
      }
      return publicState({
        status: "paid",
        selectedRail: attempt.selectedRail ?? summary.selectedRail,
      })!;
    }

    const nextStatus = args.result.status;
    if (nextStatus === "paid") {
      if (!args.result.transactionId) throw new ConvexError("MoPay success has no transaction ID.");
      const exactLinkedOrders = new Set(checkout.orderIds.map(String));
      if (orders.length !== exactLinkedOrders.size)
        throw new ConvexError("Checkout order mapping changed.");
      await ctx.db.patch(attempt._id, {
        sessionId: args.result.sessionId,
        status: "paid",
        ...(args.result.selectedRail ? { selectedRail: args.result.selectedRail } : {}),
        providerTransactionId: args.result.transactionId,
        updatedAt: args.now,
      });
      await ctx.db.patch(summary._id, {
        currentAttemptId: attempt._id,
        status: "paid",
        ...(args.result.selectedRail ? { selectedRail: args.result.selectedRail } : {}),
        providerTransactionId: args.result.transactionId,
        updatedAt: args.now,
      });
      for (const order of orders) {
        if (order.payment.status !== "paid") {
          await ctx.db.patch(order._id, {
            payment: {
              ...order.payment,
              method: "mopay",
              status: "paid",
              ...(args.result.selectedRail ? { selectedRail: args.result.selectedRail } : {}),
            },
          });
          await ctx.db.insert("domainEvents", {
            eventType: "PaymentStatusChanged",
            version: 1,
            aggregateType: "order",
            aggregateId: order._id,
            storeId: order.storeId,
            occurredAt: args.now,
            data: { paymentStatus: "paid" },
          });
        }
      }
    } else {
      await ctx.db.patch(attempt._id, {
        sessionId: args.result.sessionId,
        status: nextStatus,
        ...(args.result.selectedRail ? { selectedRail: args.result.selectedRail } : {}),
        updatedAt: args.now,
      });
      if (summary.currentAttemptId === attempt._id) {
        await ctx.db.patch(summary._id, {
          status: nextStatus,
          ...(args.result.selectedRail ? { selectedRail: args.result.selectedRail } : {}),
          updatedAt: args.now,
        });
      }
    }
    if (args.eventId) {
      await ctx.db.insert("mopayWebhookEvents", {
        eventId: args.eventId,
        eventType: args.eventType ?? "payment.succeeded",
        checkoutId: attempt.checkoutId,
        processedAt: args.now,
      });
    }
    const updated = await ctx.db.get(summary._id);
    return publicState(
      updated ? { status: updated.status, selectedRail: updated.selectedRail } : null,
    )!;
  },
});

export const handleWebhookPayment = action({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    reference: v.string(),
    sessionId: v.string(),
    amount: v.string(),
    environment: v.string(),
  },
  returns: v.object({ accepted: v.boolean() }),
  handler: async (ctx, args) => {
    if (args.environment !== "SANDBOX" || args.eventType !== "payment.succeeded") {
      return { accepted: true };
    }
    const attempt = await ctx.runQuery(getAttemptByReferenceRef, { reference: args.reference });
    if (!attempt || (attempt.sessionId && attempt.sessionId !== args.sessionId))
      return { accepted: true };
    const webhookAmount = parseMoneyCents(args.amount);
    if (webhookAmount === null || webhookAmount !== amountCents(attempt.expectedAmount))
      return { accepted: true };
    try {
      const raw = await providerSession(args.sessionId);
      const result = parseProviderSession(raw, {
        sessionId: args.sessionId,
        reference: args.reference,
        amount: attempt.expectedAmount,
      });
      await ctx.runMutation(applyVerifiedResultRef, {
        attemptId: attempt.attemptId,
        result,
        eventId: args.eventId,
        eventType: args.eventType,
        now: Date.now(),
      });
      return { accepted: true };
    } catch {
      return { accepted: false };
    }
  },
});
