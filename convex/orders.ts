import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { calculateOrderTotal, priceOrderLine, roundLslAmount } from "../src/domain/orders/pricing";
import { canTransitionOrder, type OrderWorkflowRole } from "../src/domain/orders/workflow";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { getActiveMemberships, requireStoreRole } from "./lib/authorization";

const paymentMethod = v.union(
  v.literal("mobile_money"),
  v.literal("cash_on_delivery"),
  v.literal("card"),
);

export const placeGuestOrder = mutation({
  args: {
    checkoutId: v.string(),
    customer: v.object({ name: v.string(), phone: v.string(), email: v.optional(v.string()) }),
    destination: v.object({
      area: v.string(),
      address: v.string(),
      landmark: v.optional(v.string()),
      instructions: v.optional(v.string()),
      latitude: v.optional(v.number()),
      longitude: v.optional(v.number()),
    }),
    paymentMethod,
    couponCode: v.optional(v.string()),
    cashGiven: v.optional(v.number()),
    exactAmount: v.optional(v.boolean()),
    items: v.array(v.object({ productId: v.id("products"), quantity: v.number() })),
  },
  handler: async (ctx, args) => {
    const customerUserId = await getAuthUserId(ctx);
    if (args.paymentMethod === "card") throw new ConvexError("Card payments are not configured yet.");
    const checkoutId = args.checkoutId.trim();
    const name = args.customer.name.trim();
    const phone = args.customer.phone.trim();
    const normalizedPhone = phone.replace(/[\s()-]/g, "");
    const email = args.customer.email?.trim() || undefined;
    const landmark = args.destination.landmark?.trim() || undefined;
    const instructions = args.destination.instructions?.trim() || undefined;
    const area = args.destination.area.trim();
    const address = args.destination.address.trim();
    if (checkoutId.length < 12 || checkoutId.length > 100)
      throw new Error("A valid checkout request ID is required.");
    if (name.length < 2 || name.length > 120) throw new Error("Enter the customer's full name.");
    if (!/^\+?[0-9]{8,15}$/.test(normalizedPhone)) throw new Error("Enter a valid phone number.");
    if (!area || !address)
      throw new Error("Delivery area and destination description are required.");
    const { latitude, longitude } = args.destination;
    if ((latitude === undefined) !== (longitude === undefined))
      throw new Error("A map pin needs both latitude and longitude.");
    if (latitude !== undefined && (latitude < -90 || latitude > 90))
      throw new Error("Latitude is outside the valid range.");
    if (longitude !== undefined && (longitude < -180 || longitude > 180))
      throw new Error("Longitude is outside the valid range.");
    if (args.items.length === 0 || args.items.length > 50)
      throw new Error("A checkout must contain between 1 and 50 products.");
    if (new Set(args.items.map((item) => item.productId)).size !== args.items.length)
      throw new Error("Each product can only appear once in the checkout.");

    const existingCheckout = await ctx.db
      .query("checkouts")
      .withIndex("by_checkout_id", (q) => q.eq("checkoutId", checkoutId))
      .unique();
    if (existingCheckout) {
      const orders = await Promise.all(existingCheckout.orderIds.map((id) => ctx.db.get(id)));
      return {
        checkoutId,
        total: existingCheckout.total,
        storeCount: existingCheckout.storeCount,
        changeRequired: existingCheckout.changeRequired,
        orders: orders.flatMap((order) =>
          order
            ? [{
                orderId: order._id,
                orderNumber: order.orderNumber,
                storeId: order.storeId,
                storeName: order.storeName,
                subtotal: order.subtotal,
                discount: order.discount ?? 0,
                deliveryFee: order.deliveryFee,
                total: order.total,
                createdAt: order.createdAt,
                estimatedDeliveryAt: order.estimatedDeliveryAt,
                items: order.items,
              }]
            : [],
        ),
      };
    }

    type StoreGroup = {
      store: Doc<"stores">;
      settings: Doc<"storeSettings">;
      lines: Array<{
        product: Doc<"products">;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
      }>;
      subtotal: number;
      discount: number;
      total: number;
    };
    const groups = new Map<string, StoreGroup>();
    const stockUpdates: Array<{ productId: Id<"products">; quantity: number }> = [];

    for (const requested of args.items) {
      const product = await ctx.db.get(requested.productId);
      if (!product || !product.available)
        throw new Error("One or more products are no longer available.");
      const category = await ctx.db.get(product.categoryId);
      if (!category?.enabled || category.storeId !== product.storeId)
        throw new Error("One or more products are no longer available.");
      let group = groups.get(product.storeId);
      if (!group) {
        const store = await ctx.db.get(product.storeId);
        if (!store?.enabled) throw new Error("One or more stores are no longer available.");
        const settings = await ctx.db
          .query("storeSettings")
          .withIndex("by_store", (q) => q.eq("storeId", store._id))
          .unique();
        if (!settings) throw new Error(`${store.name} is not ready to accept orders.`);
        if (!settings.deliveryAreas.includes(area))
          throw new Error(`${store.name} does not deliver to ${area}.`);
        if (
          (args.paymentMethod === "mobile_money" && !settings.mobileMoneyEnabled) ||
          (args.paymentMethod === "cash_on_delivery" && !settings.cashOnDeliveryEnabled)
        ) {
          throw new Error(`${store.name} does not accept that payment method.`);
        }
        group = { store, settings, lines: [], subtotal: 0, discount: 0, total: 0 };
        groups.set(product.storeId, group);
      }
      const unitPrice = product.promoPrice ?? product.price;
      const lineTotal = priceOrderLine({
        unitPrice,
        quantity: requested.quantity,
        soldByWeight: product.soldByWeight,
        availableStock: product.stock,
      });
      group.lines.push({ product, quantity: requested.quantity, unitPrice, lineTotal });
      group.subtotal += lineTotal;
      stockUpdates.push({ productId: product._id, quantity: requested.quantity });
    }

    const couponCode = args.couponCode?.trim().toUpperCase();
    let couponMatched = !couponCode;
    if (couponCode) {
      if (couponCode.length > 40) throw new ConvexError("That coupon code is not valid.");
      const today = new Date().toISOString().slice(0, 10);
      for (const group of groups.values()) {
        const promotions = await ctx.db
          .query("promotions")
          .withIndex("by_store", (q) => q.eq("storeId", group.store._id))
          .take(100);
        const promotion = promotions.find((item) =>
          item.type === "coupon" &&
          item.active &&
          item.code?.trim().toUpperCase() === couponCode &&
          item.startDate <= today &&
          item.endDate >= today,
        );
        if (!promotion) continue;
        couponMatched = true;
        group.discount = roundLslAmount(Math.min(group.subtotal, promotion.value));
      }
      if (!couponMatched) throw new ConvexError("That coupon is invalid, expired, or not available for products in your cart.");
    }

    for (const group of groups.values()) {
      group.subtotal = roundLslAmount(group.subtotal);
      try {
        const beforeDiscount = calculateOrderTotal(
          group.subtotal,
          group.settings.deliveryFee,
          group.settings.minimumOrder,
        );
        group.total = roundLslAmount(beforeDiscount - group.discount);
      } catch {
        throw new Error(
          `${group.store.name} requires a minimum order of M${group.settings.minimumOrder.toFixed(2)}.`,
        );
      }
    }

    const total = roundLslAmount([...groups.values()].reduce((sum, group) => sum + group.total, 0));
    if (args.paymentMethod === "cash_on_delivery" && args.cashGiven !== undefined) {
      if (!Number.isFinite(args.cashGiven) || args.cashGiven < total)
        throw new Error("Cash available must cover the current checkout total.");
    } else if (args.paymentMethod !== "cash_on_delivery" && args.cashGiven !== undefined) {
      throw new Error("Cash amount is only used for cash on delivery.");
    }
    const changeRequired =
      args.paymentMethod === "cash_on_delivery" && args.cashGiven !== undefined
        ? roundLslAmount(args.cashGiven - total)
        : undefined;
    const now = Date.now();
    const phoneMatch = await ctx.db
      .query("customers")
      .withIndex("by_normalized_phone", (q) => q.eq("normalizedPhone", normalizedPhone))
      .unique();
    const accountCustomer = customerUserId
      ? await ctx.db
          .query("customers")
          .withIndex("by_user", (q) => q.eq("userId", customerUserId))
          .unique()
      : null;
    let customerId: Id<"customers">;
    if (accountCustomer) {
      customerId = accountCustomer._id;
      await ctx.db.patch(accountCustomer._id, {
        orderCount: accountCustomer.orderCount + groups.size,
        lifetimeSpend: roundLslAmount(accountCustomer.lifetimeSpend + total),
        lastOrderAt: now,
      });
    } else if (customerUserId) {
      // A signed-in customer's profile is keyed by their auth identity. Avoid
      // claiming or changing a different customer's phone-matched record.
      customerId = await ctx.db.insert("customers", {
        userId: customerUserId,
        name,
        phone,
        normalizedPhone: phoneMatch ? `user:${String(customerUserId)}` : normalizedPhone,
        ...(email === undefined ? {} : { email }),
        orderCount: groups.size,
        lifetimeSpend: total,
        lastOrderAt: now,
      });
    } else if (phoneMatch && !phoneMatch.userId) {
      customerId = phoneMatch._id;
      await ctx.db.patch(phoneMatch._id, {
        name,
        phone,
        ...((email ?? phoneMatch.email) === undefined ? {} : { email: email ?? phoneMatch.email }),
        orderCount: phoneMatch.orderCount + groups.size,
        lifetimeSpend: roundLslAmount(phoneMatch.lifetimeSpend + total),
        lastOrderAt: now,
      });
    } else {
      // Keep guest order history separate when the supplied phone belongs to
      // an account profile. The synthetic index key prevents profile takeover
      // and leaves the guest's actual phone available for display/contact.
      customerId = await ctx.db.insert("customers", {
        name,
        phone,
        normalizedPhone: phoneMatch ? `guest:${checkoutId}` : normalizedPhone,
        ...(email === undefined ? {} : { email }),
        orderCount: groups.size,
        lifetimeSpend: total,
        lastOrderAt: now,
      });
    }

    for (const update of stockUpdates) {
      const product = await ctx.db.get(update.productId);
      if (!product || product.stock < update.quantity)
        throw new Error("Stock changed while placing this checkout. Please review your cart.");
      await ctx.db.patch(product._id, {
        stock: Math.round((product.stock - update.quantity) * 1000) / 1000,
      });
      await ctx.db.insert("domainEvents", {
        eventType: "ProductChanged", version: 1, aggregateType: "product", aggregateId: product._id,
        storeId: product.storeId, ...(customerUserId ? { actorId: customerUserId } : {}),
        occurredAt: now, data: { changedFields: ["stock"] },
      });
    }

    const orderIds: Id<"orders">[] = [];
    const receiptOrders = [];
    for (const group of groups.values()) {
      const suffix = Array.from({ length: 6 }, () => Math.floor(Math.random() * 36).toString(36))
        .join("")
        .toUpperCase();
      const orderNumber = `REE-${now.toString(36).toUpperCase()}-${suffix}`;
      const estimatedDeliveryAt = now + 2 * 60 * 60 * 1000;
      const items = group.lines.map(({ product, quantity, unitPrice, lineTotal }) => ({
        productId: product._id,
        name: product.name,
        unit: product.unit,
        emoji: product.emoji,
        unitPrice,
        quantity,
        lineTotal,
        soldByWeight: product.soldByWeight,
      }));
      const orderId = await ctx.db.insert("orders", {
        storeId: group.store._id,
        storeName: group.store.name,
        orderNumber,
        checkoutId,
        customerId,
        ...(customerUserId ? { customerUserId } : {}),
        customer: { name, phone, ...(email === undefined ? {} : { email }) },
        items,
        destination: {
          area,
          address,
          ...(landmark === undefined ? {} : { landmark }),
          ...(instructions === undefined ? {} : { instructions }),
          ...(latitude === undefined || longitude === undefined ? {} : { latitude, longitude }),
        },
        payment: {
          method: args.paymentMethod,
          status: args.paymentMethod === "cash_on_delivery" ? "unpaid" : "pending",
          ...(args.exactAmount === undefined ? {} : { exactAmount: args.exactAmount }),
        },
        subtotal: group.subtotal,
        discount: group.discount,
        deliveryFee: group.settings.deliveryFee,
        total: group.total,
        status: "received",
        createdAt: now,
        estimatedDeliveryAt,
      });
      orderIds.push(orderId);
      await ctx.db.insert("orderEvents", {
        orderId,
        orderNumber,
        eventType: "OrderPlaced",
        version: 1,
        ...(customerUserId ? { actorId: customerUserId } : {}),
        status: "received",
        total: group.total,
        occurredAt: now,
      });
      await ctx.db.insert("domainEvents", {
        eventType: "OrderPlaced", version: 1, aggregateType: "order", aggregateId: orderId,
        ...(customerUserId ? { actorId: customerUserId } : {}), storeId: group.store._id,
        occurredAt: now, data: { status: "received", total: group.total },
      });
      receiptOrders.push({
        orderId,
        orderNumber,
        storeId: group.store._id,
        storeName: group.store.name,
        subtotal: group.subtotal,
        discount: group.discount,
        deliveryFee: group.settings.deliveryFee,
        total: group.total,
        createdAt: now,
        estimatedDeliveryAt,
        items,
      });
    }
    await ctx.db.insert("checkouts", {
      checkoutId,
      orderIds,
      storeCount: groups.size,
      total,
      ...(args.cashGiven === undefined ? {} : { cashGiven: args.cashGiven }),
      ...(changeRequired === undefined ? {} : { changeRequired }),
      createdAt: now,
    });
    return { checkoutId, total, storeCount: groups.size, changeRequired, orders: receiptOrders };
  },
});

