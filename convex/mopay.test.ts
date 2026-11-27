/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { makeFunctionReference } from "convex/server";
import type { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const PREVIEW_URL = "https://deploy-preview-42--local-cart-lesotho.netlify.app";
const SESSION_ID = "MOP_testSession123";

type CheckoutState = { status: string; selectedRail?: string } | null;
const getAvailabilityRef = makeFunctionReference<
  "query",
  Record<string, never>,
  { enabled: boolean }
>("mopay:getAvailability");
const getCheckoutPaymentRef = makeFunctionReference<"query", { checkoutId: string }, CheckoutState>(
  "mopay:getCheckoutPayment",
);
const startCheckoutPaymentRef = makeFunctionReference<
  "action",
  { checkoutId: string },
  { status: string; paymentUrl?: string }
>("mopay:startCheckoutPayment");
const verifyCheckoutPaymentRef = makeFunctionReference<
  "action",
  { checkoutId: string },
  CheckoutState
>("mopay:verifyCheckoutPayment");

function identity(userId: Id<"users">, email: string) {
  return {
    subject: String(userId),
    email,
    issuer: "https://auth.example.test",
    tokenIdentifier: `https://auth.example.test|${userId}`,
  };
}

function configureMoPay(redirectUrl = PREVIEW_URL) {
  vi.stubEnv("MOPAY_API_KEY", "sandbox-test-key");
  vi.stubEnv("MOPAY_WEBHOOK_TOKEN", "webhook-test-token");
  vi.stubEnv("MOPAY_REDIRECT_BASE_URL", redirectUrl);
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function createdSessionResponse(paymentUrl = `https://mopay.co.ls/pay/${SESSION_ID}`) {
  return jsonResponse({ success: true, sessionId: SESSION_ID, paymentUrl });
}

function providerSession(
  status: string,
  overrides: Record<string, unknown> = {},
  reference = "REEABC1234567890",
) {
  return jsonResponse({
    success: true,
    session: {
      sessionId: SESSION_ID,
      amount: "20.00",
      reference,
      status,
      transactionStatus: status === "COMPLETED" ? "success" : null,
      selectedPaymentMethod: "mpesa",
      transactionId: status === "COMPLETED" ? "txn-sandbox-001" : undefined,
      ...overrides,
    },
  });
}

async function seedCheckout(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const customerUserId = await ctx.db.insert("users", {
      email: "customer@mopay.example.test",
      emailVerificationTime: Date.now(),
    });
    const otherUserId = await ctx.db.insert("users", {
      email: "other@mopay.example.test",
      emailVerificationTime: Date.now(),
    });
    const customerId = await ctx.db.insert("customers", {
      userId: customerUserId,
      name: "MoPay Customer",
      normalizedPhone: "+26650000001",
      phone: "+26650000001",
      email: "customer@mopay.example.test",
      orderCount: 0,
      lifetimeSpend: 0,
      lastOrderAt: Date.now(),
    });
    const storeA = await ctx.db.insert("stores", {
      slug: "mopay-store-a",
      name: "MoPay Store A",
      tagline: "Groceries",
      phone: "+26622220000",
      whatsapp: "+26622220000",
      address: "Maseru",
      openingHours: "08:00-18:00",
      enabled: true,
      sortOrder: 1,
    });
    const storeB = await ctx.db.insert("stores", {
      slug: "mopay-store-b",
      name: "MoPay Store B",
      tagline: "Groceries",
      phone: "+26622220001",
      whatsapp: "+26622220001",
      address: "Maseru",
      openingHours: "08:00-18:00",
      enabled: true,
      sortOrder: 2,
    });
    const checkoutId = "mopay-checkout-123456";
    const createOrder = async (storeId: Id<"stores">, orderNumber: string, total: number) =>
      await ctx.db.insert("orders", {
        storeId,
        storeName: storeId === storeA ? "MoPay Store A" : "MoPay Store B",
        orderNumber,
        checkoutId,
        customerId,
        customerUserId,
        customer: {
          name: "MoPay Customer",
          phone: "+26650000001",
          email: "customer@mopay.example.test",
        },
        items: [],
        destination: { area: "Maseru", address: "Ha Matala" },
        payment: { method: "mopay", status: "pending" },
        subtotal: total - 2,
        deliveryFee: 2,
        total,
        status: "received",
        createdAt: Date.now(),
        estimatedDeliveryAt: Date.now() + 60_000,
      });
    const orderAId = await createOrder(storeA, "REE-MOPAY-A", 15);
    const orderBId = await createOrder(storeB, "REE-MOPAY-B", 5);
    await ctx.db.insert("checkouts", {
      checkoutId,
      orderIds: [orderAId, orderBId],
      storeCount: 2,
      total: 20,
      createdAt: Date.now(),
    });
    const managerId = await ctx.db.insert("users", {
      email: "manager@mopay.example.test",
      emailVerificationTime: Date.now(),
    });
    await ctx.db.insert("memberships", {
      userId: managerId,
      storeId: storeA,
      role: "store_manager",
      status: "active",
      grantedAt: Date.now(),
    });
    return { customerUserId, otherUserId, managerId, storeA, orderAId, orderBId, checkoutId };
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test("MoPay reserves one checkout attempt and sends the server total with an alphanumeric reference", async () => {
  configureMoPay();
  const t = convexTest(schema, modules);
  const fixture = await seedCheckout(t);
  const customer = t.withIdentity(identity(fixture.customerUserId, "customer@mopay.example.test"));
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return createdSessionResponse();
    }),
  );

  const results = await Promise.all([
    customer.action(startCheckoutPaymentRef, { checkoutId: fixture.checkoutId }),
    customer.action(startCheckoutPaymentRef, { checkoutId: fixture.checkoutId }),
  ]);
  const postCalls = calls.filter((call) => call.url === "https://mopay.co.ls/api/external/payment");
  expect(postCalls).toHaveLength(1);
  const body = JSON.parse(String(postCalls[0]?.init?.body)) as Record<string, string>;
  expect(body["amount"]).toBe("20.00");
  expect(body["reference"]).toMatch(/^[A-Z0-9]+$/);
  expect(body["redirectUrl"]).toBe(
    `${PREVIEW_URL}/order-confirmation/${fixture.checkoutId}?mopayReturn=1`,
  );
  expect(postCalls[0]?.init?.headers).toMatchObject({ Authorization: "Bearer sandbox-test-key" });
  expect(results.map((result) => result.status)).toContain("ready");

  const retry = await customer.action(startCheckoutPaymentRef, { checkoutId: fixture.checkoutId });
  expect(retry).toEqual({ status: "ready", paymentUrl: `https://mopay.co.ls/pay/${SESSION_ID}` });
  expect(calls).toHaveLength(1);

  const other = t.withIdentity(identity(fixture.otherUserId, "other@mopay.example.test"));
  await expect(
    other.action(startCheckoutPaymentRef, { checkoutId: fixture.checkoutId }),
  ).rejects.toThrow();
  expect(calls).toHaveLength(1);
});

