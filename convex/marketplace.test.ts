/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function user(ctx: MutationCtx, email: string, verified = true) {
  return await ctx.db.insert("users", {
    email,
    ...(verified ? { emailVerificationTime: Date.now() } : {}),
  });
}

async function store(ctx: MutationCtx, name: string) {
  return await ctx.db.insert("stores", {
    slug: name.toLowerCase().replaceAll(" ", "-"), name, tagline: "Local groceries",
    phone: "+26622220000", whatsapp: "+26622220000", address: "Maseru", openingHours: "08:00–18:00",
    enabled: true, sortOrder: 1,
  });
}

async function seedProduct(ctx: MutationCtx, storeId: Id<"stores">, name: string, stock = 10) {
  const categoryId = await ctx.db.insert("categories", {
    storeId, slug: "groceries", name: "Groceries", emoji: "🛒", accent: "green", enabled: true, sortOrder: 1,
  });
  return await ctx.db.insert("products", {
    storeId, slug: name.toLowerCase().replaceAll(" ", "-"), name, description: name, categoryId,
    price: 10, unit: "each", soldByWeight: false, stock, lowStockThreshold: 2,
    available: true, popularity: 0, emoji: "🛒",
  });
}

async function seedSettings(ctx: MutationCtx, storeId: Id<"stores">) {
  await ctx.db.insert("storeSettings", {
    storeId, key: "storefront", name: "Local shop", currency: "LSL", deliveryFee: 5, minimumOrder: 0,
    deliveryAreas: ["Maseru"], defaultDeliveryArea: "Maseru", mobileMoneyEnabled: true,
    cashOnDeliveryEnabled: true, cardEnabled: true,
  });
}

function identity(userId: Id<"users">, email: string) {
  return { subject: String(userId), email, issuer: "https://auth.example.test", tokenIdentifier: `https://auth.example.test|${userId}` };
}

test("store management reads and writes are limited to active memberships in that store", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const ownerId = await user(ctx, "owner@example.test");
    const storeA = await store(ctx, "Store A");
    const storeB = await store(ctx, "Store B");
    const categoryId = await ctx.db.insert("categories", { storeId: storeA, slug: "existing", name: "Existing", emoji: "🛒", accent: "green", enabled: true, sortOrder: 1 });
    const membershipId = await ctx.db.insert("memberships", { userId: ownerId, storeId: storeA, role: "store_owner", status: "active", grantedAt: Date.now() });
    return { ownerId, storeA, storeB, categoryId, membershipId };
  });
  const owner = t.withIdentity(identity(fixture.ownerId, "owner@example.test"));

  await expect(owner.query(api.memberships.listForStore, { storeId: fixture.storeB })).rejects.toThrow();
  await expect(owner.mutation(api.catalog.upsertCategory, {
    storeId: fixture.storeB, slug: "wrong-store", name: "Wrong store", emoji: "🛒", accent: "green", enabled: true, sortOrder: 2,
  })).rejects.toThrow();
  await expect(owner.mutation(api.catalog.upsertCategory, {
    categoryId: fixture.categoryId, storeId: fixture.storeB, slug: "changed", name: "Changed", emoji: "🛒", accent: "green", enabled: true, sortOrder: 2,
  })).rejects.toThrow();

  const rows = await owner.query(api.memberships.listForStore, { storeId: fixture.storeA });
  expect(rows).toHaveLength(1);
});

test("suspended memberships immediately lose store permissions", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const managerId = await user(ctx, "manager@example.test");
    const storeId = await store(ctx, "Store A");
    const membershipId = await ctx.db.insert("memberships", { userId: managerId, storeId, role: "store_manager", status: "suspended", grantedAt: Date.now() });
    return { managerId, storeId, membershipId };
  });
  const manager = t.withIdentity(identity(fixture.managerId, "manager@example.test"));
  await expect(manager.query(api.memberships.listForStore, { storeId: fixture.storeId })).rejects.toThrow();
  await expect(manager.mutation(api.memberships.setMembershipStatus, { membershipId: fixture.membershipId, status: "active" })).rejects.toThrow();
});

test("store managers cannot change owner access and owners cannot suspend themselves", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const managerId = await user(ctx, "manager@example.test");
    const ownerId = await user(ctx, "owner@example.test");
    const storeId = await store(ctx, "Store A");
    const managerMembershipId = await ctx.db.insert("memberships", { userId: managerId, storeId, role: "store_manager", status: "active", grantedAt: Date.now() });
    const ownerMembershipId = await ctx.db.insert("memberships", { userId: ownerId, storeId, role: "store_owner", status: "active", grantedAt: Date.now() });
    return { managerId, ownerId, managerMembershipId, ownerMembershipId };
  });
  const manager = t.withIdentity(identity(fixture.managerId, "manager@example.test"));
  const owner = t.withIdentity(identity(fixture.ownerId, "owner@example.test"));
  await expect(manager.mutation(api.memberships.setMembershipStatus, { membershipId: fixture.ownerMembershipId, status: "suspended" })).rejects.toThrow();
  await expect(owner.mutation(api.memberships.setMembershipStatus, { membershipId: fixture.ownerMembershipId, status: "suspended" })).rejects.toThrow();
  await owner.mutation(api.memberships.setMembershipStatus, { membershipId: fixture.managerMembershipId, status: "suspended" });
});