const orderStatus = v.union(
  v.literal("received"), v.literal("confirmed"), v.literal("preparing"), v.literal("ready"),
  v.literal("out_for_delivery"), v.literal("delivered"), v.literal("rejected"), v.literal("cancelled"),
);

// checkoutId is generated with crypto.randomUUID() on the client and is also
// the idempotency key. Treat it as a bearer receipt capability: validate it,
// return only receipt fields, and never include it in logs or domain events.
export const checkoutReceipt = query({
  args: { checkoutId: v.string() },
  handler: async (ctx, { checkoutId: rawCheckoutId }) => {
    const checkoutId = rawCheckoutId.trim();
    if (checkoutId.length < 12 || checkoutId.length > 100) {
      throw new ConvexError("Invalid checkout receipt.");
    }
    const checkout = await ctx.db
      .query("checkouts")
      .withIndex("by_checkout_id", (q) => q.eq("checkoutId", checkoutId))
      .unique();
    if (!checkout) return null;

    const orders = (await Promise.all(checkout.orderIds.map((orderId) => ctx.db.get(orderId))))
      .flatMap((order) => order ? [{
        orderNumber: order.orderNumber,
        storeName: order.storeName,
        customerName: order.customer.name,
        destination: {
          area: order.destination.area,
          address: order.destination.address,
          ...(order.destination.landmark ? { landmark: order.destination.landmark } : {}),
          ...(order.destination.instructions ? { instructions: order.destination.instructions } : {}),
        },
        payment: order.payment,
        items: order.items.map((item) => ({
          productId: String(item.productId),
          name: item.name,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        })),
        subtotal: order.subtotal,
        discount: order.discount ?? 0,
        deliveryFee: order.deliveryFee,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt,
        estimatedDeliveryAt: order.estimatedDeliveryAt,
      }] : []);

    if (!orders.length) return null;
    return {
      total: checkout.total,
      changeRequired: checkout.changeRequired ?? null,
      orders,
    };
  },
});