test("MoPay rejects non-preview redirects and untrusted hosted payment URLs", async () => {
  const t = convexTest(schema, modules);
  const fixture = await seedCheckout(t);
  const customer = t.withIdentity(identity(fixture.customerUserId, "customer@mopay.example.test"));
  const fetchMock = vi.fn(async () =>
    createdSessionResponse("https://attacker.example/pay/stolen"),
  );
  vi.stubGlobal("fetch", fetchMock);

  configureMoPay("https://deploy-preview-42--local-cart-lesotho.netlify.app.attacker.example");
  await expect(customer.query(getAvailabilityRef, {})).resolves.toEqual({ enabled: false });
  await expect(
    customer.action(startCheckoutPaymentRef, { checkoutId: fixture.checkoutId }),
  ).resolves.toEqual({ status: "failed" });
  expect(fetchMock).not.toHaveBeenCalled();

  configureMoPay();
  await expect(
    customer.action(startCheckoutPaymentRef, { checkoutId: fixture.checkoutId }),
  ).resolves.toEqual({ status: "unknown" });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await expect(
    customer.query(getCheckoutPaymentRef, { checkoutId: fixture.checkoutId }),
  ).resolves.toMatchObject({ status: "unknown" });
});

test("server verification rejects mismatched session facts and keeps all checkout orders unpaid", async () => {
  configureMoPay();
  const t = convexTest(schema, modules);
  const fixture = await seedCheckout(t);
  const customer = t.withIdentity(identity(fixture.customerUserId, "customer@mopay.example.test"));
  let reference = "";
  let verifyResponse = jsonResponse({});
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input) === "https://mopay.co.ls/api/external/payment") {
      reference = (JSON.parse(String(init?.body)) as { reference: string }).reference;
      verifyResponse = providerSession("COMPLETED", { amount: "19.99" }, reference);
      return createdSessionResponse();
    }
    return verifyResponse;
  });
  vi.stubGlobal("fetch", fetchMock);

  await customer.action(startCheckoutPaymentRef, { checkoutId: fixture.checkoutId });
  await expect(
    customer.action(verifyCheckoutPaymentRef, { checkoutId: fixture.checkoutId }),
  ).resolves.toMatchObject({ status: "unknown" });
  const orders = await t.run(async (ctx) =>
    Promise.all([ctx.db.get(fixture.orderAId), ctx.db.get(fixture.orderBId)]),
  );
  expect(orders.map((order) => order?.payment.status)).toEqual(["pending", "pending"]);

  verifyResponse = providerSession("COMPLETED", { reference: "ATTACKERREFERENCE" }, reference);
  await expect(
    customer.action(verifyCheckoutPaymentRef, { checkoutId: fixture.checkoutId }),
  ).resolves.toMatchObject({ status: "unknown" });
  const stillUnpaid = await t.run(async (ctx) =>
    Promise.all([ctx.db.get(fixture.orderAId), ctx.db.get(fixture.orderBId)]),
  );
  expect(stillUnpaid.map((order) => order?.payment.status)).toEqual(["pending", "pending"]);
});