test("store manager invitations cannot gain owner or manager authority from a suspended owner record", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const managerId = await user(ctx, "manager@example.test");
    const suspendedOwnerId = await user(ctx, "old-owner@example.test");
    const storeId = await store(ctx, "Store A");
    await ctx.db.insert("memberships", { userId: managerId, storeId, role: "store_manager", status: "active", grantedAt: Date.now() });
    await ctx.db.insert("memberships", { userId: suspendedOwnerId, storeId, role: "store_owner", status: "suspended", grantedAt: Date.now() });
    return { managerId, storeId };
  });
  const manager = t.withIdentity(identity(fixture.managerId, "manager@example.test"));
  await expect(manager.mutation(api.invitations.create, {
    storeId: fixture.storeId, email: "new-manager@example.test", role: "store_manager",
  })).rejects.toThrow();
  await expect(manager.mutation(api.invitations.create, {
    storeId: fixture.storeId, email: "new-owner@example.test", role: "store_owner",
  })).rejects.toThrow();
  await manager.mutation(api.invitations.create, {
    storeId: fixture.storeId, email: "driver@example.test", role: "driver",
  });
  await manager.mutation(api.invitations.create, {
    storeId: fixture.storeId, email: "preparation@example.test", role: "order_staff",
  });
});

test("revoked and previously accepted invitations cannot be reused", async () => {
  const t = convexTest(schema, modules);
  const token = "revoked-invite-token";
  const tokenHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const fixture = await t.run(async (ctx) => {
    const ownerId = await user(ctx, "owner@example.test");
    const inviteeId = await user(ctx, "invitee@example.test");
    const storeId = await store(ctx, "Store A");
    await ctx.db.insert("staffInvitations", {
      storeId, email: "invitee@example.test", role: "driver", tokenHash, invitedBy: ownerId,
      status: "revoked", createdAt: Date.now(), expiresAt: Date.now() + 60_000,
    });
    return { inviteeId };
  });
  const invitee = t.withIdentity(identity(fixture.inviteeId, "invitee@example.test"));
  await expect(invitee.mutation(api.invitations.accept, { token })).rejects.toThrow(/no longer active/i);
});

test("a super admin cannot suspend their own access or the final active super admin", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const adminId = await user(ctx, "admin@example.test");
    const membershipId = await ctx.db.insert("memberships", { userId: adminId, role: "superadmin", status: "active", grantedAt: Date.now() });
    return { adminId, membershipId };
  });
  const admin = t.withIdentity(identity(fixture.adminId, "admin@example.test"));
  await expect(admin.mutation(api.memberships.setMembershipStatus, {
    membershipId: fixture.membershipId, status: "suspended",
  })).rejects.toThrow(/own platform access/i);
});

test("only the super admin can create and inspect stores, and publishing requires an active owner and catalog", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const adminId = await user(ctx, "platform@example.test");
    const ownerId = await user(ctx, "owner@example.test");
    await ctx.db.insert("memberships", { userId: adminId, role: "superadmin", status: "active", grantedAt: Date.now() });
    const storeId = await store(ctx, "Existing Store");
    return { adminId, ownerId, storeId };
  });
  const admin = t.withIdentity(identity(fixture.adminId, "platform@example.test"));
  const owner = t.withIdentity(identity(fixture.ownerId, "owner@example.test"));
  await expect(owner.query(api.stores.listForPlatform, {})).rejects.toThrow();
  await expect(owner.mutation(api.stores.create, {
    name: "Unauthorized", slug: "unauthorized", tagline: "No", phone: "+26650000000", whatsapp: "+26650000000",
    address: "Maseru", openingHours: "08:00–18:00", deliveryArea: "Maseru",
  })).rejects.toThrow();

  const storeId = await admin.mutation(api.stores.create, {
    name: "New Store", slug: "new-store", tagline: "Local goods", phone: "+26650000000", whatsapp: "+26650000000",
    address: "Maseru", openingHours: "08:00–18:00", deliveryArea: "Maseru",
  });
  const initial = await t.run(async (ctx) => ({ store: await ctx.db.get(storeId), settings: await ctx.db.query("storeSettings").withIndex("by_store", (q) => q.eq("storeId", storeId)).unique() }));
  expect(initial.store?.enabled).toBe(false);
  expect(initial.settings).toMatchObject({ deliveryAreas: ["Maseru"], defaultDeliveryArea: "Maseru", cashOnDeliveryEnabled: true, mobileMoneyEnabled: false, cardEnabled: false });
  await expect(admin.mutation(api.stores.setEnabled, { storeId, enabled: true })).rejects.toThrow(/owner/i);

  await t.run(async (ctx) => {
    await ctx.db.insert("memberships", { userId: fixture.ownerId, storeId, role: "store_owner", status: "active", grantedAt: Date.now() });
  });
  await expect(admin.mutation(api.stores.setEnabled, { storeId, enabled: true })).rejects.toThrow(/category and product/i);
  await t.run((ctx) => seedProduct(ctx, storeId, "First product"));
  await expect(admin.mutation(api.stores.setEnabled, { storeId, enabled: true })).resolves.toBeNull();
  await expect(owner.mutation(api.stores.setEnabled, { storeId, enabled: false })).rejects.toThrow();
  const published = await admin.query(api.stores.listForPlatform, {});
  expect(published.find((row) => row.id === storeId)).toMatchObject({ enabled: true, ownerEmail: "owner@example.test", setup: { readyToPublish: true } });
});