export const listForStaff = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const memberships = await getActiveMemberships(ctx, userId);
    const platformAdmin = memberships.some((membership) => membership.role === "superadmin");
    const storeIds = platformAdmin
      ? (await ctx.db.query("stores").take(50)).map((store) => store._id)
      : [...new Set(memberships.filter((membership) => ["store_owner", "store_manager", "dispatcher", "order_staff"].includes(membership.role)).flatMap((membership) => membership.storeId ?? []))];
    if (!storeIds.length) return { orders: [], customers: [], drivers: [], preparationStaff: [], routeSequences: [] };
    const perStore = await Promise.all(storeIds.map(async (storeId) => {
      const storeMemberships = memberships.filter((membership) => membership.storeId === storeId);
      const canDispatch = platformAdmin || memberships.some((membership) =>
        membership.storeId === storeId && ["store_owner", "store_manager", "dispatcher"].includes(membership.role),
      );
      const canManageAssignments = platformAdmin || storeMemberships.some((membership) => ["store_owner", "store_manager"].includes(membership.role));
      const assignedOnly = !platformAdmin && storeMemberships.some((membership) => membership.role === "order_staff") &&
        !storeMemberships.some((membership) => ["store_owner", "store_manager", "dispatcher"].includes(membership.role));
      const [orders, drivers, routeSequences, preparationStaff] = await Promise.all([
        assignedOnly
          ? ctx.db.query("orders").withIndex("by_store_assignee_status_created_at", (q) => q.eq("storeId", storeId).eq("assignedStaffUserId", userId)).order("desc").take(200)
          : ctx.db.query("orders").withIndex("by_store_status_created_at", (q) => q.eq("storeId", storeId)).order("desc").take(200),
        canDispatch ? ctx.db.query("memberships").withIndex("by_store_role_status", (q) => q.eq("storeId", storeId).eq("role", "driver").eq("status", "active")).take(100) : Promise.resolve([]),
        canDispatch ? ctx.db.query("deliveryRouteSequences").withIndex("by_store_driver", (q) => q.eq("storeId", storeId)).take(100) : Promise.resolve([]),
        canManageAssignments ? ctx.db.query("memberships").withIndex("by_store_role_status", (q) => q.eq("storeId", storeId).eq("role", "order_staff").eq("status", "active")).take(100) : Promise.resolve([]),
      ]);
      return { storeId, orders, drivers, routeSequences, preparationStaff };
    }));
    const orders = perStore.flatMap((result) => result.orders);
    const timelines = await Promise.all(orders.map((order) =>
      ctx.db.query("orderEvents").withIndex("by_order", (q) => q.eq("orderId", order._id)).order("asc").take(100),
    ));
    const ordersWithTimeline = orders.map((order, index) => ({ ...order, timeline: timelines[index] ?? [] }));
    const customerIds = [...new Set(orders.map((order) => order.customerId))];
    const customers = await Promise.all(customerIds.map((customerId) => ctx.db.get(customerId)));
    const driverIds = [...new Set(perStore.flatMap((result) => result.drivers.map((membership) => membership.userId)))];
    const drivers = await Promise.all(driverIds.map(async (driverUserId) => {
      const user = await ctx.db.get(driverUserId);
      const driverMemberships = (await ctx.db.query("memberships").withIndex("by_user", (q) => q.eq("userId", driverUserId)).take(100)).filter((membership) => membership.role === "driver" && membership.status === "active" && storeIds.includes(membership.storeId!));
      return { userId: driverUserId, name: user?.name ?? user?.email ?? "Driver", storeIds: driverMemberships.map((membership) => membership.storeId).filter(Boolean) };
    }));
    const preparationStaffIds = [...new Set(perStore.flatMap((result) => result.preparationStaff.map((membership) => membership.userId)))];
    const preparationStaff = await Promise.all(preparationStaffIds.map(async (staffUserId) => {
      const staffUser = await ctx.db.get(staffUserId);
      const storeMemberships = perStore.flatMap((result) => result.preparationStaff
        .filter((membership) => membership.userId === staffUserId)
        .map((membership) => result.storeId));
      return { userId: staffUserId, name: staffUser?.name ?? staffUser?.email ?? "Order staff", storeIds: storeMemberships };
    }));
    return { orders: ordersWithTimeline, customers: customers.filter(Boolean), drivers,
      preparationStaff,
      routeSequences: perStore.flatMap((result) => result.routeSequences.map((sequence) => ({ storeId: sequence.storeId, driverUserId: sequence.driverUserId, orderIds: sequence.orderIds }))),
    };
  },
});

