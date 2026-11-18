import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const MAX_BASKETS_PER_CUSTOMER = 20;
const MAX_ITEMS_PER_BASKET = 100;
const MAX_QUANTITY = 500;

const basketLineInput = v.object({
  productId: v.id("products"),
  quantity: v.number(),
});

function cleanName(name: string) {
  const cleaned = name.trim();
  if (!cleaned || cleaned.length > 60) {
    throw new ConvexError("Enter a basket name up to 60 characters long.");
  }
  return cleaned;
}

function cleanQuantity(quantity: number, soldByWeight: boolean) {
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > MAX_QUANTITY) {
    throw new ConvexError("Enter a quantity greater than zero and no more than 500.");
  }
  if (!soldByWeight && !Number.isInteger(quantity)) {
    throw new ConvexError("This product needs a whole-number quantity.");
  }
  if (soldByWeight && Math.abs(quantity * 2 - Math.round(quantity * 2)) > 0.000001) {
    throw new ConvexError("Choose weight in 0.5 kg increments.");
  }
  return Number(quantity.toFixed(3));
}

async function findOwnedBasket(ctx: MutationCtx, basketId: Id<"savedBaskets">, userId: Id<"users">) {
  const basket = await ctx.db.get(basketId);
  if (!basket || basket.ownerUserId !== userId) throw new ConvexError("Saved basket not found.");
  return basket;
}

async function insertBasketItems(
  ctx: MutationCtx,
  ownerUserId: Id<"users">,
  basketId: Id<"savedBaskets">,
  lines: Array<{ productId: Id<"products">; quantity: number }>,
  now: number,
) {
  if (lines.length > MAX_ITEMS_PER_BASKET) {
    throw new ConvexError(`A basket can contain up to ${MAX_ITEMS_PER_BASKET} products.`);
  }
  const seen = new Set<string>();
  for (const line of lines) {
    const key = String(line.productId);
    if (seen.has(key)) throw new ConvexError("A product can only appear once in a saved basket.");
    seen.add(key);
    const product = await ctx.db.get(line.productId);
    if (!product) throw new ConvexError("A product in this basket is no longer listed.");
    const quantity = cleanQuantity(line.quantity, product.soldByWeight);
    await ctx.db.insert("savedBasketItems", {
      ownerUserId,
      basketId,
      productId: product._id,
      storeId: product.storeId,
      productNameAtSave: product.name,
      unitAtSave: product.unit,
      emojiAtSave: product.emoji,
      soldByWeightAtSave: product.soldByWeight,
      unitPriceAtSave: product.promoPrice ?? product.price,
      quantity,
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function createBasket(
  ctx: MutationCtx,
  ownerUserId: Id<"users">,
  name: string,
  lines: Array<{ productId: Id<"products">; quantity: number }>,
) {
  const baskets = await ctx.db
    .query("savedBaskets")
    .withIndex("by_owner_updated", (q) => q.eq("ownerUserId", ownerUserId))
    .take(MAX_BASKETS_PER_CUSTOMER);
  if (baskets.length >= MAX_BASKETS_PER_CUSTOMER) {
    throw new ConvexError(`You can save up to ${MAX_BASKETS_PER_CUSTOMER} baskets.`);
  }
  const now = Date.now();
  const basketId = await ctx.db.insert("savedBaskets", {
    ownerUserId,
    name: cleanName(name),
    createdAt: now,
    updatedAt: now,
  });
  await insertBasketItems(ctx, ownerUserId, basketId, lines, now);
  return basketId;
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to view saved baskets.");
    const baskets = await ctx.db
      .query("savedBaskets")
      .withIndex("by_owner_updated", (q) => q.eq("ownerUserId", userId))
      .order("desc")
      .take(MAX_BASKETS_PER_CUSTOMER);
    return await Promise.all(baskets.map(async (basket) => {
      const rows = await ctx.db
        .query("savedBasketItems")
        .withIndex("by_owner_basket", (q) => q.eq("ownerUserId", userId).eq("basketId", basket._id))
        .take(MAX_ITEMS_PER_BASKET);
      const items = await Promise.all(rows.map(async (row) => {
        const product = await ctx.db.get(row.productId);
        const store = await ctx.db.get(row.storeId);
        const category = product ? await ctx.db.get(product.categoryId) : null;
        const productMatchesStore = product?.storeId === row.storeId;
        const currentPrice = product && productMatchesStore ? product.promoPrice ?? product.price : null;
        const reason = !product
          ? "discontinued"
          : !productMatchesStore
            ? "merchant_changed"
            : product.unit !== row.unitAtSave || product.soldByWeight !== row.soldByWeightAtSave
              ? "product_changed"
            : !store?.enabled
              ? "store_unavailable"
              : !category?.enabled
                ? "category_unavailable"
                : !product.available
                  ? "unavailable"
                  : product.stock < row.quantity
                    ? "insufficient_stock"
                    : null;
        return {
          id: row._id,
          productId: row.productId,
          storeId: row.storeId,
          storeName: store?.name ?? "Original store unavailable",
          name: row.productNameAtSave,
          emoji: row.emojiAtSave,
          unit: row.unitAtSave,
          soldByWeight: row.soldByWeightAtSave,
          quantity: row.quantity,
          unitPriceAtSave: row.unitPriceAtSave,
          currentPrice,
          availableStock: productMatchesStore && product?.available && store?.enabled ? product.stock : 0,
          reason,
        };
      }));
      return {
        _id: basket._id,
        name: basket.name,
        createdAt: basket.createdAt,
        updatedAt: basket.updatedAt,
        items,
      };
    }));
  },
});

export const createEmpty = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to save a basket.");
    return await createBasket(ctx, userId, name, []);
  },
});