test("store managers can update store settings but cannot control platform publication", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const managerId = await user(ctx, "manager@example.test");
    const storeId = await store(ctx, "Store A");
    const settingsId = await ctx.db.insert("storeSettings", {
      storeId, key: "storefront", name: "Store A", currency: "LSL", deliveryFee: 5, minimumOrder: 0,
      deliveryAreas: ["Maseru"], defaultDeliveryArea: "Maseru", mobileMoneyEnabled: true, cashOnDeliveryEnabled: true, cardEnabled: false,
    });
    await ctx.db.insert("memberships", { userId: managerId, storeId, role: "store_manager", status: "active", grantedAt: Date.now() });
    return { managerId, storeId, settingsId };
  });
  const manager = t.withIdentity(identity(fixture.managerId, "manager@example.test"));
  await manager.mutation(api.catalog.updateStoreSettings, {
    storeId: fixture.storeId, name: "Updated Store", tagline: "More choice", phone: "+26650000001", whatsapp: "+26650000001",
    address: "New address", openingHours: "09:00–17:00", deliveryFee: 8, minimumOrder: 20,
    deliveryAreas: ["Maseru", "Roma"], defaultDeliveryArea: "Roma", mobileMoneyEnabled: false,
    cashOnDeliveryEnabled: true, cardEnabled: false,
  });
  await expect(manager.mutation(api.stores.setEnabled, { storeId: fixture.storeId, enabled: false })).rejects.toThrow();
  const persisted = await t.run(async (ctx) => ({ store: await ctx.db.get(fixture.storeId), settings: await ctx.db.get(fixture.settingsId) }));
  expect(persisted.store).toMatchObject({ name: "Updated Store", enabled: true, sortOrder: 1 });
  expect(persisted.settings).toMatchObject({ deliveryFee: 8, minimumOrder: 20, deliveryAreas: ["Maseru", "Roma"], defaultDeliveryArea: "Roma", mobileMoneyEnabled: false });
});

test("store setup progress is private and reflects setup, catalogue, and team readiness", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const ownerId = await user(ctx, "setup-owner@example.test");
    const outsiderId = await user(ctx, "setup-outsider@example.test");
    const staffId = await user(ctx, "setup-staff@example.test");
    const storeId = await store(ctx, "Setup Store");
    await ctx.db.insert("memberships", { userId: ownerId, storeId, role: "store_owner", status: "active", grantedAt: Date.now() });
    return { ownerId, outsiderId, staffId, storeId };
  });
  const owner = t.withIdentity(identity(fixture.ownerId, "setup-owner@example.test"));
  const outsider = t.withIdentity(identity(fixture.outsiderId, "setup-outsider@example.test"));

  const initial = await owner.query(api.stores.setupProgress, { storeId: fixture.storeId, now: Date.now() });
  expect(initial.steps).toEqual({ profile: true, delivery: false, payment: false, catalogue: false, team: false });
  expect(initial.readyToPublish).toBe(false);
  expect(initial.preview).toMatchObject({ deliveryArea: "Not set", paymentMethods: [], products: [] });
  await expect(outsider.query(api.stores.setupProgress, { storeId: fixture.storeId, now: Date.now() })).rejects.toThrow(/do not have access/i);

  await t.run(async (ctx) => {
    await seedSettings(ctx, fixture.storeId);
    await seedProduct(ctx, fixture.storeId, "First product");
    await ctx.db.insert("memberships", { userId: fixture.staffId, storeId: fixture.storeId, role: "order_staff", status: "active", grantedAt: Date.now() });
  });
  const complete = await owner.query(api.stores.setupProgress, { storeId: fixture.storeId, now: Date.now() });
  expect(complete.steps).toEqual({ profile: true, delivery: true, payment: true, catalogue: true, team: true });
  expect(complete.readyToPublish).toBe(true);
  expect(complete.preview).toMatchObject({
    deliveryArea: "Maseru",
    paymentMethods: ["Cash on delivery", "Manual mobile money"],
    products: [{ name: "First product", price: 10, unit: "each" }],
  });
});

test("store publication enforces complete profile and at least one supported payment method", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const adminId = await user(ctx, "publish-admin@example.test");
    const ownerId = await user(ctx, "publish-owner@example.test");
    await ctx.db.insert("memberships", { userId: adminId, role: "superadmin", status: "active", grantedAt: Date.now() });
    const storeId = await store(ctx, "Ready Store");
    await ctx.db.patch(storeId, { enabled: false, tagline: "  " });
    await ctx.db.insert("memberships", { userId: ownerId, storeId, role: "store_owner", status: "active", grantedAt: Date.now() });
    await seedSettings(ctx, storeId);
    await seedProduct(ctx, storeId, "First product");
    const settings = await ctx.db.query("storeSettings").withIndex("by_store", (q) => q.eq("storeId", storeId)).unique();
    await ctx.db.patch(settings!._id, { cashOnDeliveryEnabled: false, mobileMoneyEnabled: false });
    return { adminId, storeId, settingsId: settings!._id };
  });
  const admin = t.withIdentity(identity(fixture.adminId, "publish-admin@example.test"));

  await expect(admin.mutation(api.stores.setEnabled, { storeId: fixture.storeId, enabled: true })).rejects.toThrow(/profile/i);
  await t.run(async (ctx) => {
    await ctx.db.patch(fixture.storeId, { tagline: "Local groceries" });
  });
  await expect(admin.mutation(api.stores.setEnabled, { storeId: fixture.storeId, enabled: true })).rejects.toThrow(/payment method/i);
  await expect(t.run(async (ctx) => await ctx.db.get(fixture.storeId))).resolves.toMatchObject({ enabled: false });
});

test("staff invitations verify email, grant only the invited store role, and expire without granting access", async () => {
  const t = convexTest(schema, modules);
  const token = "single-use-invite-token";
  const tokenHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const expiredToken = "expired-invite-token";
  const expiredHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(expiredToken))), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const fixture = await t.run(async (ctx) => {
    const invitingOwner = await user(ctx, "owner@example.test");
    const invitedUser = await user(ctx, "staff@example.test");
    const unverifiedUser = await user(ctx, "unverified@example.test", false);
    const expiredUser = await user(ctx, "expired@example.test");
    const storeId = await store(ctx, "Store A");
    const otherStore = await store(ctx, "Store B");
    const invitationId = await ctx.db.insert("staffInvitations", {
      storeId, email: "staff@example.test", role: "dispatcher", tokenHash, invitedBy: invitingOwner,
      status: "sent", createdAt: Date.now(), expiresAt: Date.now() + 60_000,
    });
    const expiredInvitationId = await ctx.db.insert("staffInvitations", {
      storeId: otherStore, email: "expired@example.test", role: "driver", tokenHash: expiredHash,
      invitedBy: invitingOwner, status: "sent", createdAt: Date.now() - 120_000, expiresAt: Date.now() - 1,
    });
    return { invitedUser, unverifiedUser, expiredUser, storeId, expiredInvitationId };
  });
  const staff = t.withIdentity(identity(fixture.invitedUser, "staff@example.test"));
  const accepted = await staff.mutation(api.invitations.accept, { token });
  expect(accepted).toMatchObject({ role: "dispatcher", storeId: fixture.storeId });
  await expect(staff.mutation(api.invitations.accept, { token })).rejects.toThrow();

  const unverified = t.withIdentity(identity(fixture.unverifiedUser, "unverified@example.test"));
  await expect(unverified.mutation(api.invitations.accept, { token })).rejects.toThrow(/verify your email/i);
  const expiredStaff = t.withIdentity(identity(fixture.expiredUser, "expired@example.test"));
  const expired = await expiredStaff.mutation(api.invitations.accept, { token: expiredToken });
  expect(expired).toEqual({ expired: true });
  const expiredRow = await t.run((ctx) => ctx.db.get(fixture.expiredInvitationId));
  expect(expiredRow?.status).toBe("expired");
});

