import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const pricingUnit = v.union(
  v.literal("each"),
  v.literal("pack"),
  v.literal("kg"),
  v.literal("gram"),
  v.literal("litre"),
  v.literal("crate"),
);
const paymentMethod = v.union(
  v.literal("mobile_money"),
  v.literal("cash_on_delivery"),
  v.literal("card"),
);
const orderStatus = v.union(
  v.literal("received"),
  v.literal("confirmed"),
  v.literal("preparing"),
  v.literal("ready"),
  v.literal("out_for_delivery"),
  v.literal("delivered"),
  v.literal("rejected"),
  v.literal("cancelled"),
);
const paymentStatus = v.union(v.literal("pending"), v.literal("unpaid"), v.literal("paid"));
const membershipRole = v.union(
  v.literal("superadmin"),
  v.literal("store_owner"),
  v.literal("store_manager"),
  v.literal("order_staff"),
  v.literal("catalogue_staff"),
  v.literal("dispatcher"),
  v.literal("driver"),
);
const storeRole = v.union(
  v.literal("store_owner"),
  v.literal("store_manager"),
  v.literal("order_staff"),
  v.literal("catalogue_staff"),
  v.literal("dispatcher"),
  v.literal("driver"),
);

export default defineSchema({
  ...authTables,
  memberships: defineTable({
    userId: v.id("users"),
    role: membershipRole,
    storeId: v.optional(v.id("stores")),
    status: v.union(v.literal("active"), v.literal("suspended")),
    grantedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_store", ["userId", "storeId"])
    .index("by_role", ["role"])
    .index("by_store_role_status", ["storeId", "role", "status"]),
  staffInvitations: defineTable({
    storeId: v.id("stores"),
    email: v.string(),
    role: storeRole,
    tokenHash: v.string(),
    invitedBy: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("accepted"),
      v.literal("expired"),
      v.literal("revoked"),
    ),
    createdAt: v.number(),
    expiresAt: v.number(),
    acceptedBy: v.optional(v.id("users")),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_store_email", ["storeId", "email"])
    .index("by_store_email_status", ["storeId", "email", "status"])
    .index("by_token_hash", ["tokenHash"])
    .index("by_status_expires_at", ["status", "expiresAt"]),
  stores: defineTable({
    slug: v.string(),
    name: v.string(),
    tagline: v.string(),
    phone: v.string(),
    whatsapp: v.string(),
    address: v.string(),
    openingHours: v.string(),
    enabled: v.boolean(),
    sortOrder: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_enabled_sort", ["enabled", "sortOrder"]),
  categories: defineTable({
    storeId: v.id("stores"),
    slug: v.string(),
    name: v.string(),
    emoji: v.string(),
    accent: v.string(),
    enabled: v.boolean(),
    sortOrder: v.number(),
  })
    .index("by_store_slug", ["storeId", "slug"])
    .index("by_store_enabled_sort", ["storeId", "enabled", "sortOrder"]),
  products: defineTable({
    storeId: v.id("stores"),
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    categoryId: v.id("categories"),
    price: v.number(),
    promoPrice: v.optional(v.number()),
    unit: pricingUnit,
    soldByWeight: v.boolean(),
    weightOptions: v.optional(v.array(v.number())),
    stock: v.number(),
    lowStockThreshold: v.number(),
    available: v.boolean(),
    popularity: v.number(),
    emoji: v.string(),
    variants: v.optional(v.array(v.object({ label: v.string(), multiplier: v.number() }))),
  })
    .index("by_store_slug", ["storeId", "slug"])
    .index("by_available", ["available"])
    .index("by_store", ["storeId"])
    .index("by_store_available", ["storeId", "available"])
    .index("by_category_available", ["categoryId", "available"])
    .index("by_store_category_available", ["storeId", "categoryId", "available"]),
  storeSettings: defineTable({
    storeId: v.id("stores"),
    key: v.literal("storefront"),
    name: v.string(),
    currency: v.literal("LSL"),
    deliveryFee: v.number(),
    minimumOrder: v.number(),
    deliveryAreas: v.array(v.string()),
    defaultDeliveryArea: v.string(),
    mobileMoneyEnabled: v.boolean(),
    cashOnDeliveryEnabled: v.boolean(),
    cardEnabled: v.boolean(),
  }).index("by_store", ["storeId"]),
  customers: defineTable({
    userId: v.optional(v.id("users")),
    name: v.string(),
    normalizedPhone: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    orderCount: v.number(),
    lifetimeSpend: v.number(),
    lastOrderAt: v.number(),
  })
    .index("by_normalized_phone", ["normalizedPhone"])
    .index("by_user", ["userId"]),
  customerAddresses: defineTable({
    userId: v.id("users"),
    label: v.string(),
    area: v.string(),
    address: v.string(),
    landmark: v.optional(v.string()),
    instructions: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
  customerFavourites: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_product", ["userId", "productId"]),
  customerPreferences: defineTable({
    userId: v.id("users"),
    key: v.string(),
    enabled: v.boolean(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
  promotions: defineTable({
    storeId: v.id("stores"),
    name: v.string(),
    type: v.union(
      v.literal("percentage"),
      v.literal("fixed"),
      v.literal("product_price"),
      v.literal("coupon"),
    ),
    value: v.number(),
    code: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    active: v.boolean(),
  }).index("by_store", ["storeId"]),
  orders: defineTable({
    storeId: v.id("stores"),
    storeName: v.string(),
    orderNumber: v.string(),
    checkoutId: v.string(),
    customerId: v.id("customers"),
    customerUserId: v.optional(v.id("users")),
    driverUserId: v.optional(v.id("users")),
    driverName: v.optional(v.string()),
    assignedStaffUserId: v.optional(v.id("users")),
    assignedStaffName: v.optional(v.string()),
    customer: v.object({ name: v.string(), phone: v.string(), email: v.optional(v.string()) }),
    items: v.array(
      v.object({
        productId: v.id("products"),
        name: v.string(),
        unit: pricingUnit,
        emoji: v.string(),
        unitPrice: v.number(),
        quantity: v.number(),
        lineTotal: v.number(),
        soldByWeight: v.boolean(),
      }),
    ),
    destination: v.object({
      area: v.string(),
      address: v.string(),
      landmark: v.optional(v.string()),
      instructions: v.optional(v.string()),
      latitude: v.optional(v.number()),
      longitude: v.optional(v.number()),
    }),
    payment: v.object({
      method: paymentMethod,
      status: paymentStatus,
      exactAmount: v.optional(v.boolean()),
    }),
    subtotal: v.number(),
    discount: v.optional(v.number()),
    deliveryFee: v.number(),
    total: v.number(),
    status: orderStatus,
    createdAt: v.number(),
    estimatedDeliveryAt: v.number(),
  })
    .index("by_order_number", ["orderNumber"])
    .index("by_checkout_id", ["checkoutId"])
    .index("by_status_created_at", ["status", "createdAt"])
    .index("by_customer_created_at", ["customerId", "createdAt"])
    .index("by_customer_user_created_at", ["customerUserId", "createdAt"])
    .index("by_store_status_created_at", ["storeId", "status", "createdAt"])
    .index("by_store_driver_status", ["storeId", "driverUserId", "status"])
    .index("by_store_assignee_status_created_at", ["storeId", "assignedStaffUserId", "status", "createdAt"]),
  checkouts: defineTable({
    checkoutId: v.string(),
    orderIds: v.array(v.id("orders")),
    storeCount: v.number(),
    total: v.number(),
    cashGiven: v.optional(v.number()),
    changeRequired: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_checkout_id", ["checkoutId"]),
  orderEvents: defineTable({
    orderId: v.id("orders"),
    orderNumber: v.string(),
    eventType: v.union(v.literal("OrderPlaced"), v.literal("OrderStatusChanged")),
    version: v.literal(1),
    actorId: v.optional(v.id("users")),
    status: orderStatus,
    total: v.number(),
    occurredAt: v.number(),
  }).index("by_order", ["orderId", "occurredAt"]),
  deliveryRouteSequences: defineTable({
    storeId: v.id("stores"),
    driverUserId: v.id("users"),
    orderIds: v.array(v.id("orders")),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  }).index("by_store_driver", ["storeId", "driverUserId"]),
  deliveryLandmarks: defineTable({
    storeId: v.id("stores"),
    name: v.string(),
    aliases: v.array(v.string()),
    area: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    verified: v.boolean(),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  }).index("by_store", ["storeId"]),
  domainEvents: defineTable({
    eventType: v.union(
      v.literal("MembershipGranted"),
      v.literal("MembershipSuspended"),
      v.literal("ProductChanged"),
      v.literal("CatalogChanged"),
      v.literal("DeliveryPlaceChanged"),
      v.literal("OrderPlaced"),
      v.literal("OrderStatusChanged"),
      v.literal("DriverAssigned"),
      v.literal("OrderStaffAssigned"),
      v.literal("PaymentStatusChanged"),
    ),
    version: v.literal(1),
    aggregateType: v.union(v.literal("membership"), v.literal("product"), v.literal("category"), v.literal("promotion"), v.literal("store"), v.literal("deliveryPlace"), v.literal("order")),
    aggregateId: v.string(),
    actorId: v.optional(v.id("users")),
    storeId: v.optional(v.id("stores")),
    occurredAt: v.number(),
    data: v.union(
      v.object({ role: membershipRole }),
      v.object({ status: v.union(v.literal("active"), v.literal("suspended")) }),
      v.object({ changedFields: v.array(v.string()) }),
      v.object({ changedFields: v.array(v.string()) }),
      v.object({ status: orderStatus, total: v.number() }),
      v.object({ from: orderStatus, to: orderStatus }),
      v.object({ driverAssigned: v.boolean() }),
      v.object({ staffAssigned: v.boolean() }),
      v.object({ paymentStatus: v.union(v.literal("pending"), v.literal("unpaid"), v.literal("paid")) }),
    ),
  })
    .index("by_aggregate", ["aggregateType", "aggregateId", "occurredAt"])
    .index("by_store_time", ["storeId", "occurredAt"]),
});