export const createFromCart = mutation({
  args: { name: v.string(), items: v.array(basketLineInput) },
  handler: async (ctx, { name, items }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to save a basket.");
    if (!items.length) throw new ConvexError("Add products to your cart before saving a basket.");
    return await createBasket(ctx, userId, name, items);
  },
});

export const createFromOrder = mutation({
  args: { name: v.string(), orderId: v.id("orders") },
  handler: async (ctx, { name, orderId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to save a basket.");
    const order = await ctx.db.get(orderId);
    if (!order) throw new ConvexError("Order not found.");
    const customer = await ctx.db.get(order.customerId);
    if (order.customerUserId !== userId && customer?.userId !== userId) {
      throw new ConvexError("You can only save products from your own orders.");
    }
    if (order.items.length > MAX_ITEMS_PER_BASKET) {
      throw new ConvexError(`A basket can contain up to ${MAX_ITEMS_PER_BASKET} products.`);
    }
    const basketId = await createBasket(ctx, userId, name, []);
    const now = Date.now();
    for (const item of order.items) {
      await ctx.db.insert("savedBasketItems", {
        ownerUserId: userId,
        basketId,
        productId: item.productId,
        storeId: order.storeId,
        productNameAtSave: item.name,
        unitAtSave: item.unit,
        emojiAtSave: item.emoji,
        soldByWeightAtSave: item.soldByWeight,
        unitPriceAtSave: item.unitPrice,
        quantity: cleanQuantity(item.quantity, item.soldByWeight),
        createdAt: now,
        updatedAt: now,
      });
    }
    return basketId;
  },
});

export const previewOrderReorder = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to reorder a past purchase.");
    const order = await ctx.db.get(orderId);
    if (!order) throw new ConvexError("Order not found.");
    const customer = await ctx.db.get(order.customerId);
    if (order.customerUserId !== userId && customer?.userId !== userId) {
      throw new ConvexError("You can only reorder your own purchases.");
    }

    const store = await ctx.db.get(order.storeId);
    const added = [];
    const blocked: Array<{ name: string; reason: string }> = [];
    for (const line of order.items) {
      const product = await ctx.db.get(line.productId);
      const category = product ? await ctx.db.get(product.categoryId) : null;
      const reason = !product
        ? "This product is no longer listed."
        : product.storeId !== order.storeId
          ? "This product has moved from its original store."
          : product.unit !== line.unit || product.soldByWeight !== line.soldByWeight
            ? "This product's quantity or weight options have changed."
            : !store?.enabled
              ? "The original store is not taking orders."
              : !category?.enabled
                ? "This product's category is unavailable."
                : !product.available
                  ? "This product is currently unavailable."
                  : product.stock < line.quantity
                    ? `Only ${product.stock} ${product.soldByWeight ? "kg" : "items"} are currently available.`
                    : null;
      if (reason || !product || !store) {
        blocked.push({ name: line.name, reason: reason ?? "Unavailable." });
        continue;
      }
      added.push({
        productId: product._id,
        storeId: store._id,
        storeName: store.name,
        slug: product.slug,
        name: product.name,
        description: product.description,
        categoryId: product.categoryId,
        price: product.price,
        ...(product.promoPrice === undefined ? {} : { promoPrice: product.promoPrice }),
        unit: product.unit,
        soldByWeight: product.soldByWeight,
        ...(product.weightOptions === undefined ? {} : { weightOptions: product.weightOptions }),
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        available: product.available,
        popularity: product.popularity,
        createdAt: new Date(product._creationTime).toISOString(),
        emoji: product.emoji,
        ...(product.variants === undefined ? {} : { variants: product.variants }),
        quantity: line.quantity,
        priceChanged: (product.promoPrice ?? product.price) !== line.unitPrice,
      });
    }
    return { added, blocked };
  },
});

