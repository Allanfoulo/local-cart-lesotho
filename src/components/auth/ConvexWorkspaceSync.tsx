import { useEffect } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "@/lib/app-store";
import { mapAssignedDelivery, mapConvexCustomer, mapConvexOrder } from "@/features/orders/convex-mapper";
import type { Category, DeliveryLandmark, Product, Promotion, Shop } from "@/lib/types";

export function ConvexWorkspaceSync() {
  const access = useQuery(api.memberships.currentAccess, {});
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const customerAccount = useQuery(api.customers.account, isAuthenticated ? {} : "skip");
  const canManageCatalog = Boolean(access?.isSuperadmin || access?.memberships.some((item) => ["store_owner", "store_manager", "catalogue_staff"].includes(item.role)));
  const canManageOrders = Boolean(access?.isSuperadmin || access?.memberships.some((item) => ["store_owner", "store_manager", "dispatcher", "order_staff"].includes(item.role)));
  const isDriver = Boolean(access?.memberships.some((item) => item.role === "driver"));
  const catalog = useQuery(api.catalog.getManagementWorkspace, canManageCatalog ? {} : "skip");
  const staffWorkspace = useQuery(api.orders.listForStaff, canManageOrders ? {} : "skip");
  const driverOrders = useQuery(api.orders.myAssigned, isDriver && !canManageOrders ? {} : "skip");
  const deliveryPlaces = useQuery(api.deliveryPlaces.marketplace, {});
  const {
    replaceManagementWorkspace,
    replaceStaffWorkspace,
    replaceDeliveryLandmarks,
    replaceCustomerAccount,
  } = useAppStore();

  useEffect(() => {
    if (!catalog) return;
    const shops: Shop[] = catalog.flatMap(({ store, settings }) => store && settings ? [{
      id: String(store._id), slug: store.slug, enabled: store.enabled, order: store.sortOrder, name: store.name,
      tagline: store.tagline, phone: store.phone, whatsapp: store.whatsapp, address: store.address,
      openingHours: store.openingHours, deliveryAreas: settings.deliveryAreas,
      defaultDeliveryArea: settings.defaultDeliveryArea, deliveryFee: settings.deliveryFee,
      minimumOrder: settings.minimumOrder, currency: settings.currency, currencySymbol: "M" as const,
      paymentOptions: { mobileMoney: settings.mobileMoneyEnabled, cashOnDelivery: settings.cashOnDeliveryEnabled, card: settings.cardEnabled },
    }] : []);
    const storeNames = new Map(shops.map((store) => [store.id, store.name]));
    const categories: Category[] = catalog.flatMap(({ categories }) => categories.map((category) => ({
      id: String(category._id), storeId: String(category.storeId), slug: category.slug, name: category.name,
      emoji: category.emoji, accent: category.accent, enabled: category.enabled, order: category.sortOrder,
    })));
    const products: Product[] = catalog.flatMap(({ products }) => products.map((product) => ({
      id: String(product._id), storeId: String(product.storeId), storeName: storeNames.get(String(product.storeId)) ?? "Local store",
      slug: product.slug, name: product.name, description: product.description, categoryId: String(product.categoryId),
      price: product.price, ...(product.promoPrice === undefined ? {} : { promoPrice: product.promoPrice }), unit: product.unit,
      soldByWeight: product.soldByWeight, ...(product.weightOptions === undefined ? {} : { weightOptions: product.weightOptions }),
      stock: product.stock, lowStockThreshold: product.lowStockThreshold, available: product.available,
      popularity: product.popularity, createdAt: new Date(product._creationTime).toISOString(), emoji: product.emoji,
      ...(product.variants ? { variants: product.variants.map((variant, index) => ({ id: `${product._id}-${index}`, ...variant })) } : {}),
    })));
    const promotions: Promotion[] = catalog.flatMap(({ promotions }) => promotions.map((promotion) => ({
      id: String(promotion._id), storeId: String(promotion.storeId), name: promotion.name, type: promotion.type,
      value: promotion.value, ...(promotion.code ? { code: promotion.code } : {}), startDate: promotion.startDate,
      endDate: promotion.endDate, active: promotion.active,
    })));
    replaceManagementWorkspace({ stores: shops, categories, products, promotions });
  }, [catalog, replaceManagementWorkspace]);

  useEffect(() => {
    if (staffWorkspace) {
      replaceStaffWorkspace({
        orders: staffWorkspace.orders.map((order) => mapConvexOrder(order, order.timeline)),
        customers: staffWorkspace.customers.flatMap((customer) => customer ? [mapConvexCustomer(customer)] : []),
        drivers: staffWorkspace.drivers.map((driver) => ({ id: String(driver.userId), name: driver.name, storeIds: driver.storeIds.map(String) })),
        preparationStaff: staffWorkspace.preparationStaff.map((staff) => ({ id: String(staff.userId), name: staff.name, storeIds: staff.storeIds.map(String) })),
        deliveryRouteSequence: Object.fromEntries((staffWorkspace.routeSequences ?? []).map((sequence) => [
          `${String(sequence.storeId)}::${String(sequence.driverUserId)}`, sequence.orderIds.map(String),
        ])),
      });
      return;
    }
    if (driverOrders) {
      replaceStaffWorkspace({
        orders: driverOrders.orders.map((order) => mapAssignedDelivery(order)), customers: [], drivers: [], preparationStaff: [],
        deliveryRouteSequence: Object.fromEntries(driverOrders.routeSequences.map((sequence) => [
          `${String(sequence.storeId)}::${String(driverOrders.orders.find((order) => order.storeId === sequence.storeId)?.driverUserId ?? "")}`,
          sequence.orderIds.map(String),
        ])),
      });
      return;
    }
    if (access !== undefined && !canManageOrders && !isDriver) {
      replaceStaffWorkspace({ orders: [], customers: [], drivers: [], preparationStaff: [] });
    }
  }, [access, canManageOrders, driverOrders, isDriver, replaceStaffWorkspace, staffWorkspace]);

  useEffect(() => {
    if (!deliveryPlaces) return;
    const places: DeliveryLandmark[] = deliveryPlaces.map((place) => ({
      id: String(place._id), storeId: String(place.storeId), name: place.name, aliases: place.aliases, area: place.area,
      lat: place.latitude, lng: place.longitude,
    }));
    replaceDeliveryLandmarks(places);
  }, [deliveryPlaces, replaceDeliveryLandmarks]);

  useEffect(() => {
    if (customerAccount) {
      replaceCustomerAccount({
        customerId: customerAccount.customerId,
        name: customerAccount.name,
        phone: customerAccount.phone,
        email: customerAccount.email,
        addresses: customerAccount.addresses.map((address) => ({
          id: String(address._id), label: address.label, area: address.area, address: address.address,
          ...(address.landmark ? { landmark: address.landmark } : {}),
          ...(address.instructions ? { instructions: address.instructions } : {}),
          ...(address.latitude === undefined ? {} : { lat: address.latitude }),
          ...(address.longitude === undefined ? {} : { lng: address.longitude }),
        })),
        favourites: customerAccount.favouriteProductIds.map(String),
        preferences: customerAccount.preferences.map((item) => ({ key: item.key, enabled: item.enabled })),
      });
    } else if (!authLoading && !isAuthenticated) {
      replaceCustomerAccount({ customerId: "", name: "", phone: "", email: "", addresses: [], favourites: [], preferences: [] });
    }
  }, [authLoading, customerAccount, isAuthenticated, replaceCustomerAccount]);

  return null;
}
