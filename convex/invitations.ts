import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { requireStoreManager, requireStoreOwner, requireSuperadmin } from "./lib/authorization";
import { getDeploymentEnv } from "./lib/environment";

const staffRole = v.union(
  v.literal("store_owner"),
  v.literal("store_manager"),
  v.literal("order_staff"),
  v.literal("catalogue_staff"),
  v.literal("dispatcher"),
  v.literal("driver"),
);
const normalizeEmail = (email: string) => email.trim().toLowerCase();

async function requireInvitationRoleAuthority(
  ctx: Parameters<typeof requireStoreManager>[0],
  storeId: import("./_generated/dataModel").Id<"stores">,
  role: "store_owner" | "store_manager" | "order_staff" | "catalogue_staff" | "dispatcher" | "driver",
) {
  if (role === "store_owner") return await requireSuperadmin(ctx);
  if (role === "store_manager") return await requireStoreOwner(ctx, storeId);
  return await requireStoreManager(ctx, storeId);
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const listForStore = query({
  args: { storeId: v.id("stores") },
  handler: async (ctx, { storeId }) => {
    await requireStoreManager(ctx, storeId);
    const invitations = await ctx.db
      .query("staffInvitations")
      .withIndex("by_store_email", (q) => q.eq("storeId", storeId))
      .order("desc")
      .take(100);
    return invitations.map(({ _id, email, role, status, createdAt, expiresAt, acceptedAt }) => ({
      _id, email, role, status, createdAt, expiresAt, acceptedAt,
    }));
  },
});

export const create = mutation({
  args: { storeId: v.id("stores"), email: v.string(), role: staffRole },
  handler: async (ctx, { storeId, email, role }) => {
    const actorId = await getAuthUserId(ctx);
    if (!actorId) throw new ConvexError("Authentication required.");
    await requireInvitationRoleAuthority(ctx, storeId, role);
    const normalizedEmail = normalizeEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new ConvexError("Enter a valid staff email address.");
    }
    const store = await ctx.db.get(storeId);
    if (!store) throw new ConvexError("Store not found.");
    const [pending, sent] = await Promise.all([
      ctx.db.query("staffInvitations")
        .withIndex("by_store_email_status", (q) => q.eq("storeId", storeId).eq("email", normalizedEmail).eq("status", "pending"))
        .take(10),
      ctx.db.query("staffInvitations")
        .withIndex("by_store_email_status", (q) => q.eq("storeId", storeId).eq("email", normalizedEmail).eq("status", "sent"))
        .take(10),
    ]);
    if ([...pending, ...sent].some((invitation) => invitation.expiresAt > Date.now())) {
      throw new ConvexError("An active invitation already exists for this email and store.");
    }
    const token = randomToken();
    const invitationId = await ctx.db.insert("staffInvitations", {
      storeId,
      email: normalizedEmail,
      role,
      tokenHash: await hashToken(token),
      invitedBy: actorId,
      status: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    await ctx.scheduler.runAfter(0, internal.invitations.sendInvitation, { invitationId, token });
    return { invitationId };
  },
});

export const accept = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Create an account or sign in before accepting the invitation.");
    const user = await ctx.db.get(userId);
    if (!user?.email || user.emailVerificationTime === undefined) {
      throw new ConvexError("Verify your email before accepting the invitation.");
    }
    const tokenHash = await hashToken(token);
    const invitation = await ctx.db
      .query("staffInvitations")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (!invitation) throw new ConvexError("This invitation is invalid or has already been used.");
    if (invitation.status !== "pending" && invitation.status !== "sent") {
      throw new ConvexError("This invitation is no longer active.");
    }
    if (invitation.expiresAt <= Date.now()) {
      await ctx.db.patch(invitation._id, { status: "expired" });
      return { expired: true as const };
    }
    if (normalizeEmail(user.email) !== invitation.email) {
      throw new ConvexError("Sign in with the invited email address to accept this invitation.");
    }
    const sameStore = await ctx.db
      .query("memberships")
      .withIndex("by_user_store", (q) => q.eq("userId", userId).eq("storeId", invitation.storeId))
      .take(2);
    if (sameStore.some((membership) => membership.status === "active")) {
      throw new ConvexError("This account already has active access to the store.");
    }
    if (sameStore.length > 1) throw new ConvexError("This account has duplicate store memberships; contact the platform administrator.");
    const membershipId = sameStore[0]
      ? sameStore[0]._id
      : await ctx.db.insert("memberships", {
          userId,
          storeId: invitation.storeId,
          role: invitation.role,
          status: "active",
          grantedAt: Date.now(),
        });
    if (sameStore[0]) {
      await ctx.db.patch(membershipId, { role: invitation.role, status: "active", grantedAt: Date.now() });
    }
    await ctx.db.patch(invitation._id, { status: "accepted", acceptedBy: userId, acceptedAt: Date.now() });
    await ctx.db.insert("domainEvents", {
      eventType: "MembershipGranted",
      version: 1,
      aggregateType: "membership",
      aggregateId: membershipId,
      actorId: userId,
      storeId: invitation.storeId,
      occurredAt: Date.now(),
      data: { role: invitation.role },
    });
    return { role: invitation.role, storeId: invitation.storeId };
  },
});