test("customers only receive orders linked to their authenticated account", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const customerA = await user(ctx, "a@example.test");
    const customerB = await user(ctx, "b@example.test");
    const storeId = await store(ctx, "Store A");
    const customerId = await ctx.db.insert("customers", { userId: customerA, name: "Customer A", phone: "+26650000001", normalizedPhone: "+26650000001", orderCount: 0, lifetimeSpend: 0, lastOrderAt: Date.now() });
    const otherCustomerId = await ctx.db.insert("customers", { name: "Customer B", phone: "+26650000002", normalizedPhone: "+26650000002", orderCount: 0, lifetimeSpend: 0, lastOrderAt: Date.now() });
    const order = async (checkoutId: string, owner: Id<"users"> | undefined, contactId: Id<"customers">) => await ctx.db.insert("orders", {
      storeId, storeName: "Store A", orderNumber: checkoutId, checkoutId, customerId: contactId,
      ...(owner ? { customerUserId: owner } : {}), customer: { name: "Customer", phone: "+26650000000" }, items: [],
      destination: { area: "Maseru", address: "Main street" }, payment: { method: "cash_on_delivery", status: "unpaid" },
      subtotal: 10, deliveryFee: 5, total: 15, status: "received", createdAt: Date.now(), estimatedDeliveryAt: Date.now() + 1000,
    });
    await order("OWN", customerA, customerId);
    await order("OTHER", customerB, otherCustomerId);
    await order("GUEST", undefined, customerId);
    return { customerA };
  });
  const customer = t.withIdentity(identity(fixture.customerA, "a@example.test"));
  const orders = await customer.query(api.customers.myOrders, {});
  expect(orders.map((order) => order.checkoutId)).toEqual(["OWN"]);
});

test("driver status changes require the assigned driver and append an event atomically", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const dispatcherId = await user(ctx, "dispatch@example.test");
    const driverId = await user(ctx, "driver@example.test");
    const otherDriverId = await user(ctx, "other-driver@example.test");
    const storeId = await store(ctx, "Store A");
    const customerId = await ctx.db.insert("customers", { name: "Customer", phone: "+26650000003", normalizedPhone: "+26650000003", email: "private@example.test", orderCount: 1, lifetimeSpend: 15, lastOrderAt: Date.now() });
    await ctx.db.insert("memberships", { userId: dispatcherId, storeId, role: "dispatcher", status: "active", grantedAt: Date.now() });
    await ctx.db.insert("memberships", { userId: driverId, storeId, role: "driver", status: "active", grantedAt: Date.now() });
    await ctx.db.insert("memberships", { userId: otherDriverId, storeId, role: "driver", status: "active", grantedAt: Date.now() });
    const orderId = await ctx.db.insert("orders", {
      storeId, storeName: "Store A", orderNumber: "REE-TEST-1", checkoutId: "CHECKOUT-1", customerId,
      customerUserId: undefined, driverUserId: driverId, driverName: "Driver", customer: { name: "Customer", phone: "+26650000003" }, items: [],
      destination: { area: "Maseru", address: "Main street" }, payment: { method: "cash_on_delivery", status: "unpaid" },
      subtotal: 10, deliveryFee: 5, total: 15, status: "ready", createdAt: Date.now(), estimatedDeliveryAt: Date.now() + 1000,
    });
    return { driverId, otherDriverId, orderId };
  });
  const driver = t.withIdentity(identity(fixture.driverId, "driver@example.test"));
  const otherDriver = t.withIdentity(identity(fixture.otherDriverId, "other-driver@example.test"));
  const assigned = await driver.query(api.orders.myAssigned, {});
  expect(assigned?.orders.map((order) => order._id)).toEqual([fixture.orderId]);
  expect(assigned?.orders[0]).not.toHaveProperty("customerId");
  expect(assigned?.orders[0]?.customer).not.toHaveProperty("email");
  expect(assigned?.orders[0]?.destination).not.toHaveProperty("latitude");
  await expect(otherDriver.mutation(api.orders.updateStatus, { orderId: fixture.orderId, status: "out_for_delivery" })).rejects.toThrow();
  await expect(driver.mutation(api.orders.updateStatus, { orderId: fixture.orderId, status: "delivered" })).rejects.toThrow();
  await driver.mutation(api.orders.updateStatus, { orderId: fixture.orderId, status: "out_for_delivery" });
  await driver.mutation(api.orders.updateStatus, { orderId: fixture.orderId, status: "delivered" });
  const persisted = await t.run(async (ctx) => ({
    order: await ctx.db.get(fixture.orderId),
    timeline: await ctx.db.query("orderEvents").withIndex("by_order", (q) => q.eq("orderId", fixture.orderId)).take(10),
    audit: await ctx.db.query("domainEvents").withIndex("by_aggregate", (q) => q.eq("aggregateType", "order").eq("aggregateId", fixture.orderId)).take(10),
  }));
  expect(persisted.order?.status).toBe("delivered");
  expect(persisted.timeline.map((event) => event.status)).toEqual(["out_for_delivery", "delivered"]);
  expect(persisted.audit).toHaveLength(2);
});

