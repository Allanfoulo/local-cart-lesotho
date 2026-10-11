import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireStoreManager, requireSuperadmin } from "./lib/authorization";
import { getDeploymentEnv } from "./lib/environment";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const bootstrapStatus = query({
  args: {},
  handler: async (ctx) => {
    const configuredEmail = getDeploymentEnv("INITIAL_SUPERADMIN_EMAIL");
    const emailDeliveryConfigured = Boolean(
      getDeploymentEnv("RESEND_API_KEY") && getDeploymentEnv("AUTH_EMAIL_FROM"),
    );
    const existingAdmin = await ctx.db
      .query("memberships")
      .withIndex("by_role", (q) => q.eq("role", "superadmin"))
      .first();
    const userId = await getAuthUserId(ctx);
    const currentMembership = userId
      ? await ctx.db
          .query("memberships")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .first()
      : null;

    return {
      initialSetupConfigured: Boolean(configuredEmail) && emailDeliveryConfigured,
      initialSetupAvailable:
        Boolean(configuredEmail) && emailDeliveryConfigured && existingAdmin === null,
      isSuperadmin:
        currentMembership?.role === "superadmin" && currentMembership.status === "active",
    };
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(100);
    const active = memberships.filter((membership) => membership.status === "active");
    if (!active.length) return null;

    return { memberships: active.map(({ role, status, storeId }) => ({ role, status, storeId })) };
  },
});

export const currentAccess = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    const memberships = (await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(100)).filter((membership) => membership.status === "active");
    const isSuperadmin = memberships.some((membership) => membership.role === "superadmin");
    const stores = isSuperadmin
      ? await ctx.db
          .query("stores")
          .take(50)
      : await Promise.all(
          [...new Set(memberships.flatMap((membership) => membership.storeId ?? []))].map((id) =>
            ctx.db.get(id),
          ),
        ).then((rows) => rows.filter(Boolean));
    return {
      user: user ? { email: user.email ?? null, name: user.name ?? null } : null,
      isSuperadmin,
      memberships: memberships.map(({ _id, role, status, storeId }) => ({
        id: _id,
        role,
        status,
        storeId: storeId ?? null,
      })),
      stores: stores.flatMap((store) => store ? [{ id: store._id, name: store.name, slug: store.slug, enabled: store.enabled }] : []),
    };
  },
});

export const listForStore = query({
  args: { storeId: v.id("stores") },
  handler: async (ctx, { storeId }) => {
    await requireStoreManager(ctx, storeId);
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_store_role_status", (q) => q.eq("storeId", storeId))
      .take(300);
    return await Promise.all(memberships.map(async (membership) => {
      const user = await ctx.db.get(membership.userId);
      return {
        id: membership._id,
        userId: membership.userId,
        role: membership.role,
        status: membership.status,
        email: user?.email ?? "",
        name: user?.name ?? "",
        grantedAt: membership.grantedAt,
      };
    }));
  },
});

export const claimInitialSuperadmin = mutation({
  args: {},
  handler: async (ctx) => {
    const configuredEmail = getDeploymentEnv("INITIAL_SUPERADMIN_EMAIL");
    if (!configuredEmail) {
      throw new ConvexError("Initial administrator authentication is not configured.");
    }

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in before claiming the administrator account.");

    const user = await ctx.db.get(userId);
    if (
      !user ||
      !user.email ||
      user.emailVerificationTime === undefined ||
      normalizeEmail(user.email) !== normalizeEmail(configuredEmail)
    ) {
      throw new ConvexError("A verified initial administrator email is required.");
    }

    const existingAdmin = await ctx.db
      .query("memberships")
      .withIndex("by_role", (q) => q.eq("role", "superadmin"))
      .first();
    if (existingAdmin) {
      if (existingAdmin.userId === userId && existingAdmin.status === "active") {
        return { role: "superadmin" as const };
      }
      throw new ConvexError("Initial administrator setup is already complete.");
    }

    const existingMembership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existingMembership) {
      throw new ConvexError("This account already has a membership.");
    }

    await ctx.db.insert("memberships", {
      userId,
      role: "superadmin",
      status: "active",
      grantedAt: Date.now(),
    });
    await ctx.db.insert("domainEvents", {
      eventType: "MembershipGranted",
      version: 1,
      aggregateType: "membership",
      aggregateId: userId,
      actorId: userId,
      occurredAt: Date.now(),
      data: { role: "superadmin" },
    });
    return { role: "superadmin" as const };
  },
});

export const setMembershipStatus = mutation({
  args: {
    membershipId: v.id("memberships"),
    status: v.union(v.literal("active"), v.literal("suspended")),
  },
  handler: async (ctx, { membershipId, status }) => {
    const target = await ctx.db.get(membershipId);
    if (!target) throw new ConvexError("Membership not found.");
    let actorId: import("./_generated/dataModel").Id<"users">;
    if (target.role === "superadmin") {
      ({ userId: actorId } = await requireSuperadmin(ctx));
      if (status === "suspended" && target.status === "active") {
        if (target.userId === actorId) throw new ConvexError("You cannot suspend your own platform access.");
        const activeAdmins = (await ctx.db
          .query("memberships")
          .withIndex("by_role", (q) => q.eq("role", "superadmin"))
          .take(100)).filter((membership) => membership.status === "active");
        if (activeAdmins.length <= 1) throw new ConvexError("The last active super admin cannot be suspended.");
      }
    } else {
      if (!target.storeId) throw new ConvexError("This membership cannot be managed.");
      const actor = await requireStoreManager(ctx, target.storeId);
      actorId = actor.userId;
      if (target.role === "store_owner" && actor.membership.role !== "superadmin") {
        throw new ConvexError("Only a super admin can manage store owner access.");
      }
      if (target.role === "store_manager" && actor.membership.role !== "superadmin" && actor.membership.role !== "store_owner") {
        throw new ConvexError("Only the store owner can manage store manager access.");
      }
      if (target.status === "active" && status === "suspended" && target.userId === actor.userId) {
        throw new ConvexError("You cannot suspend your own store access.");
      }
    }
    await ctx.db.patch(membershipId, { status });
    await ctx.db.insert("domainEvents", {
      eventType: status === "suspended" ? "MembershipSuspended" : "MembershipGranted",
      version: 1,
      aggregateType: "membership",
      aggregateId: membershipId,
      actorId,
      ...(target.storeId ? { storeId: target.storeId } : {}),
      occurredAt: Date.now(),
      data: status === "active" ? { role: target.role } : { status },
    });
    return null;
  },
});
