import { internalMutation } from "./_generated/server";
import { seedCategories, seedProducts, seedShop } from "../src/lib/seed";

export const seedStorefront = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existingStore = await ctx.db
      .query("stores")
      .withIndex("by_slug", (q) => q.eq("slug", seedShop.slug))
      .unique();
    const storeId = existingStore
      ? existingStore._id
      : await ctx.db.insert("stores", {
          slug: seedShop.slug,
          name: seedShop.name,
          tagline: seedShop.tagline,
          phone: seedShop.phone,
          whatsapp: seedShop.whatsapp,
          address: seedShop.address,
          openingHours: seedShop.openingHours,
          enabled: seedShop.enabled,
          sortOrder: seedShop.order,
        });

    const categoryDocIds = new Map<string, import("./_generated/dataModel").Id<"categories">>();
    for (const category of seedCategories) {
      const existing = await ctx.db
        .query("categories")
        .withIndex("by_store_slug", (q) =>
          q.eq("storeId", storeId).eq("slug", category.slug),
        )
        .unique();
      const id = existing
        ? existing._id
        : await ctx.db.insert("categories", {
            storeId,
            slug: category.slug,
            name: category.name,
            emoji: category.emoji,
            accent: category.accent,
            enabled: category.enabled,
            sortOrder: category.order,
          });
      categoryDocIds.set(category.id, id);
    }

    for (const product of seedProducts) {
      const categoryId = categoryDocIds.get(product.categoryId);
      if (!categoryId) throw new Error(`Missing category for ${product.name}.`);
      const existing = await ctx.db
        .query("products")
        .withIndex("by_store_slug", (q) =>
          q.eq("storeId", storeId).eq("slug", product.slug),
        )
        .unique();
      if (existing) continue;
      await ctx.db.insert("products", {
        storeId,
        slug: product.slug,
        name: product.name,
        description: product.description,
        categoryId,
        price: product.price,
        ...(product.promoPrice === undefined ? {} : { promoPrice: product.promoPrice }),
        unit: product.unit,
        soldByWeight: product.soldByWeight,
        ...(product.weightOptions === undefined ? {} : { weightOptions: product.weightOptions }),
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        available: product.available,
        popularity: product.popularity,
        emoji: product.emoji,
        ...(product.variants === undefined
          ? {}
          : { variants: product.variants.map(({ label, multiplier }) => ({ label, multiplier })) }),
      });
    }

    const settings = await ctx.db
      .query("storeSettings")
      .withIndex("by_store", (q) => q.eq("storeId", storeId))
      .unique();
    if (!settings)
      await ctx.db.insert("storeSettings", {
        storeId,
        key: "storefront",
        name: seedShop.name,
        currency: seedShop.currency,
        deliveryFee: seedShop.deliveryFee,
        minimumOrder: seedShop.minimumOrder,
        deliveryAreas: seedShop.deliveryAreas,
        defaultDeliveryArea: seedShop.defaultDeliveryArea,
        mobileMoneyEnabled: seedShop.paymentOptions.mobileMoney,
        cashOnDeliveryEnabled: seedShop.paymentOptions.cashOnDelivery,
        cardEnabled: seedShop.paymentOptions.card,
      });
    return { store: seedShop.slug, categories: seedCategories.length, products: seedProducts.length };
  },
});
