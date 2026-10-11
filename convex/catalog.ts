import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { getActiveMemberships, requireStoreRole } from "./lib/authorization";

const MAX_STORES = 50;
const MAX_CATEGORIES = 300;
const MAX_PRODUCTS = 500;
const pricingUnit = v.union(
  v.literal("each"), v.literal("pack"), v.literal("kg"),
  v.literal("gram"), v.literal("litre"), v.literal("crate"),
);
const promoType = v.union(
  v.literal("percentage"), v.literal("fixed"), v.literal("product_price"), v.literal("coupon"),
);

export const listStores = query({
  args: {},
  handler: async (ctx) =>
    await ctx.db
      .query("stores")
      .withIndex("by_enabled_sort", (q) => q.eq("enabled", true))
      .take(MAX_STORES),
});

export const listCategories = query({
  args: { storeId: v.id("stores") },
  handler: async (ctx, { storeId }) =>
    await ctx.db
      .query("categories")
      .withIndex("by_store_enabled_sort", (q) =>
        q.eq("storeId", storeId).eq("enabled", true),
      )
      .take(100),
});

export const listProducts = query({
  args: { storeId: v.id("stores") },
  handler: async (ctx, { storeId }) => {
    const store = await ctx.db.get(storeId);
    if (!store?.enabled) return [];
    const categoryIds = new Set(
      (
        await ctx.db
          .query("categories")
          .withIndex("by_store_enabled_sort", (q) =>
            q.eq("storeId", storeId).eq("enabled", true),
          )
          .take(100)
      ).map((category) => category._id),
    );
    const products = await ctx.db
      .query("products")
      .withIndex("by_store", (q) => q.eq("storeId", storeId))
      .take(500);
    return products.filter((product) => categoryIds.has(product.categoryId));
  },
});

export const getStorefrontSettings = query({
  args: { storeId: v.id("stores") },
  handler: async (ctx, { storeId }) =>
    await ctx.db
      .query("storeSettings")
      .withIndex("by_store", (q) => q.eq("storeId", storeId))
      .unique(),
});

/** A bounded first page used by the marketplace UI. Store detail pages can use the scoped queries above. */
export const getMarketplaceCatalog = query({
  args: {},
  handler: async (ctx) => {
    const storeDocs = await ctx.db
      .query("stores")
      .withIndex("by_enabled_sort", (q) => q.eq("enabled", true))
      .take(MAX_STORES);
    const settings = await Promise.all(
      storeDocs.map((store) =>
        ctx.db
          .query("storeSettings")
          .withIndex("by_store", (q) => q.eq("storeId", store._id))
          .unique(),
      ),
    );
    const stores = storeDocs.flatMap((store, index) => {
      const storeSettings = settings[index];
      return storeSettings ? [{ ...store, settings: storeSettings }] : [];
    });
    const today = new Date().toISOString().slice(0, 10);
    const promotionRows = await Promise.all(stores.map((store) =>
      ctx.db.query("promotions").withIndex("by_store", (q) => q.eq("storeId", store._id)).take(100),
    ));
    const promotions = promotionRows.flat().filter((promotion) =>
      promotion.type === "coupon" && promotion.active && promotion.code &&
      promotion.startDate <= today && promotion.endDate >= today,
    );
    const storeIds = new Set(stores.map((store) => store._id));
    const enabledCategories = await ctx.db
      .query("categories")
      .withIndex("by_store_enabled_sort")
      .filter((q) => q.eq(q.field("enabled"), true))
      .take(MAX_CATEGORIES);
    const categories = enabledCategories.filter((category) => storeIds.has(category.storeId));
    const categoryIds = new Set(categories.map((category) => category._id));
    const marketplaceProducts = await ctx.db
      .query("products")
      .withIndex("by_store")
      .take(MAX_PRODUCTS);
    const products = marketplaceProducts.filter(
      (product) => storeIds.has(product.storeId) && categoryIds.has(product.categoryId),
    );
    return { stores, categories, products, promotions };
  },
});

export const getManagementWorkspace = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const memberships = await getActiveMemberships(ctx, userId);
    const isSuperadmin = memberships.some((membership) => membership.role === "superadmin");
    const storeIds = isSuperadmin
      ? (await ctx.db.query("stores").take(MAX_STORES)).map((store) => store._id)
      : [...new Set(memberships.filter((membership) => ["store_owner", "store_manager", "catalogue_staff"].includes(membership.role)).flatMap((membership) => membership.storeId ?? []))];
    const result = await Promise.all(storeIds.map(async (storeId) => {
      const [store, settings, categories, products, promotions] = await Promise.all([
        ctx.db.get(storeId),
        ctx.db.query("storeSettings").withIndex("by_store", (q) => q.eq("storeId", storeId)).unique(),
        ctx.db.query("categories").withIndex("by_store_slug", (q) => q.eq("storeId", storeId)).take(100),
        ctx.db.query("products").withIndex("by_store", (q) => q.eq("storeId", storeId)).take(500),
        ctx.db.query("promotions").withIndex("by_store", (q) => q.eq("storeId", storeId)).take(100),
      ]);
      return store && settings ? { store, settings, categories, products, promotions } : null;
    }));
    return result.filter((item) => item !== null);
  },
});