test("order staff can prepare orders but cannot dispatch, assign drivers, or change payment state", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const orderStaffId = await user(ctx, "prep@example.test");
    const managerId = await user(ctx, "manager@example.test");
    const otherStaffId = await user(ctx, "other-prep@example.test");
    const driverId = await user(ctx, "driver@example.test");
    const storeId = await store(ctx, "Store A");
    const customerId = await ctx.db.insert("customers", { name: "Customer", phone: "+26650000003", normalizedPhone: "+26650000003", orderCount: 1, lifetimeSpend: 15, lastOrderAt: Date.now() });
    await ctx.db.insert("memberships", { userId: orderStaffId, storeId, role: "order_staff", status: "active", grantedAt: Date.now() });
    await ctx.db.insert("memberships", { userId: otherStaffId, storeId, role: "order_staff", status: "active", grantedAt: Date.now() });
    await ctx.db.insert("memberships", { userId: managerId, storeId, role: "store_manager", status: "active", grantedAt: Date.now() });
    await ctx.db.insert("memberships", { userId: driverId, storeId, role: "driver", status: "active", grantedAt: Date.now() });
    const orderId = await ctx.db.insert("orders", {
      storeId, storeName: "Store A", orderNumber: "REE-PREP-1", checkoutId: "CHECKOUT-PREP-1", customerId,
      customer: { name: "Customer", phone: "+26650000003" }, items: [],
      destination: { area: "Maseru", address: "Main street" }, payment: { method: "cash_on_delivery", status: "unpaid" },
      subtotal: 10, deliveryFee: 5, total: 15, status: "received", createdAt: Date.now(), estimatedDeliveryAt: Date.now() + 1000,
    });
    return { orderStaffId, managerId, otherStaffId, driverId, storeId, orderId };
  });
  const orderStaff = t.withIdentity(identity(fixture.orderStaffId, "prep@example.test"));
  const otherOrderStaff = t.withIdentity(identity(fixture.otherStaffId, "other-prep@example.test"));
  const manager = t.withIdentity(identity(fixture.managerId, "manager@example.test"));
  await expect(orderStaff.mutation(api.orders.updateStatus, { orderId: fixture.orderId, status: "confirmed" })).rejects.toThrow(/assigned/i);
  await manager.mutation(api.orders.assignPreparationStaff, { orderId: fixture.orderId, staffUserId: fixture.orderStaffId });
  const workspace = await orderStaff.query(api.orders.listForStaff, {});
  expect(workspace?.orders.map((order) => order._id)).toContain(fixture.orderId);
  expect(workspace?.preparationStaff).toEqual([]);
  expect(workspace?.drivers).toEqual([]);
  const otherWorkspace = await otherOrderStaff.query(api.orders.listForStaff, {});
  expect(otherWorkspace?.orders).toHaveLength(0);
  await expect(otherOrderStaff.mutation(api.orders.updateStatus, { orderId: fixture.orderId, status: "confirmed" })).rejects.toThrow(/assigned/i);
  await orderStaff.mutation(api.orders.updateStatus, { orderId: fixture.orderId, status: "confirmed" });
  await orderStaff.mutation(api.orders.updateStatus, { orderId: fixture.orderId, status: "confirmed" });
  await orderStaff.mutation(api.orders.updateStatus, { orderId: fixture.orderId, status: "preparing" });
  await orderStaff.mutation(api.orders.updateStatus, { orderId: fixture.orderId, status: "ready" });
  await expect(orderStaff.mutation(api.orders.updateStatus, { orderId: fixture.orderId, status: "out_for_delivery" })).rejects.toThrow();
  await expect(orderStaff.mutation(api.orders.assignDriver, { orderId: fixture.orderId, driverUserId: fixture.driverId })).rejects.toThrow();
  await expect(orderStaff.mutation(api.orders.setPaymentStatus, { orderId: fixture.orderId, status: "paid" })).rejects.toThrow();
  const timeline = await t.run((ctx) => ctx.db.query("orderEvents").withIndex("by_order", (q) => q.eq("orderId", fixture.orderId)).take(10));
  expect(timeline.filter((event) => event.status === "confirmed")).toHaveLength(1);
});

test("managers can reject only a newly received order and persist its customer timeline atomically", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const managerId = await user(ctx, "manager@example.test");
    const staffId = await user(ctx, "staff@example.test");
    const storeId = await store(ctx, "Store A");
    const customerId = await ctx.db.insert("customers", { name: "Customer", phone: "+26650000003", normalizedPhone: "+26650000003", orderCount: 1, lifetimeSpend: 15, lastOrderAt: Date.now() });
    await ctx.db.insert("memberships", { userId: managerId, storeId, role: "store_manager", status: "active", grantedAt: Date.now() });
    await ctx.db.insert("memberships", { userId: staffId, storeId, role: "order_staff", status: "active", grantedAt: Date.now() });
    const orderId = await ctx.db.insert("orders", {
      storeId, storeName: "Store A", orderNumber: "REE-REJECT-1", checkoutId: "CHECKOUT-REJECT-1", customerId,
      customer: { name: "Customer", phone: "+26650000003" }, items: [], destination: { area: "Maseru", address: "Main street" },
      payment: { method: "cash_on_delivery", status: "unpaid" }, subtotal: 10, deliveryFee: 5, total: 15,
      status: "received", createdAt: Date.now(), estimatedDeliveryAt: Date.now() + 1000,
    });
    return { managerId, staffId, orderId };
  });
  const manager = t.withIdentity(identity(fixture.managerId, "manager@example.test"));
  const staff = t.withIdentity(identity(fixture.staffId, "staff@example.test"));
  await expect(staff.mutation(api.orders.updateStatus, { orderId: fixture.orderId, status: "rejected" })).rejects.toThrow();
  await manager.mutation(api.orders.updateStatus, { orderId: fixture.orderId, status: "rejected" });
  await expect(manager.mutation(api.orders.updateStatus, { orderId: fixture.orderId, status: "confirmed" })).rejects.toThrow();
  const persisted = await t.run(async (ctx) => ({
    order: await ctx.db.get(fixture.orderId),
    event: await ctx.db.query("orderEvents").withIndex("by_order", (q) => q.eq("orderId", fixture.orderId)).first(),
  }));
  expect(persisted.order?.status).toBe("rejected");
  expect(persisted.event).toMatchObject({ eventType: "OrderStatusChanged", status: "rejected", actorId: fixture.managerId, version: 1 });
});

