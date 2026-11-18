/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function setup(ctx: MutationCtx) {
  const ownerId = await ctx.db.insert("users", { email: "basket-owner@example.test", emailVerificationTime: Date.now() });
  const otherId = await ctx.db.insert("users", { email: "other-customer@example.test", emailVerificationTime: Date.now() });
  const storeId = await ctx.db.insert("stores", {
    slug: "basket-store", name: "Basket Store", tagline: "Local groceries", phone: "+26622220000",
    whatsapp: "+26622220000", address: "Maseru", openingHours: "08:00–18:00", enabled: true, sortOrder: 1,
  });
  const categoryId = await ctx.db.insert("categories", {
    storeId, slug: "groceries", name: "Groceries", emoji: "🛒", accent: "green", enabled: true, sortOrder: 1,
  });
  const productId = await ctx.db.insert("products", {
    storeId, slug: "maize-meal", name: "Maize Meal", description: "10 kg bag", categoryId,
    price: 40, unit: "pack", soldByWeight: false, stock: 10, lowStockThreshold: 2,
    available: true, popularity: 0, emoji: "🌽",
  });
  return { ownerId, otherId, storeId, categoryId, productId };
}

function identity(userId: Id<"users">, email: string) {
  return { subject: String(userId), email, issuer: "https://auth.example.test", tokenIdentifier: `https://auth.example.test|${userId}` };
}

test("saved baskets persist current pricing and block unavailable stock without changing merchant", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(setup);
  const customer = t.withIdentity(identity(fixture.ownerId, "basket-owner@example.test"));
  const basketId = await customer.mutation(api.baskets.createFromCart, {
    name: "Weekly Essentials", items: [{ productId: fixture.productId, quantity: 2 }],
  });

  await t.run(async (ctx) => {
    await ctx.db.patch(fixture.productId, { price: 45, stock: 1 });
  });
  const baskets = await customer.query(api.baskets.listMine, {});
  expect(baskets).toHaveLength(1);
  const basket = baskets[0]!;
  expect(basket.name).toBe("Weekly Essentials");
  expect(basket.items[0]).toMatchObject({
    storeId: fixture.storeId,
    unitPriceAtSave: 40,
    currentPrice: 45,
    reason: "insufficient_stock",
  });
  const preview = await customer.mutation(api.baskets.addAvailableToCart, { basketId });
  expect(preview.added).toHaveLength(0);
  expect(preview.blocked[0]?.reason).toContain("Only 1 items");
});

test("basket functions enforce customer ownership and retain order product snapshots", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const ids = await setup(ctx);
    const customerId = await ctx.db.insert("customers", {
      userId: ids.ownerId, name: "Basket Owner", normalizedPhone: "+26650000001", phone: "+26650000001",
      orderCount: 1, lifetimeSpend: 80, lastOrderAt: Date.now(),
    });
    const orderId = await ctx.db.insert("orders", {
      storeId: ids.storeId, storeName: "Basket Store", orderNumber: "REE-BASKET-ORDER", checkoutId: "basket-checkout-001",
      customerId, customerUserId: ids.ownerId, customer: { name: "Basket Owner", phone: "+26650000001" },
      items: [{ productId: ids.productId, name: "Maize Meal 10kg", unit: "pack", emoji: "🌽", unitPrice: 38, quantity: 2, lineTotal: 76, soldByWeight: false }],
      destination: { area: "Maseru", address: "Home" }, payment: { method: "cash_on_delivery", status: "unpaid" },
      subtotal: 76, deliveryFee: 4, total: 80, status: "delivered", createdAt: Date.now(), estimatedDeliveryAt: Date.now(),
    });
    return { ...ids, orderId };
  });
  const customer = t.withIdentity(identity(fixture.ownerId, "basket-owner@example.test"));
  const other = t.withIdentity(identity(fixture.otherId, "other-customer@example.test"));
  const reorderPreview = await customer.mutation(api.baskets.previewOrderReorder, { orderId: fixture.orderId });
  expect(reorderPreview.added).toMatchObject([{ name: "Maize Meal", quantity: 2, priceChanged: true }]);
  await expect(other.mutation(api.baskets.previewOrderReorder, { orderId: fixture.orderId })).rejects.toThrow("own purchases");
  await t.run(async (ctx) => { await ctx.db.delete(fixture.productId); });
  const unavailableReorder = await customer.mutation(api.baskets.previewOrderReorder, { orderId: fixture.orderId });
  expect(unavailableReorder.added).toHaveLength(0);
  expect(unavailableReorder.blocked[0]?.reason).toContain("no longer listed");
  const basketId = await customer.mutation(api.baskets.createFromOrder, { name: "Past Shop", orderId: fixture.orderId });

  await expect(other.query(api.baskets.listMine, {})).resolves.toHaveLength(0);
  await expect(other.mutation(api.baskets.rename, { basketId, name: "Stolen" })).rejects.toThrow("not found");
  await expect(other.mutation(api.baskets.remove, { basketId })).rejects.toThrow("not found");
  const baskets = await customer.query(api.baskets.listMine, {});
  expect(baskets).toHaveLength(1);
  const basket = baskets[0]!;
  expect(basket.items[0]).toMatchObject({ name: "Maize Meal 10kg", unitPriceAtSave: 38, storeId: fixture.storeId, reason: "discontinued" });
});

