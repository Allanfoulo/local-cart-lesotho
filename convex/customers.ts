import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

const phonePattern = /^\+?[0-9]{8,15}$/;

export const account = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    const profile = await ctx.db
      .query("customers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const addresses = await ctx.db
      .query("customerAddresses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(100);
    const favourites = await ctx.db
      .query("customerFavourites")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(500);
    const preferences = await ctx.db
      .query("customerPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(100);
    return {
      customerId: profile ? String(profile._id) : "",
      email: user?.email ?? "",
      name: profile?.name ?? user?.name ?? "",
      phone: profile?.phone ?? "",
      addresses,
      favouriteProductIds: favourites.map((item) => item.productId),
      preferences,
    };
  },
});

export const myOrders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to view your orders.");
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_customer_user_created_at", (q) => q.eq("customerUserId", userId))
      .order("desc")
      .take(100);
    const timelines = await Promise.all(
      orders.map((order) =>
        ctx.db
          .query("orderEvents")
          .withIndex("by_order", (q) => q.eq("orderId", order._id))
          .order("asc")
          .take(100),
      ),
    );
    return orders.map((order, index) => ({
      ...order,
      timeline: timelines[index] ?? [],
    }));
  },
});

export const updateProfile = mutation({
  args: { name: v.string(), phone: v.string() },
  handler: async (ctx, { name, phone }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to update your account.");
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const normalizedPhone = cleanPhone.replace(/[\s()-]/g, "");
    if (cleanName.length < 2 || cleanName.length > 120) throw new ConvexError("Enter your full name.");
    if (!phonePattern.test(normalizedPhone)) throw new ConvexError("Enter a valid phone number.");
    const existingPhone = await ctx.db
      .query("customers")
      .withIndex("by_normalized_phone", (q) => q.eq("normalizedPhone", normalizedPhone))
      .unique();
    const profile = await ctx.db
      .query("customers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (existingPhone && existingPhone._id !== profile?._id) {
      throw new ConvexError("This phone number is already linked to another customer record.");
    }
    const user = await ctx.db.get(userId);
    const email = user?.email ?? undefined;
    if (profile) {
      await ctx.db.patch(profile._id, {
        name: cleanName,
        phone: cleanPhone,
        normalizedPhone,
        ...(email ? { email } : {}),
      });
    } else {
      await ctx.db.insert("customers", {
        userId,
        name: cleanName,
        phone: cleanPhone,
        normalizedPhone,
        ...(email ? { email } : {}),
        orderCount: 0,
        lifetimeSpend: 0,
        lastOrderAt: Date.now(),
      });
    }
    return null;
  },
});

export const saveAddress = mutation({
  args: {
    addressId: v.optional(v.id("customerAddresses")),
    label: v.string(),
    area: v.string(),
    address: v.string(),
    landmark: v.optional(v.string()),
    instructions: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to save an address.");
    if (!args.area.trim() || !args.address.trim()) throw new ConvexError("Enter an area and address.");
    if ((args.latitude === undefined) !== (args.longitude === undefined)) {
      throw new ConvexError("A map pin needs both coordinates.");
    }
    const now = Date.now();
    const fields = {
      label: args.label.trim() || "Address",
      area: args.area.trim(),
      address: args.address.trim(),
      ...(args.landmark?.trim() ? { landmark: args.landmark.trim() } : {}),
      ...(args.instructions?.trim() ? { instructions: args.instructions.trim() } : {}),
      ...(args.latitude !== undefined && args.longitude !== undefined
        ? { latitude: args.latitude, longitude: args.longitude }
        : {}),
    };
    if (args.addressId) {
      const existing = await ctx.db.get(args.addressId);
      if (!existing || existing.userId !== userId) throw new ConvexError("Address not found.");
      await ctx.db.patch(args.addressId, { ...fields, updatedAt: now });
    } else {
      await ctx.db.insert("customerAddresses", { ...fields, userId, createdAt: now, updatedAt: now });
    }
    return null;
  },
});

export const removeAddress = mutation({
  args: { addressId: v.id("customerAddresses") },
  handler: async (ctx, { addressId }) => {
    const userId = await getAuthUserId(ctx);
    const address = await ctx.db.get(addressId);
    if (!userId || !address || address.userId !== userId) throw new ConvexError("Address not found.");
    await ctx.db.delete(addressId);
    return null;
  },
});

export const toggleFavourite = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to save favourites.");
    const existing = await ctx.db
      .query("customerFavourites")
      .withIndex("by_user_product", (q) => q.eq("userId", userId).eq("productId", productId))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    else await ctx.db.insert("customerFavourites", { userId, productId, createdAt: Date.now() });
    return null;
  },
});

export const setPreference = mutation({
  args: { key: v.string(), enabled: v.boolean() },
  handler: async (ctx, { key, enabled }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to save preferences.");
    const cleanKey = key.trim();
    if (!cleanKey || cleanKey.length > 80) throw new ConvexError("Invalid preference.");
    const existing = await ctx.db
      .query("customerPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("key"), cleanKey))
      .first();
    if (existing) await ctx.db.patch(existing._id, { enabled, updatedAt: Date.now() });
    else await ctx.db.insert("customerPreferences", { userId, key: cleanKey, enabled, updatedAt: Date.now() });
    return null;
  },
});