export const upsertProduct = mutation({
  args: {
    productId: v.optional(v.id("products")),
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
  },
  handler: async (ctx, args) => {
    const { userId } = await requireStoreRole(ctx, args.storeId, ["store_owner", "store_manager", "catalogue_staff"]);
    const name = args.name.trim();
    const slug = args.slug.trim();
    if (!name || !slug || name.length > 160 || slug.length > 180) throw new ConvexError("Product name and slug are required.");
    if (![args.price, args.stock, args.lowStockThreshold, args.popularity].every(Number.isFinite) || args.price < 0 || args.stock < 0 || args.lowStockThreshold < 0) {
      throw new ConvexError("Product price and stock values must be valid non-negative numbers.");
    }
    if (args.promoPrice !== undefined && (args.promoPrice < 0 || args.promoPrice > args.price)) throw new ConvexError("Promotion price must be between zero and the regular price.");
    const category = await ctx.db.get(args.categoryId);
    if (!category || category.storeId !== args.storeId) throw new ConvexError("Choose a category from this store.");
    if (args.productId) {
      const existing = await ctx.db.get(args.productId);
      if (!existing || existing.storeId !== args.storeId) throw new ConvexError("Product not found in this store.");
      await ctx.db.patch(args.productId, { ...args, name, slug, available: args.available && args.stock > 0 });
      await ctx.db.insert("domainEvents", {
        eventType: "ProductChanged", version: 1, aggregateType: "product", aggregateId: args.productId,
        actorId: userId, storeId: args.storeId, occurredAt: Date.now(), data: { changedFields: ["product"] },
      });
      return args.productId;
    }
    const productId = await ctx.db.insert("products", { ...args, name, slug, available: args.available && args.stock > 0 });
    await ctx.db.insert("domainEvents", {
      eventType: "ProductChanged", version: 1, aggregateType: "product", aggregateId: productId,
      actorId: userId, storeId: args.storeId, occurredAt: Date.now(), data: { changedFields: ["created"] },
    });
    return productId;
  },
});

export const deleteProduct = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const product = await ctx.db.get(productId);
    if (!product) return null;
    const { userId } = await requireStoreRole(ctx, product.storeId, ["store_owner", "store_manager", "catalogue_staff"]);
    await ctx.db.delete(productId);
    await ctx.db.insert("domainEvents", {
      eventType: "ProductChanged", version: 1, aggregateType: "product", aggregateId: productId,
      actorId: userId, storeId: product.storeId, occurredAt: Date.now(), data: { changedFields: ["deleted"] },
    });
    return null;
  },
});

export const upsertCategory = mutation({
  args: {
    categoryId: v.optional(v.id("categories")), storeId: v.id("stores"), slug: v.string(),
    name: v.string(), emoji: v.string(), accent: v.string(), enabled: v.boolean(), sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await requireStoreRole(ctx, args.storeId, ["store_owner", "store_manager", "catalogue_staff"]);
    if (!args.name.trim() || !Number.isFinite(args.sortOrder)) throw new ConvexError("Category name and sort order are required.");
    if (args.categoryId) {
      const existing = await ctx.db.get(args.categoryId);
      if (!existing || existing.storeId !== args.storeId) throw new ConvexError("Category not found in this store.");
      await ctx.db.patch(args.categoryId, { slug: args.slug, name: args.name.trim(), emoji: args.emoji, accent: args.accent, enabled: args.enabled, sortOrder: args.sortOrder });
      await ctx.db.insert("domainEvents", { eventType: "CatalogChanged", version: 1, aggregateType: "category", aggregateId: args.categoryId, actorId: (await getAuthUserId(ctx)) ?? undefined, storeId: args.storeId, occurredAt: Date.now(), data: { changedFields: ["category"] } });
      return args.categoryId;
    }
    const categoryId = await ctx.db.insert("categories", { storeId: args.storeId, slug: args.slug, name: args.name.trim(), emoji: args.emoji, accent: args.accent, enabled: args.enabled, sortOrder: args.sortOrder });
    await ctx.db.insert("domainEvents", { eventType: "CatalogChanged", version: 1, aggregateType: "category", aggregateId: categoryId, actorId: (await getAuthUserId(ctx)) ?? undefined, storeId: args.storeId, occurredAt: Date.now(), data: { changedFields: ["created"] } });
    return categoryId;
  },
});