test("authenticated customer checkout splits multiple stores and rejects guests", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const customerId = await user(ctx, "customer@example.test");
    const storeA = await store(ctx, "Store A");
    const storeB = await store(ctx, "Store B");
    await seedSettings(ctx, storeA);
    await seedSettings(ctx, storeB);
    const productA = await seedProduct(ctx, storeA, "Apples");
    const productB = await seedProduct(ctx, storeB, "Bread");
    const today = new Date().toISOString().slice(0, 10);
    await ctx.db.insert("promotions", {
      storeId: storeA, name: "Five maloti off", type: "coupon", value: 5,
      code: "SAVE5", startDate: today, endDate: today, active: true,
    });
    return { customerId, storeA, storeB, productA, productB };
  });

  const checkout = t.withIdentity(identity(fixture.customerId, "customer@example.test"));
  const customer = { name: "Customer", phone: "+26650000004", email: "customer@example.test" };
  await expect(t.mutation(api.orders.placeGuestOrder, {
    checkoutId: "guest-checkout-blocked-001", customer,
    destination: { area: "Maseru", address: "Main street" }, paymentMethod: "cash_on_delivery",
    items: [{ productId: fixture.productA, quantity: 1 }],
  })).rejects.toThrow(/sign in or create a customer account/i);
  const beforeAuthentication = await t.run(async (ctx) => ({
    orders: await ctx.db.query("orders").take(10),
    checkouts: await ctx.db.query("checkouts").take(10),
  }));
  expect(beforeAuthentication.orders).toHaveLength(0);
  expect(beforeAuthentication.checkouts).toHaveLength(0);

  const receipt = await checkout.mutation(api.orders.placeGuestOrder, {
    checkoutId: "multi-store-checkout-001", customer,
    destination: { area: "Maseru", address: "Main street" }, paymentMethod: "cash_on_delivery", couponCode: "save5",
    items: [{ productId: fixture.productA, quantity: 2 }, { productId: fixture.productB, quantity: 1 }],
  });

  const retry = await checkout.mutation(api.orders.placeGuestOrder, {
    checkoutId: "multi-store-checkout-001", customer,
    destination: { area: "Maseru", address: "Main street" }, paymentMethod: "cash_on_delivery", couponCode: "save5",
    items: [{ productId: fixture.productA, quantity: 2 }, { productId: fixture.productB, quantity: 1 }],
  });

  expect(receipt.storeCount).toBe(2);
  expect(retry.orders.map((order) => order.orderId)).toEqual(receipt.orders.map((order) => order.orderId));
  expect(retry.total).toBe(receipt.total);
  expect(receipt.orders.map((order) => order.storeId).sort()).toEqual([fixture.storeA, fixture.storeB].sort());
  expect(receipt.total).toBe(35);
  expect(receipt.orders.find((order) => order.storeId === fixture.storeA)).toMatchObject({ subtotal: 20, discount: 5, total: 20 });
  expect(receipt.orders.find((order) => order.storeId === fixture.storeB)).toMatchObject({ subtotal: 10, discount: 0, total: 15 });
  await expect(checkout.mutation(api.orders.placeGuestOrder, {
    checkoutId: "invalid-coupon-checkout-01", customer,
    destination: { area: "Maseru", address: "Main street" }, paymentMethod: "cash_on_delivery", couponCode: "NOTREAL",
    items: [{ productId: fixture.productA, quantity: 1 }],
  })).rejects.toThrow(/coupon is invalid/i);
  await expect(checkout.mutation(api.orders.placeGuestOrder, {
    checkoutId: "unconfigured-card-checkout", customer,
    destination: { area: "Maseru", address: "Main street" }, paymentMethod: "card",
    items: [{ productId: fixture.productA, quantity: 1 }],
  })).rejects.toThrow(/card payments are not configured/i);
  const persisted = await t.run(async (ctx) => ({
    orders: await ctx.db.query("orders").withIndex("by_checkout_id", (q) => q.eq("checkoutId", "multi-store-checkout-001")).take(10),
    checkout: await ctx.db.query("checkouts").withIndex("by_checkout_id", (q) => q.eq("checkoutId", "multi-store-checkout-001")).unique(),
    events: await ctx.db.query("domainEvents").withIndex("by_store_time", (q) => q.eq("storeId", fixture.storeA)).take(10),
    productA: await ctx.db.get(fixture.productA),
    productB: await ctx.db.get(fixture.productB),
  }));
  expect(persisted.orders).toHaveLength(2);
  expect(persisted.checkout?.storeCount).toBe(2);
  expect(persisted.events.filter((event) => event.eventType === "OrderPlaced")).toHaveLength(1);
  expect(persisted.productA?.stock).toBe(8);
  expect(persisted.productB?.stock).toBe(9);
});

