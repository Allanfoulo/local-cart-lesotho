import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireSuperadmin } from "./lib/authorization";

const MAX_STORES = 50;

function cleanText(value: string, label: string, maxLength: number) {
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > maxLength) {
    throw new ConvexError(`${label} is required and must be ${maxLength} characters or fewer.`);
  }
  return cleaned;
}

export const listForPlatform = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperadmin(ctx);
    const stores = await ctx.db.query("stores").take(MAX_STORES);
    return await Promise.all(stores.map(async (store) => {
      const ownerMembership = await ctx.db.query("memberships")
        .withIndex("by_store_role_status", (q) => q.eq("storeId", store._id).eq("role", "store_owner").eq("status", "active"))
        .first();
      const owner = ownerMembership ? await ctx.db.get(ownerMembership.userId) : null;
      const invitations = await ctx.db.query("staffInvitations")
        .withIndex("by_store_email", (q) => q.eq("storeId", store._id))
        .order("desc")
        .take(100);
      const ownerInvitation = invitations.find((invitation) =>
        invitation.role === "store_owner" &&
        ["pending", "sent"].includes(invitation.status) &&
        invitation.expiresAt > Date.now(),
      );
      const settings = await ctx.db.query("storeSettings")
        .withIndex("by_store", (q) => q.eq("storeId", store._id))
        .unique();
      const categories = await ctx.db.query("categories")
        .withIndex("by_store_enabled_sort", (q) => q.eq("storeId", store._id).eq("enabled", true))
        .take(100);
      const products = await ctx.db.query("products")
        .withIndex("by_store_available", (q) => q.eq("storeId", store._id).eq("available", true))
        .take(50);
      const activeProductCount = products.filter((product) => categories.some((category) => category._id === product.categoryId)).length;
      return {
        id: store._id,
        name: store.name,
        slug: store.slug,
        enabled: store.enabled,
        sortOrder: store.sortOrder,
        ownerEmail: owner?.email ?? null,
        ownerInvitationEmail: ownerInvitation?.email ?? null,
        setup: {
          hasSettings: Boolean(settings),
          hasOwner: Boolean(ownerMembership),
          hasActiveCategory: categories.length > 0,
          activeProductCount,
          readyToPublish: Boolean(ownerMembership && settings && categories.length && activeProductCount),
        },
      };
    }));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    tagline: v.string(),
    phone: v.string(),
    whatsapp: v.string(),
    address: v.string(),
    openingHours: v.string(),
    deliveryArea: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperadmin(ctx);
    const name = cleanText(args.name, "Store name", 120);
    const slug = cleanText(args.slug, "Store URL", 80).toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new ConvexError("Store URL must use lowercase letters, numbers, and single hyphens.");
    }
    const existing = await ctx.db.query("stores").withIndex("by_slug", (q) => q.eq("slug", slug)).unique();
    if (existing) throw new ConvexError("That store URL is already in use.");
    if ((await ctx.db.query("stores").take(MAX_STORES)).length >= MAX_STORES) {
      throw new ConvexError("The platform store limit has been reached.");
    }
    const phone = cleanText(args.phone, "Phone number", 40);
    const whatsapp = cleanText(args.whatsapp, "WhatsApp number", 40);
    const area = cleanText(args.deliveryArea, "First delivery area", 80);
    const storeId = await ctx.db.insert("stores", {
      slug,
      name,
      tagline: cleanText(args.tagline, "Store description", 180),
      phone,
      whatsapp,
      address: cleanText(args.address, "Store address", 240),
      openingHours: cleanText(args.openingHours, "Opening hours", 120),
      enabled: false,
      sortOrder: (await ctx.db.query("stores").take(MAX_STORES)).reduce((highest, store) => Math.max(highest, store.sortOrder), -1) + 1,
    });
    await ctx.db.insert("storeSettings", {
      storeId,
      key: "storefront",
      name,
      currency: "LSL",
      deliveryFee: 0,
      minimumOrder: 0,
      deliveryAreas: [area],
      defaultDeliveryArea: area,
      mobileMoneyEnabled: false,
      cashOnDeliveryEnabled: true,
      cardEnabled: false,
    });
    await ctx.db.insert("domainEvents", {
      eventType: "CatalogChanged",
      version: 1,
      aggregateType: "store",
      aggregateId: storeId,
      actorId: userId,
      storeId,
      occurredAt: Date.now(),
      data: { changedFields: ["created"] },
    });
    return storeId;
  },
});

export const setEnabled = mutation({
  args: { storeId: v.id("stores"), enabled: v.boolean() },
  handler: async (ctx, { storeId, enabled }) => {
    const { userId } = await requireSuperadmin(ctx);
    const store = await ctx.db.get(storeId);
    if (!store) throw new ConvexError("Store not found.");
    if (store.enabled === enabled) return null;
    if (enabled) {
      const owner = await ctx.db.query("memberships")
        .withIndex("by_store_role_status", (q) => q.eq("storeId", storeId).eq("role", "store_owner").eq("status", "active"))
        .first();
      if (!owner) throw new ConvexError("Invite a store owner and wait for them to accept before publishing this store.");
      const settings = await ctx.db.query("storeSettings")
        .withIndex("by_store", (q) => q.eq("storeId", storeId))
        .unique();
      if (!settings || !settings.deliveryAreas.length || !settings.deliveryAreas.includes(settings.defaultDeliveryArea)) {
        throw new ConvexError("Complete the store delivery settings before publishing it.");
      }
      const categories = await ctx.db.query("categories")
        .withIndex("by_store_enabled_sort", (q) => q.eq("storeId", storeId).eq("enabled", true))
        .take(100);
      if (!categories.length) throw new ConvexError("Add an active category and product before publishing this store.");
      const categoryIds = new Set(categories.map((category) => category._id));
      const products = await ctx.db.query("products")
        .withIndex("by_store_available", (q) => q.eq("storeId", storeId).eq("available", true))
        .take(100);
      if (!products.some((product) => categoryIds.has(product.categoryId))) {
        throw new ConvexError("Add an available product to an active category before publishing this store.");
      }
    }
    await ctx.db.patch(storeId, { enabled });
    await ctx.db.insert("domainEvents", {
      eventType: "CatalogChanged",
      version: 1,
      aggregateType: "store",
      aggregateId: storeId,
      actorId: userId,
      storeId,
      occurredAt: Date.now(),
      data: { changedFields: ["enabled"] },
    });
    return null;
  },
});
