import { getAuthUserId } from "@convex-dev/auth/server";
import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import { ConvexError } from "convex/values";
import type { DataModel } from "../_generated/dataModel";
import type { Id } from "../_generated/dataModel";

type AuthContext = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

export async function requireSuperadmin(ctx: AuthContext) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Authentication required.");

  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(100);
  const membership = memberships.find((item) => item.role === "superadmin" && item.status === "active");
  if (!membership) {
    throw new ConvexError("Super administrator access required.");
  }

  return { userId, membership };
}

export type StoreRole =
  | "store_owner"
  | "store_manager"
  | "order_staff"
  | "catalogue_staff"
  | "dispatcher"
  | "driver";

export async function getActiveMemberships(ctx: AuthContext, userId: Id<"users">) {
  return (await ctx.db
    .query("memberships")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(100)).filter((membership) => membership.status === "active");
}

export async function requireStoreRole(
  ctx: AuthContext,
  storeId: Id<"stores">,
  roles: readonly StoreRole[],
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Authentication required.");

  const memberships = await getActiveMemberships(ctx, userId);
  if (memberships.some((membership) => membership.role === "superadmin")) {
    return { userId, membership: memberships.find((membership) => membership.role === "superadmin")! };
  }
  const membership = memberships.find(
    (candidate) => candidate.storeId === storeId && roles.includes(candidate.role as StoreRole),
  );
  if (!membership) throw new ConvexError("You do not have access to this store.");
  return { userId, membership };
}

export async function requireStoreManager(ctx: AuthContext, storeId: Id<"stores">) {
  return await requireStoreRole(ctx, storeId, ["store_owner", "store_manager"]);
}

export async function requireStoreOwner(ctx: AuthContext, storeId: Id<"stores">) {
  return await requireStoreRole(ctx, storeId, ["store_owner"]);
}