test("multi-store recovery keeps sibling orders intact and checkout retries do not duplicate", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const customerId = await user(ctx, "recovery-customer@example.test");
    const managerId = await user(ctx, "recovery-manager@example.test");
    const storeA = await store(ctx, "Recovery Store A");
    const storeB = await store(ctx, "Recovery Store B");
    await seedSettings(ctx, storeA);
    await seedSettings(ctx, storeB);
    const productA = await seedProduct(ctx, storeA, "Recovery apples");
    const productB = await seedProduct(ctx, storeB, "Recovery bread");
    await ctx.db.insert("memberships", { userId: managerId, storeId: storeA, role: "store_manager", status: "active", grantedAt: Date.now() });
    return { customerId, managerId, storeA, storeB, productA, productB };
  });
  const checkout = t.withIdentity(identity(fixture.customerId, "recovery-customer@example.test"));
  const manager = t.withIdentity(identity(fixture.managerId, "recovery-manager@example.test"));
  const customer = { name: "Recovery Customer", phone: "+26650000005", email: "recovery-customer@example.test" };
  const checkoutArgs = (checkoutId: string) => ({
    checkoutId, customer,
    destination: { area: "Maseru", address: "Recovery test address" }, paymentMethod: "cash_on_delivery" as const,
    items: [{ productId: fixture.productA, quantity: 1 }, { productId: fixture.productB, quantity: 1 }],
  });

  await t.run(async (ctx) => ctx.db.patch(fixture.productA, { available: false }));
  await expect(checkout.mutation(api.orders.placeGuestOrder, checkoutArgs("recovery-unavailable-01")))
    .rejects.toThrow(/products are no longer available/i);
  let state = await t.run(async (ctx) => ({
    orders: await ctx.db.query("orders").take(10),
    checkouts: await ctx.db.query("checkouts").take(10),
    productA: await ctx.db.get(fixture.productA),
    productB: await ctx.db.get(fixture.productB),
  }));
  expect(state.orders).toHaveLength(0);
  expect(state.checkouts).toHaveLength(0);
  expect(state.productA?.stock).toBe(10);
  expect(state.productB?.stock).toBe(10);

  await t.run(async (ctx) => {
    await ctx.db.patch(fixture.productA, { available: true });
    await ctx.db.patch(fixture.storeB, { enabled: false });
  });
  await expect(checkout.mutation(api.orders.placeGuestOrder, checkoutArgs("recovery-closed-store-01")))
    .rejects.toThrow(/stores are no longer available/i);
  state = await t.run(async (ctx) => ({
    orders: await ctx.db.query("orders").take(10),
    checkouts: await ctx.db.query("checkouts").take(10),
    productA: await ctx.db.get(fixture.productA),
    productB: await ctx.db.get(fixture.productB),
  }));
  expect(state.orders).toHaveLength(0);
  expect(state.checkouts).toHaveLength(0);
  expect(state.productA?.stock).toBe(10);
  expect(state.productB?.stock).toBe(10);

  await t.run(async (ctx) => ctx.db.patch(fixture.storeB, { enabled: true }));
  const placed = await checkout.mutation(api.orders.placeGuestOrder, checkoutArgs("recovery-multistore-01"));
  const uncertainRetry = await checkout.mutation(api.orders.placeGuestOrder, checkoutArgs("recovery-multistore-01"));
  expect(uncertainRetry.orders.map((order) => order.orderId)).toEqual(placed.orders.map((order) => order.orderId));
  expect(uncertainRetry.total).toBe(placed.total);

  const rejectedOrder = placed.orders.find((order) => order.storeId === fixture.storeA);
  const siblingOrder = placed.orders.find((order) => order.storeId === fixture.storeB);
  expect(rejectedOrder).toBeTruthy();
  expect(siblingOrder).toBeTruthy();
  await manager.mutation(api.orders.updateStatus, { orderId: rejectedOrder!.orderId, status: "rejected" });
  const retryAfterRejection = await checkout.mutation(api.orders.placeGuestOrder, checkoutArgs("recovery-multistore-01"));
  expect(retryAfterRejection.orders.map((order) => order.orderId)).toEqual(placed.orders.map((order) => order.orderId));

  state = await t.run(async (ctx) => ({
    orders: await ctx.db.query("orders").withIndex("by_checkout_id", (q) => q.eq("checkoutId", "recovery-multistore-01")).take(10),
    checkout: await ctx.db.query("checkouts").withIndex("by_checkout_id", (q) => q.eq("checkoutId", "recovery-multistore-01")).unique(),
  }));
  expect(state.orders).toHaveLength(2);
  expect(state.checkout?.orderIds).toEqual(placed.orders.map((order) => order.orderId));
  expect(state.orders.find((order) => order.storeId === fixture.storeA)?.status).toBe("rejected");
  expect(state.orders.find((order) => order.storeId === fixture.storeB)).toMatchObject({
    status: "received", total: siblingOrder!.total, items: siblingOrder!.items,
  });
});