export const resend = mutation({
  args: { invitationId: v.id("staffInvitations") },
  handler: async (ctx, { invitationId }) => {
    const invitation = await ctx.db.get(invitationId);
    if (!invitation) throw new ConvexError("Invitation not found.");
    await requireInvitationRoleAuthority(ctx, invitation.storeId, invitation.role);
    if (!["failed", "expired"].includes(invitation.status) && invitation.expiresAt > Date.now()) {
      throw new ConvexError("Only a failed or expired invitation can be sent again.");
    }
    const token = randomToken();
    await ctx.db.patch(invitationId, {
      tokenHash: await hashToken(token),
      status: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      acceptedBy: undefined,
      acceptedAt: undefined,
    });
    await ctx.scheduler.runAfter(0, internal.invitations.sendInvitation, { invitationId, token });
    return null;
  },
});

export const revoke = mutation({
  args: { invitationId: v.id("staffInvitations") },
  handler: async (ctx, { invitationId }) => {
    const invitation = await ctx.db.get(invitationId);
    if (!invitation) throw new ConvexError("Invitation not found.");
    const actorId = await getAuthUserId(ctx);
    if (!actorId) throw new ConvexError("Authentication required.");
    await requireInvitationRoleAuthority(ctx, invitation.storeId, invitation.role);
    if (invitation.status === "accepted") throw new ConvexError("An accepted membership must be suspended separately.");
    await ctx.db.patch(invitationId, { status: "revoked" });
    return null;
  },
});

export const getDeliveryDetails = internalQuery({
  args: { invitationId: v.id("staffInvitations") },
  handler: async (ctx, { invitationId }) => {
    const invitation = await ctx.db.get(invitationId);
    if (!invitation) return null;
    const store = await ctx.db.get(invitation.storeId);
    return store
      ? { email: invitation.email, role: invitation.role, storeName: store.name, expiresAt: invitation.expiresAt }
      : null;
  },
});

export const setDeliveryStatus = internalMutation({
  args: { invitationId: v.id("staffInvitations"), status: v.union(v.literal("sent"), v.literal("failed")) },
  handler: async (ctx, { invitationId, status }) => {
    const invitation = await ctx.db.get(invitationId);
    if (invitation && invitation.status === "pending") await ctx.db.patch(invitationId, { status });
    return null;
  },
});

export const sendInvitation = internalAction({
  args: { invitationId: v.id("staffInvitations"), token: v.string() },
  handler: async (ctx, { invitationId, token }) => {
    const invitation = await ctx.runQuery(internal.invitations.getDeliveryDetails, { invitationId });
    if (!invitation) return null;
    const apiKey = getDeploymentEnv("RESEND_API_KEY");
    const from = getDeploymentEnv("AUTH_EMAIL_FROM");
    const siteUrl = getDeploymentEnv("SITE_URL");
    if (!apiKey || !from || !siteUrl) {
      await ctx.runMutation(internal.invitations.setDeliveryStatus, { invitationId, status: "failed" });
      return null;
    }
    const acceptUrl = `${siteUrl.replace(/\/$/, "")}/staff/accept-invite?token=${encodeURIComponent(token)}`;
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [invitation.email],
          subject: `Invitation to join ${invitation.storeName} on REETAPELE`,
          text: `You have been invited as ${invitation.role} at ${invitation.storeName}. Accept the invitation within 7 days: ${acceptUrl}`,
        }),
      });
      if (!response.ok) throw new Error("Email provider rejected the invitation.");
      await ctx.runMutation(internal.invitations.setDeliveryStatus, { invitationId, status: "sent" });
    } catch {
      await ctx.runMutation(internal.invitations.setDeliveryStatus, { invitationId, status: "failed" });
    }
    return null;
  },
});
