import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { env, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

const COORDINATE_UPDATE_INTERVAL_MS = 10_000;
const MIN_MOVEMENT_METERS = 20;
const ROUTE_REFRESH_INTERVAL_MS = 45_000;
const TRACKING_RETENTION_MS = 8 * 60 * 60 * 1000;
const TRACKING_RENEWAL_WINDOW_MS = 60 * 60 * 1000;

function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(b.latitude - a.latitude);
  const longitudeDelta = radians(b.longitude - a.longitude);
  const aLatitude = radians(a.latitude);
  const bLatitude = radians(b.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(aLatitude) * Math.cos(bLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export const updateDriverLocation = mutation({
  args: {
    orderId: v.id("orders"),
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args) => {
    if (
      !Number.isFinite(args.latitude) ||
      args.latitude < -90 || args.latitude > 90 ||
      !Number.isFinite(args.longitude) ||
      args.longitude < -180 || args.longitude > 180
    ) {
      throw new ConvexError("A valid driver location is required.");
    }

    const userId = await getAuthUserId(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!userId || !order || order.driverUserId !== userId || order.status !== "out_for_delivery") {
      throw new ConvexError("This active delivery is not assigned to you.");
    }
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(100);
    if (!memberships.some((membership) =>
      membership.storeId === order.storeId && membership.role === "driver" && membership.status === "active",
    )) {
      throw new ConvexError("Active driver access is required to share a delivery location.");
    }

    const existing = await ctx.db
      .query("deliveryTracking")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .unique();
    const now = Date.now();
    const movement = existing
      ? distanceMeters(existing, args)
      : Number.POSITIVE_INFINITY;
    if (
      existing &&
      now - existing.locationUpdatedAt < COORDINATE_UPDATE_INTERVAL_MS &&
      movement < MIN_MOVEMENT_METERS
    ) {
      return null;
    }

    const routeRefreshDue = !existing ||
      existing.routeRequestedAt === undefined ||
      now - existing.routeRequestedAt >= ROUTE_REFRESH_INTERVAL_MS;
    const hasDestination = order.destination.latitude !== undefined && order.destination.longitude !== undefined;
    const routeRequestDue = routeRefreshDue && hasDestination;
    const routeVersion = (existing?.routeVersion ?? 0) + (routeRequestDue ? 1 : 0);
    const routeStatus = !hasDestination
      ? "unavailable" as const
      : routeRequestDue || !existing
        ? "pending" as const
        : existing.routeStatus;
    const renewExpiry = !existing || existing.expiresAt < now + TRACKING_RENEWAL_WINDOW_MS;
    const expiresAt = renewExpiry ? now + TRACKING_RETENTION_MS : existing.expiresAt;
    const fields = {
      orderId: order._id,
      storeId: order.storeId,
      driverUserId: userId,
      latitude: args.latitude,
      longitude: args.longitude,
      locationUpdatedAt: now,
      routeVersion,
      routeStatus,
      expiresAt,
      ...(routeRequestDue ? {
        routeRequestedAt: now,
      } : {}),
      ...(!hasDestination || routeRequestDue ? { distanceMeters: undefined, durationSeconds: undefined, encodedPolyline: undefined } : {}),
    };
    if (existing) await ctx.db.patch(existing._id, fields);
    else await ctx.db.insert("deliveryTracking", fields);

    if (renewExpiry) {
      await ctx.scheduler.runAfter(TRACKING_RETENTION_MS, internal.deliveryTracking.expire, {
        orderId: order._id,
        expiresAt,
      });
    }

    if (routeRequestDue) {
      await ctx.scheduler.runAfter(0, internal.deliveryTracking.fetchGoogleRoute, {
        orderId: order._id,
        routeVersion,
      });
    }
    return null;
  },
});

export const expire = internalMutation({
  args: { orderId: v.id("orders"), expiresAt: v.number() },
  handler: async (ctx, { orderId, expiresAt }) => {
    const tracking = await ctx.db
      .query("deliveryTracking")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .unique();
    if (tracking && tracking.expiresAt === expiresAt && tracking.expiresAt <= Date.now()) {
      await ctx.db.delete(tracking._id);
    }
    return null;
  },
});

export const forOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const order = await ctx.db.get(orderId);
    if (!order) return null;
    const ownsOrder = order.customerUserId === userId;
    const assignedDriver = order.driverUserId === userId && (await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(100)).some((membership) =>
        membership.storeId === order.storeId && membership.role === "driver" && membership.status === "active",
      );
    if (!ownsOrder && !assignedDriver) return null;
    if (order.status !== "out_for_delivery") return { active: false as const };

    const tracking = await ctx.db
      .query("deliveryTracking")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .unique();
    return {
      active: true as const,
      destination: order.destination.latitude === undefined || order.destination.longitude === undefined
        ? null
        : { latitude: order.destination.latitude, longitude: order.destination.longitude },
      location: tracking
        ? {
            latitude: tracking.latitude,
            longitude: tracking.longitude,
            updatedAt: tracking.locationUpdatedAt,
            routeStatus: tracking.routeStatus,
            ...(tracking.distanceMeters === undefined ? {} : { distanceMeters: tracking.distanceMeters }),
            ...(tracking.durationSeconds === undefined ? {} : { durationSeconds: tracking.durationSeconds }),
            ...(tracking.encodedPolyline === undefined ? {} : { encodedPolyline: tracking.encodedPolyline }),
            ...(tracking.routeUpdatedAt === undefined ? {} : { routeUpdatedAt: tracking.routeUpdatedAt }),
          }
        : null,
    };
  },
});