test("multi-store staff handoff stays scoped and customers see both delivered child orders", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const customerUserId = await user(ctx, "customer@example.test");
    const managerAId = await user(ctx, "manager-a@example.test");
    const managerBId = await user(ctx, "manager-b@example.test");
    const staffAId = await user(ctx, "staff-a@example.test");
    const staffBId = await user(ctx, "staff-b@example.test");
    const driverAId = await user(ctx, "driver-a@example.test");
    const driverBId = await user(ctx, "driver-b@example.test");
    const otherDriverId = await user(ctx, "other-driver@example.test");
    const storeA = await store(ctx, "Store A");
    const storeB = await store(ctx, "Store B");
    const customerId = await ctx.db.insert("customers", {
      userId: customerUserId, name: "Customer", phone: "+26650000004", normalizedPhone: "+26650000004",
      orderCount: 2, lifetimeSpend: 30, lastOrderAt: Date.now(),
    });
    for (const [userId, storeId, role] of [
      [managerAId, storeA, "store_manager"], [staffAId, storeA, "order_staff"], [driverAId, storeA, "driver"],
      [managerBId, storeB, "store_manager"], [staffBId, storeB, "order_staff"], [driverBId, storeB, "driver"],
      [otherDriverId, storeA, "driver"],
    ] as const) {
      await ctx.db.insert("memberships", { userId, storeId, role, status: "active", grantedAt: Date.now() });
    }
    const makeOrder = async (storeId: Id<"stores">, storeName: string, orderNumber: string) => await ctx.db.insert("orders", {
      storeId, storeName, orderNumber, checkoutId: "MULTI-STORE-CHECKOUT", customerId, customerUserId,
      customer: { name: "Customer", phone: "+26650000004" }, items: [],
      destination: { area: "Maseru", address: "Main street" }, payment: { method: "cash_on_delivery", status: "unpaid" },
      subtotal: 10, deliveryFee: 5, total: 15, status: "received", createdAt: Date.now(), estimatedDeliveryAt: Date.now() + 1000,
    });
    const orderAId = await makeOrder(storeA, "Store A", "REE-CHILD-A");
    const orderBId = await makeOrder(storeB, "Store B", "REE-CHILD-B");
    return { customerUserId, managerAId, managerBId, staffAId, staffBId, driverAId, driverBId, otherDriverId, storeA, storeB, orderAId, orderBId };
  });
  const managerA = t.withIdentity(identity(fixture.managerAId, "manager-a@example.test"));
  const managerB = t.withIdentity(identity(fixture.managerBId, "manager-b@example.test"));
  const staffA = t.withIdentity(identity(fixture.staffAId, "staff-a@example.test"));
  const staffB = t.withIdentity(identity(fixture.staffBId, "staff-b@example.test"));
  const driverA = t.withIdentity(identity(fixture.driverAId, "driver-a@example.test"));
  const driverB = t.withIdentity(identity(fixture.driverBId, "driver-b@example.test"));
  const otherDriver = t.withIdentity(identity(fixture.otherDriverId, "other-driver@example.test"));

  const managerAOrders = await managerA.query(api.orders.listForStaff, {});
  const managerBOrders = await managerB.query(api.orders.listForStaff, {});
  expect(managerAOrders?.orders.map((order) => order._id)).toEqual([fixture.orderAId]);
  expect(managerBOrders?.orders.map((order) => order._id)).toEqual([fixture.orderBId]);
  await expect(managerA.mutation(api.orders.assignPreparationStaff, { orderId: fixture.orderBId, staffUserId: fixture.staffAId })).rejects.toThrow();
  await expect(managerA.mutation(api.orders.assignDriver, { orderId: fixture.orderBId, driverUserId: fixture.driverAId })).rejects.toThrow();
  await managerA.mutation(api.orders.assignPreparationStaff, { orderId: fixture.orderAId, staffUserId: fixture.staffAId });
  await managerB.mutation(api.orders.assignPreparationStaff, { orderId: fixture.orderBId, staffUserId: fixture.staffBId });
  const staffAOrders = await staffA.query(api.orders.listForStaff, {});
  const staffBOrders = await staffB.query(api.orders.listForStaff, {});
  expect(staffAOrders?.orders.map((order) => order._id)).toEqual([fixture.orderAId]);
  expect(staffBOrders?.orders.map((order) => order._id)).toEqual([fixture.orderBId]);
  await expect(staffA.mutation(api.orders.updateStatus, { orderId: fixture.orderBId, status: "confirmed" })).rejects.toThrow();
  await expect(managerA.mutation(api.orders.assignDriver, { orderId: fixture.orderAId, driverUserId: fixture.driverBId })).rejects.toThrow(/active driver for this store/i);

  for (const [manager, staff, driver, orderId] of [
    [managerA, staffA, driverA, fixture.orderAId], [managerB, staffB, driverB, fixture.orderBId],
  ] as const) {
    await staff.mutation(api.orders.updateStatus, { orderId, status: "confirmed" });
    await staff.mutation(api.orders.updateStatus, { orderId, status: "preparing" });
    await staff.mutation(api.orders.updateStatus, { orderId, status: "ready" });
    await manager.mutation(api.orders.assignDriver, { orderId, driverUserId: orderId === fixture.orderAId ? fixture.driverAId : fixture.driverBId });
    await expect(driver.mutation(api.orders.updateStatus, { orderId, status: "delivered" })).rejects.toThrow();
  }
  expect((await driverA.query(api.orders.myAssigned, {}))?.orders.map((order) => order._id)).toEqual([fixture.orderAId]);
  expect((await driverB.query(api.orders.myAssigned, {}))?.orders.map((order) => order._id)).toEqual([fixture.orderBId]);
  await expect(otherDriver.mutation(api.orders.updateStatus, { orderId: fixture.orderAId, status: "out_for_delivery" })).rejects.toThrow();
  await expect(driverA.mutation(api.orders.updateStatus, { orderId: fixture.orderBId, status: "out_for_delivery" })).rejects.toThrow();
  for (const [driver, orderId] of [[driverA, fixture.orderAId], [driverB, fixture.orderBId]] as const) {
    await driver.mutation(api.orders.updateStatus, { orderId, status: "out_for_delivery" });
    await driver.mutation(api.orders.updateStatus, { orderId, status: "delivered" });
  }
  const customer = t.withIdentity(identity(fixture.customerUserId, "customer@example.test"));
  const customerOrders = await customer.query(api.customers.myOrders, {});
  expect(customerOrders).toHaveLength(2);
  expect(customerOrders.map((order) => order.status).sort()).toEqual(["delivered", "delivered"]);
  expect(customerOrders.map((order) => order.timeline.map((event) => event.status))).toEqual([
    ["confirmed", "preparing", "ready", "out_for_delivery", "delivered"],
    ["confirmed", "preparing", "ready", "out_for_delivery", "delivered"],
  ]);
});
