import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireStoreRole } from "./lib/authorization";

export const listForStore = query({
  args: { storeId: v.id("stores") },
  handler: async (ctx, { storeId }) => {
    await requireStoreRole(ctx, storeId, ["store_owner", "store_manager", "dispatcher"]);
    return await ctx.db.query("deliveryLandmarks").withIndex("by_store", (q) => q.eq("storeId", storeId)).take(300);
  },
});

export const upsert = mutation({
  args: {
    placeId: v.optional(v.id("deliveryLandmarks")), storeId: v.id("stores"), name: v.string(),
    aliases: v.array(v.string()), area: v.string(), latitude: v.number(), longitude: v.number(), verified: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireStoreRole(ctx, args.storeId, ["store_owner", "store_manager", "dispatcher"]);
    const name = args.name.trim();
    const area = args.area.trim();
    if (!name || !area || args.latitude < -90 || args.latitude > 90 || args.longitude < -180 || args.longitude > 180) {
      throw new ConvexError("Enter a name, delivery area, and valid coordinates.");
    }
    const fields = { storeId: args.storeId, name, aliases: args.aliases.map((alias) => alias.trim()).filter(Boolean), area, latitude: args.latitude, longitude: args.longitude, verified: args.verified, updatedAt: Date.now(), updatedBy: userId };
    let placeId = args.placeId;
    if (placeId) {
      const existing = await ctx.db.get(placeId);
      if (!existing || existing.storeId !== args.storeId) throw new ConvexError("Delivery place not found in this store.");
      await ctx.db.patch(placeId, fields);
    } else {
      placeId = await ctx.db.insert("deliveryLandmarks", fields);
    }
    await ctx.db.insert("domainEvents", {
      eventType: "DeliveryPlaceChanged", version: 1, aggregateType: "deliveryPlace", aggregateId: placeId,
      actorId: userId, storeId: args.storeId, occurredAt: Date.now(), data: { changedFields: ["place"] },
    });
    return placeId;
  },
});

export const remove = mutation({
  args: { placeId: v.id("deliveryLandmarks") },
  handler: async (ctx, { placeId }) => {
    const place = await ctx.db.get(placeId);
    if (!place) return null;
    const { userId } = await requireStoreRole(ctx, place.storeId, ["store_owner", "store_manager", "dispatcher"]);
    await ctx.db.delete(placeId);
    await ctx.db.insert("domainEvents", {
      eventType: "DeliveryPlaceChanged", version: 1, aggregateType: "deliveryPlace", aggregateId: placeId,
      actorId: userId, storeId: place.storeId, occurredAt: Date.now(), data: { changedFields: ["deleted"] },
    });
    return null;
  },
});

export const marketplace = query({
  args: {},
  handler: async (ctx) => {
    const stores = await ctx.db.query("stores").withIndex("by_enabled_sort", (q) => q.eq("enabled", true)).take(50);
    const places = await Promise.all(stores.map((store) => ctx.db.query("deliveryLandmarks").withIndex("by_store", (q) => q.eq("storeId", store._id)).filter((q) => q.eq(q.field("verified"), true)).take(300)));
    return places.flat();
  },
});