test("verify returns null when the authenticated customer has no payment attempt for an owned checkout", async () => {
  const t = convexTest(schema, modules);
  const fixture = await seedCheckout(t);
  const customer = t.withIdentity(identity(fixture.customerUserId, "customer@mopay.example.test"));
  await expect(
    customer.action(verifyCheckoutPaymentRef, { checkoutId: fixture.checkoutId }),
  ).resolves.toBeNull();
});

test("verified checkout success pays every linked order once and delayed pending reads cannot downgrade it", async () => {
  configureMoPay();
  const t = convexTest(schema, modules);
  const fixture = await seedCheckout(t);
  const customer = t.withIdentity(identity(fixture.customerUserId, "customer@mopay.example.test"));
  let reference = "";
  let verifyResponse = jsonResponse({});
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input) === "https://mopay.co.ls/api/external/payment") {
      reference = (JSON.parse(String(init?.body)) as { reference: string }).reference;
      verifyResponse = providerSession("COMPLETED", {}, reference);
      return createdSessionResponse();
    }
    return verifyResponse;
  });
  vi.stubGlobal("fetch", fetchMock);

  await customer.action(startCheckoutPaymentRef, { checkoutId: fixture.checkoutId });
  await expect(
    customer.action(verifyCheckoutPaymentRef, { checkoutId: fixture.checkoutId }),
  ).resolves.toEqual({ status: "paid", selectedRail: "mpesa" });
  verifyResponse = providerSession("PROCESSING", {}, reference);
  await expect(
    customer.action(verifyCheckoutPaymentRef, { checkoutId: fixture.checkoutId }),
  ).resolves.toEqual({ status: "paid", selectedRail: "mpesa" });

  const orders = await t.run(async (ctx) =>
    Promise.all([ctx.db.get(fixture.orderAId), ctx.db.get(fixture.orderBId)]),
  );
  expect(orders.map((order) => order?.payment)).toEqual([
    { method: "mopay", status: "paid", selectedRail: "mpesa" },
    { method: "mopay", status: "paid", selectedRail: "mpesa" },
  ]);
  const paymentEvents = await t.run(async (ctx) => await ctx.db.query("domainEvents").collect());
  expect(paymentEvents.filter((event) => event.eventType === "PaymentStatusChanged")).toHaveLength(
    2,
  );
});