export const myAssigned = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const memberships = await getActiveMemberships(ctx, userId);
    const storeIds = [...new Set(memberships.filter((membership) => membership.role === "driver").flatMap((membership) => membership.storeId ?? []))];
    if (!storeIds.length) return { orders: [], routeSequences: [] };
    const [rows, routeSequences] = await Promise.all([
      Promise.all(storeIds.map((storeId) => ctx.db.query("orders").withIndex("by_store_driver_status", (q) => q.eq("storeId", storeId).eq("driverUserId", userId)).take(100))),
      Promise.all(storeIds.map((storeId) => ctx.db.query("deliveryRouteSequences").withIndex("by_store_driver", (q) => q.eq("storeId", storeId).eq("driverUserId", userId)).unique())),
    ]);
    return {
      orders: rows.flat().filter((order) => order.status === "ready" || order.status === "out_for_delivery").map((order) => ({
        _id: order._id,
        _creationTime: order._creationTime,
        storeId: order.storeId,
        storeName: order.storeName,
        orderNumber: order.orderNumber,
        driverUserId: userId,
        driverName: order.driverName ?? "Driver",
        customer: { name: order.customer.name, phone: order.customer.phone },
        destination: {
          area: order.destination.area,
          address: order.destination.address,
          ...(order.destination.landmark ? { landmark: order.destination.landmark } : {}),
          ...(order.destination.instructions ? { instructions: order.destination.instructions } : {}),
        },
        payment: { method: order.payment.method, status: order.payment.status },
        total: order.total,
        status: order.status,
        createdAt: order.createdAt,
        estimatedDeliveryAt: order.estimatedDeliveryAt,
      })),
      routeSequences: routeSequences.flatMap((sequence) => sequence ? [{ storeId: sequence.storeId, orderIds: sequence.orderIds }] : []),
    };
  },
});