export const routeInput = internalQuery({
  args: { orderId: v.id("orders"), routeVersion: v.number() },
  handler: async (ctx, { orderId, routeVersion }) => {
    const order = await ctx.db.get(orderId);
    const tracking = await ctx.db
      .query("deliveryTracking")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .unique();
    if (
      !order || order.status !== "out_for_delivery" || !order.driverUserId || !tracking ||
      tracking.routeVersion !== routeVersion ||
      order.destination.latitude === undefined || order.destination.longitude === undefined
    ) return null;
    return {
      driverLocation: {
        latitude: tracking.latitude,
        longitude: tracking.longitude,
      },
      destination: { latitude: order.destination.latitude, longitude: order.destination.longitude },
    };
  },
});

export const saveRoute = internalMutation({
  args: {
    orderId: v.id("orders"),
    routeVersion: v.number(),
    distanceMeters: v.number(),
    durationSeconds: v.number(),
    encodedPolyline: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    const tracking = await ctx.db
      .query("deliveryTracking")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .unique();
    if (!order || order.status !== "out_for_delivery" || !tracking || tracking.routeVersion !== args.routeVersion) return null;
    await ctx.db.patch(tracking._id, {
      routeStatus: "available",
      distanceMeters: args.distanceMeters,
      durationSeconds: args.durationSeconds,
      encodedPolyline: args.encodedPolyline,
      routeUpdatedAt: Date.now(),
    });
    return null;
  },
});

export const markRouteUnavailable = internalMutation({
  args: { orderId: v.id("orders"), routeVersion: v.number() },
  handler: async (ctx, { orderId, routeVersion }) => {
    const tracking = await ctx.db
      .query("deliveryTracking")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .unique();
    if (!tracking || tracking.routeVersion !== routeVersion) return null;
    await ctx.db.patch(tracking._id, {
      routeStatus: "unavailable",
      distanceMeters: undefined,
      durationSeconds: undefined,
      encodedPolyline: undefined,
    });
    return null;
  },
});

export const fetchGoogleRoute = internalAction({
  args: { orderId: v.id("orders"), routeVersion: v.number() },
  handler: async (ctx, args) => {
    const input: {
      driverLocation: { latitude: number; longitude: number };
      destination: { latitude: number; longitude: number };
    } | null = await ctx.runQuery(internal.deliveryTracking.routeInput, args);
    if (!input) return null;
    const key = env.GOOGLE_MAPS_ROUTES_API_KEY;
    if (!key) {
      await ctx.runMutation(internal.deliveryTracking.markRouteUnavailable, args);
      return null;
    }

    try {
      const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
        },
        body: JSON.stringify({
          origin: { location: { latLng: input.driverLocation } },
          destination: { location: { latLng: input.destination } },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
          polylineQuality: "OVERVIEW",
          computeAlternativeRoutes: false,
          units: "METRIC",
        }),
      });
      if (!response.ok) throw new Error(`Google Routes API returned ${response.status}.`);
      const payload = await response.json() as {
        routes?: Array<{
          distanceMeters?: number;
          duration?: string;
          polyline?: { encodedPolyline?: string };
        }>;
      };
      const route = payload.routes?.[0];
      const seconds = route?.duration ? Number.parseFloat(route.duration.replace(/s$/, "")) : Number.NaN;
      if (
        !route || !Number.isFinite(route.distanceMeters) || !Number.isFinite(seconds) ||
        !route.polyline?.encodedPolyline
      ) throw new Error("Google Routes API did not return a usable route.");

      await ctx.runMutation(internal.deliveryTracking.saveRoute, {
        orderId: args.orderId,
        routeVersion: args.routeVersion,
        distanceMeters: route.distanceMeters!,
        durationSeconds: seconds,
        encodedPolyline: route.polyline.encodedPolyline,
      });
    } catch {
      await ctx.runMutation(internal.deliveryTracking.markRouteUnavailable, args);
    }
    return null;
  },
});