export const upsertPromotion = mutation({
  args: {
    promotionId: v.optional(v.id("promotions")), storeId: v.id("stores"), name: v.string(), type: promoType,
    value: v.number(), code: v.optional(v.string()), startDate: v.string(), endDate: v.string(), active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireStoreRole(ctx, args.storeId, ["store_owner", "store_manager", "catalogue_staff"]);
    const code = args.code?.trim().toUpperCase();
    if (!args.name.trim() || !Number.isFinite(args.value) || args.value < 0 || args.startDate > args.endDate) throw new ConvexError("Enter a valid promotion name, value, and date range.");
    if (args.type === "coupon" && (!code || code.length > 40 || args.value <= 0)) throw new ConvexError("Enter a coupon code and positive discount value.");
    if (args.type === "coupon") {
      const existingCoupons = await ctx.db
        .query("promotions")
        .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
        .take(100);
      if (existingCoupons.some((item) => item.type === "coupon" && item.code?.trim().toUpperCase() === code && item._id !== args.promotionId)) {
        throw new ConvexError("That coupon code already exists for this store.");
      }
    }
    const fields = { ...args, name: args.name.trim(), code: code || undefined };
    if (args.promotionId) {
      const existing = await ctx.db.get(args.promotionId);
      if (!existing || existing.storeId !== args.storeId) throw new ConvexError("Promotion not found in this store.");
      const { promotionId: _ignored, ...update } = fields;
      await ctx.db.patch(args.promotionId, update);
      await ctx.db.insert("domainEvents", { eventType: "CatalogChanged", version: 1, aggregateType: "promotion", aggregateId: args.promotionId, actorId: (await getAuthUserId(ctx)) ?? undefined, storeId: args.storeId, occurredAt: Date.now(), data: { changedFields: ["promotion"] } });
      return args.promotionId;
    }
    const { promotionId: _ignored, ...newPromotion } = fields;
    const promotionId = await ctx.db.insert("promotions", newPromotion);
    await ctx.db.insert("domainEvents", { eventType: "CatalogChanged", version: 1, aggregateType: "promotion", aggregateId: promotionId, actorId: (await getAuthUserId(ctx)) ?? undefined, storeId: args.storeId, occurredAt: Date.now(), data: { changedFields: ["created"] } });
    return promotionId;
  },
});

export const updateStoreSettings = mutation({
  args: {
    storeId: v.id("stores"), name: v.string(), tagline: v.string(), phone: v.string(), whatsapp: v.string(),
    address: v.string(), openingHours: v.string(), deliveryFee: v.number(),
    minimumOrder: v.number(), deliveryAreas: v.array(v.string()), defaultDeliveryArea: v.string(),
    mobileMoneyEnabled: v.boolean(), cashOnDeliveryEnabled: v.boolean(), cardEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireStoreRole(ctx, args.storeId, ["store_owner", "store_manager"]);
    if (args.cardEnabled) throw new ConvexError("Card processing is not configured for this marketplace yet.");
    const name = args.name.trim();
    const tagline = args.tagline.trim();
    const phone = args.phone.trim();
    const whatsapp = args.whatsapp.trim();
    const address = args.address.trim();
    const openingHours = args.openingHours.trim();
    const deliveryAreas = [...new Set(args.deliveryAreas.map((area) => area.trim()).filter(Boolean))];
    const defaultDeliveryArea = args.defaultDeliveryArea.trim();
    if (!name || name.length > 120 || !tagline || tagline.length > 180 || !phone || !whatsapp || !address || !openingHours ||
      !Number.isFinite(args.deliveryFee) || !Number.isFinite(args.minimumOrder) || args.deliveryFee < 0 || args.minimumOrder < 0 ||
      deliveryAreas.length === 0 || deliveryAreas.length > 30 || deliveryAreas.some((area) => area.length > 80) || !deliveryAreas.includes(defaultDeliveryArea)) {
      throw new ConvexError("Store settings are incomplete or invalid.");
    }
    const store = await ctx.db.get(args.storeId);
    const settings = await ctx.db.query("storeSettings").withIndex("by_store", (q) => q.eq("storeId", args.storeId)).unique();
    if (!store || !settings) throw new ConvexError("Store settings were not found.");
    const { storeId, deliveryFee, minimumOrder, mobileMoneyEnabled, cashOnDeliveryEnabled } = args;
    const actorId = await getAuthUserId(ctx);
    await ctx.db.patch(storeId, { name, tagline, phone, whatsapp, address, openingHours });
    await ctx.db.patch(settings._id, { name, deliveryFee, minimumOrder, deliveryAreas, defaultDeliveryArea, mobileMoneyEnabled, cashOnDeliveryEnabled, cardEnabled: false });
    await ctx.db.insert("domainEvents", { eventType: "CatalogChanged", version: 1, aggregateType: "store", aggregateId: storeId, ...(actorId ? { actorId } : {}), storeId, occurredAt: Date.now(), data: { changedFields: ["settings"] } });
    return null;
  },
});