export const updateStatus = mutation({
  args: { orderId: v.id("orders"), status: orderStatus },
  handler: async (ctx, { orderId, status }) => {
    const order = await ctx.db.get(orderId);
    if (!order) throw new ConvexError("Order not found.");
    const { userId, membership } = await requireStoreRole(ctx, order.storeId, ["store_owner", "store_manager", "dispatcher", "order_staff", "driver"]);
    const driver = membership.role === "driver";
    if (driver && order.driverUserId !== userId) throw new ConvexError("This delivery is assigned to another driver.");
    if (membership.role === "order_staff" && order.assignedStaffUserId !== userId) throw new ConvexError("This order is assigned to another staff member.");
    if (order.status === status) return null;
    const role: OrderWorkflowRole = membership.role === "superadmin" ? "store_manager" : membership.role as OrderWorkflowRole;
    if (!canTransitionOrder(role, order.status, status)) throw new ConvexError("That order status change is not allowed for your role.");
    if (status === "out_for_delivery" && !order.driverUserId) throw new ConvexError("Assign a driver before dispatching this order.");
    const occurredAt = Date.now();
    await ctx.db.patch(orderId, { status });
    await ctx.db.insert("orderEvents", { orderId, orderNumber: order.orderNumber, eventType: "OrderStatusChanged", version: 1, actorId: userId, status, total: order.total, occurredAt });
    await ctx.db.insert("domainEvents", {
      eventType: "OrderStatusChanged", version: 1, aggregateType: "order", aggregateId: orderId,
      actorId: userId, storeId: order.storeId, occurredAt, data: { from: order.status, to: status },
    });
    return null;
  },
});