export const rename = mutation({
  args: { basketId: v.id("savedBaskets"), name: v.string() },
  handler: async (ctx, { basketId, name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to update saved baskets.");
    await findOwnedBasket(ctx, basketId, userId);
    await ctx.db.patch(basketId, { name: cleanName(name), updatedAt: Date.now() });
    return null;
  },
});

export const remove = mutation({
  args: { basketId: v.id("savedBaskets") },
  handler: async (ctx, { basketId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to remove saved baskets.");
    await findOwnedBasket(ctx, basketId, userId);
    const rows = await ctx.db
      .query("savedBasketItems")
      .withIndex("by_owner_basket", (q) => q.eq("ownerUserId", userId).eq("basketId", basketId))
      .take(MAX_ITEMS_PER_BASKET);
    for (const row of rows) await ctx.db.delete(row._id);
    await ctx.db.delete(basketId);
    return null;
  },
});

export const setItem = mutation({
  args: { basketId: v.id("savedBaskets"), productId: v.id("products"), quantity: v.number() },
  handler: async (ctx, { basketId, productId, quantity }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to edit saved baskets.");
    const basket = await findOwnedBasket(ctx, basketId, userId);
    const product = await ctx.db.get(productId);
    if (!product) throw new ConvexError("This product is no longer listed.");
    const store = await ctx.db.get(product.storeId);
    const category = await ctx.db.get(product.categoryId);
    if (!store?.enabled || !category?.enabled || !product.available) {
      throw new ConvexError("Choose an available product from an active store.");
    }
    const clean = cleanQuantity(quantity, product.soldByWeight);
    const existing = await ctx.db
      .query("savedBasketItems")
      .withIndex("by_basket_product", (q) => q.eq("basketId", basketId).eq("productId", productId))
      .unique();
    if (existing && (existing.ownerUserId !== userId || existing.storeId !== product.storeId)) {
      throw new ConvexError("This product no longer belongs to its original store.");
    }
    if (!existing) {
      const rows = await ctx.db
        .query("savedBasketItems")
        .withIndex("by_owner_basket", (q) => q.eq("ownerUserId", userId).eq("basketId", basketId))
        .take(MAX_ITEMS_PER_BASKET);
      if (rows.length >= MAX_ITEMS_PER_BASKET) {
        throw new ConvexError(`A basket can contain up to ${MAX_ITEMS_PER_BASKET} products.`);
      }
    }
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { quantity: clean, updatedAt: now });
    } else {
      await ctx.db.insert("savedBasketItems", {
        ownerUserId: userId,
        basketId,
        productId,
        storeId: product.storeId,
        productNameAtSave: product.name,
        unitAtSave: product.unit,
        emojiAtSave: product.emoji,
        soldByWeightAtSave: product.soldByWeight,
        unitPriceAtSave: product.promoPrice ?? product.price,
        quantity: clean,
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.patch(basket._id, { updatedAt: now });
    return null;
  },
});

export const removeItem = mutation({
  args: { basketId: v.id("savedBaskets"), itemId: v.id("savedBasketItems") },
  handler: async (ctx, { basketId, itemId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to edit saved baskets.");
    const basket = await findOwnedBasket(ctx, basketId, userId);
    const item = await ctx.db.get(itemId);
    if (!item || item.ownerUserId !== userId || item.basketId !== basketId) {
      throw new ConvexError("Saved product not found.");
    }
    await ctx.db.delete(itemId);
    await ctx.db.patch(basket._id, { updatedAt: Date.now() });
    return null;
  },
});

export const addAvailableToCart = mutation({
  args: { basketId: v.id("savedBaskets") },
  handler: async (ctx, { basketId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to use saved baskets.");
    await findOwnedBasket(ctx, basketId, userId);
    const rows = await ctx.db
      .query("savedBasketItems")
      .withIndex("by_owner_basket", (q) => q.eq("ownerUserId", userId).eq("basketId", basketId))
      .take(MAX_ITEMS_PER_BASKET);
    const added = [];
    const blocked: Array<{ itemId: Id<"savedBasketItems">; name: string; reason: string }> = [];
    for (const row of rows) {
      const product = await ctx.db.get(row.productId);
      const store = await ctx.db.get(row.storeId);
      const category = product ? await ctx.db.get(product.categoryId) : null;
      const validStore = product?.storeId === row.storeId;
      const reason = !product
        ? "This product is no longer listed."
        : !validStore
          ? "This product has moved from its original store."
          : product.unit !== row.unitAtSave || product.soldByWeight !== row.soldByWeightAtSave
            ? "This product's quantity or weight options have changed. Remove it and add it again."
          : !store?.enabled
            ? "The original store is not taking orders."
            : !category?.enabled
              ? "This product's category is unavailable."
              : !product.available
                ? "This product is currently unavailable."
                : product.stock < row.quantity
                  ? `Only ${product.stock} ${product.soldByWeight ? "kg" : "items"} are currently available.`
                  : null;
      if (reason || !product || !store) {
        blocked.push({ itemId: row._id, name: row.productNameAtSave, reason: reason ?? "Unavailable." });
        continue;
      }
      added.push({
        productId: product._id,
        storeId: store._id,
        storeName: store.name,
        slug: product.slug,
        name: product.name,
        description: product.description,
        categoryId: product.categoryId,
        price: product.price,
        ...(product.promoPrice === undefined ? {} : { promoPrice: product.promoPrice }),
        unit: product.unit,
        soldByWeight: product.soldByWeight,
        ...(product.weightOptions === undefined ? {} : { weightOptions: product.weightOptions }),
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        available: product.available,
        popularity: product.popularity,
        createdAt: new Date(product._creationTime).toISOString(),
        emoji: product.emoji,
        ...(product.variants === undefined ? {} : { variants: product.variants }),
        quantity: row.quantity,
        priceChanged: (product.promoPrice ?? product.price) !== row.unitPriceAtSave,
      });
    }
    return { added, blocked };
  },
});