test("webhook test events do not mutate state; SANDBOX success is reconciled and replayed idempotently", async () => {
  configureMoPay();
  const t = convexTest(schema, modules);
  const fixture = await seedCheckout(t);
  const customer = t.withIdentity(identity(fixture.customerUserId, "customer@mopay.example.test"));
  let reference = "";
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input) === "https://mopay.co.ls/api/external/payment") {
      reference = (JSON.parse(String(init?.body)) as { reference: string }).reference;
      return createdSessionResponse();
    }
    return providerSession("COMPLETED", {}, reference);
  });
  vi.stubGlobal("fetch", fetchMock);
  await customer.action(startCheckoutPaymentRef, { checkoutId: fixture.checkoutId });

  const webhook = async (body: unknown, eventId: string) =>
    await t.fetch("/mopay/webhook", {
      method: "POST",
      headers: {
        Authorization: "Bearer webhook-test-token",
        "Content-Type": "application/json",
        "Mopay-Event-Id": eventId,
      },
      body: JSON.stringify(body),
    });
  const unauthorized = await t.fetch("/mopay/webhook", {
    method: "POST",
    headers: { Authorization: "Bearer invalid-token", "Content-Type": "application/json" },
    body: JSON.stringify({ id: "evt_unauthorized", type: "webhook.test" }),
  });
  expect(unauthorized.status).toBe(401);
  expect(fetchMock).toHaveBeenCalledTimes(1);

  const testEvent = await webhook(
    { id: "evt_test_1", type: "webhook.test", data: { message: "verify" } },
    "evt_test_1",
  );
  expect(testEvent.status).toBe(200);
  expect(fetchMock).toHaveBeenCalledTimes(1);

  const event = {
    id: "evt_paid_1",
    type: "payment.succeeded",
    data: {
      payment: { sessionId: SESSION_ID, reference, amount: "20.00", environment: "SANDBOX" },
    },
  };
  expect((await webhook(event, "evt_paid_1")).status).toBe(200);
  expect((await webhook(event, "evt_paid_1")).status).toBe(200);
  const liveEnvironmentEvent = {
    ...event,
    id: "evt_live_1",
    data: { payment: { ...event.data.payment, environment: "LIVE" } },
  };
  expect((await webhook(liveEnvironmentEvent, "evt_live_1")).status).toBe(200);

  const state = await t.run(async (ctx) => ({
    orders: await Promise.all([ctx.db.get(fixture.orderAId), ctx.db.get(fixture.orderBId)]),
    events: await ctx.db.query("mopayWebhookEvents").collect(),
    domainEvents: await ctx.db.query("domainEvents").collect(),
  }));
  expect(state.orders.map((order) => order?.payment.status)).toEqual(["paid", "paid"]);
  expect(state.events).toHaveLength(1);
  expect(state.events[0]?.eventId).toBe("evt_paid_1");
  expect(
    state.domainEvents.filter((event) => event.eventType === "PaymentStatusChanged"),
  ).toHaveLength(2);
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

test("staff cannot manually mark a MoPay order paid", async () => {
  const t = convexTest(schema, modules);
  const fixture = await seedCheckout(t);
  const manager = t.withIdentity(identity(fixture.managerId, "manager@mopay.example.test"));
  await expect(
    manager.mutation(api.orders.setPaymentStatus, {
      orderId: fixture.orderAId,
      status: "paid",
    }),
  ).rejects.toThrow(/managed by provider verification/i);
});