export const assignDriver = mutation({
  args: { orderId: v.id("orders"), driverUserId: v.union(v.id("users"), v.null()) },
  handler: async (ctx, { orderId, driverUserId }) => {
    const order = await ctx.db.get(orderId);
    if (!order) throw new ConvexError("Order not found.");
    const { userId } = await requireStoreRole(ctx, order.storeId, ["store_owner", "store_manager", "dispatcher"]);
    if (!["received", "confirmed", "preparing", "ready"].includes(order.status)) throw new ConvexError("Driver assignment is closed once delivery has started or the order has ended.");
    let driverName: string | undefined;
    if (driverUserId) {
      const memberships = await ctx.db.query("memberships").withIndex("by_user", (q) => q.eq("userId", driverUserId)).take(100);
      const valid = memberships.some((membership) => membership.storeId === order.storeId && membership.role === "driver" && membership.status === "active");
      if (!valid) throw new ConvexError("Choose an active driver for this store.");
      const driver = await ctx.db.get(driverUserId);
      driverName = driver?.name ?? driver?.email ?? "Driver";
    }
    if ((order.driverUserId ?? null) === driverUserId) return null;
    await ctx.db.patch(orderId, { driverUserId: driverUserId ?? undefined, driverName });
    await ctx.db.insert("domainEvents", {
      eventType: "DriverAssigned", version: 1, aggregateType: "order", aggregateId: orderId,
      actorId: userId, storeId: order.storeId, occurredAt: Date.now(), data: { driverAssigned: driverUserId !== null },
    });
    return null;
  },
});

