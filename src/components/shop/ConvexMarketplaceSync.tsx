import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "@/lib/app-store";
import { marketplaceCatalogLoadingContext } from "@/lib/marketplace-catalog-context";
import type { Category, Product, Promotion, Shop } from "@/lib/types";

export function ConvexMarketplaceSync({ children }: { children: ReactNode }) {
  const catalog = useQuery(api.catalog.getMarketplaceCatalog, {});
  const { replaceMarketplaceCatalog } = useAppStore();
  const [appliedCatalog, setAppliedCatalog] = useState<typeof catalog>();

  useEffect(() => {
    if (catalog === undefined) return;
    const shops: Shop[] = catalog.stores.map((entry) => ({
      id: entry._id,
      slug: entry.slug,
      enabled: entry.enabled,
      order: entry.sortOrder,
      name: entry.name,
      tagline: entry.tagline,
      phone: entry.phone,
      whatsapp: entry.whatsapp,
      address: entry.address,
      openingHours: entry.openingHours,
      deliveryAreas: entry.settings.deliveryAreas,
      defaultDeliveryArea: entry.settings.defaultDeliveryArea,
      deliveryFee: entry.settings.deliveryFee,
      minimumOrder: entry.settings.minimumOrder,
      currency: entry.settings.currency,
      currencySymbol: "M",
      paymentOptions: {
        mobileMoney: entry.settings.mobileMoneyEnabled,
        cashOnDelivery: entry.settings.cashOnDeliveryEnabled,
        card: entry.settings.cardEnabled,
      },
    }));
    const storeNames = new Map(shops.map((store) => [store.id, store.name]));
    const categories: Category[] = catalog.categories.map((category) => ({
      id: category._id,
      storeId: category.storeId,
      slug: category.slug,
      name: category.name,
      emoji: category.emoji,
      accent: category.accent,
      enabled: category.enabled,
      order: category.sortOrder,
    }));
    const products: Product[] = catalog.products.map((product) => ({
      id: product._id,
      storeId: product.storeId,
      storeName: storeNames.get(product.storeId) ?? "Local store",
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
      ...(product.variants === undefined
        ? {}
        : {
            variants: product.variants.map((variant, index) => ({
              id: `${product._id}-${index}`,
              ...variant,
            })),
          }),
    }));
    const promotions: Promotion[] = catalog.promotions.map((promotion) => ({
      id: promotion._id,
      storeId: String(promotion.storeId),
      name: promotion.name,
      type: promotion.type,
      value: promotion.value,
      ...(promotion.code ? { code: promotion.code } : {}),
      startDate: promotion.startDate,
      endDate: promotion.endDate,
      active: promotion.active,
    }));
    replaceMarketplaceCatalog({ stores: shops, categories, products, promotions });
    setAppliedCatalog(catalog);
  }, [catalog, replaceMarketplaceCatalog]);

  return (
    <marketplaceCatalogLoadingContext.Provider
      value={catalog === undefined || appliedCatalog !== catalog}
    >
      {children}
    </marketplaceCatalogLoadingContext.Provider>
  );
}