test("basket quantity validation follows weight and whole-unit rules", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const ids = await setup(ctx);
    const weightProductId = await ctx.db.insert("products", {
      storeId: ids.storeId, slug: "tomatoes", name: "Tomatoes", description: "Fresh tomatoes", categoryId: ids.categoryId,
      price: 12, unit: "kg", soldByWeight: true, weightOptions: [0.5, 1, 2], stock: 20, lowStockThreshold: 2,
      available: true, popularity: 0, emoji: "🍅",
    });
    return { ...ids, weightProductId };
  });
  const customer = t.withIdentity(identity(fixture.ownerId, "basket-owner@example.test"));
  const basketId = await customer.mutation(api.baskets.createEmpty, { name: "Breakfast Essentials" });
  await customer.mutation(api.baskets.setItem, { basketId, productId: fixture.weightProductId, quantity: 0.5 });
  await expect(customer.mutation(api.baskets.setItem, { basketId, productId: fixture.productId, quantity: 1.5 })).rejects.toThrow("whole-number");
  const baskets = await customer.query(api.baskets.listMine, {});
  expect(baskets).toHaveLength(1);
  const basket = baskets[0]!;
  expect(basket.items).toHaveLength(1);
  expect(basket.items[0]).toMatchObject({ soldByWeight: true, quantity: 0.5, reason: null });
});

test("saved products are not silently reassigned when their catalogue store changes", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const ids = await setup(ctx);
    const otherStoreId = await ctx.db.insert("stores", {
      slug: "other-basket-store", name: "Other Store", tagline: "Another shop", phone: "+26622220001",
      whatsapp: "+26622220001", address: "Maseru", openingHours: "08:00–18:00", enabled: true, sortOrder: 2,
    });
    return { ...ids, otherStoreId };
  });
  const customer = t.withIdentity(identity(fixture.ownerId, "basket-owner@example.test"));
  const basketId = await customer.mutation(api.baskets.createFromCart, {
    name: "Original store", items: [{ productId: fixture.productId, quantity: 1 }],
  });
  await t.run(async (ctx) => { await ctx.db.patch(fixture.productId, { storeId: fixture.otherStoreId }); });

  const [basket] = await customer.query(api.baskets.listMine, {});
  expect(basket!.items[0]).toMatchObject({ storeId: fixture.storeId, storeName: "Basket Store", reason: "merchant_changed" });
  const result = await customer.mutation(api.baskets.addAvailableToCart, { basketId });
  expect(result.added).toHaveLength(0);
  expect(result.blocked[0]?.reason).toContain("original store");
});