export const assignPreparationStaff = mutation({
  args: { orderId: v.id("orders"), staffUserId: v.union(v.id("users"), v.null()) },
  handler: async (ctx, { orderId, staffUserId }) => {
    const order = await ctx.db.get(orderId);
    if (!order) throw new ConvexError("Order not found.");
    const { userId } = await requireStoreRole(ctx, order.storeId, ["store_owner", "store_manager"]);
    if (!["received", "confirmed", "preparing"].includes(order.status)) throw new ConvexError("Preparation assignment is closed for this order.");
    let staffName: string | undefined;
    if (staffUserId) {
      const memberships = await ctx.db.query("memberships").withIndex("by_user", (q) => q.eq("userId", staffUserId)).take(100);
      if (!memberships.some((membership) => membership.storeId === order.storeId && membership.role === "order_staff" && membership.status === "active")) {
        throw new ConvexError("Choose active order staff from this store.");
      }
      const staff = await ctx.db.get(staffUserId);
      staffName = staff?.name ?? staff?.email ?? "Order staff";
    }
    if ((order.assignedStaffUserId ?? null) === staffUserId) return null;
    await ctx.db.patch(orderId, { assignedStaffUserId: staffUserId ?? undefined, assignedStaffName: staffName });
    await ctx.db.insert("domainEvents", {
      eventType: "OrderStaffAssigned", version: 1, aggregateType: "order", aggregateId: orderId,
      actorId: userId, storeId: order.storeId, occurredAt: Date.now(), data: { staffAssigned: staffUserId !== null },
    });
    return null;
  },
});

export const setPaymentStatus = mutation({
  args: { orderId: v.id("orders"), status: v.union(v.literal("pending"), v.literal("unpaid"), v.literal("paid")) },
  handler: async (ctx, { orderId, status }) => {
    const order = await ctx.db.get(orderId);
    if (!order) throw new ConvexError("Order not found.");
    const { userId } = await requireStoreRole(ctx, order.storeId, ["store_owner", "store_manager"]);
    if (order.payment.status === status) return null;
    await ctx.db.patch(orderId, { payment: { ...order.payment, status } });
    await ctx.db.insert("domainEvents", {
      eventType: "PaymentStatusChanged", version: 1, aggregateType: "order", aggregateId: orderId,
      actorId: userId, storeId: order.storeId, occurredAt: Date.now(),
      data: { paymentStatus: status },
    });
    return null;
  },
});

export const setRouteSequence = mutation({
  args: { storeId: v.id("stores"), driverUserId: v.id("users"), orderIds: v.array(v.id("orders")) },
  handler: async (ctx, { storeId, driverUserId, orderIds }) => {
    const { userId } = await requireStoreRole(ctx, storeId, ["store_owner", "store_manager", "dispatcher"]);
    if (new Set(orderIds).size !== orderIds.length) throw new ConvexError("A route cannot contain duplicate orders.");
    const driverMemberships = await ctx.db.query("memberships").withIndex("by_user", (q) => q.eq("userId", driverUserId)).take(100);
    if (!driverMemberships.some((membership) => membership.storeId === storeId && membership.role === "driver" && membership.status === "active")) throw new ConvexError("Choose an active driver for this store.");
    for (const orderId of orderIds) {
      const order = await ctx.db.get(orderId);
      if (!order || order.storeId !== storeId || order.driverUserId !== driverUserId || !["ready", "out_for_delivery"].includes(order.status)) throw new ConvexError("The route includes an order that is not assigned to this driver.");
    }
    const existing = await ctx.db.query("deliveryRouteSequences").withIndex("by_store_driver", (q) => q.eq("storeId", storeId).eq("driverUserId", driverUserId)).unique();
    if (existing) await ctx.db.patch(existing._id, { orderIds, updatedAt: Date.now(), updatedBy: userId });
    else await ctx.db.insert("deliveryRouteSequences", { storeId, driverUserId, orderIds, updatedAt: Date.now(), updatedBy: userId });
    return null;
  },
});
