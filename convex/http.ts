import { httpRouter, makeFunctionReference, type FunctionReference } from "convex/server";
import { env, httpAction } from "./_generated/server";
import { auth } from "./auth";

type MoPayWebhookArgs = {
  eventId: string;
  eventType: string;
  reference: string;
  sessionId: string;
  amount: string;
  environment: string;
};
const handleMoPayWebhookRef = makeFunctionReference<
  "action",
  MoPayWebhookArgs,
  { accepted: boolean }
>("mopay:handleWebhookPayment") as unknown as FunctionReference<
  "action",
  "internal",
  MoPayWebhookArgs,
  { accepted: boolean }
>;

const envValues = env as unknown as { MOPAY_WEBHOOK_TOKEN?: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function reply(status: number, message: string) {
  return new Response(JSON.stringify({ received: status === 200, message }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

const http = httpRouter();
auth.addHttpRoutes(http);

http.route({
  path: "/mopay/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expectedToken = envValues.MOPAY_WEBHOOK_TOKEN?.trim();
    if (!expectedToken) return reply(503, "Webhook is not configured.");
    const authorization = request.headers.get("Authorization") ?? "";
    const expectedAuthorization = `Bearer ${expectedToken}`;
    if (!constantTimeEqual(authorization, expectedAuthorization))
      return reply(401, "Unauthorized.");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return reply(400, "Invalid JSON.");
    }
    if (!isRecord(body)) return reply(400, "Invalid webhook event.");
    const eventId = typeof body["id"] === "string" ? body["id"].trim() : "";
    const eventType = typeof body["type"] === "string" ? body["type"].trim() : "";
    if (!eventId || eventId.length > 200 || !eventType || eventType.length > 100) {
      return reply(400, "Invalid webhook event.");
    }
    const headerEventId = request.headers.get("Mopay-Event-Id");
    if (headerEventId && headerEventId !== eventId) return reply(400, "Webhook event ID mismatch.");

    // MoPay uses this event to validate the webhook destination and bearer token.
    // It is acknowledged without reading or changing payment state.
    if (eventType === "webhook.test") return reply(200, "Webhook verified.");
    if (eventType !== "payment.succeeded") return reply(200, "Event ignored.");

    if (!isRecord(body["data"]) || !isRecord(body["data"]["payment"])) {
      return reply(400, "Invalid payment event.");
    }
    const payment = body["data"]["payment"];
    const reference = typeof payment["reference"] === "string" ? payment["reference"].trim() : "";
    const sessionId = typeof payment["sessionId"] === "string" ? payment["sessionId"].trim() : "";
    const amount = typeof payment["amount"] === "string" ? payment["amount"].trim() : "";
    const environment =
      typeof payment["environment"] === "string" ? payment["environment"].trim() : "";
    if (
      !reference ||
      !/^[A-Z0-9]+$/.test(reference) ||
      !sessionId ||
      sessionId.length > 200 ||
      !amount ||
      amount.length > 32 ||
      !environment
    ) {
      return reply(400, "Invalid payment event.");
    }

    const result = await ctx.runAction(handleMoPayWebhookRef, {
      eventId,
      eventType,
      reference,
      sessionId,
      amount,
      environment,
    });
    return result.accepted
      ? reply(200, "Event accepted.")
      : reply(503, "Payment verification unavailable.");
  }),
});

export default http;
